import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/components": path.resolve(__dirname, "./src/components"),
      "@/services": path.resolve(__dirname, "./src/services"),
      "@/types": path.resolve(__dirname, "./src/types"),
      "@/utils": path.resolve(__dirname, "./src/utils"),
      "@/hooks": path.resolve(__dirname, "./src/hooks"),
    },
  },
  server: {
    port: 3001,
    host: 'localhost',
    https: {
      key: './localhost-key.pem',
      cert: './localhost.pem',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
