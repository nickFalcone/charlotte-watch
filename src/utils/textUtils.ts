/** Remove emoji and variation selectors from text (e.g. from Twitter feeds). */
export function stripEmojis(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\uFE0F/g, '')
    .trim();
}

/** Remove Twitter t.co shortened URLs from text. */
export function stripTcoLinks(text: string): string {
  return text.replace(/https?:\/\/t\.co\/\S+/g, '').trim();
}
