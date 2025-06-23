import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'unit',
      include: ['src/**/*.{test,spec}.ts'],
      exclude: ['**/*.int-spec.ts', '**/*.integration.spec.ts'],
    },
    extends: './vitest.config.ts',
  },
  {
    test: {
      name: 'integration',
      include: ['**/*.int-spec.ts', '**/*.integration.spec.ts'],
    },
    extends: './vitest.integration.config.ts',
  },
]);
