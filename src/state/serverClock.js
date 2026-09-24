import { useEffect, useSyncExternalStore } from 'react';
import { doc, setDoc, getDocFromServer, serverTimestamp } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { db } from '../firebase';
import { sampleFromProbe, bestSample } from './clockOffset';

const PROBES_PER_ROUND = 3;
const RESYNC_MS = 5 * 60 * 1000;
const PROBE_TIMEOUT_MS = 5000;
const READY_TIMEOUT_MS = 2000;

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

let offsetMs = 0;
const listeners = new Set();
let syncing = null;
let firstSync = null;

function clientId() {
  try {
    let id = localStorage.getItem('clockProbeId');
    if (!id) {
      id = nanoid(16);
      localStorage.setItem('clockProbeId', id);
    }
    return id;
  } catch {
    return nanoid(16);
  }
}

async function probeOnce(ref) {
  const sentAtMs = Date.now();
  await setDoc(ref, { t: serverTimestamp() });
  const ackedAtMs = Date.now();
  const snap = await getDocFromServer(ref);
  return sampleFromProbe({ sentAtMs, ackedAtMs, serverMs: snap.data().t.toMillis() });
}

async function syncRound() {
  const ref = doc(db, 'clockProbes', clientId());
  const samples = [];
  for (let i = 0; i < PROBES_PER_ROUND; i++) {
    // setDoc only resolves once the server acks it, so it can hang offline.
    samples.push(await withTimeout(probeOnce(ref), PROBE_TIMEOUT_MS, 'clock probe timed out'));
  }
  offsetMs = bestSample(samples).offsetMs;
  listeners.forEach((l) => l());
}

export function syncServerClock() {
  if (!syncing) {
    syncing = syncRound()
      // A failed probe leaves the previous offset (0 at first) in place.
      .catch((err) => console.warn('Server clock sync failed', err))
      .finally(() => { syncing = null; });
    firstSync ??= syncing;
  }
  return syncing;
}

// Resolves once the first sync attempt has finished, whether or not it worked,
// but never blocks an action for more than READY_TIMEOUT_MS.
export function serverClockReady() {
  const ready = firstSync ?? syncServerClock();
  return withTimeout(ready, READY_TIMEOUT_MS, 'clock sync slow').catch(() => {});
}

export function serverNowMs() {
  return Date.now() + offsetMs;
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Keeps the offset fresh while a game is open and re-renders when it changes.
export function useServerClock() {
  const offset = useSyncExternalStore(subscribe, () => offsetMs);

  useEffect(() => {
    syncServerClock();
    const id = setInterval(syncServerClock, RESYNC_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') syncServerClock(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return offset;
}
