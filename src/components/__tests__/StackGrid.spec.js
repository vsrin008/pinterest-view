// src/components/__tests__/StackGrid.spec.js
import React from 'react';
import { render, act } from '@testing-library/react';
import StackGrid, { GridInline } from '../StackGrid';

// Mock react-sizeme to provide size prop that component needs
jest.mock('react-sizeme', () => ({
  __esModule: true,
  default: () => (Component) => function SizeMeWrapper(props) {
    // Provide a mock size that the component needs
    const mockSize = {
      width: 800,
      height: 600,
      registerRef: jest.fn(),
      unregisterRef: jest.fn(),
    };
    return <Component {...props} size={mockSize} />;
  },
}));

// Mock requestAnimationFrame for predictable testing
let rafCallbacks = [];
let rafId = 0;

global.requestAnimationFrame = (callback) => {
  rafId += 1;
  rafCallbacks.push({ id: rafId, callback });
  return rafId;
};

global.cancelAnimationFrame = (id) => {
  rafCallbacks = rafCallbacks.filter(cb => cb.id !== id);
};

// Helper to flush RAF callbacks
const flushRAF = () => {
  rafCallbacks.forEach(({ callback }) => callback());
  rafCallbacks = [];
};

describe('StackGrid', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    rafCallbacks = [];
    rafId = 0;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('renders children correctly', () => {
      const { container } = render(
        <StackGrid columnWidth={100}>
          <div data-testid="child1">Item 1</div>
          <div data-testid="child2">Item 2</div>
        </StackGrid>,
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies correct container styles', () => {
      const { container } = render(
        <StackGrid columnWidth={100} gutterWidth={10} gutterHeight={10}>
          <div>Test Content</div>
        </StackGrid>,
      );
      const gridContainer = container.querySelector('[style*="position: relative"]');
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveStyle({ position: 'relative' });
    });
  });

  describe('GridInline Component', () => {
    const mockSize = {
      width: 800,
      height: 600,
      registerRef: jest.fn(),
      unregisterRef: jest.fn(),
    };

    it('renders GridInline with size props', () => {
      const { container } = render(
        <GridInline
          size={mockSize}
          columnWidth={100}
          component="div"
          itemComponent="div"
          gutterWidth={5}
          gutterHeight={5}
        >
          <div>Test Content</div>
        </GridInline>,
      );
      expect(container.firstChild).toBeInTheDocument();
      expect(mockSize.registerRef).toHaveBeenCalled();
    });
  });

  describe('Public API Methods', () => {
    it('exposes freeze, unfreeze, and layout methods', () => {
      const gridRef = React.createRef();
      
      render(
        <StackGrid ref={gridRef} columnWidth={100}>
          <div key="1">Item 1</div>
        </StackGrid>,
      );

      // Flush RAF to ensure component is mounted
      act(() => {
        flushRAF();
        jest.runAllTimers();
      });

      expect(gridRef.current).toBeDefined();
      expect(typeof gridRef.current.freeze).toBe('function');
      expect(typeof gridRef.current.unfreeze).toBe('function');
      expect(typeof gridRef.current.layout).toBe('function');
      expect(typeof gridRef.current.updateLayout).toBe('function');
    });

    it('can freeze and unfreeze layout', () => {
      const gridRef = React.createRef();
      
      render(
        <StackGrid ref={gridRef} columnWidth={100}>
          <div key="1" style={{ height: '200px' }}>Item 1</div>
          <div key="2" style={{ height: '200px' }}>Item 2</div>
        </StackGrid>,
      );

      // Flush RAF to ensure component is mounted
      act(() => {
        flushRAF();
        jest.runAllTimers();
      });

      // Test freeze
      act(() => {
        gridRef.current.freeze();
      });
      expect(gridRef.current.state.isFrozen).toBe(true);

      // Test that layout doesn't change when frozen
      const beforeRects = [...gridRef.current.state.rects];
      act(() => {
        gridRef.current.layout();
      });
      expect(gridRef.current.state.rects).toEqual(beforeRects);

      // Test unfreeze
      act(() => {
        gridRef.current.unfreeze();
      });
      expect(gridRef.current.state.isFrozen).toBe(false);
    });

    it('calls onLayout callback when layout updates', () => {
      const onLayout = jest.fn();
      
      render(
        <StackGrid columnWidth={100} onLayout={onLayout}>
          <div style={{ height: '200px' }}>Test Content</div>
        </StackGrid>,
      );

      // Flush RAF to trigger initial layout
      act(() => {
        flushRAF();
        jest.runAllTimers();
      });

      expect(onLayout).toHaveBeenCalled();
      expect(onLayout).toHaveBeenCalledWith(expect.objectContaining({
        height: expect.any(Number),
      }));
    });
  });

  describe('Frozen Layout Behavior', () => {
    it('preserves layout when frozen and new items are added', () => {
      const gridRef = React.createRef();
      const { rerender } = render(
        <StackGrid ref={gridRef} columnWidth={100}>
          <div key="1" style={{ height: '200px' }}>Item 1</div>
          <div key="2" style={{ height: '200px' }}>Item 2</div>
        </StackGrid>,
      );

      // Flush RAF to ensure component is mounted
      act(() => {
        flushRAF();
        jest.runAllTimers();
      });

      // Freeze the layout
      act(() => {
        gridRef.current.freeze();
      });

      // Store the current layout
      const frozenRects = [...gridRef.current.state.rects];

      // Add new items
      rerender(
        <StackGrid ref={gridRef} columnWidth={100}>
          <div key="1" style={{ height: '200px' }}>Item 1</div>
          <div key="2" style={{ height: '200px' }}>Item 2</div>
          <div key="3" style={{ height: '200px' }}>Item 3</div>
          <div key="4" style={{ height: '200px' }}>Item 4</div>
        </StackGrid>,
      );

      // Flush RAF to process new items
      act(() => {
        flushRAF();
        jest.runAllTimers();
      });

      // Original items should maintain their positions
      const newRects = gridRef.current.state.rects;
      expect(newRects[0]).toEqual(frozenRects[0]);
      expect(newRects[1]).toEqual(frozenRects[1]);
      
      // New items should be added at the bottom
      expect(newRects.length).toBe(4);
    });
  });

  describe('Virtualization', () => {
    it('renders all items when virtualization is disabled', () => {
      const { container } = render(
        <StackGrid columnWidth={100} virtualized={false}>
          <div key="1">Item 1</div>
          <div key="2">Item 2</div>
          <div key="3">Item 3</div>
        </StackGrid>,
      );

      act(() => {
        flushRAF();
        jest.runAllTimers();
      });

      const gridItems = container.querySelectorAll('.grid-item');
      expect(gridItems.length).toBe(3);
    });

    it('renders items when virtualization is enabled', () => {
      const { container } = render(
        <StackGrid columnWidth={100} virtualized={true}>
          <div key="1">Item 1</div>
          <div key="2">Item 2</div>
          <div key="3">Item 3</div>
        </StackGrid>,
      );

      act(() => {
        flushRAF();
        jest.runAllTimers();
      });

      // Should render at least some items (viewport + buffer)
      const gridItems = container.querySelectorAll('.grid-item');
      expect(gridItems.length).toBeGreaterThan(0);
    });
  });
});
