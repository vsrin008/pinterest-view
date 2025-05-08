import '@testing-library/jest-dom';

global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Mock userAgent for inline-style-prefixer
global.navigator = {
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
};

// Mock ResizeObserver
class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }

  observe(target) {
    // Simulate an initial size measurement
    this.callback([
      {
        target,
        contentRect: {
          width: target.offsetWidth || 0,
          height: target.offsetHeight || 0,
        },
      },
    ]);
  }

  unobserve() {}

  disconnect() {}
}

global.ResizeObserver = ResizeObserver;
