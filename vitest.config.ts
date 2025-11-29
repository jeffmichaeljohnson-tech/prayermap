import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vitest configuration for PrayerMap testing infrastructure
 * Configured with jsdom environment, coverage thresholds, and path aliases
 */
export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom for React component testing
    environment: 'jsdom',

    // Global setup files
    setupFiles: ['./src/test/setup.ts'],

    // Test file patterns
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],

    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      'coverage',
      '.idea',
      '.git',
      '.cache',
      'build',
      '**/*.config.ts',
    ],

    // Global test configuration
    globals: true,

    // Timeout for all tests
    testTimeout: 10000,

    // Parallel execution
    pool: 'threads',

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage',

      // Coverage thresholds
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },

      // Files to include in coverage
      include: ['src/**/*.ts', 'src/**/*.tsx'],

      // Files to exclude from coverage
      exclude: [
        'node_modules/',
        'src/test/**',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/*.d.ts',
        'src/types/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
    },

    // Reporter configuration
    reporters: ['verbose'],

    // Mock configuration
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
  },

  // Resolve path aliases to match tsconfig.json
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/stores': path.resolve(__dirname, './src/stores'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/layouts': path.resolve(__dirname, './src/layouts'),
      '@/test': path.resolve(__dirname, './src/test'),
    },
  },
});
