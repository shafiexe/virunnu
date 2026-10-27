"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";


type ParsedResult = {
  valid: true;
  intent?: string;
  city?: string | null;
  guests?: number | null;
  date?: string | null;
  type?: string | null;
  nearby?: boolean;
  radiusKm?: number | null;
  userLat?: number;
  userLng?: number;
  cuisine?: string | null;
  summary?: string;
};

type ParsedError = {
  valid: false;
  message: string;
};

type Props = {
  onParsed: (result: ParsedResult) => void;
};

// Minimal type shim for Web Speech API
type SpeechRecognitionEvent = Event & { results: { [i: number]: { [j: number]: { transcript: string } } } };
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

const LOADER_MESSAGES = [
  "Understanding your request…",
  "Checking availability across Kerala…",
  "Finding the best matches…",
  "Almost there…",
];

// English keywords for relevance pre-check
const RELEVANT_KEYWORDS = [
  "hall", "venue", "auditorium", "banquet", "convention", "sabha", "kalyana",
  "wedding", "marriage", "reception", "conference", "function", "book", "booking",
  "guests", "guest", "capacity", "people", "seat",
  "caterer", "catering", "sadya", "food", "cuisine", "menu", "cook", "chef",
  "veg", "non-veg", "multi-cuisine", "kerala",
  "kochi", "kozhikode", "thrissur", "thiruvananthapuram", "kollam", "kannur",
  "palakkad", "alappuzha", "malappuram", "kottayam", "wayanad", "idukki",
  "kasaragod", "pathanamthitta", "nearby", "near", "km",
  "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
  "january", "february", "march", "april", "june", "july", "august", "september",
  "october", "november", "december", "next", "month",
];

// Detect Malayalam Unicode block (U+0D00–U+0D7F)
function hasMalayalam(text: string) {
  return /[ഀ-ൿ]/.test(text);
}

export function AISearchBar({ onParsed }: Props) {
  const t = useTranslations("search");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaderMsg, setLoaderMsg] = useState(LOADER_MESSAGES[0]);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [listening, setListening] = useState(false);
  const recogRef = useRef<SpeechRecognitionInstance | null>(null);
  const loaderTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const voiceLang = locale === "en" ? "en-IN" : "ml-IN";

  useEffect(() => {
    if (!loading) {
      if (loaderTimer.current) clearInterval(loaderTimer.current);
      return;
    }
    let i = 0;
    loaderTimer.current = setInterval(() => {
      i = (i + 1) % LOADER_MESSAGES.length;
      setLoaderMsg(LOADER_MESSAGES[i]);
    }, 1800);
    return () => { if (loaderTimer.current) clearInterval(loaderTimer.current); };
  }, [loading]);

  const parse = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Allow Malayalam script through without keyword check — Claude handles it natively
    const isMalayalam = hasMalayalam(text);
    if (!isMalayalam) {
      const lower = text.toLowerCase();
      const hasRelevantWord = RELEVANT_KEYWORDS.some((kw) => lower.includes(kw));
      if (!hasRelevantWord) {
        setError("Please ask something related to booking a hall or finding a caterer — e.g. 'auditorium for 500 guests in Kochi' or 'തൃശ്ശൂരിൽ സദ്യ കാറ്ററർ'");
        return;
      }
    }

    setLoading(true);
    setError("");
    setSummary("");

    let lat: number | undefined;
    let lng: number | undefined;
    const nearbyWords = ["near", "nearby", "അടുത്ത്", "സമീപം"];
    if (nearbyWords.some((w) => text.toLowerCase().includes(w))) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (geoErr) {
        const code = (geoErr as GeolocationPositionError)?.code;
        if (code === 1) {
          setLoading(false);
          setError("Location access denied — showing all venues instead. Enable location in your browser to filter by distance.");
          return;
        }
      }
    }

    try {
      const res = await fetch("/api/search/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, lat, lng }),
      });
      const data: ParsedResult | ParsedError = await res.json();
      if (!data.valid) {
        setError((data as ParsedError).message);
      } else {
        const r = data as ParsedResult;
        setSummary(r.summary ?? "");
        onParsed(r.nearby && lat !== undefined && lng !== undefined
          ? { ...r, userLat: lat, userLng: lng }
          : r
        );
      }
    } catch {
      setError("Could not reach the search assistant. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [onParsed]);

  function startVoice() {
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice search is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    if (listening && recogRef.current) {
      recogRef.current.stop();
      return;
    }

    const recog = new SpeechRecognition();
    recog.lang = voiceLang;
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recogRef.current = recog;
    setListening(true);
    setError("");

    recog.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      setQuery(transcript);
      setListening(false);
      if (transcript) parse(transcript);
    };

    recog.onerror = () => {
      setListening(false);
      setError("Could not capture voice. Please try again.");
    };

    recog.onend = () => setListening(false);
    recog.start();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      parse(query);
    }
  }

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
          {t("aiLabel")}
        </span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 font-normal normal-case tracking-normal">
          {t("aiSub")}
        </span>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setError(""); setSummary(""); }}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            disabled={loading || listening}
            className="w-full rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition disabled:opacity-60"
          />
          {listening && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-red-500 font-medium animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {t("listening")}
            </span>
          )}
        </div>

        {/* Mic button */}
        <button
          type="button"
          onClick={startVoice}
          disabled={loading}
          title={listening ? "Stop recording" : t("micTitle")}
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors border ${
            listening
              ? "bg-red-500 border-red-500 text-white animate-pulse"
              : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-amber-600 hover:border-amber-300"
          } disabled:opacity-50`}
        >
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        {/* Parse button */}
        <button
          type="button"
          onClick={() => parse(query)}
          disabled={loading || listening || !query.trim()}
          className="shrink-0 flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          <span className="hidden sm:inline">{loading ? loaderMsg : t("aiBtn")}</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* AI understood summary */}
      {summary && !error && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 px-3 py-2">
          <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            <span className="font-semibold">AI understood: </span>{summary}
            <span className="text-amber-600 dark:text-amber-400 ml-1">— filters filled below ↓</span>
          </p>
        </div>
      )}
    </div>
  );
}
