import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputPath = path.join(process.cwd(), 'public', 'logo.png');

sharp(inputPath)
  .png({ quality: 90 })
  .toBuffer()
  .then(data => {
    return sharp(data)
      .threshold(248)
      .negate()
      .toColorspace('srgb')
      .toFile(inputPath);
  })
  .catch(err => console.error('Error processing logo:', err));
