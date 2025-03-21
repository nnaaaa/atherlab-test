module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^src/lib/wagmiConfig$': '<rootDir>/src/lib/wagmiConfig.ts.mock.ts',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.tsx', '**/*.test.tsx'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/providers.tsx',
    '!src/lib/constants.ts',
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm/)?(@swc|@babel|wagmi|viem|react|react-dom|next))',
  ],
}; 