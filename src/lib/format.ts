/** Shared formatting so dates and numbers render identically everywhere. */
export const monthYear = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export const longDate = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export const isoDate = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

/** Reading time, rounded up, at 225 words per minute. */
export const readingTime = (text: string) =>
  Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 225));
