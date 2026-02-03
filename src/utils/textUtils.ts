/** Remove emoji and variation selectors from text (e.g. from Twitter feeds). */
export function stripEmojis(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\uFE0F/g, '')
    .trim();
}
