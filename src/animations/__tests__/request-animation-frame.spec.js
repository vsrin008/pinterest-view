import {
  requestAnimationFrame,
  cancelAnimationFrame,
} from '../request-animation-frame';

describe('request-animation-frame', () => {
  let originalRAF;
  let originalCAF;

  beforeEach(() => {
    originalRAF = window.requestAnimationFrame;
    originalCAF = window.cancelAnimationFrame;
    jest.useFakeTimers();
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRAF;
    window.cancelAnimationFrame = originalCAF;
    jest.useRealTimers();
  });

  it('should use window.requestAnimationFrame when available', () => {
    const mockCallback = jest.fn();
    const mockRAF = jest.fn();
    window.requestAnimationFrame = mockRAF;

    requestAnimationFrame(mockCallback);
    expect(mockRAF).toHaveBeenCalledWith(mockCallback);
  });

  it('should fallback to setTimeout when requestAnimationFrame is not available', () => {
    window.requestAnimationFrame = null;
    const mockCallback = jest.fn();

    requestAnimationFrame(mockCallback);
    jest.advanceTimersByTime(16); // 60fps = ~16.67ms

    expect(mockCallback).toHaveBeenCalled();
  });

  it('should use window.cancelAnimationFrame when available', () => {
    const mockCAF = jest.fn();
    window.cancelAnimationFrame = mockCAF;
    const id = 123;

    cancelAnimationFrame(id);
    expect(mockCAF).toHaveBeenCalledWith(id);
  });

  it('should fallback to clearTimeout when cancelAnimationFrame is not available', () => {
    window.cancelAnimationFrame = null;
    const mockClearTimeout = jest.spyOn(window, 'clearTimeout');
    const id = 123;

    cancelAnimationFrame(id);
    expect(mockClearTimeout).toHaveBeenCalledWith(id);
  });
});
