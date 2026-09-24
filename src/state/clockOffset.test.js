import { describe, expect, it } from 'vitest';
import { bestSample, sampleFromProbe } from './clockOffset';

describe('sampleFromProbe', () => {
  it('measures a device clock that is behind the server', () => {
    // Server time was 10_000 while this device's clock read ~4_000 (+/- rtt).
    const s = sampleFromProbe({ sentAtMs: 3_900, ackedAtMs: 4_100, serverMs: 10_000 });
    expect(s).toEqual({ offsetMs: 6_000, rttMs: 200 });
  });

  it('measures a device clock that is ahead of the server', () => {
    const s = sampleFromProbe({ sentAtMs: 20_000, ackedAtMs: 20_060, serverMs: 15_030 });
    expect(s.offsetMs).toBe(-5_000);
  });
});

describe('bestSample', () => {
  it('prefers the smallest round trip', () => {
    const best = bestSample([
      { offsetMs: 10, rttMs: 300 },
      { offsetMs: 12, rttMs: 40 },
      { offsetMs: 90, rttMs: 500 },
    ]);
    expect(best).toEqual({ offsetMs: 12, rttMs: 40 });
  });
});
