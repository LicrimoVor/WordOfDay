import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    build: {
        outDir: 'build',
    },
    plugins: [react()],
    resolve: {
        alias: [{ find: '@', replacement: '/src' }],
    },
    server: {
        proxy: {
            '/api': 'http://localhost:8010',
        },
    },
    envDir: '../',
});
