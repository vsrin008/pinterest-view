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
          prevH = h;
          onHeightChange(h);
        }
      });
    });
    ro.observe(itemRef.current);
    return () => ro.disconnect();
  }, [onHeightChange]);

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
    this.initialLayoutDone = false;
    this.columnAssignments = null;
    this.updateLayout(this.props);

    window.addEventListener('scroll', this.handleScroll, { passive: true });
    window.addEventListener('resize', this.handleScroll, { passive: true });
    this.handleScroll();
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
        const scrollTop = window.scrollY;
        console.log('Scroll Update:', {
          scrollTop,
          containerHeight: rect.height,
          windowHeight: window.innerHeight,
          containerTop: rect.top,
          containerBottom: rect.bottom
        });
        this.setState({ 
          containerRect: rect,
          scrollTop 
        }, () => {
          this.forceUpdate();
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
    this.mounted && typeof this.props.onLayout === 'function' && this.props.onLayout();
    return res;
  };

  doLayoutForClient = (props) => {
    const {
      size, children, columnWidth, gutterWidth, gutterHeight,
      horizontal, virtualized,
    } = props;
    const w = size?.width ?? 800;
    const arr = React.Children.toArray(children).filter(isValidElement);
    const [maxCol, colW] = getColumnLengthAndWidth(w, columnWidth, gutterWidth);
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
      }

      // Debug column assignments
      console.log('Column Assignments:', this.columnAssignments.map(a => ({
        key: a.key,
        column: a.column,
        height: a.height
      })));

      rects = arr.map((child, i) => {
        const a = this.columnAssignments[i];
        const h = this.heightCache[child.key] ?? this.getItemHeight(child.key);
        const left = Math.round(a.column * (colW + gutterWidth));
        const top = Math.round(colHeights[a.column]);
        colHeights[a.column] = top + Math.round(h) + gutterHeight;

        // Debug item placement
        console.log(`Item ${i} placement:`, {
          column: a.column,
          height: h,
          top,
          left,
          columnHeight: colHeights[a.column]
        });

        return { top, left, width: colW, height: h };
      });

      // Debug final column heights
      console.log('Final Column Heights:', colHeights);
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
    if (this.heightCache[key] !== h) {
      this.heightCache[key] = h;
      if (this.columnAssignments) {
        const as = this.columnAssignments.find(a => a.key === key);
        if (as) as.height = h;
      }
      this.forceLayoutUpdate();
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
    const { rects, height, containerRect, scrollTop } = this.state;
    const containerStyle = { 
      position: 'relative', 
      height, 
      overflow: 'visible',
      ...style 
    };
    const validChildren = React.Children.toArray(children).filter(isValidElement);
    const buffer = 800;
    const actuallyVirtualized = virtualized;
    
    // Calculate viewport boundaries in absolute coordinates
    const viewportTop = scrollTop - buffer;
    const viewportBottom = scrollTop + window.innerHeight + buffer;
    
    console.log('Viewport Calculation:', {
      scrollTop,
      viewportTop,
      viewportBottom,
      windowHeight: window.innerHeight,
      containerHeight: containerRect?.height
    });
    
    const gridItems = validChildren.map((child, i) => {
      const rect = rects[i];
      if (!rect) return null;
      
      if (actuallyVirtualized && containerRect) {
        const itemTop = rect.top;
        const itemBottom = itemTop + rect.height;
        
        const isVisible = !(itemBottom < viewportTop || itemTop > viewportBottom);
        console.log(`Item ${i} visibility:`, {
          itemTop,
          itemBottom,
          viewportTop,
          viewportBottom,
          isVisible,
          height: rect.height,
          scrollTop
        });
        
        if (!isVisible) {
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
          onHeightChange={(newHeight) => this.handleHeightChange(child.key, newHeight)}
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
  updateLayout() {
    this.grid?.updateLayout();
  }

  handleRef = (g) => {
    this.grid = g;
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
