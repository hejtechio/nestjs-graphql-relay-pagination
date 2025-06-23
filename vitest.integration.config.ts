import { defineConfig, configDefaults } from 'vitest/config';
import baseConfig from './vitest.config';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { test, ...restOfBaseConfig } = baseConfig;

export default defineConfig({
  ...restOfBaseConfig,
  test: {
    globals: baseConfig.test?.globals,
    root: baseConfig.test?.root,
    include: ['**/*.int-spec.ts', '**/*.integration.spec.ts'],
    exclude: [...configDefaults.exclude, '**/node_modules/**', '**/dist/**'],
    env: {
      NODE_ENV: 'test',
    },
  },
});
