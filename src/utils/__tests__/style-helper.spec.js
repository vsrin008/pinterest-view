/* eslint-disable max-len */
import { createPrefixer } from 'inline-style-prefixer';
import { transition, buildStyles } from '../style-helper';

const mockUnits = {
  length: 'px',
  angle: 'deg',
};

jest.mock('inline-style-prefixer', () => ({
  createPrefixer: jest.fn(() => (styles) => styles),
}));

describe('style-helper', () => {
  beforeEach(() => {
    createPrefixer.mockClear();
  });

  test('Should be build a transition string', () => {
    expect(transition(['opacity'], 1000, 'ease-in')).toBe(
      'opacity 1000ms ease-in'
    );

    const easing = 'cubic-bezier(0.215, 0.61, 0.355, 1)';
    expect(
      transition(['transform', 'opacity', 'background'], 200, easing)
    ).toBe(
      [
        `transform 200ms ${easing}`,
        `opacity 200ms ${easing}`,
        `background 200ms ${easing}`,
      ].join(',')
    );
  });

  it('creates transition string correctly', () => {
    const result = transition(['transform'], 300, 'ease-in-out');
    expect(result).toBe('transform 300ms ease-in-out');
  });

  it('creates multiple transition strings correctly', () => {
    const result = transition(['opacity', 'transform'], 300, 'ease-in-out');
    expect(result).toBe(
      'opacity 300ms ease-in-out,transform 300ms ease-in-out'
    );
  });

  it('builds a style object correctly', () => {
    const style = {
      transform: 'translate3d(0, 0, 0)',
      width: 100,
      height: 200,
    };

    const result = buildStyles(style, mockUnits, false);
    expect(result).toEqual({
      transform: 'translate3d(0, 0, 0)',
      width: 100,
      height: 200,
    });
  });

  it('handles vendor prefixes correctly', () => {
    const style = {
      transform: 'translate3d(0, 0, 0)',
      transition: 'all 300ms ease-in-out',
    };

    const result = buildStyles(style, mockUnits, true);
    expect(createPrefixer).toHaveBeenCalledWith({ userAgent: undefined });
    expect(result).toEqual(style);
  });

  it('handles null values correctly', () => {
    const style = {
      height: 200,
      width: null,
      transform: null,
    };

    const result = buildStyles(style, mockUnits, false);
    expect(createPrefixer).not.toHaveBeenCalled();
    expect(result).toEqual({
      height: 200,
      width: null,
      transform: null,
    });
  });

  it('returns original styles when vendor prefixing is disabled', () => {
    const styles = {
      transform: 'translate3d(0, 0, 0)',
      transition: 'all 300ms ease-in-out',
    };

    const result = buildStyles(styles, false);
    expect(createPrefixer).not.toHaveBeenCalled();
    expect(result).toEqual(styles);
  });
});
