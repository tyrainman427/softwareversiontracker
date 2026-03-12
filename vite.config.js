import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function fetchProxyPlugin() {
  return {
    name: 'fetch-proxy',
    configureServer(server) {
      server.middlewares.use('/api/fetch', async (req, res) => {
        const url = new URL(req.url, 'http://localhost').searchParams.get('url');
        if (!url) {
          res.statusCode = 400;
          res.end('Missing url parameter');
          return;
        }
        try {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'SoftwareVersionTracker/1.0 (version-check-tool)',
              'Accept': 'text/html',
            },
          });
          res.statusCode = response.status;
          const body = await response.text();
          res.setHeader('Content-Type', response.headers.get('content-type') || 'text/html');
          res.end(body);
        } catch (err) {
          res.statusCode = 502;
          res.end(err.message);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), fetchProxyPlugin()],
  server: {
    proxy: {
      '/api/repology': {
        target: 'https://repology.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/repology/, '/api/v1'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
            proxyReq.setHeader('User-Agent', 'SoftwareVersionTracker/1.0 (version-check-tool)');
            proxyReq.setHeader('Accept', 'application/json');
          });
        },
      },
    },
  },
})
