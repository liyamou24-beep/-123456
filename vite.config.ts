import dns from 'node:dns';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

/** 让 Node 侧解析 localhost 时优先 IPv4（对子进程/代理等有帮助） */
dns.setDefaultResultOrder('ipv4first');

/**
 * 开发服监听地址：
 * - `::`（默认）：Node 在 Windows/macOS 上多为 IPv4+IPv6 双栈，浏览器访问 http://localhost:3000（常走 ::1）与 http://127.0.0.1:3000、局域网 IP 均可。
 * - 若本机不支持 IPv6 双栈导致启动失败，在项目根 .env 设： VITE_DEV_HOST=0.0.0.0
 */
const devHostPlugin: Plugin = {
  name: 'dev-server-host-hint',
  configureServer(server) {
    server.httpServer?.once('listening', () => {
      const h = server.config.server.host;
      console.info(
        `\n  Dev server host: ${String(h)} — open http://localhost:3000/ or http://127.0.0.1:3000/\n`,
      );
    });
  },
};

const apiDevProxy = {
  '/api': {
    target: 'http://127.0.0.1:3001',
    changeOrigin: true,
  },
} as const;

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const devHost = env.VITE_DEV_HOST || '::';

  return {
    plugins: [react(), tailwindcss(), devHostPlugin],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: devHost,
      port: 3000,
      /** If 3000 is taken (e.g. another Express), fail loudly instead of silently using 3001+ */
      strictPort: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {...apiDevProxy},
    },
    /** Same as dev: `vite preview` serves dist but still needs /api → Node on localhost. */
    preview: {
      host: devHost,
      port: 4173,
      strictPort: true,
      proxy: {...apiDevProxy},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('lucide-react')) return 'lucide';
            if (id.includes('node_modules/motion')) return 'motion';
            if (id.includes('react-router')) return 'react-router';
            if (id.includes('@google/genai')) return 'genai';
            if (
              id.includes('node_modules/react-dom') ||
              id.includes('/react/') ||
              id.includes('node_modules/scheduler')
            ) {
              return 'react-vendor';
            }
            return 'vendor';
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  };
});
