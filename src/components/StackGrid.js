/* eslint-disable max-classes-per-file */
/* eslint-disable react/default-props-match-prop-types */
/* eslint-disable react/no-unused-prop-types */

import React, { Component, isValidElement } from 'react';
import PropTypes from 'prop-types';
import sizeMe from 'react-sizeme';
import shallowequal from 'shallowequal';
import ExecutionEnvironment from 'exenv';
import invariant from 'invariant';

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const isPercentageNumber = (v) =>
  typeof v === 'string' && /^\d+(\.\d+)?%$/.test(v);

const createArray = (v, l) => {
  const arr = [];
  for (let i = 0; i < l; i++) arr.push(v);
  return arr;
};

const getColumnLengthAndWidth = (width, value, gutter) => {
  if (isNumber(value)) {
    const cw = parseFloat(value);
    return [
      Math.floor((width - (width / cw - 1) * gutter) / cw),
      cw,
    ];
  }
  if (isPercentageNumber(value)) {
    const pct = parseFloat(value) / 100;
    const maxCol = Math.floor(1 / pct);
    const colWidth = (width - gutter * (maxCol - 1)) / maxCol;
    return [maxCol, colWidth];
  }
  invariant(false, 'columnWidth must be a number or percentage string.');
};

const GridItem = React.forwardRef((
  {
    itemKey,
    index,
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

  React.useEffect(() => {
    if (!itemRef.current || typeof onHeightChange !== 'function') return;
    let prevH = itemRef.current.getBoundingClientRect().height;
    onHeightChange(prevH);
    const ro = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const h = entry.contentRect.height;
        if (h !== prevH) {
          // Log suspicious height changes
          if (h < 1 && itemRef.current) {
            console.warn(`[StackGrid] GridItem Key: ${itemKey} - ResizeObserver detected suspicious height: ${h}, prevH: ${prevH}`);
          }
          prevH = h;
          onHeightChange(h);
        }
      });
    });
    ro.observe(itemRef.current);
    return () => ro.disconnect();
  }, [onHeightChange, itemKey]);

  const itemStyle = {
    ...style,
    display: 'block',
    position: 'absolute',
    top: 0,
    ...(rtl ? { right: 0 } : { left: 0 }),
    width: rect.width,
    transform: `translateX(${rtl ? -rect.left : rect.left}px) translateY(${rect.top}px)`,
    zIndex: 1,
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
});

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
    virtualized: false,
  };

  _debugLoggingEnabled = true; // Set to true to enable logs, false to disable

  constructor(props) {
    super(props);
    this.containerRef = React.createRef();
    this.itemRefs = {};
    this.imgLoad = {};
    this.mounted = false;
    this.heightCache = {};
    this.scrollRaf = null;
    this.layoutRaf = null;
    this.columnAssignments = null;
    this.lastChildrenKeys = [];
    this.initialLayoutDone = false;
    this._prevMaxCol = null;
    this.state = {
      ...this.doLayout(props),
      containerRect: {
        top: 0,
        bottom: ExecutionEnvironment.canUseDOM ? window.innerHeight : 800,
      },
    };
  }

  componentDidMount() {
    this.mounted = true;
    this.props.size?.registerRef?.(this);
    if (typeof this.props.gridRef === 'function') {
      if (this._debugLoggingEnabled) {
        console.log('[StackGrid] GridInline::componentDidMount - Calling this.props.gridRef (which is StackGrid.handleRef) with GridInline instance.');
      }
      this.props.gridRef(this);
    }
    this.initialLayoutDone = false;
    this.columnAssignments = null;
    this.updateLayout(this.props);

    // Listen to scroll on its own container (for cases where it might be scrollable)
    this.containerRef.current?.addEventListener('scroll', this.handleScroll, { passive: true });
    
    // Crucially, listen to window scroll and resize events
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    window.addEventListener('resize', this.handleScroll, { passive: true });
    
    this.handleScroll(); // Call once on mount to get initial position and layout
  }

  componentDidUpdate(prev) {
    if (prev.children !== this.props.children) {
      this.columnAssignments = null;
    }
    if (!shallowequal(prev, this.props)) {
      this.updateLayout(this.props);
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    this.props.size?.unregisterRef?.(this);
    
    // Clean up all event listeners
    this.containerRef.current?.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleScroll);
    
    if (this.scrollRaf) cancelAnimationFrame(this.scrollRaf);
    if (this.layoutRaf) cancelAnimationFrame(this.layoutRaf);
    Object.values(this.imgLoad).forEach(l => l.off?.('always'));
  }

  handleScroll = () => {
    if (this.scrollRaf) return;
    this.scrollRaf = requestAnimationFrame(() => {
      if (this.mounted && this.containerRef.current) {
        const rect = this.containerRef.current.getBoundingClientRect();
        const currentScrollTop = this.containerRef.current?.scrollTop ?? 0;

        if (this._debugLoggingEnabled) {
          console.log(
            `[StackGrid] GridInline::handleScroll - Container Top: ${rect.top.toFixed(1)}px, Viewport H: ${window.innerHeight}px`
          );
        }

        this.setState({
          containerRect: rect,
          scrollTop: currentScrollTop,
        });
      }
      this.scrollRaf = null;
    });
  };

  setStateIfNeeded = (st, cb) => {
    if (this.mounted) this.setState(st, cb);
  };

  getItemHeight = (key) => {
    if (this.heightCache[key]) return this.heightCache[key];
    const el = this.itemRefs[key];
    if (el) {
      const h = Math.max(el.offsetHeight, el.scrollHeight, el.clientHeight, 100);
      this.heightCache[key] = h;
      return h;
    }
    return 100;
  };

  doLayout = (props) => {
    if (!ExecutionEnvironment.canUseDOM) return this.doLayoutForSSR(props);
    const res = this.doLayoutForClient(props);
    this.mounted && typeof this.props.onLayout === 'function' && this.props.onLayout({ height: res.height });
    return res;
  };

  doLayoutForClient = (props) => {
    const {
      size, children, columnWidth, gutterWidth, gutterHeight,
      horizontal,
    } = props;
    const w = size?.width ?? 800;
    const arr = React.Children.toArray(children).filter(isValidElement);
    const [rawMaxCol, colW] = getColumnLengthAndWidth(w, columnWidth, gutterWidth);
    const maxCol = Math.max(1, rawMaxCol);

    if (this._debugLoggingEnabled) {
      console.groupCollapsed('[StackGrid] GridInline::doLayoutForClient - Details');
      console.log('Input Props:', props);
      console.log('Calculated Max Columns:', maxCol, 'Column Width:', colW.toFixed(1));
    }

    if (this._prevMaxCol !== maxCol) {
      this._prevMaxCol = maxCol;
      this.columnAssignments = null;
    }

    const colHeights = createArray(0, maxCol);
    let rects;

    if (!horizontal) {
      const keys = arr.map(c => c.key);
      if (!this.arraysEqual(keys, this.lastChildrenKeys)) {
        this.columnAssignments = null;
        this.initialLayoutDone = false;
        this.lastChildrenKeys = keys;
      }
      if (!this.columnAssignments) {
        const temps = createArray(0, maxCol);
        this.columnAssignments = arr.map(child => {
          const col = temps.indexOf(Math.min(...temps));
          const h = this.heightCache[child.key] ?? this.getItemHeight(child.key);
          temps[col] += h + gutterHeight;
          return { key: child.key, column: col, height: h };
        });

        if (this._debugLoggingEnabled) {
          console.log('New Column Assignments:', this.columnAssignments.map(a => ({
            key: a.key,
            column: a.column,
            height: a.height.toFixed(1),
          })));
        }
      }

      rects = arr.map((child, i) => {
        const a = this.columnAssignments[i];
        const h = this.heightCache[child.key] ?? this.getItemHeight(child.key);
        const left = Math.round(a.column * (colW + gutterWidth));
        const top = Math.round(colHeights[a.column]);
        colHeights[a.column] = top + Math.round(h) + gutterHeight;

        if (this._debugLoggingEnabled) {
          console.log(`[StackGrid] Item ${i} (Key: ${child.key}) Placement: Top=${top.toFixed(1)}, Left=${left.toFixed(1)}, H=${h.toFixed(1)}, W=${colW.toFixed(1)}, ColH=${colHeights[a.column].toFixed(1)}`);
        }

        return { top, left, width: colW, height: h };
      });

      if (this._debugLoggingEnabled) {
        console.log('Final Calculated Column Heights:', colHeights.map(h => h.toFixed(1)));
      }
    } else {
      rects = arr.map((_, i) => ({ top: 0, left: 0, width: 0, height: 0 }));
    }

    const totalW = maxCol * colW + (maxCol - 1) * gutterWidth;
    const totalH = Math.max(...colHeights) - gutterHeight;
    const offset = Math.max(0, (w - totalW) / 2);
    const final = rects.map(o => ({
      ...o,
      left: Math.round(o.left + offset),
      top: Math.round(o.top),
    }));

    if (this._debugLoggingEnabled) {
      console.log('Total Calculated Grid Height (totalH):', totalH.toFixed(1));
      console.groupEnd();
    }

    return { rects: final, actualWidth: totalW, height: totalH, columnWidth: colW };
  };

  doLayoutForSSR = (props) => {
    const arr = React.Children.toArray(props.children);
    return {
      rects: arr.map(() => ({ top: 0, left: 0, width: 0, height: 0 })),
      actualWidth: 0,
      height: 0,
      columnWidth: 0,
    };
  };

  updateLayout = (props) => {
    if (!this.mounted) return;
    const next = props || this.props;
    const nl = this.doLayout(next);
    this.setStateIfNeeded(nl);
  };

  arraysEqual = (a, b) => a.length === b.length && a.every((v,i) => v === b[i]);

  forceLayoutUpdate = () => {
    if (!this.layoutRaf) {
      this.layoutRaf = requestAnimationFrame(() => {
        if (this.mounted) this.updateLayout();
        this.layoutRaf = null;
      });
    }
  };

  handleItemRef = (key, node) => {
    if (node) {
      if (this.itemRefs[key] && this.itemRefs[key] !== node) return;
      this.itemRefs[key] = node;
      const newH = Math.max(node.offsetHeight, node.scrollHeight, node.clientHeight, 100);
      if (!this.heightCache[key] || this.heightCache[key] !== newH) {
        this.heightCache[key] = newH;
        if (!this.layoutRaf) {
          this.layoutRaf = requestAnimationFrame(() => {
            if (this.mounted) this.updateLayout();
            this.layoutRaf = null;
          });
        }
      }
    } else {
      delete this.itemRefs[key];
      this.imgLoad[key]?.off('always');
      delete this.imgLoad[key];
    }
  };

  handleHeightChange = (key, h) => {
    const newHeight = Math.max(0, h); // Ensure height is not negative

    if (this._debugLoggingEnabled) {
      console.log(`[StackGrid] GridInline::handleHeightChange - Received for Key: ${key}, New Height: ${newHeight.toFixed(1)}, Cached Height: ${this.heightCache[key]?.toFixed(1)}`);
    }

    // Scenario 1: Reported height is effectively zero for an item that's being/has been removed
    if (newHeight < 1 && !this.itemRefs[key]) {
      if (this._debugLoggingEnabled) {
        console.log(`[StackGrid] GridInline::handleHeightChange - Key: ${key} reported height ${newHeight.toFixed(1)} but itemRef is already cleared (likely unmounted/virtualized out). Ignoring this height update to prevent layout instability.`);
      }
      return; // Exit early, do not process this zero height for layout
    }

    // Scenario 2: Reported height is effectively zero for an item that *should* be there
    if (newHeight < 1 && this.itemRefs[key] && (this.heightCache[key] === undefined || this.heightCache[key] > 0)) {
      if (this._debugLoggingEnabled) {
        console.warn(`[StackGrid] GridInline::handleHeightChange - WARNING: Key: ${key} (itemRef exists) reported suspicious height: ${newHeight.toFixed(1)}. Previous cache: ${this.heightCache[key]?.toFixed(1)}. This might indicate an issue with the item's content or styling.`);
      }
    }

    // Proceed with height update only if it's a meaningful change or a new item
    if (this.heightCache[key] !== newHeight) {
      if (this._debugLoggingEnabled) {
        console.log(`[StackGrid] GridInline::handleHeightChange - Updating height cache for Key: ${key} from ${this.heightCache[key]?.toFixed(1)} to ${newHeight.toFixed(1)} and forcing layout update.`);
      }
      this.heightCache[key] = newHeight;
      // Update columnAssignments if it exists and item is found
      if (this.columnAssignments) {
        const assignment = this.columnAssignments.find(a => a.key === key);
        if (assignment) {
          assignment.height = newHeight;
        }
      }
      this.forceLayoutUpdate();
    } else if (this._debugLoggingEnabled) {
      console.log(`[StackGrid] GridInline::handleHeightChange - Key: ${key}, New Height ${newHeight.toFixed(1)} matches cached height. No update needed.`);
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
    const { rects, height, containerRect } = this.state;
    const containerStyle = {
      position: 'relative',
      height,
      overflow: 'visible',
      ...style,
    };
    const validChildren = React.Children.toArray(children).filter(isValidElement);
    const buffer = 800;
    const actuallyVirtualized = virtualized;

    const gridContainerViewportTop = containerRect ? containerRect.top : 0;
    const visibleThresholdTop = 0 - buffer;
    const visibleThresholdBottom = (ExecutionEnvironment.canUseDOM ? window.innerHeight : 800) + buffer;

    if (this._debugLoggingEnabled) {
      console.groupCollapsed('[StackGrid] GridInline::render - Viewport & Item Visibility Pass');
      console.log('Viewport Calculation:', {
        gridContainerViewportTop: gridContainerViewportTop.toFixed(1),
        visibleThresholdTop,
        visibleThresholdBottom,
        windowInnerHeight: ExecutionEnvironment.canUseDOM ? window.innerHeight : 800,
        currentGridHeightState: height.toFixed(1),
      });
    }

    let renderedItemCount = 0;
    let virtualizedItemCount = 0;

    const gridItems = validChildren.map((child, i) => {
      const rect = rects[i];
      if (!rect) return null;

      let isVisible = true;
      if (actuallyVirtualized) {
        const itemAbsoluteViewportTop = gridContainerViewportTop + rect.top;
        const itemAbsoluteViewportBottom = itemAbsoluteViewportTop + rect.height;
        isVisible = !(itemAbsoluteViewportBottom < visibleThresholdTop || itemAbsoluteViewportTop > visibleThresholdBottom);

        if (this._debugLoggingEnabled) {
          console.groupCollapsed(`[StackGrid] Item ${i} (Key: ${child.key})`);
          console.log({
            itemRectTop: rect.top.toFixed(1),
            itemRectHeight: rect.height.toFixed(1),
            itemAbsoluteViewportTop: itemAbsoluteViewportTop.toFixed(1),
            itemAbsoluteViewportBottom: itemAbsoluteViewportBottom.toFixed(1),
            isVisible,
          });
          console.groupEnd();
        }

        if (!isVisible) {
          virtualizedItemCount++;
          return null;
        }
      }
      renderedItemCount++;
      return (
        <GridItem
          key={child.key}
          itemKey={child.key}
          index={i}
          component={itemComponent}
          rect={rect}
          rtl={rtl}
          ref={(node) => this.handleItemRef(child.key, node)}
          onHeightChange={(newHeight) => this.handleHeightChange(child.key, newHeight)}
        >
          {child}
        </GridItem>
      );
    });

    if (this._debugLoggingEnabled) {
      if (actuallyVirtualized) {
        console.log(`[StackGrid] Render Summary: ${renderedItemCount} items rendered, ${virtualizedItemCount} virtualized out (Total: ${validChildren.length}).`);
      } else {
        console.log(`[StackGrid] Render Summary: ${renderedItemCount} items rendered (Virtualization OFF).`);
      }
      console.groupEnd();
    }

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
  updateLayout() {
    this.grid?.updateLayout();
  }

  handleRef = (g) => {
    if (this._debugLoggingEnabled) {
      console.log('[StackGrid] StackGrid::handleRef - Received GridInline instance:', g);
    }
    this.grid = g;
    if (typeof this.props.gridRef === 'function') {
      if (this._debugLoggingEnabled) {
        console.log('[StackGrid] StackGrid::handleRef - Calling this.props.gridRef (from MasonryGridComponent) with StackGrid instance (this).');
      }
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
  style: PropTypes.object,
  gridRef: PropTypes.func,
  component: PropTypes.string,
  itemComponent: PropTypes.string,
  columnWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  gutterWidth: PropTypes.number,
  gutterHeight: PropTypes.number,
  monitorImagesLoaded: PropTypes.bool,
  enableSSR: PropTypes.bool,
  onLayout: PropTypes.func,
  horizontal: PropTypes.bool,
  rtl: PropTypes.bool,
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
  enableSSR: false,
  onLayout: null,
  horizontal: false,
  rtl: false,
  virtualized: false,
};

export { GridInline };
export default sizeMe({ monitorHeight: true })(StackGrid);
