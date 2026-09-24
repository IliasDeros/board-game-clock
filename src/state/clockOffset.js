// Estimates how far this device's clock is from Firestore's server clock.
//
// A probe writes serverTimestamp() and learns the server's time `serverMs`.
// That time falls somewhere between when we sent the write and when it was
// acked, so the midpoint is the best guess and half the round trip is the
// worst-case error.
export function sampleFromProbe({ sentAtMs, ackedAtMs, serverMs }) {
  return {
    offsetMs: Math.round(serverMs - (sentAtMs + ackedAtMs) / 2),
    rttMs: ackedAtMs - sentAtMs,
  };
}

// The sample with the smallest round trip has the tightest error bound.
export function bestSample(samples) {
  return samples.reduce((best, s) => (best === null || s.rttMs < best.rttMs ? s : best), null);
}
