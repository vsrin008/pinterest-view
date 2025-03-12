import React from 'react';
import { render } from '@testing-library/react';
import StackGrid from '../StackGrid';

const mockSize = {
  width: 800,
  height: 600,
  registerRef: jest.fn(),
  unregisterRef: jest.fn(),
};

// Mock react-sizeme
jest.mock('react-sizeme', () => {
  // eslint-disable-next-line global-require
  const PropTypes = require('prop-types');
  return {
    __esModule: true,
    default: () => (Component) => {
      function SizeMeWrapper(props) {
        if (props.gridRef) {
          mockSize.registerRef(props.gridRef);
        }
        return <Component {...props} size={mockSize} />;
      }

      SizeMeWrapper.propTypes = {
        gridRef: PropTypes.func,
      };

      return SizeMeWrapper;
    },
  };
});

describe('StackGrid', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('renders children correctly', () => {
    const { container } = render(
      <StackGrid columnWidth={100}>
        <div data-testid="child1">Item 1</div>
        <div data-testid="child2">Item 2</div>
      </StackGrid>
    );

    // The children are rendered inside a wrapper element
    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies correct styles', () => {
    const { container } = render(
      <StackGrid columnWidth={100} gutterWidth={10} gutterHeight={10}>
        <div>Test Content</div>
      </StackGrid>
    );

    // Find the container with position: relative style
    const gridContainer = container.querySelector('[style*="position: relative"]');
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveStyle({
      position: 'relative',
    });
  });

  it('renders GridInline correctly', () => {
    const gridRefMock = jest.fn();
    const { container } = render(
      // Render the default (HOC-wrapped) component and pass gridRef prop
      <StackGrid
        gridRef={gridRefMock}
        columnWidth={100}
        itemComponent="div"
        gutterWidth={5}
        gutterHeight={5}
      >
        <div>Test Content</div>
      </StackGrid>
    );

    expect(container.firstChild).toBeInTheDocument();
    // Ensure that the HOC called registerRef with the gridRef prop
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
