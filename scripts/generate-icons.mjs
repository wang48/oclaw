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
const SVG_SOURCE = path.join(ICONS_DIR, 'icon.svg');

echo`🎨 Generating Oclaw icons using Node.js...`;

// Check if SVG source exists
if (!fs.existsSync(SVG_SOURCE)) {
  echo`❌ SVG source not found: ${SVG_SOURCE}`;
  process.exit(1);
}

// Ensure icons directory exists
await fs.ensureDir(ICONS_DIR);

try {
  // 1. Generate Master PNG Buffer (1024x1024) - higher resolution for better quality
  echo`  Processing SVG source...`;
  const masterPngBuffer = await sharp(SVG_SOURCE)
    .resize(1024, 1024)
    .png()
    .toBuffer();

  // Save the main icon.png (512x512 for Electron root icon)
  await sharp(masterPngBuffer)
    .resize(512, 512)
    .toFile(path.join(ICONS_DIR, 'icon.png'));
  echo`  ✅ Created icon.png (512x512)`;

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
      // Clean up iconset directory
      await fs.remove(iconsetDir);
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

  // 5. Generate macOS Tray Icon Template
  echo`📍 Generating macOS tray icon template...`;
  const TRAY_SVG_SOURCE = path.join(ICONS_DIR, 'tray-icon-template.svg');

  if (fs.existsSync(TRAY_SVG_SOURCE)) {
    await sharp(TRAY_SVG_SOURCE)
      .resize(22, 22)
      .png()
      .toFile(path.join(ICONS_DIR, 'tray-icon-Template.png'));
    echo`  ✅ Created tray-icon-Template.png (22x22)`;
  } else {
    echo`  ⚠️  tray-icon-template.svg not found, skipping tray icon generation`;
  }

  echo`\n✨ Icon generation complete! Files located in: ${ICONS_DIR}`;

} catch (error) {
  echo(chalk.red`\n❌ Fatal Error: ${error.message}`);
  console.error(error);
  process.exit(1);
}
