// src/components/StackGrid.js

/* eslint-disable max-classes-per-file */
/* eslint-disable react/default-props-match-prop-types */
/* eslint-disable react/no-unused-prop-types */
/* eslint-disable react/jsx-filename-extension */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable no-param-reassign */

import React, { Component, isValidElement } from 'react';
import PropTypes from 'prop-types';
import sizeMe from 'react-sizeme';

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const isPercentageNumber = (v) => typeof v === 'string' && /^\d+(\.\d+)?%$/.test(v);

const getColumnConfig = (containerWidth, columnWidth, gutterWidth) => {
  if (isNumber(columnWidth)) {
    // Keep the column width fixed, only calculate number of columns
    const columnCount = Math.floor((containerWidth + gutterWidth) / (columnWidth + gutterWidth));
    return { columnCount: Math.max(1, columnCount), columnWidth };
  }
  if (isPercentageNumber(columnWidth)) {
    const percentage = parseFloat(columnWidth) / 100;
    const columnCount = Math.floor(1 / percentage);
    const actualColumnWidth = (containerWidth - (columnCount - 1) * gutterWidth) / columnCount;
    return { columnCount, columnWidth: actualColumnWidth };
  }
  throw new Error('columnWidth must be a number or percentage string');
};

// Optimized column finding - O(n) instead of O(n*m)
const getShortestColumn = (heights) => {
  let minIndex = 0;
  let minHeight = heights[0];
  for (let i = 1; i < heights.length; i += 1) {
    if (heights[i] < minHeight) {
      minHeight = heights[i];
      minIndex = i;
    }
  }
  return minIndex;
};

const GridItem = React.memo(React.forwardRef((
  {
    itemKey,
    component: Element,
    rect = {
      top: 0,
      left: 0,
      width: 0,
      height: 0,
    },
    style,
    rtl,
    children,
    onHeightChange,
    ...rest
  },
  ref,
) => {
  const itemRef = React.useRef(null);
  const [isInitialRender, setIsInitialRender] = React.useState(true);

  React.useEffect(() => {
    setIsInitialRender(false);
  }, []);

  React.useEffect(() => {
    if (!itemRef.current || typeof onHeightChange !== 'function') return;

    // Debounced height update to prevent cascade of updates
    let timeoutId;
    const updateHeight = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!itemRef.current) return;
        const { height } = itemRef.current.getBoundingClientRect();
        onHeightChange(height);
      }, 100); // Debounce by 100ms
    };

    // Initial height
    updateHeight();

    // ResizeObserver for height changes - use contentRect to avoid reflow
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { height } = entry.contentRect;
        onHeightChange(height);
      }
    });
    ro.observe(itemRef.current);

    return () => {
      clearTimeout(timeoutId);
      ro.disconnect();
    };
  }, [onHeightChange, itemKey]);

  const itemStyle = {
    ...style,
    position: 'absolute',
    top: rect.top,
    left: rtl ? 'auto' : rect.left,
    right: rtl ? rect.left : 'auto',
    width: rect.width,
    zIndex: 1,
    // Only apply transitions after initial render to prevent performance issues
    transition: isInitialRender ? 'none' : 'top 0.3s ease-out, left 0.3s ease-out, right 0.3s ease-out, width 0.3s ease-out',
    // CSS containment for better reflow isolation
    contain: 'layout style',
    willChange: isInitialRender ? 'auto' : 'transform',
  };

  return (
    <Element
      {...rest}
      ref={(node) => {
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
        itemRef.current = node;
      }}
      className="grid-item"
      style={itemStyle}
    >
      {children}
    </Element>
  );
}), (prevProps, nextProps) => prevProps.itemKey === nextProps.itemKey
    && prevProps.rect.top === nextProps.rect.top
    && prevProps.rect.left === nextProps.rect.left
    && prevProps.rect.width === nextProps.rect.width
    && prevProps.rect.height === nextProps.rect.height
    && prevProps.rtl === nextProps.rtl
    && prevProps.children === nextProps.children);

GridItem.displayName = 'GridItem';
GridItem.propTypes = {
  itemKey: PropTypes.string,
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
  onHeightChange: PropTypes.func,
};

GridItem.defaultProps = {
  itemKey: '',
  component: 'div',
  rect: {
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  },
  style: {},
  rtl: false,
  children: null,
  onHeightChange: null,
};

const GridInlinePropTypes = {
  className: PropTypes.string,
  style: PropTypes.shape({}),
  component: PropTypes.string,
  itemComponent: PropTypes.string,
  children: PropTypes.node,
  rtl: PropTypes.bool,
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
  virtualized: PropTypes.bool,
  debug: PropTypes.bool,
  virtualizationBuffer: PropTypes.number,
  scrollContainer: PropTypes.instanceOf(HTMLElement),
};

const GridInlineDefaultProps = {
  className: '',
  style: {},
  component: 'div',
  itemComponent: 'div',
  children: null,
  rtl: false,
  onLayout: () => {},
  gridRef: null,
  size: null,
  columnWidth: 150,
  gutterWidth: 5,
  gutterHeight: 5,
  virtualized: false,
  debug: true,
  virtualizationBuffer: 800,
  scrollContainer: null,
};

class GridInline extends Component {
  constructor(props) {
    super(props);
    this.containerRef = React.createRef();
    this.heightCache = new Map(); // Using Map for better performance
    this.columnAssignments = new Map(); // Track which column each item belongs to
    this.mounted = false;
    this.layoutRequestId = null; // For debounced layout updates
    this.scrollRAF = null; // For optimized scroll handling
    this.lastLogTime = 0; // For throttling debug logs
    // Initialize scroller in constructor to prevent null access in render
    this.scroller = props.scrollContainer || window;
    this.state = {
      rects: [],
      height: 0,
      scrollTop: 0,
    };
  }

  componentDidMount() {
    this.mounted = true;
    const {
      size,
      gridRef,
      virtualized,
      columnWidth,
      children,
      scrollContainer,
    } = this.props;
    size?.registerRef?.(this);
    gridRef?.(this);

    // Update scroller if it changed
    this.scroller = scrollContainer || window;

    this.debugLog('Component mounted', {
      virtualized,
      columnWidth,
      childrenCount: React.Children.count(children),
      scrollContainer: scrollContainer ? 'custom' : 'window',
    }, true);

    // Listen to scroll events only if virtualized
    if (virtualized) {
      this.scroller.addEventListener('scroll', this.handleScroll, { passive: true });
      this.debugLog('Scroll listener attached (virtualized mode)', {
        scroller: this.scroller === window ? 'window' : 'custom container',
      });
    }
    window.addEventListener('resize', this.handleResize, { passive: true });

    // Initial layout
    this.scheduleLayout();
  }

  componentDidUpdate(prevProps) {
    const {
      children,
      size,
      columnWidth,
      gutterWidth,
      gutterHeight,
      scrollContainer,
      virtualized,
    } = this.props;
    const childrenChanged = prevProps.children !== children;
    const sizeChanged = prevProps.size?.width !== size?.width;
    const layoutPropsChanged = prevProps.columnWidth !== columnWidth
      || prevProps.gutterWidth !== gutterWidth
      || prevProps.gutterHeight !== gutterHeight;
    const scrollContainerChanged = prevProps.scrollContainer !== scrollContainer;

    // Handle scroll container changes
    if (scrollContainerChanged && this.mounted) {
      // Remove old scroll listener
      if (prevProps.virtualized) {
        const oldScroller = prevProps.scrollContainer || window;
        oldScroller.removeEventListener('scroll', this.handleScroll);
      }

      // Set up new scroll container
      this.scroller = scrollContainer || window;

      // Add new scroll listener
      if (virtualized) {
        this.scroller.addEventListener('scroll', this.handleScroll, { passive: true });
        this.debugLog('Scroll container changed', {
          from: prevProps.scrollContainer ? 'custom' : 'window',
          to: scrollContainer ? 'custom' : 'window',
        });
      }
    }

    // Clean up height cache for removed children
    if (childrenChanged) {
      const currentKeys = new Set(
        React.Children.toArray(children)
          .filter(isValidElement)
          .map((child) => child.key),
      );

      this.heightCache.forEach((value, key) => {
        if (!currentKeys.has(key)) {
          this.heightCache.delete(key);
          this.columnAssignments.delete(key);
        }
      });
    }

    if (childrenChanged || sizeChanged || layoutPropsChanged) {
      this.debugLog('Layout update triggered', {
        childrenChanged,
        sizeChanged: sizeChanged ? `${prevProps.size?.width} → ${size?.width}` : false,
        layoutPropsChanged,
        newChildrenCount: React.Children.count(children),
      });
      this.scheduleLayout();
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    const { size, virtualized } = this.props;
    size?.unregisterRef?.(this);

    this.debugLog('Component unmounting', null, true);

    if (virtualized && this.scroller) {
      this.scroller.removeEventListener('scroll', this.handleScroll);
    }
    window.removeEventListener('resize', this.handleResize);

    if (this.layoutRequestId) {
      cancelAnimationFrame(this.layoutRequestId);
    }
    if (this.scrollRAF) {
      cancelAnimationFrame(this.scrollRAF);
    }
  }

  // Throttled debug logging
  debugLog = (message, data = null, force = false) => {
    const { debug } = this.props;
    if (!debug) return;

    const now = Date.now();
    const timeSinceLastLog = now - this.lastLogTime;

    // Throttle logs to prevent console spam, but allow forced logs
    if (!force && timeSinceLastLog < 1000) return;

    this.lastLogTime = now;

    if (data) {
      console.log(`[StackGrid] ${message}`, data);
    } else {
      console.log(`[StackGrid] ${message}`);
    }
  };

  handleScroll = () => {
    const { virtualized } = this.props;
    if (!this.mounted || !virtualized || !this.scroller) return;

    // Use requestAnimationFrame for better performance
    if (this.scrollRAF) return;

    this.scrollRAF = requestAnimationFrame(() => {
      // Get scroll position from the appropriate container
      const scrollTop = this.scroller === window
        ? (window.pageYOffset || document.documentElement.scrollTop)
        : this.scroller.scrollTop;

      const { scrollTop: currentScrollTop } = this.state;
      // Only update if scroll position changed significantly
      if (Math.abs(scrollTop - currentScrollTop) > 50) {
        this.debugLog('Scroll position changed', {
          from: currentScrollTop,
          to: scrollTop,
          delta: scrollTop - currentScrollTop,
          scroller: this.scroller === window ? 'window' : 'custom container',
        });
        this.setState({ scrollTop });
      }
      this.scrollRAF = null;
    });
  };

  handleResize = () => {
    if (!this.mounted) return;
    this.debugLog('Window resize detected');
    this.scheduleLayout();
  };

  scheduleLayout = () => {
    if (this.layoutRequestId) {
      cancelAnimationFrame(this.layoutRequestId);
    }

    this.layoutRequestId = requestAnimationFrame(() => {
      this.updateLayout();
      this.layoutRequestId = null;
    });
  };

  updateLayout = () => {
    if (!this.mounted) return;

    const {
      size,
      children,
      columnWidth,
      gutterWidth,
      gutterHeight,
    } = this.props;
    const containerWidth = size?.width;

    if (!containerWidth || containerWidth <= 0) return;

    const validChildren = React.Children.toArray(children).filter(isValidElement);
    if (validChildren.length === 0) {
      this.setState({ rects: [], height: 0 });
      return;
    }

    try {
      const { columnCount, columnWidth: actualColumnWidth } = getColumnConfig(
        containerWidth,
        columnWidth,
        gutterWidth,
      );

      const columnHeights = new Array(columnCount).fill(0);
      const rects = validChildren.map((child) => {
        // Find shortest column
        const shortestColumnIndex = getShortestColumn(columnHeights);

        // Get cached height or use default
        const itemHeight = this.heightCache.get(child.key) || 200;

        // Calculate position
        const left = shortestColumnIndex * (actualColumnWidth + gutterWidth);
        const top = columnHeights[shortestColumnIndex];

        // Update column height
        columnHeights[shortestColumnIndex] = top + itemHeight + gutterHeight;

        // Store column assignment for efficient updates
        this.columnAssignments.set(child.key, shortestColumnIndex);

        return {
          top,
          left,
          width: actualColumnWidth,
          height: itemHeight,
        };
      });

      const height = Math.max(...columnHeights) - gutterHeight;

      this.debugLog('Layout calculated', {
        columns: columnCount,
        items: validChildren.length,
        containerWidth,
        columnWidth: actualColumnWidth,
        totalHeight: height,
        heightCacheSize: this.heightCache.size,
      });

      this.setState({ rects, height }, () => {
        const { onLayout } = this.props;
        if (typeof onLayout === 'function') {
          onLayout({ height });
        }
      });
    } catch (error) {
      console.error('Layout calculation error:', error);
    }
  };

  handleHeightChange = (key, height) => {
    const oldHeight = this.heightCache.get(key);
    if (oldHeight !== height) {
      this.debugLog('Item height changed', {
        key,
        from: oldHeight,
        to: height,
        delta: height - (oldHeight || 0),
      });

      this.heightCache.set(key, height);

      // Update the layout to push other cards down
      this.updateLayoutForHeightChange(key, oldHeight, height);
    }
  };

  updateLayoutForHeightChange = (changedKey, oldHeight, newHeight) => {
    if (!this.mounted) return;

    const {
      children,
      columnWidth,
      gutterWidth,
      gutterHeight,
      size,
    } = this.props;
    const containerWidth = size?.width;

    if (!containerWidth || containerWidth <= 0) return;

    const validChildren = React.Children.toArray(children).filter(isValidElement);
    const changedIndex = validChildren.findIndex((child) => child.key === changedKey);

    if (changedIndex === -1) return;

    try {
      const { columnCount, columnWidth: actualColumnWidth } = getColumnConfig(
        containerWidth,
        columnWidth,
        gutterWidth,
      );

      // Recalculate layout from the changed item onwards
      const columnHeights = new Array(columnCount).fill(0);
      const rects = [];

      // First pass: calculate positions up to the changed item
      for (let i = 0; i < changedIndex; i += 1) {
        const child = validChildren[i];
        const itemHeight = this.heightCache.get(child.key) || 200;

        // Find shortest column
        const shortestColumnIndex = getShortestColumn(columnHeights);

        const left = shortestColumnIndex * (actualColumnWidth + gutterWidth);
        const top = columnHeights[shortestColumnIndex];

        columnHeights[shortestColumnIndex] = top + itemHeight + gutterHeight;

        rects.push({
          top,
          left,
          width: actualColumnWidth,
          height: itemHeight,
        });
      }

      // Second pass: recalculate from changed item onwards
      for (let i = changedIndex; i < validChildren.length; i += 1) {
        const child = validChildren[i];
        const itemHeight = this.heightCache.get(child.key) || 200;

        // Find shortest column
        const shortestColumnIndex = getShortestColumn(columnHeights);

        const left = shortestColumnIndex * (actualColumnWidth + gutterWidth);
        const top = columnHeights[shortestColumnIndex];

        columnHeights[shortestColumnIndex] = top + itemHeight + gutterHeight;

        rects.push({
          top,
          left,
          width: actualColumnWidth,
          height: itemHeight,
        });
      }

      const height = Math.max(...columnHeights) - gutterHeight;

      this.debugLog('Layout updated for height change', {
        changedKey,
        oldHeight,
        newHeight,
        totalHeight: height,
      });

      this.setState({ rects, height }, () => {
        const { onLayout } = this.props;
        if (typeof onLayout === 'function') {
          onLayout({ height });
        }
      });
    } catch (error) {
      console.error('Layout update error:', error);
    }
  };

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

    const { rects, height, scrollTop } = this.state;
    const validChildren = React.Children.toArray(children).filter(isValidElement);

    const containerStyle = {
      position: 'relative',
      height,
      ...style,
    };

    let renderedItems = validChildren;
    let virtualizedCount = 0;

    // Optimized virtualization
    if (virtualized && this.scroller) {
      const { virtualizationBuffer } = this.props;

      // Get viewport height from the appropriate container
      const viewportHeight = this.scroller === window
        ? window.innerHeight
        : this.scroller.clientHeight;

      const visibleTop = scrollTop - virtualizationBuffer;
      const visibleBottom = scrollTop + viewportHeight + virtualizationBuffer;

      const beforeCount = renderedItems.length;
      renderedItems = validChildren.filter((child, index) => {
        const rect = rects[index];
        if (!rect) return false;

        const itemTop = rect.top;
        const itemBottom = itemTop + rect.height;

        return itemBottom >= visibleTop && itemTop <= visibleBottom;
      });

      virtualizedCount = beforeCount - renderedItems.length;

      if (virtualizedCount > 0) {
        this.debugLog('Virtualization active', {
          total: validChildren.length,
          rendered: renderedItems.length,
          hidden: virtualizedCount,
          scrollTop,
          visibleRange: [visibleTop, visibleBottom],
          viewportHeight,
          scroller: this.scroller === window ? 'window' : 'custom container',
        });
      }
    }

    const gridItems = renderedItems.map((child) => {
      const originalIndex = validChildren.indexOf(child);
      const rect = rects[originalIndex];
      if (!rect) return null;

      return (
        <GridItem
          key={child.key}
          itemKey={child.key}
          component={itemComponent}
          rect={rect}
          rtl={rtl}
          onHeightChange={(itemHeight) => this.handleHeightChange(child.key, itemHeight)}
        >
          {child}
        </GridItem>
      );
    });

    return (
      <ElementType
        className={className}
        style={containerStyle}
        ref={this.containerRef}
      >
        {gridItems}
      </ElementType>
    );
  }
}

// Move propTypes and defaultProps outside the class
GridInline.propTypes = GridInlinePropTypes;
GridInline.defaultProps = GridInlineDefaultProps;

const StackGridPropTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  style: PropTypes.shape({}),
  gridRef: PropTypes.func,
  component: PropTypes.string,
  itemComponent: PropTypes.string,
  columnWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  gutterWidth: PropTypes.number,
  gutterHeight: PropTypes.number,
  onLayout: PropTypes.func,
  rtl: PropTypes.bool,
  virtualized: PropTypes.bool,
  debug: PropTypes.bool,
  size: PropTypes.shape({
    width: PropTypes.number,
    height: PropTypes.number,
    registerRef: PropTypes.func,
    unregisterRef: PropTypes.func,
  }),
  scrollContainer: PropTypes.instanceOf(HTMLElement),
};

const StackGridDefaultProps = {
  children: null,
  className: '',
  style: {},
  gridRef: null,
  component: 'div',
  itemComponent: 'div',
  gutterWidth: 5,
  gutterHeight: 5,
  onLayout: null,
  rtl: false,
  virtualized: false,
  debug: false,
  size: null,
  scrollContainer: null,
};

class StackGrid extends Component {
  constructor(props) {
    super(props);
    // eslint-disable-next-line no-unused-vars
    this.grid = null; // Used for gridRef callback
  }

  handleRef = (gridInlineInstance) => {
    // eslint-disable-next-line no-unused-vars
    this.grid = gridInlineInstance; // Store reference for potential future use
    const { gridRef } = this.props;
    gridRef?.(this);
  };

  render() {
    const { gridRef, children, ...restOfProps } = this.props;

    return (
      <GridInline
        {...restOfProps}
        gridRef={this.handleRef}
      >
        {children}
      </GridInline>
    );
  }
}

// Move propTypes and defaultProps outside the class
StackGrid.propTypes = StackGridPropTypes;
StackGrid.defaultProps = StackGridDefaultProps;

export default sizeMe({ monitorHeight: false, monitorWidth: true })(StackGrid);
export { GridInline };
