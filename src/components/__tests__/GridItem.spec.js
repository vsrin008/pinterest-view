import React from 'react';
import { render, screen } from '@testing-library/react';
import GridItem from '../GridItem';

const mockRect = {
  top: 0,
  left: 0,
  width: 100,
  height: 100,
};

const mockContainerSize = {
  width: 300,
  height: 300,
};

const mockTransitionFunctions = {
  appear: () => ({ opacity: 0, transform: 'scale(0)' }),
  appeared: () => ({ opacity: 1, transform: 'scale(1)' }),
  enter: () => ({ opacity: 0, transform: 'scale(0)' }),
  entered: () => ({ opacity: 1, transform: 'scale(1)' }),
  leaved: () => ({ opacity: 0, transform: 'scale(0)' }),
};

const mockCallbacks = {
  onMounted: () => {},
  onUnmount: () => {},
};

describe('GridItem', () => {
  it('renders children correctly', () => {
    render(
      <GridItem
        rect={mockRect}
        component="div"
        style={{}}
        {...mockTransitionFunctions}
        {...mockCallbacks}
      >
        <div data-testid="child">Test Content</div>
      </GridItem>
    );
    const child = screen.getByTestId('child');
    expect(child).toBeInTheDocument();
    expect(child).toHaveTextContent('Test Content');
  });

  it('applies correct styles', () => {
    const { container } = render(
      <GridItem
        rect={mockRect}
        component="div"
        style={{ backgroundColor: 'red' }}
        {...mockTransitionFunctions}
        {...mockCallbacks}
      >
        <div>Test Content</div>
      </GridItem>
    );
    const gridItem = container.firstChild;
    expect(gridItem).toHaveStyle({
      backgroundColor: 'red',
      position: 'absolute',
      top: '0px',
      left: '0px',
      width: '100px',
      height: '100px',
    });
  });

  it('applies RTL styles', () => {
    const { container } = render(
      <GridItem
        rect={mockRect}
        component="div"
        rtl
        style={{}}
        {...mockTransitionFunctions}
        {...mockCallbacks}
      >
        <div>Test Content</div>
      </GridItem>
    );
    const gridItem = container.firstChild;
    expect(gridItem).toHaveStyle({
      position: 'absolute',
      top: '0px',
      right: '0px',
      width: '100px',
      height: '100px',
    });
  });

  it('applies transition styles', () => {
    const { container } = render(
      <GridItem
        rect={mockRect}
        containerSize={mockContainerSize}
        transition="all"
        easing="ease-out"
        duration={300}
        component="div"
        {...mockTransitionFunctions}
        {...mockCallbacks}
      >
        <div>Test Content</div>
      </GridItem>
    );
    const gridItem = container.firstChild;
    expect(gridItem).toHaveStyle({
      transition: 'all 300ms ease-out',
    });
  });

  it('returns null if rect is not provided', () => {
    const { container } = render(
      <GridItem
        rect={null}
        component="div"
      >
        <div>Test Content</div>
      </GridItem>
    );
    expect(container.firstChild).toBeNull();
  });
});
