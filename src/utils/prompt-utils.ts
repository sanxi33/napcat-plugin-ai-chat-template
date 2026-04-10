export function renderTemplate(template: string, variables: Record<string, string>): string {
  let output = String(template || '');
  for (const [key, value] of Object.entries(variables)) {
    output = output.replaceAll(`{{${key}}}`, value);
  }
  return output;
}

export function appendMemorySection(profile: string, memory: string): string {
  const main = String(profile || '').trim();
  const memo = String(memory || '').trim();
  if (!memo) return main;
  if (!main) return memo;
  return `${main}\n\n${memo}`;
}
