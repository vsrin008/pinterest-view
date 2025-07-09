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
    // eslint-disable-next-line react/jsx-props-no-spreading
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
  rafCallbacks = rafCallbacks.filter((cb) => cb.id !== id);
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
    it('exposes layout and updateLayout methods', () => {
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
      expect(typeof gridRef.current.layout).toBe('function');
      expect(typeof gridRef.current.updateLayout).toBe('function');
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

  describe('Measurement Phase Behavior', () => {
    it('transitions from measurement to virtualized phase', () => {
      const gridRef = React.createRef();
      
      render(
        <StackGrid ref={gridRef} columnWidth={100} virtualized>
          <div key="1" style={{ height: '200px' }}>Item 1</div>
          <div key="2" style={{ height: '200px' }}>Item 2</div>
        </StackGrid>,
      );

      // Flush RAF and timers to complete measurement
      act(() => {
        flushRAF();
        jest.runAllTimers();
      });

      // Simulate measurement completion by calling the method directly
      act(() => {
        if (gridRef.current.finalizeMeasurementPhase) {
          gridRef.current.finalizeMeasurementPhase();
        }
      });

      expect(gridRef.current.state.measurementPhase).toBe(false);
      expect(gridRef.current.state.allItemsMeasured).toBe(true);
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

      // When virtualization is disabled, should render all items
      // Note: The grid renders both measurement and virtualized items during measurement phase
      const gridItems = container.querySelectorAll('.grid-item');
      expect(gridItems.length).toBeGreaterThanOrEqual(3);
    });

    it('renders items when virtualization is enabled', () => {
      const { container } = render(
        <StackGrid columnWidth={100} virtualized>
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

  describe('Scroll Container Management', () => {
    it('properly handles scroll container changes', () => {
      const mockScrollContainer = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        scrollTop: 0,
      };

      const { rerender } = render(
        <GridInline
          size={{ width: 800, height: 600, registerRef: jest.fn(), unregisterRef: jest.fn() }}
          columnWidth={100}
          virtualized
          scrollContainer={mockScrollContainer}
        >
          <div key="1" style={{ height: '200px' }}>Item 1</div>
          <div key="2" style={{ height: '200px' }}>Item 2</div>
        </GridInline>,
      );

      act(() => {
        flushRAF();
        jest.runAllTimers();
      });

      // Should add scroll listener to the custom container
      expect(mockScrollContainer.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), {
        passive: true,
      });

      // Create a new scroll container
      const newMockScrollContainer = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        scrollTop: 0,
      };

      // Rerender with new scroll container
      rerender(
        <GridInline
          size={{ width: 800, height: 600, registerRef: jest.fn(), unregisterRef: jest.fn() }}
          columnWidth={100}
          virtualized
          scrollContainer={newMockScrollContainer}
        >
          <div key="1" style={{ height: '200px' }}>Item 1</div>
          <div key="2" style={{ height: '200px' }}>Item 2</div>
        </GridInline>,
      );

      act(() => {
        flushRAF();
        jest.runAllTimers();
      });

      // Should remove listener from old container
      expect(mockScrollContainer.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
      
      // Should add listener to new container
      expect(newMockScrollContainer.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), {
        passive: true,
      });
    });

    it('handles virtualization state changes correctly', () => {
      const mockScrollContainer = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        scrollTop: 0,
      };

      const { rerender } = render(
        <GridInline
          size={{ width: 800, height: 600, registerRef: jest.fn(), unregisterRef: jest.fn() }}
          columnWidth={100}
          virtualized={false}
          scrollContainer={mockScrollContainer}
        >
          <div key="1" style={{ height: '200px' }}>Item 1</div>
          <div key="2" style={{ height: '200px' }}>Item 2</div>
        </GridInline>,
      );

      act(() => {
        flushRAF();
        jest.runAllTimers();
      });

      // Should not add scroll listener when virtualization is disabled
      expect(mockScrollContainer.addEventListener).not.toHaveBeenCalled();

      // Enable virtualization
      rerender(
        <GridInline
          size={{ width: 800, height: 600, registerRef: jest.fn(), unregisterRef: jest.fn() }}
          columnWidth={100}
          virtualized
          scrollContainer={mockScrollContainer}
        >
          <div key="1" style={{ height: '200px' }}>Item 1</div>
          <div key="2" style={{ height: '200px' }}>Item 2</div>
        </GridInline>,
      );

      act(() => {
        flushRAF();
        jest.runAllTimers();
      });

      // Should add scroll listener when virtualization is enabled
      expect(mockScrollContainer.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), {
        passive: true,
      });
    });
  });
});
