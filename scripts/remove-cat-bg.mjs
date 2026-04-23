import sharp from "sharp";

const { data, info } = await sharp("public/cat lie down.jpg")
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const output = Buffer.alloc(info.width * info.height * 4);

for (let i = 0; i < info.width * info.height; i++) {
  const r = data[i * 4];
  const g = data[i * 4 + 1];
  const b = data[i * 4 + 2];
  const isWhite = r > 220 && g > 220 && b > 220;
  output[i * 4]     = isWhite ? 0 : r;
  output[i * 4 + 1] = isWhite ? 0 : g;
  output[i * 4 + 2] = isWhite ? 0 : b;
  output[i * 4 + 3] = isWhite ? 0 : 255;
}

await sharp(output, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png()
  .toFile("public/cat-lie-down.png");

console.log("✓ public/cat-lie-down.png created");
