import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// Removed runtime error overlay plugin because it can crash when PostCSS plugins
// don't pass the `from` option. The HMR overlay is also disabled below.
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  css: {
    postcss: {
      plugins: [
        {
          postcssPlugin: 'internal:charset-removal',
          AtRule: {
            charset: (atRule) => {
              if (atRule.name === 'charset') {
                atRule.remove();
              }
            }
          }
        },
        tailwindcss(),
        autoprefixer()
      ]
    }
  },
  plugins: [
    react(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
    : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"), // Ensure this is correct
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"), // Ensure this matches the HTML
    emptyOutDir: true,
    sourcemap: true, // Added for better debugging
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5003',
        changeOrigin: true,
        secure: false,
      },
    },
    hmr: {
      overlay: false
    },
  },
});
