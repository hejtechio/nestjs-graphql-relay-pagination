import swc from 'unplugin-swc';
import { configDefaults, defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['**/*.{test,spec}.ts'],
    env: {
      NODE_ENV: 'test',
    },
    exclude: [
      ...configDefaults.exclude,
      '**/*.integration.spec.ts',
      '**/*.integration.spec.ts',
      '**/node_modules/**',
      '**/dist/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'html', 'text'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,js}'],
      exclude: [
        ...configDefaults.coverage.exclude!,
        '**/node_modules/**',
        '**/*.interface.ts',
        '**/*.module.ts',
        'src/index.ts',
        '**/*.entity.ts',
        '**/*.enum.ts',
        '**/*.decorator.ts',
      ],
    },
  },
  resolve: {
    alias: {
      src: resolve(__dirname, './src'),
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
