import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    base: 'words',
    build: {
        outDir: 'build',
    },
    plugins: [react()],
    resolve: {
        alias: [{ find: '@', replacement: '/src' }],
    },
    // server: {
    //     host: '192.168.1.35',
    //     port: 3000,
    // },
    envDir: '../',
});
