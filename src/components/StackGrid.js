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
    
    // New stable layout system
    this.rectsMap = new Map(); // key → Rect
    this.pendingMeasurementKeys = new Set(); // Track keys waiting for height measurement
    this.prevKeySet = null; // Store previous keys when freezing
    
    this.state = {
      rects: [],
      height: 0,
      scrollTop: 0,
      isFrozen: false, // New state for frozen layout
      forceRenderAll: false, // Temporarily render all items when adding new ones
    };
    // Store frozen layout configuration
    this.frozenConfig = null;
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
    const { isFrozen } = this.state;
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

    // Handle frozen layout with incremental updates
    if (childrenChanged && isFrozen) {
      const currentKeys = React.Children.toArray(children)
        .filter(isValidElement)
        .map((child) => child.key);
      const prevKeys = React.Children.toArray(prevProps.children)
        .filter(isValidElement)
        .map((child) => child.key);
      
      // Find new keys
      const newKeys = currentKeys.filter((key) => !prevKeys.includes(key));
      
      console.log('[StackGrid] Frozen layout check - detailed', {
        childrenChanged,
        isFrozen: this.state.isFrozen,
        currentKeys,
        prevKeys,
        newKeys,
        newKeysLength: newKeys.length,
        hasFrozenConfig: !!this.frozenConfig,
        frozenConfig: this.frozenConfig,
        prevKeySet: this.prevKeySet ? Array.from(this.prevKeySet) : null,
      });
      
      if (newKeys.length > 0 && this.frozenConfig) {
        // 1) remember who we need
        this.pendingMeasurementKeys = new Set(newKeys);
        // 2) show everything offscreen (bypass virtualization)
        this.setState({ forceRenderAll: true });
        // 3) don't compute layout yet—wait for all heights
        console.log('[StackGrid] Entering measurement mode for new items', {
          pendingMeasurementKeys: Array.from(this.pendingMeasurementKeys),
        });
        return;
      }
    }

    // Normal layout updates (when not frozen)
    if (childrenChanged || sizeChanged || layoutPropsChanged) {
      this.debugLog('Layout update triggered', {
        childrenChanged,
        sizeChanged: sizeChanged ? `${prevProps.size?.width} → ${size?.width}` : false,
        layoutPropsChanged,
        newChildrenCount: React.Children.count(children),
      });
      this.layout();
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
    const { isFrozen } = this.state;
    
    if (isFrozen) {
      this.debugLog('Window resize ignored (layout frozen)');
      return;
    }
    
    this.debugLog('Window resize detected');
    this.layout();
  };

  // New method to freeze/unfreeze layout
  freezeLayout = (frozen = true) => {
    console.log('[StackGrid] freezeLayout called with frozen:', frozen);
    const { rects } = this.state;
    this.setState({ isFrozen: frozen }, () => {
      if (frozen) {
        // Store the current column configuration when freezing
        const { columnWidth, gutterWidth, gutterHeight, size } = this.props;
        const containerWidth = size?.width;
        
        console.log('[StackGrid] Freezing layout - checking size prop', {
          size,
          containerWidth,
          hasSize: !!size,
          hasWidth: !!containerWidth,
        });
        
        if (containerWidth) {
          const { columnCount, columnWidth: actualColumnWidth } = getColumnConfig(
            containerWidth,
            columnWidth,
            gutterWidth,
          );
          this.frozenConfig = {
            columnCount,
            columnWidth: actualColumnWidth,
            gutterWidth,
            gutterHeight,
            containerWidth,
          };
          console.log('[StackGrid] Frozen config set', this.frozenConfig);
          
          // Store previous keys when freezing
          const validChildren = React.Children.toArray(this.props.children).filter(isValidElement);
          this.prevKeySet = new Set(validChildren.map(child => child.key));
          console.log('[StackGrid] Previous keys stored', Array.from(this.prevKeySet));
        } else {
          // Fallback: try to get width from DOM
          const domWidth = this.containerRef.current?.clientWidth;
          console.log('[StackGrid] Trying DOM fallback for container width', {
            domWidth,
            containerRef: !!this.containerRef.current,
          });
          
          if (domWidth) {
            const { columnCount, columnWidth: actualColumnWidth } = getColumnConfig(
              domWidth,
              columnWidth,
              gutterWidth,
            );
            this.frozenConfig = {
              columnCount,
              columnWidth: actualColumnWidth,
              gutterWidth,
              gutterHeight,
              containerWidth: domWidth,
            };
            console.log('[StackGrid] Frozen config set via DOM fallback', this.frozenConfig);
            
            // Store previous keys when freezing
            const validChildren = React.Children.toArray(this.props.children).filter(isValidElement);
            this.prevKeySet = new Set(validChildren.map(child => child.key));
            console.log('[StackGrid] Previous keys stored', Array.from(this.prevKeySet));
          } else {
            console.log('[StackGrid] Cannot freeze - no container width available from size prop or DOM', {
              size,
              containerWidth,
              domWidth,
            });
          }
        }
      } else {
        // Clear frozen config when unfreezing
        this.frozenConfig = null;
        this.prevKeySet = null;
        this.pendingMeasurementKeys.clear();
      }

      console.log('[StackGrid] Layout frozen/unfrozen', {
        frozen,
        currentRects: rects.length,
        heightCacheSize: this.heightCache.size,
        frozenConfig: this.frozenConfig,
      });
    });
  };

  // Expose freeze/unfreeze methods
  // eslint-disable-next-line react/no-unused-class-component-methods
  freeze = () => this.freezeLayout(true);

  // eslint-disable-next-line react/no-unused-class-component-methods
  unfreeze = () => this.freezeLayout(false);

  // New layout method for manual control
  // eslint-disable-next-line react/no-unused-class-component-methods
  layout = () => {
    const { children, columnWidth, gutterWidth, gutterHeight, size } = this.props;
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
      this.setState({ rects: [], height: 0 });
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

      this.debugLog('Manual layout computed', {
        items: validChildren.length,
        columns: columnCount,
        height,
      });

      this.setState({
        rects: keys.map((key) => rectsObj[key]),
        height,
      }, () => {
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
    const { isFrozen } = this.state;

    // Always cache the height
    const oldHeight = this.heightCache.get(key);
    this.heightCache.set(key, height);

    // If we're frozen and waiting on this key:
    if (isFrozen && this.pendingMeasurementKeys.has(key)) {
      this.pendingMeasurementKeys.delete(key);
      console.log('[StackGrid] Height measured for frozen item', {
        key,
        height,
        remainingKeys: Array.from(this.pendingMeasurementKeys),
      });
      
      // Once every new item is measured:
      if (this.pendingMeasurementKeys.size === 0) {
        // All heights ready → finalize
        console.log('[StackGrid] All heights measured, finalizing frozen layout');
        this.finalizeFrozenLayout();
      }
      // But don't do the normal "updateLayoutForHeightChange" when frozen
      return;
    }

    // Don't trigger layout updates when frozen (for existing items)
    if (isFrozen) {
      this.debugLog('Height change ignored (layout frozen)', {
        key,
        height,
        frozen: true,
      });
      return;
    }

    // Normal height change handling (when not frozen)
    if (oldHeight !== height) {
      this.debugLog('Item height changed', {
        key,
        from: oldHeight,
        to: height,
        delta: height - (oldHeight || 0),
      });

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

  finalizeFrozenLayout() {
    const { columnCount, columnWidth, gutterWidth, gutterHeight } = this.frozenConfig;
    
    console.log('[StackGrid] Finalizing frozen layout', {
      columnCount,
      columnWidth,
      gutterWidth,
      gutterHeight,
    });
    
    // 1) build current column bottom positions from existing rectsMap
    const columnHeights = Array(columnCount).fill(0);
    for (const [key, rect] of this.rectsMap.entries()) {
      const col = Math.round(rect.left / (columnWidth + gutterWidth));
      if (col >= 0 && col < columnCount) {
        columnHeights[col] = Math.max(columnHeights[col], rect.top + rect.height + gutterHeight);
      }
    }
    
    console.log('[StackGrid] Current column heights', columnHeights);

    // 2) for each new key in original insertion order, place it at the shortest column
    const newKeys = Array.from(this.heightCache.keys())
      .filter(k => !this.prevKeySet.has(k));  // store prevKeySet when freezing
    
    console.log('[StackGrid] Placing new keys', {
      newKeys,
      heightCacheKeys: Array.from(this.heightCache.keys()),
      prevKeySet: this.prevKeySet ? Array.from(this.prevKeySet) : null,
      rectsMapKeys: Array.from(this.rectsMap.keys()),
    });
    
    for (const key of newKeys) {
      const h = this.heightCache.get(key);
      const i = getShortestColumn(columnHeights);
      const left = i * (columnWidth + gutterWidth);
      const top = columnHeights[i];
      
      console.log('[StackGrid] Placing item', {
        key,
        height: h,
        column: i,
        top,
        left,
        columnHeights: [...columnHeights],
      });
      
      this.rectsMap.set(key, { top, left, width: columnWidth, height: h });
      columnHeights[i] = top + h + gutterHeight;
    }

    // 3) update React state in one go
    const allKeys = Array.from(this.rectsMap.keys());
    const rectsArray = allKeys.map(k => this.rectsMap.get(k));
    const containerHeight = Math.max(...columnHeights) - gutterHeight;

    console.log('[StackGrid] Updating state with final layout', {
      allKeysCount: allKeys.length,
      rectsArrayCount: rectsArray.length,
      containerHeight,
      finalColumnHeights: columnHeights,
    });

    this.setState({
      rects: rectsArray,
      height: containerHeight,
      forceRenderAll: false
    }, () => {
      console.log('[StackGrid] Frozen layout finalized successfully');
      
      // Update prevKeySet to include newly added items for subsequent additions
      this.prevKeySet = new Set(Array.from(this.rectsMap.keys()));
      console.log('[StackGrid] Updated prevKeySet for next addition', Array.from(this.prevKeySet));
      
      const { onLayout } = this.props;
      if (typeof onLayout === 'function') {
        onLayout({ height: containerHeight });
      }
    });
  }

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
    if (virtualized && this.scroller && !this.state.forceRenderAll) {
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
    } else if (this.state.forceRenderAll) {
      this.debugLog('Force rendering all items for height measurement', {
        total: validChildren.length,
        reason: 'frozen layout with new items',
      });
    }

    const gridItems = renderedItems.map((child) => {
      const originalIndex = validChildren.indexOf(child);
      const rect = rects[originalIndex];
      
      // When forceRenderAll is true, render items even without rects for height measurement
      if (!rect && !this.state.forceRenderAll) return null;

      return (
        <GridItem
          key={child.key}
          itemKey={child.key}
          component={itemComponent}
          rect={rect || { top: 0, left: 0, width: 300, height: 200 }} // Default rect for height measurement
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