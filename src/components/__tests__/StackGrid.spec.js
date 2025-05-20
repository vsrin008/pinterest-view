import React from 'react';
import { render, act } from '@testing-library/react';
import StackGrid, { GridInline } from '../StackGrid';

const mockRect = {
  top: 0,
  left: 0,
  width: 100,
  height: 100,
};

const mockSize = {
  width: 800,
  height: 600,
  registerRef: jest.fn(),
  unregisterRef: jest.fn(),
};

// Mock react-sizeme
jest.mock('react-sizeme', () => ({
  __esModule: true,
  default: () => (Component) => function SizeMeWrapper({ gridRef, ...rest }) {
    if (gridRef) {
      mockSize.registerRef(gridRef);
    }
    return <Component {...rest} size={mockSize} />;
  },
}));

// Mock requestAnimationFrame
const mockRAF = (callback) => setTimeout(callback, 0);
const mockCAF = (id) => clearTimeout(id);

describe('StackGrid', () => {
  beforeEach(() => {
    mockSize.registerRef.mockClear();
    mockSize.unregisterRef.mockClear();
    jest.useFakeTimers();
    global.requestAnimationFrame = mockRAF;
    global.cancelAnimationFrame = mockCAF;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders children correctly', () => {
    const { container } = render(
      <StackGrid columnWidth={100}>
        <div data-testid="child1">Item 1</div>
        <div data-testid="child2">Item 2</div>
      </StackGrid>,
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies correct styles to container', () => {
    const { container } = render(
      <StackGrid columnWidth={100} gutterWidth={10} gutterHeight={10}>
        <div>Test Content</div>
      </StackGrid>,
    );
    const gridContainer = container.querySelector('[style*="position: relative"]');
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveStyle({ position: 'relative' });
  });

  it('renders GridInline correctly', () => {
    const { container } = render(
      <GridInline
        rect={mockRect}
        size={mockSize}
        width={100}
        height={100}
        top={0}
        left={0}
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

  it('renders with size props', () => {
    const { container } = render(
      <StackGrid
        columnWidth={100}
        gutterWidth={10}
        gutterHeight={10}
        monitorImagesLoaded={false}
      >
        <div>Test Content</div>
      </StackGrid>,
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('calls onLayout callback when layout updates', async () => {
    const onLayout = jest.fn();
    function TestComponent() {
      return (
        <div style={{ height: '200px', width: '100%', background: 'red' }}>Test</div>
      );
    }

    await act(async () => {
      render(
        <StackGrid
          columnWidth={100}
          onLayout={onLayout}
          enableDebugLogs
        >
          <TestComponent />
        </StackGrid>,
      );
    });

    // Wait for initial layout to complete
    await act(async () => {
      // Flush requestAnimationFrame
      jest.runAllTimers();
      // Allow any microtasks to run
      await Promise.resolve();
    });

    expect(onLayout).toHaveBeenCalled();
    expect(onLayout).toHaveBeenCalledWith(expect.objectContaining({
      height: expect.any(Number),
    }));
  });
});
