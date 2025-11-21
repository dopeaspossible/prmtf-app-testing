import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Output to 'dist' folder
    outDir: 'dist',
    // Ensure files are not hashed so Magento XML link remains constant
    rollupOptions: {
      output: {
        entryFileNames: 'assets/casecraft.js',
        assetFileNames: 'assets/casecraft.[ext]', // This handles the CSS
      },
    },
  },
});