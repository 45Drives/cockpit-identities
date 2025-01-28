import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

import manifest from "../manifest.json";

const getAppVersionDefine = () => {
  return `${manifest.version}-${manifest.buildVersion}${process.env.OS_PACKAGE_RELEASE ?? "built_from_source"}`;
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: "./",
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    dedupe: ['vue'],
  },
  build: {
    minify: false,
  },
  define: {
    __APP_VERSION__: JSON.stringify(getAppVersionDefine()),
  },
});
