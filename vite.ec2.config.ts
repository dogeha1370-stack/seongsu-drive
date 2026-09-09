import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';
const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export default defineConfig({
  root: path('./ec2'),
  publicDir: path('./public'),
  plugins: [react()],
  resolve: { alias: { '@': path('./'), 'next/image': path('./ec2/image.tsx') } },
  define: { __EC2__: 'true' },
  css: { postcss: { plugins: [tailwindcss()] } },
  build: { outDir: path('./dist-ec2/client'), emptyOutDir: true },
});
