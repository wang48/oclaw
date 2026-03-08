import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

describe('branding asset paths', () => {
  it('uses dedicated oclaw logo/icon assets in key entrypoints', () => {
    const root = process.cwd();
    const filesToCheck: Array<{ file: string; mustContain: string[] }> = [
      {
        file: 'src/components/layout/TitleBar.tsx',
        mustContain: ["@/assets/oclaw-logo.svg"],
      },
      {
        file: 'src/pages/Setup/index.tsx',
        mustContain: ["@/assets/oclaw-logo.svg"],
      },
      {
        file: 'electron/main/index.ts',
        mustContain: ['oclaw-icon.ico', 'oclaw-icon.png'],
      },
      {
        file: 'electron-builder.yml',
        mustContain: ['resources/icons/oclaw-icon.icns', 'resources/icons/oclaw-icon.ico'],
      },
    ];

    for (const item of filesToCheck) {
      const fullPath = join(root, item.file);
      const content = readFileSync(fullPath, 'utf-8');
      for (const marker of item.mustContain) {
        expect(content).toContain(marker);
      }
    }
  });
});
