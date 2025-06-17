/* eslint-disable max-classes-per-file */
/* eslint-disable react/default-props-match-prop-types */
/* eslint-disable react/no-unused-prop-types */

import React, { Component, isValidElement } from 'react';
import PropTypes from 'prop-types';
import sizeMe from 'react-sizeme';

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const isPercentageNumber = (v) =>
  typeof v === 'string' && /^\d+(\.\d+)?%$/.test(v);

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
    rect = { top: 0, left: 0, width: 0, height: 0 },
    style,
    rtl,
    children,
    onHeightChange,
    ...rest
  },
  ref
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
}), (prevProps, nextProps) => {
  // Custom comparison - only re-render if these props change
  return (
    prevProps.itemKey === nextProps.itemKey &&
    prevProps.rect.top === nextProps.rect.top &&
    prevProps.rect.left === nextProps.rect.left &&
    prevProps.rect.width === nextProps.rect.width &&
    prevProps.rect.height === nextProps.rect.height &&
    prevProps.rtl === nextProps.rtl &&
    prevProps.children === nextProps.children
  );
});

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
  style: PropTypes.object,
  rtl: PropTypes.bool,
  children: PropTypes.node,
  onHeightChange: PropTypes.func,
};

class GridInline extends Component {
  static propTypes = {
    className: PropTypes.string,
    style: PropTypes.object,
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
  };

  static defaultProps = {
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
  };

  constructor(props) {
    super(props);
    this.containerRef = React.createRef();
    this.heightCache = new Map(); // Using Map for better performance
    this.columnAssignments = new Map(); // Track which column each item belongs to
    this.mounted = false;
    this.layoutRequestId = null; // For debounced layout updates
    this.scrollRAF = null; // For optimized scroll handling
    this.lastLogTime = 0; // For throttling debug logs
    this.state = {
      rects: [],
      height: 0,
      scrollTop: 0,
    };
  }

  // Throttled debug logging
  debugLog = (message, data = null, force = false) => {
    if (!this.props.debug) return;
    
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

  componentDidMount() {
    this.mounted = true;
    this.props.size?.registerRef?.(this);
    this.props.gridRef?.(this);

    this.debugLog('Component mounted', {
      virtualized: this.props.virtualized,
      columnWidth: this.props.columnWidth,
      childrenCount: React.Children.count(this.props.children)
    }, true);

    // Listen to scroll events only if virtualized
    if (this.props.virtualized) {
      window.addEventListener('scroll', this.handleScroll, { passive: true });
      this.debugLog('Scroll listener attached (virtualized mode)');
    }
    window.addEventListener('resize', this.handleResize, { passive: true });

    // Initial layout
    this.scheduleLayout();
  }

  componentDidUpdate(prevProps) {
    const childrenChanged = prevProps.children !== this.props.children;
    const sizeChanged = prevProps.size?.width !== this.props.size?.width;
    const layoutPropsChanged = 
      prevProps.columnWidth !== this.props.columnWidth ||
      prevProps.gutterWidth !== this.props.gutterWidth ||
      prevProps.gutterHeight !== this.props.gutterHeight;

    // Clean up height cache for removed children
    if (childrenChanged) {
      const currentKeys = new Set(
        React.Children.toArray(this.props.children)
          .filter(isValidElement)
          .map(child => child.key)
      );
      
      for (const key of this.heightCache.keys()) {
        if (!currentKeys.has(key)) {
          this.heightCache.delete(key);
          this.columnAssignments.delete(key);
        }
      }
    }

    if (childrenChanged || sizeChanged || layoutPropsChanged) {
      this.debugLog('Layout update triggered', {
        childrenChanged,
        sizeChanged: sizeChanged ? `${prevProps.size?.width} → ${this.props.size?.width}` : false,
        layoutPropsChanged,
        newChildrenCount: React.Children.count(this.props.children)
      });
      this.scheduleLayout();
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    this.props.size?.unregisterRef?.(this);
    
    this.debugLog('Component unmounting', null, true);
    
    if (this.props.virtualized) {
      window.removeEventListener('scroll', this.handleScroll);
    }
    window.removeEventListener('resize', this.handleResize);
    
    if (this.layoutRequestId) {
      cancelAnimationFrame(this.layoutRequestId);
    }
    if (this.scrollRAF) {
      cancelAnimationFrame(this.scrollRAF);
    }
  }

  handleScroll = () => {
    if (!this.mounted || !this.props.virtualized) return;
    
    // Use requestAnimationFrame for better performance
    if (this.scrollRAF) return;
    
    this.scrollRAF = requestAnimationFrame(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      // Only update if scroll position changed significantly
      if (Math.abs(scrollTop - this.state.scrollTop) > 50) {
        this.debugLog('Scroll position changed', {
          from: this.state.scrollTop,
          to: scrollTop,
          delta: scrollTop - this.state.scrollTop
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

    const { size, children, columnWidth, gutterWidth, gutterHeight } = this.props;
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
        gutterWidth
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
        heightCacheSize: this.heightCache.size
      });
      
      this.setState({ rects, height }, () => {
        if (typeof this.props.onLayout === 'function') {
          this.props.onLayout({ height });
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
        delta: height - (oldHeight || 0)
      });
      
      this.heightCache.set(key, height);
      
      // Update the layout to push other cards down
      this.updateLayoutForHeightChange(key, oldHeight, height);
    }
  };

  updateLayoutForHeightChange = (changedKey, oldHeight, newHeight) => {
    if (!this.mounted) return;

    const { children, columnWidth, gutterWidth, gutterHeight } = this.props;
    const { size } = this.props;
    const containerWidth = size?.width;
    
    if (!containerWidth || containerWidth <= 0) return;

    const validChildren = React.Children.toArray(children).filter(isValidElement);
    const changedIndex = validChildren.findIndex(child => child.key === changedKey);
    
    if (changedIndex === -1) return;

    try {
      const { columnCount, columnWidth: actualColumnWidth } = getColumnConfig(
        containerWidth, 
        columnWidth, 
        gutterWidth
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
        totalHeight: height
      });
      
      this.setState({ rects, height }, () => {
        if (typeof this.props.onLayout === 'function') {
          this.props.onLayout({ height });
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
    if (virtualized) {
      const buffer = this.props.virtualizationBuffer;
      const viewportHeight = window.innerHeight;
      const visibleTop = scrollTop - buffer;
      const visibleBottom = scrollTop + viewportHeight + buffer;
      
      const beforeCount = renderedItems.length;
      renderedItems = validChildren.filter((child, i) => {
        const rect = rects[i];
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
          visibleRange: [visibleTop, visibleBottom]
        });
      }
    }

    const gridItems = renderedItems.map((child, i) => {
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
          onHeightChange={(height) => this.handleHeightChange(child.key, height)}
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

class StackGrid extends Component {
  static propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    style: PropTypes.object,
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
  };

  static defaultProps = {
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
  };

  constructor(props) {
    super(props);
    this.grid = null;
  }

  updateLayout = () => {
    if (this.grid && typeof this.grid.updateLayout === 'function') {
      this.grid.updateLayout();
    }
  };

  handleRef = (gridInlineInstance) => {
    this.grid = gridInlineInstance;
    this.props.gridRef?.(this);
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

export default sizeMe({ monitorHeight: false, monitorWidth: true })(StackGrid);
export { GridInline };
