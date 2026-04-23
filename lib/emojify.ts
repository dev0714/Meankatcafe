// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeEmoji = require("node-emoji") as { emojify: (text: string) => string };

export function emojify(text: string): string {
  return nodeEmoji.emojify(text);
}
