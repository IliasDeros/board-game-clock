import { useEffect, useState } from 'react';
import { BEATS, FAKE_PLAYERS, FAKE_URL, REDUCED_MOTION_BEAT } from './heroDemoScript';

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Everything in here is decorative and non-interactive: plain divs (never
// buttons or links), so it adds no tab stops and can't be mistaken for the
// real form below it.
function MiniForm({ beat }) {
  return (
    <div className="hero-screen">
      <div className="hero-title">New game</div>
      <div className="hero-field"><span>Players</span><b>{beat.players ?? '—'}</b></div>
      <div className="hero-field"><span>Time</span><b>{beat.time ?? '—:——'}</b></div>
      <div className={`hero-fake-btn${beat.pressed ? ' pressed' : ''}`}>Create clock</div>
    </div>
  );
}

function MiniList({ beat, showTapHint }) {
  return (
    <div className="hero-screen">
      <div className="hero-link-label">Link to Share</div>
      <div className="hero-link">{FAKE_URL}</div>
      <div className="hero-rows">
        {FAKE_PLAYERS.map((player, i) => (
          <div key={player.name} className={`hero-row${beat.activeIndex === i ? ' active' : ''}`}>
            <span className="hero-row-name">{player.name}</span>
            <span className="hero-row-time">{player.time}</span>
            {showTapHint && beat.activeIndex === i && <span className="hero-ring" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function Phone({ beat, index, reduced }) {
  const lit = index === 0 || beat.peersLit;
  return (
    <div className={`hero-phone${lit ? ' lit' : ''}`}>
      {lit && beat.phase === 'setup' && <MiniForm beat={beat} />}
      {lit && beat.phase !== 'setup' && (
        <MiniList beat={beat} showTapHint={index === 0 && beat.tapHint && !reduced} />
      )}
    </div>
  );
}

export function HeroDemo() {
  const [reduced] = useState(prefersReducedMotion);
  const [beatIndex, setBeatIndex] = useState(reduced ? REDUCED_MOTION_BEAT : 0);

  useEffect(() => {
    if (reduced) return;
    const id = setTimeout(() => setBeatIndex((i) => (i + 1) % BEATS.length), BEATS[beatIndex].ms);
    return () => clearTimeout(id);
  }, [reduced, beatIndex]);

  const beat = BEATS[beatIndex];
  return (
    <section className="hero-demo" aria-hidden="true" data-phase={beat.phase}>
      <div className="hero-phones">
        {[0, 1, 2].map((index) => (
          <Phone key={index} beat={beat} index={index} reduced={reduced} />
        ))}
        {beat.phase === 'share' && (
          <>
            <span className="hero-dot hero-dot-1" />
            <span className="hero-dot hero-dot-2" />
          </>
        )}
      </div>
    </section>
  );
}
