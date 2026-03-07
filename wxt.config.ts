import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    permissions: ['activeTab', 'tabs'],
    host_permissions: [
      'https://natfanclub-backend-809989871890.asia-southeast1.run.app/*',
    ],
  },
});
