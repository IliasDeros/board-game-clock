import { useSyncExternalStore } from 'react';

// Follows the system colour scheme until the user picks one with the switcher;
// that choice is remembered. The initial attribute is set by an inline script in
// index.html (to avoid a flash); this module keeps it in sync afterwards.
const STORAGE_KEY = 'bg-clock-theme';
const query = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set();

function readOverride() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

let override = readOverride();

function currentTheme() {
  return override ?? (query.matches ? 'dark' : 'light');
}

function notify() {
  document.documentElement.dataset.theme = currentTheme();
  listeners.forEach((listener) => listener());
}

query.addEventListener('change', notify);
notify();

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function toggleTheme() {
  override = currentTheme() === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem(STORAGE_KEY, override);
  } catch {
    // Private mode etc.: the choice just won't survive a reload.
  }
  notify();
}

export function useTheme() {
  return useSyncExternalStore(subscribe, currentTheme);
}
