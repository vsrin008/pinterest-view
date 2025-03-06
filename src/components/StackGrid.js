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
import * as easings from "../animations/easings";

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
const GridItem = ({
  itemKey,
  index,
  component: Element,
  rect = { top: 0, left: 0, width: 0, height: 0 },
  style,
  rtl,
  children,
  ...rest
}) => {
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
    minHeight: "100px", // Add a default minimum height
    zIndex: 1, // Add z-index to help with stacking
  };

  return (
    <Element {...rest} className="grid-item" style={itemStyle}>
      {children}
    </Element>
  );
};

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
    if (key && this.itemRefs[key]) {
      const el = this.itemRefs[key];
      if (el) {
        const candidate = [
          el.scrollHeight,
          el.clientHeight,
          el.offsetHeight,
          100, // Add default height
        ].filter(isNumber);
        return Math.max(...candidate);
      }
    }
    return 100; // Return default height if no ref
  }

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

    const childArray = React.Children.toArray(props.children).filter(
      isValidElement
    );
    const [maxColumn, columnWidth] = getColumnLengthAndWidth(
      containerWidth,
      rawColumnWidth,
      gutterWidth
    );
    const columnHeights = createArray(0, maxColumn);

    let rects;
    if (!horizontal) {
      rects = childArray.map((child) => {
        const column = columnHeights.indexOf(Math.min(...columnHeights));
        const height = this.getItemHeight(child.key) || 0;
        const left = column * columnWidth + column * gutterWidth;
        const top = columnHeights[column]; // Get the current top position

        // Update the column height AFTER getting the top position
        columnHeights[column] = top + Math.round(height) + gutterHeight;

        return { top, left, width: columnWidth, height };
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
        const column =
          currentColumn >= maxColumn - 1 ? maxColumn - 1 : currentColumn;
        const height = this.getItemHeight(child.key) || 0;
        const left = column * columnWidth + column * gutterWidth;
        const top = columnHeights[column];

        columnHeights[column] += Math.round(height) + gutterHeight;
        if (columnHeights[column] >= maxHeight) {
          currentColumn += 1;
        }

        return { top, left, width: columnWidth, height };
      });
    }

    const width = maxColumn * columnWidth + (maxColumn - 1) * gutterWidth;
    // For total height, we don't need to subtract gutterHeight since it's already factored in
    const height = Math.max(...columnHeights);
    const finalRects = rects.map((o) => ({
      ...o,
      left: o.left + (containerWidth - width) / 2,
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
    if (!props) {
      this.setStateIfNeeded(this.doLayout(this.props));
    } else {
      this.setStateIfNeeded(this.doLayout(props));
    }
  }

  handleItemRef = (key, node) => {
    if (node) {
      this.itemRefs[key] = node;

      if (
        this.props.monitorImagesLoaded &&
        typeof imagesLoaded === "function"
      ) {
        const imgLoad = imagesLoaded(node);

        imgLoad.once("always", () => {
          requestAnimationFrame(() => {
            this.updateLayout(this.props);
          });
        });

        this.imgLoad[key] = imgLoad;
      }

      this.updateLayout(this.props);
    } else {
      // Cleanup when ref is removed
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
