import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
// GitHub Pages serves this project from /<repo>/, so the production build needs a
// matching base. Dev stays at '/'.
export default defineConfig(function (_a) {
    var command = _a.command;
    return ({
        base: command === 'build' ? '/RDA-Asset-management-and-Seating-mapping/' : '/',
        plugins: [react()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        server: {
            host: true,
            port: 5173,
        },
    });
});
