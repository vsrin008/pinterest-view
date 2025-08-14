// src/components/StackGrid.js

/* eslint-disable max-classes-per-file */
/* eslint-disable react/default-props-match-prop-types */
/* eslint-disable react/no-unused-prop-types */
/* eslint-disable react/jsx-filename-extension */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable no-param-reassign */

import React, { Component, isValidElement, forwardRef, useRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import sizeMe from 'react-sizeme';
import computeLayout, { computeContainerHeight } from '../utils/computeLayout';

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
    transition: 'none', // REMOVE all transitions for static layout
    contain: 'layout style',
    willChange: 'auto',
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
  debug: false,
  virtualizationBuffer: 800,
  scrollContainer: null,
};

class GridInline extends Component {
  constructor(props) {
    super(props);
    this.state = {
      rects: [],
      height: 0,
      scrollTop: 0,
      measurementPhase: true, // Start in measurement phase
      allItemsMeasured: false, // Track when all items are measured
    };

    this.containerRef = React.createRef();
    this.measurementContainerRef = React.createRef(); // Hidden container for measurements
    this.heightCache = new Map();
    this.columnAssignments = new Map();
    this.mounted = false;
    this.layoutRequestId = null;
    this.scrollRAF = null;
    this.lastLogTime = 0;
    this.scroller = props.scrollContainer || window;
    
    // Layout system
    this.rectsMap = new Map();
    this.measuredKeys = new Set();
    this.measurementTimeout = null; // Timeout fallback for measurement phase
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

    // Set up ResizeObserver fallback for when react-sizeme fails
    if (this.containerRef.current) {
      this.resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry && this.mounted) {
          const { width } = entry.contentRect;
          if (width > 0 && (!this.props.size || !this.props.size.width)) {
            console.log('[StackGrid] ResizeObserver fallback: width =', width);
            // Force a layout update with the measured width
            this.forceUpdate();
          }
        }
      });
      this.resizeObserver.observe(this.containerRef.current);
    }

    // Initial layout using new system
    this.layout();
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
    const virtualizedChanged = prevProps.virtualized !== virtualized;

    // If the scroll container or virtualization state has changed, we need to update listeners.
    if ((scrollContainerChanged || virtualizedChanged) && this.mounted) {
      this.debugLog('Updating scroll listeners', {
        containerChanged: scrollContainerChanged,
        virtualizedChanged,
      });

      // 1. Always try to remove the listener from the OLD scroller,
      //    but only if virtualization was previously enabled.
      if (prevProps.virtualized) {
        const oldScroller = prevProps.scrollContainer || window;
        oldScroller.removeEventListener('scroll', this.handleScroll);
        this.debugLog('Removed scroll listener from', {
          scroller: oldScroller === window ? 'window' : 'old custom container',
        });
      }

      // 2. Update the internal scroller reference to the NEW one.
      this.scroller = scrollContainer || window;

      // 3. Always try to add the listener to the NEW scroller,
      //    but only if virtualization is currently enabled.
      if (virtualized) {
        this.scroller.addEventListener('scroll', this.handleScroll, { passive: true });
        this.debugLog('Added scroll listener to', {
          scroller: this.scroller === window ? 'window' : 'new custom container',
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
          this.measuredKeys.delete(key);
        }
      });

      // Reset measurement state when children change
      this.setState((prevState) => ({
        ...prevState,
        measurementPhase: true,
        allItemsMeasured: false,
      }));
      this.measuredKeys.clear();
      
      // Clear any existing measurement timeout
      if (this.measurementTimeout) {
        clearTimeout(this.measurementTimeout);
        this.measurementTimeout = null;
      }
      
      // Set a timeout fallback to prevent getting stuck in measurement phase
      this.measurementTimeout = setTimeout(() => {
        if (this.state.measurementPhase && this.mounted) {
          this.debugLog('Measurement timeout reached, forcing transition to virtualized phase');
          this.finalizeMeasurementPhase();
        }
      }, 5000); // 5 second timeout
    }

    // Only do layout updates if not in measurement phase
    const { measurementPhase } = this.state;
    if ((childrenChanged || sizeChanged || layoutPropsChanged) && !measurementPhase) {
      this.debugLog('Layout update triggered', {
        childrenChanged,
        sizeChanged: sizeChanged
          ? `${prevProps.size?.width} → ${size?.width}`
          : false,
        layoutPropsChanged,
        newChildrenCount: React.Children.count(children),
      });
      this.layout();
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    const { size } = this.props;
    size?.unregisterRef?.(this);

    this.debugLog('Component unmounting', null, true);

    // Always try to remove the scroll listener if a scroller was ever set
    if (this.scroller) {
      this.scroller.removeEventListener('scroll', this.handleScroll);
    }
    window.removeEventListener('resize', this.handleResize);

    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.layoutRequestId) {
      cancelAnimationFrame(this.layoutRequestId);
    }
    if (this.scrollRAF) {
      cancelAnimationFrame(this.scrollRAF);
    }

    // Clear measurement timeout
    if (this.measurementTimeout) {
      clearTimeout(this.measurementTimeout);
      this.measurementTimeout = null;
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
      
      // Always update scroll position for proper virtualization
      if (Math.abs(scrollTop - currentScrollTop) > 10) {
        // Reduced threshold for better responsiveness
        this.debugLog('Scroll position changed', {
          from: currentScrollTop,
          to: scrollTop,
          delta: scrollTop - currentScrollTop,
          scroller: this.scroller === window ? 'window' : 'custom container',
        });
        this.setState((prevState) => ({ ...prevState, scrollTop }));
      }
      this.scrollRAF = null;
    });
  };

  handleResize = () => {
    if (!this.mounted) return;
    
    this.debugLog('Window resize detected');
    this.layout();
  };

  // Layout method for manual control
  layout = () => {
    const {
      children,
      columnWidth,
      gutterWidth,
      gutterHeight,
      size,
    } = this.props;
    let containerWidth = size?.width;

    // Fallback: try to get width from DOM if react-sizeme failed
    if (!containerWidth || containerWidth <= 0) {
      if (this.containerRef.current) {
        containerWidth = this.containerRef.current.clientWidth;
        console.log('[StackGrid] Using DOM fallback width:', containerWidth);
      }
    }

    if (!containerWidth || containerWidth <= 0) {
      console.log('[StackGrid] No container width available, skipping layout');
      return;
    }

    const validChildren = React.Children.toArray(children).filter(isValidElement);
    if (validChildren.length === 0) {
      this.rectsMap.clear();
      this.setState((prevState) => ({ ...prevState, rects: [], height: 0 }));
      return;
    }

    try {
      const { columnCount, columnWidth: actualColumnWidth } = getColumnConfig(
        containerWidth,
        columnWidth,
        gutterWidth,
      );

      const config = {
        columnCount,
        columnWidth: actualColumnWidth,
        gutterWidth,
        gutterHeight,
      };

      const keys = validChildren.map((child) => child.key);
      const rectsObj = computeLayout(keys, this.heightCache, config);
      
      this.rectsMap = new Map(Object.entries(rectsObj));
      const height = computeContainerHeight(rectsObj, config);

      this.debugLog('Layout computed', {
        items: validChildren.length,
        columns: columnCount,
        height,
      });

      this.setState((prevState) => ({
        ...prevState,
        rects: keys.map((key) => rectsObj[key]),
        height,
      }), () => {
        const { onLayout } = this.props;
        if (typeof onLayout === 'function') {
          onLayout({ height });
        }
      });
    } catch (error) {
      console.error('Layout computation error:', error);
    }
  };

  handleHeightChange = (key, height) => {
    // Always cache the height
    const oldHeight = this.heightCache.get(key);
    this.heightCache.set(key, height);

    // Track that this key has been measured
    this.measuredKeys.add(key);

    // Check if this is the first time we're measuring this item
    const isInitialMeasurement = oldHeight === undefined;

    // During measurement phase, only collect heights, don't trigger layout updates
    if (this.state.measurementPhase) {
      if (isInitialMeasurement) {
        this.debugLog('Measurement phase - height measured', {
          key,
          height,
          measuredKeysCount: this.measuredKeys.size,
        });
      }
      
      // Always check for measurement completion, not just on initial measurements
      this.checkMeasurementCompletion();
      return; // Don't do anything else during measurement phase
    }

    // After measurement phase, only trigger layout updates for actual height changes
    if (oldHeight !== height && !isInitialMeasurement) {
      this.debugLog('Item height changed (post-measurement)', {
        key,
        from: oldHeight,
        to: height,
      });
      
      // Debounce layout updates to prevent thrashing
      if (this.layoutRequestId) {
        cancelAnimationFrame(this.layoutRequestId);
      }
      
      this.layoutRequestId = requestAnimationFrame(() => {
        this.updateLayoutForHeightChange(key, oldHeight, height);
        this.layoutRequestId = null;
      });
    }
  };

  checkMeasurementCompletion = () => {
    // Check if we have measured all current items
    const { children } = this.props;
    const validChildren = React.Children.toArray(children).filter(isValidElement);
    const currentKeys = new Set(validChildren.map(child => child.key));
    
    // Only count keys that are still in the current children
    const measuredCurrentKeys = Array.from(this.measuredKeys).filter(key => currentKeys.has(key));
    
    this.debugLog('Measurement progress', {
      measuredKeys: Array.from(this.measuredKeys),
      currentKeys: Array.from(currentKeys),
      measuredCurrentKeys,
      measuredCurrentCount: measuredCurrentKeys.length,
      totalCurrentCount: validChildren.length,
    });
    
    if (measuredCurrentKeys.length >= validChildren.length) {
      // All current items measured - transition to virtualized phase
      this.debugLog('All current items measured, transitioning to virtualized phase');
      this.finalizeMeasurementPhase();
    }
  };

  finalizeMeasurementPhase = () => {
    // Clear measurement timeout
    if (this.measurementTimeout) {
      clearTimeout(this.measurementTimeout);
      this.measurementTimeout = null;
    }
    
    // Calculate the final layout with all measured heights
    this.layout();
    
    // Transition to virtualized phase
    this.setState((prevState) => ({
      ...prevState,
      measurementPhase: false,
      allItemsMeasured: true,
    }), () => {
      this.debugLog('Measurement phase complete, virtualization active');
    });
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
    let containerWidth = size?.width;

    // Fallback: try to get width from DOM if react-sizeme failed
    if (!containerWidth || containerWidth <= 0) {
      if (this.containerRef.current) {
        containerWidth = this.containerRef.current.clientWidth;
      }
    }

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

      this.setState((prevState) => ({ ...prevState, rects, height }), () => {
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

    const { rects, height, scrollTop, measurementPhase, allItemsMeasured } = this.state;
    const validChildren = React.Children.toArray(children).filter(isValidElement);

    // Always render the measurement container in the background (hidden)
    const measurementStyle = {
      position: 'absolute',
      top: '-9999px',
      left: '-9999px',
      width: '100%',
      visibility: 'hidden',
      pointerEvents: 'none',
    };

    const measurementItems = validChildren.map((child) => (
      <GridItem
        key={`measure-${child.key}`}
        itemKey={child.key}
        component={itemComponent}
        rect={{ top: 0, left: 0, width: 300, height: 200 }}
        rtl={rtl}
        onHeightChange={(itemHeight) => this.handleHeightChange(child.key, itemHeight)}
      >
        {child}
      </GridItem>
    ));

    // Check if all items are already measured (this can happen when items are removed)
    if (measurementPhase && validChildren.length > 0) {
      const currentKeys = new Set(validChildren.map(child => child.key));
      const measuredCurrentKeys = Array.from(this.measuredKeys).filter(key => currentKeys.has(key));
      
      if (measuredCurrentKeys.length >= validChildren.length) {
        // Use setTimeout to avoid calling setState during render
        setTimeout(() => {
          if (this.state.measurementPhase && this.mounted) {
            this.debugLog('All items already measured, transitioning immediately');
            this.finalizeMeasurementPhase();
          }
        }, 0);
      }
    }

    // Main grid container
    const containerStyle = {
      position: 'relative',
      height: measurementPhase ? (height || '100vh') : height,
      ...style,
    };

    let renderedItems = validChildren;
    let virtualizedCount = 0;

    // Only virtualize if we have measured all items and virtualization is enabled
    if (virtualized && this.scroller && allItemsMeasured) {
      const { virtualizationBuffer = 200 } = this.props;

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
        });
      }
    }

    const gridItems = renderedItems.map((child) => {
      const originalIndex = validChildren.indexOf(child);
      const rect = rects[originalIndex];
      
      // During measurement phase, show items with estimated positions or previous positions
      if (measurementPhase) {
        // Use previous rect if available, otherwise use a default
        const displayRect = rect || { top: 0, left: 0, width: 300, height: 200 };
        return (
          <GridItem
            key={child.key}
            itemKey={child.key}
            component={itemComponent}
            rect={displayRect}
            rtl={rtl}
            onHeightChange={(itemHeight) => this.handleHeightChange(child.key, itemHeight)}
          >
            {child}
          </GridItem>
        );
      }
      
      // Only render items that have calculated positions after measurement
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
      <div>
        {/* Hidden measurement container */}
        <div ref={this.measurementContainerRef} style={measurementStyle}>
          {measurementItems}
        </div>
        
        {/* Main grid container */}
        <ElementType
          className={className}
          style={containerStyle}
          ref={this.containerRef}
        >
          {gridItems}
        </ElementType>
      </div>
    );
  }
}

// Move propTypes and defaultProps outside the class
GridInline.propTypes = GridInlinePropTypes;
GridInline.defaultProps = GridInlineDefaultProps;

// --- Ref forwarding adapter for react-sizeme HOC ---
const SizedGrid = sizeMe({ 
  monitorHeight: false, 
  monitorWidth: true,
  refreshMode: 'debounce',
  refreshRate: 16,
  noPlaceholder: true
})(GridInline);

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

const StackGrid = forwardRef((props, ref) => {
  const inner = useRef(null);

  useImperativeHandle(
    ref,
    () => {
      if (inner.current) {
        // Alias updateLayout for test compatibility
        inner.current.updateLayout = inner.current.layout.bind(inner.current);
      }
      return inner.current;
    },
    []
  );

  const handleGridRef = (inst) => {
    console.log('[StackGrid] handleGridRef called with:', inst);
    inner.current = inst;
    // Also call the original gridRef prop if provided
    if (props.gridRef) {
      console.log('[StackGrid] Calling original gridRef prop');
      props.gridRef(inst);
    }
  };

  console.log('[StackGrid] Rendering StackGrid with props:', {
    hasGridRef: !!props.gridRef,
    hasRef: !!ref,
    childrenCount: React.Children.count(props.children),
  });

  // Use react-sizeme HOC with better configuration
  return <SizedGrid {...props} gridRef={handleGridRef} />;
});

// Move propTypes and defaultProps outside the class
StackGrid.propTypes = StackGridPropTypes;
StackGrid.defaultProps = StackGridDefaultProps;

export default StackGrid;
export { GridInline };