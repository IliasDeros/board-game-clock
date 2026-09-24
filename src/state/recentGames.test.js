import { describe, expect, it } from 'vitest';
import { formatAgo, formatDuration } from './recentGames';

describe('formatDuration', () => {
  it('shows minutes and seconds', () => {
    expect(formatDuration(120000)).toBe('2:00');
    expect(formatDuration(45000)).toBe('0:45');
    expect(formatDuration(605000)).toBe('10:05');
  });

  it('adds hours from one hour up', () => {
    expect(formatDuration(3725000)).toBe('1:02:05');
  });
});

describe('formatAgo', () => {
  it('uses seconds under a minute and minutes after', () => {
    expect(formatAgo(12500)).toBe('12s ago');
    expect(formatAgo(59999)).toBe('59s ago');
    expect(formatAgo(60000)).toBe('1 min ago');
    expect(formatAgo(119000)).toBe('1 min ago');
  });
});
