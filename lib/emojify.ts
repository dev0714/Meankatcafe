// eslint-disable-next-line @typescript-eslint/no-require-imports
const emojilib = require("emojilib") as { lib: Record<string, { char: string }> };

const lookup: Record<string, string> = {};
for (const [name, data] of Object.entries(emojilib.lib)) {
  if (data?.char) lookup[name] = data.char;
}

export function emojify(text: string): string {
  return text.replace(/:([a-z0-9_+-]+):/g, (match, name) => lookup[name] ?? match);
}
