import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, serve /api/rpc from the same handler Vercel runs in production.
function devApi(mode) {
  return {
    name: 'shrimpion-dev-api',
    apply: 'serve',
    configureServer(server) {
      Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
      server.middlewares.use('/api/rpc', async (req, res) => {
        const { nodeHandler } = await server.ssrLoadModule('/server/rpc.js');
        nodeHandler(req, res);
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), devApi(mode)],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
}));
