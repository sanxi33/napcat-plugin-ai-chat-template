export function parseMemberMapFromProfile(profileText = ''): Map<string, string> {
  const map = new Map<string, string>();
  const lines = String(profileText).split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    const match = line.match(/^-\s*([^：:]{1,30})\s*[：:]\s*(\d{5,})\s*$/);
    if (match) map.set(match[2], match[1]);
  }
  return map;
}

export function resolveDisplayName(input: {
  userId?: string;
  card?: string;
  nickname?: string;
  memberMap?: Map<string, string>;
}): string {
  const uid = String(input.userId || '');
  if (uid && input.memberMap?.get(uid)) return input.memberMap.get(uid)!;
  if (input.card) return String(input.card);
  if (input.nickname) return String(input.nickname);
  return uid || 'unknown';
}
