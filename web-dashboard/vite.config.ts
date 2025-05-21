import compression from 'vite-plugin-compression';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
    root: resolve(__dirname, 'src'),
    plugins: [
        react(),
        compression({
            algorithm: 'gzip',
            ext: '.gz',
            threshold: 10240,
        }),
    ],
    resolve: {
        alias: {
            '@src': resolve(__dirname, 'src'),
            '@home': resolve(__dirname, 'src/Home'),
            '@routes': resolve(__dirname, 'src/Routes'),
            '@components': resolve(__dirname, 'src/Components'),
            '@services': resolve(__dirname, 'src/Services'),
            '@utils': resolve(__dirname, 'src/Utils'),
        },
    },
    build: {
        target: "esnext",
        outDir: resolve(__dirname, 'dist'),
    },
    server: {
        host: 'localhost',
        port: 443,
        https: {
            key: fs.readFileSync('./tls/localhost.key'),
            cert: fs.readFileSync('./tls/localhost.crt'),
        },
        proxy: {
            '/api': {
                target: 'http://localhost:4000',
                changeOrigin: true,
                rewrite: (path: string) => path.replace(/^\/api/, ''),
            },
        },
    },
});