import { defineConfig } from 'vitest/config';

// Config aparte para no cargar el plugin PWA durante las pruebas
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
