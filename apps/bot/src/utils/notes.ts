export function formatNotes(items: (string | false | null | undefined)[]): string {
  const bullets = items.filter(Boolean) as string[];
  if (bullets.length === 0) return '';
  return `\n\n-# **Note:**\n${bullets.map(b => `-# - ${b}`).join('\n')}`;
}
