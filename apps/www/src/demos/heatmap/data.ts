/** Sample activity for the demos: 26 weeks of days with quieter weekends. The same on every build. */
export const activity = Array.from({ length: 26 * 7 }, (_, i) => {
  const weekend = i % 7 === 0 || i % 7 === 6;
  const wave = Math.sin(i / 9) + Math.sin(i / 2.3) * 0.6 + 1.1;
  return Math.max(0, Math.round(wave * (weekend ? 2 : 6) - 1));
});
