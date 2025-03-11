// @flow
import React, { Component, isValidElement } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import sizeMe from "react-sizeme";
import shallowequal from "shallowequal";
import ExecutionEnvironment from "exenv";
import invariant from "invariant";

// Import only necessary utils
import { transition } from "../utils/style-helper";

import type { Units } from "../types/";

const imagesLoaded = ExecutionEnvironment.canUseDOM
  ? require("imagesloaded")
  : null;

const isNumber = (v: any): boolean => typeof v === "number" && isFinite(v);
const isPercentageNumber = (v: any): boolean =>
  typeof v === "string" && /^\d+(\.\d+)?%$/.test(v);

// Helper to create arrays of a specific length with the same value
const createArray = <T>(v: T, l: number): T[] => {
  const array = [];
  for (let i = 0; i < l; i += 1) array.push(v);
  return array;
};

/* eslint-disable consistent-return */
const getColumnLengthAndWidth = (
  width: number,
  value: number | string,
  gutter: number
): [number, number] => {
  if (isNumber(value)) {
    const columnWidth = parseFloat(value);
    return [
      Math.floor((width - (width / columnWidth - 1) * gutter) / columnWidth),
      columnWidth,
    ];
  } else if (isPercentageNumber(value)) {
    const columnPercentage = parseFloat(value) / 100;
    const maxColumn = Math.floor(1 / columnPercentage);
    const columnWidth = (width - gutter * (maxColumn - 1)) / maxColumn;
    return [maxColumn, columnWidth];
  }
  invariant(false, "Should be columnWidth is a number or percentage string.");
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
      display: "block",
      position: "absolute",
      top: 0,
      ...(rtl ? { right: 0 } : { left: 0 }),
      width: rect.width || 0,
      transform:
        "translateX(" +
        (rtl ? -(rect.left || 0) : rect.left || 0) +
        "px) translateY(" +
        (rect.top || 0) +
        "px)",
      zIndex: 1, // Remove minHeight to allow natural content height
    };

    return (
      <Element {...rest} ref={ref} className="grid-item" style={itemStyle}>
        {children}
      </Element>
    );
  }
);

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
};

type Props = {
  children: React$Element<any>,
  className?: string,
  style: Object,
  gridRef?: Function,
  component: string,
  itemComponent: string,
  columnWidth: number | string,
  gutterWidth: number,
  gutterHeight: number,
  monitorImagesLoaded: boolean,
  vendorPrefix: boolean,
  userAgent: ?string,
  enableSSR: boolean,
  onLayout: Function,
  horizontal: boolean,
  rtl: boolean,
};

type InlineState = {
  rects: Array<{
    top: number,
    left: number,
    width: number,
    height: number,
  }>,
  actualWidth: number,
  height: number,
  columnWidth: number,
};

type InlineProps = Props & {
  refCallback: Function,
  size: {
    width: number,
    height: number,
  },
};

const propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  style: PropTypes.object,
  gridRef: PropTypes.func,
  component: PropTypes.string,
  itemComponent: PropTypes.string,
  columnWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
    .isRequired,
  gutterWidth: PropTypes.number,
  gutterHeight: PropTypes.number,
  monitorImagesLoaded: PropTypes.bool,
  vendorPrefix: PropTypes.bool,
  userAgent: PropTypes.string,
  enableSSR: PropTypes.bool,
  onLayout: PropTypes.func,
  horizontal: PropTypes.bool,
  rtl: PropTypes.bool,
};

export class GridInline extends Component {
  props: InlineProps;
  state: InlineState;
  itemRefs: { [key: string]: any };
  imgLoad: Object;
  mounted: boolean;

  static propTypes = {
    ...propTypes,
    size: PropTypes.shape({
      width: PropTypes.number,
      height: PropTypes.number,
    }),
  };

  constructor(props: InlineProps) {
    super(props);
    this.itemRefs = {};
    this.imgLoad = {};
    this.mounted = false;
    this.state = this.doLayout(props);
  }

  componentDidMount() {
    this.mounted = true;
    this.updateLayout(this.props);
  }

  componentDidUpdate(prevProps: InlineProps) {
    if (!shallowequal(prevProps, this.props)) {
      this.updateLayout(this.props);
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    // Clean up any image loading listeners
    Object.keys(this.imgLoad).forEach((key) => {
      if (this.imgLoad[key]) {
        this.imgLoad[key].off("always");
      }
    });
  }

  setStateIfNeeded(state: Object) {
    if (this.mounted) {
      this.setState(state);
    }
  }

  getItemHeight(key: string): number {
    if (!key || !this.itemRefs[key]) {
      return 100; // Default height if no ref
    }

    const element = this.itemRefs[key];
    if (!element) return 100;

    // Get all child elements including images
    const children = element.getElementsByTagName("*");
    const images = element.getElementsByTagName("img");

    // Wait for images to load if they exist
    if (images.length > 0 && this.props.monitorImagesLoaded) {
      Array.from(images).forEach((img) => {
        if (!img.complete) {
          img.addEventListener("load", () => {
            if (this.mounted) {
              this.updateLayout();
            }
          });
        }
      });
    }

    // Get content height including padding and margins
    const computedStyle = window.getComputedStyle(element);
    const marginTop = parseFloat(computedStyle.marginTop) || 0;
    const marginBottom = parseFloat(computedStyle.marginBottom) || 0;

    // Calculate maximum height from all possible sources
    const heights = [
      element.offsetHeight,
      element.scrollHeight,
      element.clientHeight,
      ...Array.from(children).map((child) => {
        const childStyle = window.getComputedStyle(child);
        const totalHeight =
          child.offsetHeight +
          (parseFloat(childStyle.marginTop) || 0) +
          (parseFloat(childStyle.marginBottom) || 0);
        return totalHeight;
      }),
    ].filter((h) => typeof h === "number" && h > 0);

    const contentHeight = Math.max(...heights) + marginTop + marginBottom;
    return Math.max(contentHeight, 100); // Ensure minimum height of 100px
  }

  updateLayoutDebounced = (() => {
    let timeoutId = null;
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        if (this.mounted) {
          this.updateLayout();
        }
      }, 100); // 100ms debounce
    };
  })();

  doLayout(props: InlineProps): InlineState {
    if (!ExecutionEnvironment.canUseDOM) {
      return this.doLayoutForSSR(props);
    }
    const results = this.doLayoutForClient(props);
    if (this.mounted && typeof this.props.onLayout === "function") {
      this.props.onLayout();
    }
    return results;
  }

  doLayoutForClient(props: InlineProps): InlineState {
    const {
      size: { width: containerWidth },
      columnWidth: rawColumnWidth,
      gutterWidth,
      gutterHeight,
      horizontal,
    } = props;

    // Validate child keys for uniqueness
    const childArray = React.Children.toArray(props.children).filter(
      isValidElement
    );
    const keySet = new Set();
    const validChildren = childArray.filter((child) => {
      if (!child.key) {
        console.error("Child element missing key:", child);
        return false;
      }
      if (keySet.has(child.key)) {
        console.error("Duplicate key detected:", child.key);
        return false;
      }
      keySet.add(child.key);
      return true;
    });

    const [maxColumn, columnWidth] = getColumnLengthAndWidth(
      containerWidth,
      rawColumnWidth,
      gutterWidth
    );

    // Initialize column tracking with key validation
    const columnHeights = createArray(0, maxColumn);
    const columnItems = createArray([], maxColumn).map(() => []);
    const processedKeys = new Set();

    let rects;
    if (!horizontal) {
      // Vertical layout
      rects = validChildren
        .map((child) => {
          if (processedKeys.has(child.key)) {
            console.error("Duplicate key found during layout:", child.key);
            return null;
          }
          processedKeys.add(child.key);

          // Find the column with the smallest height
          const column = columnHeights.indexOf(Math.min(...columnHeights));
          const height = Math.max(this.getItemHeight(child.key) || 0, 50);
          const left = Math.round(column * (columnWidth + gutterWidth));
          const top = Math.round(columnHeights[column]);

          // Track this item's position with key validation
          columnItems[column].push({ key: child.key, top, height });

          // Validate no overlap with previous items in this column
          const prevItem = columnItems[column][columnItems[column].length - 2];
          if (prevItem) {
            const minTop = prevItem.top + prevItem.height + gutterHeight;
            if (top < minTop) {
              columnHeights[column] = minTop;
            }
          }

          columnHeights[column] = top + height + gutterHeight;
          return { top, left, width: columnWidth, height };
        })
        .filter(Boolean); // Remove any null items from duplicate keys
    } else {
      // Similar validation for horizontal layout
      const sumHeights = validChildren.reduce(
        (sum, child) =>
          sum + Math.max(this.getItemHeight(child.key) || 0, 50) + gutterHeight,
        0
      );
      const maxHeight = sumHeights / maxColumn;
      let currentColumn = 0;

      rects = validChildren
        .map((child) => {
          if (processedKeys.has(child.key)) {
            console.error("Duplicate key found during layout:", child.key);
            return null;
          }
          processedKeys.add(child.key);

          const column =
            currentColumn >= maxColumn - 1 ? maxColumn - 1 : currentColumn;
          const height = Math.max(this.getItemHeight(child.key) || 0, 50);
          const left = Math.round(column * (columnWidth + gutterWidth));
          const top = Math.round(columnHeights[column]);

          columnItems[column].push({ key: child.key, top, height });

          const prevItem = columnItems[column][columnItems[column].length - 2];
          if (prevItem) {
            const minTop = prevItem.top + prevItem.height + gutterHeight;
            if (top < minTop) {
              columnHeights[column] = minTop;
            }
          }

          columnHeights[column] += height + gutterHeight;
          if (columnHeights[column] >= maxHeight) {
            currentColumn = Math.min(currentColumn + 1, maxColumn - 1);
          }

          return { top, left, width: columnWidth, height };
        })
        .filter(Boolean);
    }

    // Calculate final dimensions
    const width = maxColumn * columnWidth + (maxColumn - 1) * gutterWidth;
    const height = Math.max(...columnHeights) - gutterHeight;

    // Center the grid
    const offset = Math.max(0, (containerWidth - width) / 2);
    const finalRects = rects.map((o) => ({
      ...o,
      left: Math.round(o.left + offset),
      top: Math.round(o.top),
    }));

    return { rects: finalRects, actualWidth: width, height, columnWidth };
  }

  // eslint-disable-next-line class-methods-use-this
  doLayoutForSSR(props: InlineProps): InlineState {
    return {
      rects: React.Children.toArray(props.children).map(() => ({
        top: 0,
        left: 0,
        width: 0,
        height: 0,
      })),
      actualWidth: 0,
      height: 0,
      columnWidth: 0,
    };
  }

  updateLayout(props: ?InlineProps): void {
    if (!this.mounted) return;

    const nextProps = props || this.props;
    const newLayout = this.doLayout(nextProps);

    this.setStateIfNeeded(newLayout, () => {
      // Validate layout after update
      requestAnimationFrame(() => {
        this.validateLayout();
      });
    });
  }

  handleItemRef = (key, node) => {
    if (node) {
      // Validate that this key isn't already registered
      if (this.itemRefs[key] && this.itemRefs[key] !== node) {
        console.error("Duplicate item ref detected:", key);
        return;
      }
      this.itemRefs[key] = node;

      requestAnimationFrame(() => {
        if (this.mounted) {
          this.updateLayoutDebounced();
        }
      });
    } else {
      delete this.itemRefs[key];
      if (this.imgLoad[key]) {
        this.imgLoad[key].off("always");
        delete this.imgLoad[key];
      }
    }
  };

  handleRef = (node) => {
    this.props.refCallback(this);
  };

  render() {
    const {
      className,
      style,
      size,
      component: Component,
      itemComponent,
      children,
      rtl,
      ...rest
    } = this.props;
    const { rects, actualWidth, height } = this.state;
    const containerSize = {
      actualWidth,
      width: size.width == null ? 0 : size.width,
      height,
    };
    const validChildren = React.Children.toArray(children).filter((child) =>
      isValidElement(child)
    );
    return (
      <Component
        className={className}
        style={{
          ...(style || {}),
          position: "relative",
          height,
        }}
        ref={this.handleRef}
      >
        {validChildren.map((child, i) => (
          <GridItem
            key={child.key}
            itemKey={child.key}
            index={i}
            component={itemComponent}
            rect={rects[i]}
            rtl={rtl}
            ref={(node) => this.handleItemRef(child.key, node)}
          >
            {child}
          </GridItem>
        ))}
      </Component>
    );
  }

  // Add layout validation method
  validateLayout() {
    if (!this.mounted) return;

    const { rects } = this.state;
    const { gutterWidth, gutterHeight } = this.props;

    // Group items by column
    const columnItems = {};
    rects.forEach((rect, i) => {
      const column = Math.floor(rect.left / (rect.width + gutterWidth));
      if (!columnItems[column]) columnItems[column] = [];
      columnItems[column].push({ ...rect, index: i });
    });

    // Check for overlaps or incorrect spacing
    let needsUpdate = false;
    Object.values(columnItems).forEach((items) => {
      items.sort((a, b) => a.top - b.top);
      items.forEach((item, i) => {
        if (i > 0) {
          const prevItem = items[i - 1];
          const minTop = prevItem.top + prevItem.height + gutterHeight;
          if (item.top < minTop) {
            needsUpdate = true;
          }
        }
      });
    });

    // If issues found, trigger a layout update
    if (needsUpdate) {
      this.updateLayout();
    }
  }
}

const SizeAwareGridInline = sizeMe({
  monitorWidth: true,
  monitorHeight: false,
})(GridInline);

export default class StackGrid extends Component {
  static propTypes = propTypes;

  static defaultProps = {
    style: {},
    gridRef: null,
    component: "div",
    itemComponent: "span",
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
  };

  props: Props;
  grid: GridInline;

  updateLayout() {
    if (this.grid) {
      this.grid.updateLayout();
    }
  }

  handleRef = (grid: GridInline) => {
    this.grid = grid;
    if (typeof this.props.gridRef === "function") {
      this.props.gridRef(this);
    }
  };

  render() {
    const { enableSSR, gridRef, ...rest } = this.props;
    sizeMe.enableSSRBehaviour = enableSSR;
    return <SizeAwareGridInline {...rest} refCallback={this.handleRef} />;
  }
}
