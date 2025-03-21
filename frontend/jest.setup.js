// Import Jest DOM extensions
import '@testing-library/jest-dom';

// Set up environment variables for React and new JSX transform
process.env.NODE_ENV = 'test';

// Manual mocks for wagmi modules
jest.mock('wagmi');
jest.mock('wagmi/chains');
jest.mock('wagmi/connectors');
jest.mock('@wagmi/core');

// Silence all console methods during tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

// Restore all console methods after tests
afterAll(() => {
  console.error.mockRestore();
  console.warn.mockRestore();
  console.log.mockRestore();
});

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/',
    params: {},
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock global fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

// Mock window.ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Add TextEncoder and TextDecoder polyfills for viem
class TextEncoderPolyfill {
  encode(str) {
    const buf = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      buf[i] = str.charCodeAt(i);
    }
    return buf;
  }
}

class TextDecoderPolyfill {
  decode(buf) {
    let str = '';
    for (let i = 0; i < buf.length; i++) {
      str += String.fromCharCode(buf[i]);
    }
    return str;
  }
}

global.TextEncoder = TextEncoderPolyfill;
global.TextDecoder = TextDecoderPolyfill; 