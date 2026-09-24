import { useLayoutEffect, useRef } from 'react';

const MAX_MINUTES = 99;
const SECONDS_STEP = 5;

// `value` and `onChange` deal in item indexes; each item shows index * step.
function Wheel({ label, unit, count, step = 1, value, onChange }) {
  const ref = useRef(null);

  function itemHeight() {
    return ref.current.firstElementChild.getBoundingClientRect().height;
  }

  function indexFromScroll() {
    const el = ref.current;
    return Math.min(count - 1, Math.max(0, Math.round(el.scrollTop / itemHeight())));
  }

  // Follow value changes that didn't come from scrolling this wheel (initial
  // mount, arrow keys, tapping a number).
  useLayoutEffect(() => {
    const el = ref.current;
    if (indexFromScroll() !== value) el.scrollTop = value * itemHeight();
  });

  function handleScroll() {
    const index = indexFromScroll();
    if (index !== value) onChange(index);
  }

  function select(index) {
    ref.current.scrollTo({ top: index * itemHeight(), behavior: 'smooth' });
    onChange(index);
  }

  function handleKeyDown(e) {
    const step = { ArrowUp: -1, ArrowDown: 1 }[e.key];
    if (!step) return;
    e.preventDefault();
    select(Math.min(count - 1, Math.max(0, value + step)));
  }

  return (
    <div className="wheel-col">
      <div
        ref={ref}
        className="wheel"
        role="spinbutton"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={(count - 1) * step}
        aria-valuenow={value * step}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
      >
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className={`wheel-item${i === value ? ' selected' : ''}`}
            onClick={() => select(i)}
          >
            {i * step}
          </div>
        ))}
      </div>
      <span className="wheel-unit">{unit}</span>
    </div>
  );
}

// iOS-style timer picker: one scroll-snapping wheel for minutes, one for seconds (in 5-second steps).
export function TimeWheelPicker({ valueMs, onChange, disabled }) {
  const totalSeconds = Math.round(valueMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const secondsIndex = Math.round(seconds / SECONDS_STEP) % (60 / SECONDS_STEP);

  return (
    <div className={`time-wheel${disabled ? ' disabled' : ''}`}>
      <div className="wheel-band" aria-hidden="true" />
      <Wheel
        label="Minutes" unit="min" count={MAX_MINUTES + 1} value={minutes}
        onChange={(m) => onChange((m * 60 + seconds) * 1000)}
      />
      <Wheel
        label="Seconds" unit="sec" count={60 / SECONDS_STEP} step={SECONDS_STEP} value={secondsIndex}
        onChange={(i) => onChange((minutes * 60 + i * SECONDS_STEP) * 1000)}
      />
    </div>
  );
}
