import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  
  // Get backend URL from environment variables
  // In development, use proxy. In production, use full URL or relative paths
  const backendUrl = env.VITE_API_BASE_URL || 
                     (mode === 'development' ? 'http://localhost:3001' : '');
  
  const isDevelopment = mode === 'development';
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: isDevelopment && backendUrl ? {
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          // Vite proxy automatically forwards Set-Cookie headers
          // The backend sets cookies with correct domain/path for localhost
        },
        '/uploads': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        }
      }
    } : undefined,
  }
})
