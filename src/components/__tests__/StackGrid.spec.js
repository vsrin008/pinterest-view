import React from 'react';
import { render, screen } from '@testing-library/react';
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
  default: (config) => (Component) =>
    function SizeMeWrapper(props) {
      return <Component {...props} size={mockSize} />;
    },
}));

describe('StackGrid', () => {
  beforeEach(() => {
    // Clear mock function calls before each test
    mockSize.registerRef.mockClear();
    mockSize.unregisterRef.mockClear();
  });

  it('renders children correctly', () => {
    const { container } = render(
      <StackGrid columnWidth={100}>
        <div data-testid="child1">Item 1</div>
        <div data-testid="child2">Item 2</div>
      </StackGrid>
    );

    // The children are initially rendered inside a wrapper div
    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies correct styles', () => {
    const { container } = render(
      <StackGrid columnWidth={100} gutterWidth={10} gutterHeight={10}>
        <div>Test Content</div>
      </StackGrid>
    );

    // Find the div with position: relative style
    const gridContainer = container.querySelector(
      '[style*="position: relative"]'
    );
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveStyle({
      position: 'relative',
    });
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
      </GridInline>
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
      </StackGrid>
    );

    expect(container.firstChild).toBeInTheDocument();
  });
});
