// "m:ss" <-> ms helpers for the minutes pickers.

export function formatMinutes(ms) {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Accepts "m:ss" (e.g. "3:30") or plain minutes, decimals allowed ("10", "2.5").
// Returns milliseconds, or null when the text isn't a valid duration.
export function parseMinutes(text) {
  const value = text.trim();
  const clock = /^(\d+):([0-5]?\d)$/.exec(value);
  if (clock) return (Number(clock[1]) * 60 + Number(clock[2])) * 1000;
  if (/^\d+(\.\d+)?$/.test(value)) return Math.round(Number(value) * 60000);
  return null;
}
