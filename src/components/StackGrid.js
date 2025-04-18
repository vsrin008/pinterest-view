/* eslint-disable max-classes-per-file */
/* eslint-disable react/default-props-match-prop-types */
/* eslint-disable react/no-unused-prop-types */
/* eslint-disable react/destructuring-assignment */
// Note: This file has been converted to plain JavaScript by removing Flow/TypeScript annotations.

import React, { Component, isValidElement } from 'react';
import PropTypes from 'prop-types';
import sizeMe from 'react-sizeme';
import shallowequal from 'shallowequal';
import ExecutionEnvironment from 'exenv';
import invariant from 'invariant';

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const isPercentageNumber = (v) =>
  typeof v === 'string' && /^\d+(\.\d+)?%$/.test(v);

// Helper to create arrays of a specific length with the same value
const createArray = (v, l) => {
  const array = [];
  for (let i = 0; i < l; i += 1) {
    array.push(v);
  }
  return array;
};

/* eslint-disable consistent-return */
const getColumnLengthAndWidth = (width, value, gutter) => {
  if (isNumber(value)) {
    const columnWidth = parseFloat(value);
    return [
      Math.floor((width - (width / columnWidth - 1) * gutter) / columnWidth),
      columnWidth,
    ];
  }
  if (isPercentageNumber(value)) {
    const columnPercentage = parseFloat(value) / 100;
    const maxColumn = Math.floor(1 / columnPercentage);
    const columnWidth = (width - gutter * (maxColumn - 1)) / maxColumn;
    return [maxColumn, columnWidth];
  }
  invariant(false, 'Should be columnWidth is a number or percentage string.');
};
/* eslint-enable consistent-return */

// Simplified GridItem component without transitions
const GridItem = React.forwardRef(
  (
    {
      itemKey,
      index,
      component: Element,
      rect = { top: 0, left: 0, width: 0, height: 0 },
      style,
      rtl,
      children,
      ...rest
    },
    ref
  ) => {
    if (!rect) {
      return null;
    }
    const itemStyle = {
      ...style,
      display: 'block',
      position: 'absolute',
      top: 0,
      ...(rtl ? { right: 0 } : { left: 0 }),
      width: rect.width || 0,
      transform: `translateX(${rtl ? -(rect.left || 0) : rect.left || 0}px) translateY(${rect.top || 0}px)`,
      zIndex: 1,
    };

    return <Element {...rest} ref={ref} className="grid-item" style={itemStyle}>{children}</Element>;
  }
);

GridItem.displayName = 'GridItem';

GridItem.propTypes = {
  itemKey: PropTypes.string,
  index: PropTypes.number,
  component: PropTypes.string,
  rect: PropTypes.shape({
    top: PropTypes.number,
    left: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number,
  }),
  style: PropTypes.shape({}),
  rtl: PropTypes.bool,
  children: PropTypes.node,
};

class GridInline extends Component {
  static propTypes = {
    className: PropTypes.string,
    style: PropTypes.shape({}),
    component: PropTypes.string,
    itemComponent: PropTypes.string,
    children: PropTypes.node,
    rtl: PropTypes.bool,
    refCallback: PropTypes.func,
    onLayout: PropTypes.func,
    gridRef: PropTypes.func,
    size: PropTypes.shape({
      width: PropTypes.number,
      height: PropTypes.number,
      registerRef: PropTypes.func,
      unregisterRef: PropTypes.func,
    }),
    columnWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    gutterWidth: PropTypes.number,
    gutterHeight: PropTypes.number,
    horizontal: PropTypes.bool,
    // New prop to enable virtualization
    virtualized: PropTypes.bool,
  };

  static defaultProps = {
    className: '',
    style: {},
    component: 'div',
    itemComponent: 'span',
    children: null,
    rtl: false,
    refCallback: () => {},
    onLayout: () => {},
    gridRef: null,
    size: null,
    columnWidth: 150,
    gutterWidth: 5,
    gutterHeight: 5,
    horizontal: false,
    virtualized: false, // disabled by default
  };

  constructor(props) {
    super(props);
    this.containerRef = React.createRef();
    this.itemRefs = {};
    this.imgLoad = {};
    this.mounted = false;
    this.state = {
      ...this.doLayout(props),
      // Initialize containerRect; if window.innerHeight is available, use it as a default bottom
      containerRect: { top: 0, bottom: typeof window !== 'undefined' ? window.innerHeight : 800 },
    };
  }

  componentDidMount() {
    this.mounted = true;
    if (this.props.size && this.props.size.registerRef) {
      this.props.size.registerRef(this);
    }
    this.updateLayout(this.props);
    // Listen to window scroll and resize to update container bounds for virtualization
    window.addEventListener('scroll', this.handleScroll);
    window.addEventListener('resize', this.handleScroll);
    // Update containerRect immediately
    if (this.containerRef.current) {
      this.handleScroll();
    }
  }

  componentDidUpdate(prevProps) {
    if (!shallowequal(prevProps, this.props)) {
      this.updateLayout(this.props);
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    if (this.props.size && this.props.size.unregisterRef) {
      this.props.size.unregisterRef(this);
    }
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleScroll);
    // Clean up any image loading listeners
    Object.keys(this.imgLoad).forEach((key) => {
      if (this.imgLoad[key]) {
        this.imgLoad[key].off('always');
      }
    });
  }

  handleScroll = () => {
    if (this.containerRef.current) {
      // Get the container's bounding rect relative to the viewport.
      const rect = this.containerRef.current.getBoundingClientRect();
      this.setState({ containerRect: rect });
    }
  };

  setStateIfNeeded(state, callback) {
    if (this.mounted) {
      this.setState(state, callback);
    }
  }

  getItemHeight(key) {
    if (!key || !this.itemRefs[key]) {
      return 100; // Default height if no ref
    }
    const element = this.itemRefs[key];
    if (!element) return 100;
    const candidate = [
      element.offsetHeight,
      element.scrollHeight,
      element.clientHeight,
      100, // fallback default
    ].filter(isNumber);
    return Math.max(...candidate);
  }

  doLayout(props) {
    if (!ExecutionEnvironment.canUseDOM) {
      return this.doLayoutForSSR(props);
    }
    const results = this.doLayoutForClient(props);
    if (this.mounted && typeof this.props.onLayout === 'function') {
      this.props.onLayout();
    }
    return results;
  }

  doLayoutForClient(props) {
    const { size, children, columnWidth, gutterWidth, gutterHeight, horizontal } = props;
    const containerWidth = (size && size.width != null) ? size.width : 800;
    const childArray = React.Children.toArray(children).filter(isValidElement);
    const [maxColumn, colWidth] = getColumnLengthAndWidth(containerWidth, columnWidth, gutterWidth);
    const columnHeights = createArray(0, maxColumn);
    const columnItems = Array.from({ length: maxColumn }, () => []);
    let rects;

    if (!horizontal) {
      // First pass: Assign items to columns in order
      childArray.forEach((child, index) => {
        const column = Math.floor(index % maxColumn);
        columnItems[column].push(child);
      });

      // Second pass: Calculate positions while maintaining column assignments
      rects = childArray.map((child, index) => {
        const column = Math.floor(index % maxColumn);
        const height = this.getItemHeight(child.key) || 0;
        const left = Math.round(column * (colWidth + gutterWidth));
        const top = Math.round(columnHeights[column]);
        columnHeights[column] = top + Math.round(height) + gutterHeight;
        return { top, left, width: colWidth, height };
      });
    } else {
      const sumHeights = childArray.reduce(
        (sum, child) =>
          sum + Math.round(this.getItemHeight(child.key) || 0) + gutterHeight,
        0
      );
      const maxHeight = sumHeights / maxColumn;
      let currentColumn = 0;
      rects = childArray.map((child) => {
        const column = currentColumn >= maxColumn - 1 ? maxColumn - 1 : currentColumn;
        const height = this.getItemHeight(child.key) || 0;
        const left = Math.round(column * (colWidth + gutterWidth));
        const top = Math.round(columnHeights[column]);
        columnHeights[column] += Math.round(height) + gutterHeight;
        if (columnHeights[column] >= maxHeight) {
          currentColumn = Math.min(currentColumn + 1, maxColumn - 1);
        }
        return { top, left, width: colWidth, height };
      });
    }
    const width = maxColumn * colWidth + (maxColumn - 1) * gutterWidth;
    const height = Math.max(...columnHeights) - gutterHeight;
    const offset = Math.max(0, (containerWidth - width) / 2);
    const finalRects = rects.map((o) => ({
      ...o,
      left: Math.round(o.left + offset),
      top: Math.round(o.top),
    }));
    return { rects: finalRects, actualWidth: width, height, columnWidth: colWidth };
  }

  /* eslint-disable class-methods-use-this */
  doLayoutForSSR = (props) => {
    const { children } = props;
    return {
      rects: React.Children.toArray(children).map(() => ({
        top: 0,
        left: 0,
        width: 0,
        height: 0,
      })),
      actualWidth: 0,
      height: 0,
      columnWidth: 0,
    };
  };
  /* eslint-enable class-methods-use-this */

  updateLayout(props) {
    if (!this.mounted) return;
    const nextProps = props || this.props;
    const newLayout = this.doLayout(nextProps);
    this.setStateIfNeeded(newLayout, () => {
      // Optionally, validate layout here using requestAnimationFrame
    });
  }

  handleItemRef = (key, node) => {
    if (node) {
      if (this.itemRefs[key] && this.itemRefs[key] !== node) {
        return;
      }
      this.itemRefs[key] = node;
      requestAnimationFrame(() => {
        if (this.mounted) {
          this.updateLayout();
        }
      });
    } else {
      delete this.itemRefs[key];
      if (this.imgLoad[key]) {
        this.imgLoad[key].off('always');
        delete this.imgLoad[key];
      }
    }
  };

  /* eslint-disable react/no-unused-class-component-methods */
  handleRef = () => {
    const { refCallback } = this.props;
    refCallback(this);
  };
  /* eslint-enable react/no-unused-class-component-methods */

  render() {
    const {
      className,
      style,
      component: ElementType,
      itemComponent,
      children,
      rtl,
      virtualized,
    } = this.props;
    const { rects, height, containerRect } = this.state;
    const containerStyle = { position: 'relative', height, ...style };
    const validChildren = React.Children.toArray(children).filter(isValidElement);
    const buffer = 100; // buffer in pixels to render items just offscreen
    const gridItems = validChildren.map((child, i) => {
      const rect = rects[i];
      if (!rect) return null;
      // Skip rendering items that are far from the viewport when virtualization is enabled
      if (virtualized && containerRect) {
        // Items' absolute positions are relative to the grid container.
        // The grid container's top relative to the viewport is containerRect.top.
        const itemTopInViewport = containerRect.top + rect.top;
        const itemBottomInViewport = itemTopInViewport + rect.height;
        if (itemBottomInViewport < -buffer || itemTopInViewport > window.innerHeight + buffer) {
          return null;
        }
      }
      return (
        <GridItem
          key={child.key}
          itemKey={child.key}
          index={i}
          component={itemComponent}
          rect={rect}
          rtl={rtl}
          ref={(node) => this.handleItemRef(child.key, node)}
        >
          {child}
        </GridItem>
      );
    });
    return (
      <ElementType
        data-testid="stack-grid-container"
        className={className}
        style={containerStyle}
        ref={this.containerRef}
      >
        {gridItems}
      </ElementType>
    );
  }
}

class StackGrid extends Component {
  /* eslint-disable react/no-unused-class-component-methods */
  updateLayout() {
    if (this.grid) {
      this.grid.updateLayout();
    }
  }
  /* eslint-enable react/no-unused-class-component-methods */

  handleRef = (grid) => {
    this.grid = grid;
    if (typeof this.props.gridRef === 'function') {
      this.props.gridRef(this);
    }
  };

  render() {
    const { children, ...rest } = this.props;
    return (
      <GridInline {...rest} gridRef={this.handleRef}>
        {children}
      </GridInline>
    );
  }
}

StackGrid.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  style: PropTypes.shape({}),
  gridRef: PropTypes.func,
  component: PropTypes.string,
  itemComponent: PropTypes.string,
  columnWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  gutterWidth: PropTypes.number,
  gutterHeight: PropTypes.number,
  monitorImagesLoaded: PropTypes.bool,
  vendorPrefix: PropTypes.bool,
  userAgent: PropTypes.string,
  enableSSR: PropTypes.bool,
  onLayout: PropTypes.func,
  horizontal: PropTypes.bool,
  rtl: PropTypes.bool,
  // Pass through virtualization flag
  virtualized: PropTypes.bool,
};

StackGrid.defaultProps = {
  style: {},
  gridRef: null,
  component: 'div',
  itemComponent: 'span',
  columnWidth: 150,
  gutterWidth: 5,
  gutterHeight: 5,
  monitorImagesLoaded: false,
  vendorPrefix: true,
  userAgent: null,
  enableSSR: false,
  onLayout: null,
  horizontal: false,
  rtl: false,
  virtualized: false,
};

export { GridInline };
export default sizeMe({ monitorHeight: true })(StackGrid);
