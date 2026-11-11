import type { KeyboardEvent } from "react";

const FIELDS = 'input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=button]):not([type=submit]):not([disabled]), select:not([disabled]), textarea:not([disabled])';

// Typing forms: Enter moves to the next field instead of doing nothing (or submitting half a form), and Ctrl/⌘ + Enter saves.
// Fields inside their own small <form> keep their normal Enter, and a text area keeps its new line.
export function enterToNext(onSave: () => void) {
  return (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    if (e.metaKey || e.ctrlKey) { e.preventDefault(); onSave(); return; }
    const t = e.target as HTMLElement;
    if (t.tagName === "TEXTAREA" || t.closest("form") || !(t.matches(FIELDS))) return;
    e.preventDefault();
    const all = [...e.currentTarget.querySelectorAll<HTMLElement>(FIELDS)].filter((el) => el.offsetParent !== null);
    const next = all[all.indexOf(t) + 1];
    next?.focus();
    if (next instanceof HTMLInputElement && next.type !== "date") next.select();
  };
}
