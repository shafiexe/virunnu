// Server component — no "use client" needed, pure SVG + styled span

type Props = {
  /** Font size for "irunnu" text — V mark scales proportionally */
  fontSize?: number;
  /** Color of the V arms */
  vColor?: string;
  /** Color of the teardrop flame inside the V */
  flameColor?: string;
  /** Color of the "irunnu" text */
  textColor?: string;
};

export function VirunnuLogo({
  fontSize = 26,
  vColor = "currentColor",
  flameColor = "#D97706",
  textColor = "currentColor",
}: Props) {
  const markH = Math.round(fontSize * 1.1);
  const markW = Math.round(markH * 0.9);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 1, lineHeight: 1 }}>
      {/* V lettermark — two triangle arms + teardrop flame */}
      <svg
        viewBox="0 0 18 20"
        height={markH}
        width={markW}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        style={{ display: "block", flexShrink: 0 }}
      >
        {/* Left arm */}
        <polygon points="0,0.5 4,0.5 9,19" fill={vColor} />
        {/* Right arm */}
        <polygon points="14,0.5 18,0.5 9,19" fill={vColor} />
        {/* Teardrop flame — round at top, pointed at bottom, sits in V opening */}
        <ellipse cx="9" cy="9.5" rx="2.1" ry="4.5" fill={flameColor} />
      </svg>

      {/* "irunnu" — Cormorant Garamond Italic semibold */}
      <span
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
          fontStyle: "italic",
          fontWeight: 600,
          fontSize,
          color: textColor,
          letterSpacing: "-0.015em",
          lineHeight: 1,
        }}
      >
        irunnu
      </span>
    </span>
  );
}
