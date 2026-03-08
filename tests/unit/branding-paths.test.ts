import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

describe('branding asset paths', () => {
  it('uses baseline logo/icon assets from initial branding commit', () => {
    const root = process.cwd();
    const filesToCheck: Array<{ file: string; mustContain: string[] }> = [
      {
        file: 'src/components/layout/TitleBar.tsx',
        mustContain: ["@/assets/logo.png"],
      },
      {
        file: 'src/pages/Setup/index.tsx',
        mustContain: ["@/assets/logo.png"],
      },
      {
        file: 'electron/main/index.ts',
        mustContain: ['icon.ico', 'icon.png'],
      },
      {
        file: 'electron-builder.yml',
        mustContain: ['resources/icons/icon.icns', 'resources/icons/icon.ico'],
      },
      {
        file: 'scripts/generate-icons.mjs',
        mustContain: ['oclaw-no-text.jpg', 'logo.png', 'createTrayTemplateBuffer'],
      },
    ];
    const forbiddenMarkers = [
      '@/assets/logo.svg',
      'oclaw-icon.png',
      'oclaw-icon.ico',
      'oclaw-icon.icns',
      'tray-icon-template.svg',
    ];

    for (const item of filesToCheck) {
      const fullPath = join(root, item.file);
      const content = readFileSync(fullPath, 'utf-8');
      for (const marker of item.mustContain) {
        expect(content).toContain(marker);
      }
      for (const marker of forbiddenMarkers) {
        expect(content).not.toContain(marker);
      }
    }
  });

  it('does not keep duplicate oclaw-specific branding assets tracked in the workspace', () => {
    const root = process.cwd();
    const duplicateAssets = [
      'src/assets/oclaw-logo.svg',
      'resources/icons/oclaw-icon.png',
      'resources/icons/oclaw-icon.ico',
      'resources/icons/oclaw-icon.icns',
      'resources/icons/tray-icon-template.svg',
    ];

    for (const file of duplicateAssets) {
      expect(existsSync(join(root, file))).toBe(false);
    }
  });
});
