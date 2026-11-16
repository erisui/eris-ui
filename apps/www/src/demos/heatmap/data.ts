/** Sample activity for the demos: one number per day, with quieter weekends. The same on every build. */
export const sampleActivity = (days: number) =>
  Array.from({ length: days }, (_, i) => {
    const weekend = i % 7 === 0 || i % 7 === 6;
    const wave = Math.sin(i / 9) + Math.sin(i / 2.3) * 0.6 + 1.1;
    return Math.max(0, Math.round(wave * (weekend ? 2 : 6) - 1));
  });

/** 26 weeks of days. */
export const activity = sampleActivity(26 * 7);
