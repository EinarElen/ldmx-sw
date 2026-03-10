import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const angularCoreShim = fileURLToPath(
  new URL('./src/shims/angular-core.ts', import.meta.url)
);
const basePainterSuffix = '/node_modules/jsroot/modules/base/BasePainter.mjs';

const jsrootCompatPlugin = {
  name: 'ldmx-jsroot-compat',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!id.endsWith(basePainterSuffix)) return null;

    const originalImport =
      "? import('../../scripts/jspdf.es.min.js').then(h1 => { _jspdf = h1; return import('../../scripts/svg2pdf.es.min.js'); }).then(h2 => { _svg2pdf = h2; })";
    const shimmedImport =
      "? import('/src/shims/jsroot-jspdf.ts').then(h1 => { _jspdf = h1; return import('/src/shims/jsroot-svg2pdf.ts'); }).then(h2 => { _svg2pdf = h2; })";

    if (!code.includes(originalImport)) return null;

    return {
      code: code.replace(originalImport, shimmedImport),
      map: null
    };
  }
};

export default defineConfig({
  plugins: [jsrootCompatPlugin, react()],
  resolve: {
    alias: [
      {
        find: '@angular/core',
        replacement: angularCoreShim
      }
    ]
  },
  server: {
    host: '0.0.0.0',
    port: 4173
  },
  preview: {
    host: '0.0.0.0',
    port: 4173
  }
});
