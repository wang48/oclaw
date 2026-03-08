#!/usr/bin/env zx

import 'zx/globals';
import sharp from 'sharp';
import png2icons from 'png2icons';
import { fileURLToPath } from 'url';

// Calculate paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(PROJECT_ROOT, 'resources', 'icons');
const FRONTEND_ASSETS_DIR = path.join(PROJECT_ROOT, 'src', 'assets');
const IMAGE_SOURCE = path.join(ICONS_DIR, 'oclaw-no-text.jpg');
const MASTER_SIZE = 1024;
const INSET = 88;
const CONTENT_SIZE = MASTER_SIZE - INSET * 2;
const CORNER_RADIUS = 190;

echo`🎨 Generating Oclaw icons using Node.js...`;

// Check if image source exists
if (!fs.existsSync(IMAGE_SOURCE)) {
  echo`❌ Image source not found: ${IMAGE_SOURCE}`;
  process.exit(1);
}

// Ensure icons directory exists
await fs.ensureDir(ICONS_DIR);
await fs.ensureDir(FRONTEND_ASSETS_DIR);

function roundedRectSvg(width, height, radius, fill = '#fff') {
  return Buffer.from(
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="${fill}"/></svg>`
  );
}

async function createMasterIconBuffer() {
  const roundedContent = await sharp(IMAGE_SOURCE)
    .resize(CONTENT_SIZE, CONTENT_SIZE, { fit: 'cover', position: 'centre' })
    .composite([
      {
        input: roundedRectSvg(CONTENT_SIZE, CONTENT_SIZE, CORNER_RADIUS),
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: MASTER_SIZE,
      height: MASTER_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: roundedContent, left: INSET, top: INSET }])
    .png()
    .toBuffer();
}

function averageColorFromCorners(data, width, height, channels, sampleSize = 24) {
  const regions = [
    { x: 0, y: 0 },
    { x: width - sampleSize, y: 0 },
    { x: 0, y: height - sampleSize },
    { x: width - sampleSize, y: height - sampleSize },
  ];

  const sum = { r: 0, g: 0, b: 0, count: 0 };

  for (const region of regions) {
    for (let y = region.y; y < region.y + sampleSize; y++) {
      for (let x = region.x; x < region.x + sampleSize; x++) {
        const index = (y * width + x) * channels;
        sum.r += data[index];
        sum.g += data[index + 1];
        sum.b += data[index + 2];
        sum.count++;
      }
    }
  }

  return {
    r: Math.round(sum.r / sum.count),
    g: Math.round(sum.g / sum.count),
    b: Math.round(sum.b / sum.count),
  };
}

function retainLargestComponent(alpha, width, height, minAlpha = 24) {
  const visited = new Uint8Array(width * height);
  let largest = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx] || alpha[idx] < minAlpha) {
        continue;
      }

      const queue = [idx];
      const component = [];
      visited[idx] = 1;

      while (queue.length > 0) {
        const current = queue.pop();
        component.push(current);
        const cx = current % width;
        const cy = Math.floor(current / width);
        const neighbors = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            continue;
          }
          const next = ny * width + nx;
          if (visited[next] || alpha[next] < minAlpha) {
            continue;
          }
          visited[next] = 1;
          queue.push(next);
        }
      }

      if (component.length > largest.length) {
        largest = component;
      }
    }
  }

  const keep = new Uint8Array(width * height);
  for (const idx of largest) {
    keep[idx] = 1;
  }

  for (let i = 0; i < alpha.length; i++) {
    if (!keep[i]) {
      alpha[i] = 0;
    }
  }
}

async function createTrayTemplateBuffer() {
  const traySourceSize = 256;
  const { data, info } = await sharp(IMAGE_SOURCE)
    .resize(traySourceSize, traySourceSize, { fit: 'contain', background: '#ececec' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const background = averageColorFromCorners(data, info.width, info.height, info.channels);
  const rgba = Buffer.alloc(info.width * info.height * 4);
  const alphaMask = new Uint8Array(info.width * info.height);
  const lowThreshold = 20;
  const highThreshold = 90;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const pixelIndex = (y * info.width + x) * info.channels;
      const rgbaIndex = (y * info.width + x) * 4;
      const dr = data[pixelIndex] - background.r;
      const dg = data[pixelIndex + 1] - background.g;
      const db = data[pixelIndex + 2] - background.b;
      const distance = Math.sqrt(dr * dr + dg * dg + db * db);
      let alpha = 0;

      if (distance >= highThreshold) {
        alpha = 255;
      } else if (distance > lowThreshold) {
        alpha = Math.round(((distance - lowThreshold) / (highThreshold - lowThreshold)) * 255);
      }

      alphaMask[y * info.width + x] = alpha;
      rgba[rgbaIndex] = 0;
      rgba[rgbaIndex + 1] = 0;
      rgba[rgbaIndex + 2] = 0;
      rgba[rgbaIndex + 3] = alphaMask[y * info.width + x];
    }
  }

  retainLargestComponent(alphaMask, info.width, info.height);
  for (let i = 0; i < alphaMask.length; i++) {
    rgba[i * 4 + 3] = alphaMask[i];
  }

  const trayGlyph = await sharp(rgba, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .resize(18, 18, { fit: 'contain' })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: 22,
      height: 22,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: trayGlyph, gravity: 'centre' }])
    .png()
    .toBuffer();
}

try {
  // 1. Generate a transparent master icon with preserved padding and rounded corners
  echo`  Processing JPEG source...`;
  const masterPngBuffer = await createMasterIconBuffer();

  // Save the main icon.png (512x512 for Electron root icon)
  await sharp(masterPngBuffer)
    .resize(512, 512)
    .toFile(path.join(ICONS_DIR, 'icon.png'));
  echo`  ✅ Created icon.png (512x512)`;

  await sharp(masterPngBuffer)
    .resize(512, 512)
    .toFile(path.join(FRONTEND_ASSETS_DIR, 'logo.png'));
  echo`  ✅ Created src/assets/logo.png (512x512)`;

  // 2. Generate Windows .ico
  echo`🪟 Generating Windows .ico...`;
  const icoBuffer = png2icons.createICO(masterPngBuffer, png2icons.BEZIER, 0, false);

  if (icoBuffer) {
    fs.writeFileSync(path.join(ICONS_DIR, 'icon.ico'), icoBuffer);
    echo`  ✅ Created icon.ico`;
  } else {
    echo(chalk.red`  ❌ Failed to create icon.ico`);
  }

  // 3. Generate macOS .icns with all required sizes
  echo`🍎 Generating macOS .icns...`;

  // Create iconset directory for macOS
  const iconsetDir = path.join(ICONS_DIR, 'icon.iconset');
  await fs.ensureDir(iconsetDir);

  // macOS requires specific sizes and naming convention
  const macOSSizes = [
    { size: 16, name: 'icon_16x16.png' },
    { size: 32, name: 'icon_16x16@2x.png' },
    { size: 32, name: 'icon_32x32.png' },
    { size: 64, name: 'icon_32x32@2x.png' },
    { size: 128, name: 'icon_128x128.png' },
    { size: 256, name: 'icon_128x128@2x.png' },
    { size: 256, name: 'icon_256x256.png' },
    { size: 512, name: 'icon_256x256@2x.png' },
    { size: 512, name: 'icon_512x512.png' },
    { size: 1024, name: 'icon_512x512@2x.png' },
  ];

  for (const { size, name } of macOSSizes) {
    await sharp(masterPngBuffer)
      .resize(size, size)
      .toFile(path.join(iconsetDir, name));
  }
  echo`  ✅ Created iconset with ${macOSSizes.length} sizes`;

  // Convert iconset to icns using iconutil (macOS only)
  if (process.platform === 'darwin') {
    try {
      await $`iconutil -c icns ${iconsetDir} -o ${path.join(ICONS_DIR, 'icon.icns')}`;
      echo`  ✅ Created icon.icns using iconutil`;
    } catch (error) {
      echo(chalk.yellow`  ⚠️  iconutil failed, falling back to png2icons`);
      const icnsBuffer = png2icons.createICNS(masterPngBuffer, png2icons.BEZIER, 0);
      if (icnsBuffer) {
        fs.writeFileSync(path.join(ICONS_DIR, 'icon.icns'), icnsBuffer);
        echo`  ✅ Created icon.icns using png2icons`;
      } else {
        echo(chalk.red`  ❌ Failed to create icon.icns`);
      }
    }
  } else {
    // Non-macOS: use png2icons
    const icnsBuffer = png2icons.createICNS(masterPngBuffer, png2icons.BEZIER, 0);
    if (icnsBuffer) {
      fs.writeFileSync(path.join(ICONS_DIR, 'icon.icns'), icnsBuffer);
      echo`  ✅ Created icon.icns using png2icons`;
    } else {
      echo(chalk.red`  ❌ Failed to create icon.icns`);
    }
  }
  await fs.remove(iconsetDir);

  // 4. Generate Linux PNGs (various sizes)
  echo`🐧 Generating Linux PNG icons...`;
  const linuxSizes = [16, 32, 48, 64, 128, 256, 512];
  let generatedCount = 0;

  for (const size of linuxSizes) {
    await sharp(masterPngBuffer)
      .resize(size, size)
      .toFile(path.join(ICONS_DIR, `${size}x${size}.png`));
    generatedCount++;
  }
  echo`  ✅ Created ${generatedCount} Linux PNG icons`;

  // 5. Generate macOS tray template from the Oclaw source image.
  // macOS template icons only use alpha, so we derive a monochrome mask from
  // the branded artwork instead of shipping the upstream template glyph.
  echo`📍 Generating macOS tray icon template...`;
  const trayTemplateBuffer = await createTrayTemplateBuffer();
  await fs.writeFile(path.join(ICONS_DIR, 'tray-icon-Template.png'), trayTemplateBuffer);
  echo`  ✅ Created tray-icon-Template.png (22x22)`;

  echo`\n✨ Icon generation complete! Files located in: ${ICONS_DIR}`;

} catch (error) {
  echo(chalk.red`\n❌ Fatal Error: ${error.message}`);
  console.error(error);
  process.exit(1);
}
