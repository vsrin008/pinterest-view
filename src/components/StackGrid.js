import React, { Component, isValidElement } from 'react';
import PropTypes from 'prop-types';
import sizeMe from 'react-sizeme';
import shallowequal from 'shallowequal';
import ExecutionEnvironment from 'exenv';
import invariant from 'invariant';
import GridItem from './GridItem';

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const isPercentageNumber = (v) => typeof v === 'string' && /^\d+(\.\d+)?%$/.test(v);

// Helper to create arrays of a specific length with the same value
const createArray = (v, l) => {
  const array = [];
  for (let i = 0; i < l; i += 1) array.push(v);
  return array;
};

/* eslint-disable consistent-return */
const getColumnLengthAndWidth = (containerWidth, value, gutter) => {
  if (isNumber(value)) {
    const columnWidth = parseFloat(value);
    return [
      Math.floor((containerWidth - (containerWidth / columnWidth - 1) * gutter) / columnWidth),
      columnWidth,
    ];
  }
  if (isPercentageNumber(value)) {
    const columnPercentage = parseFloat(value) / 100;
    const maxColumn = Math.floor(1 / columnPercentage);
    const columnWidth = (containerWidth - gutter * (maxColumn - 1)) / maxColumn;
    return [maxColumn, columnWidth];
  }
  invariant(false, 'Should be columnWidth is a number or percentage string.');
};
/* eslint-enable consistent-return */

const propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  style: PropTypes.shape({}),
  gridRef: PropTypes.func,
  component: PropTypes.elementType,
  itemComponent: PropTypes.elementType,
  columnWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  gutterWidth: PropTypes.number,
  gutterHeight: PropTypes.number,
  monitorImagesLoaded: PropTypes.bool,
  vendorPrefix: PropTypes.bool,
  userAgent: PropTypes.string,
  enableSSR: PropTypes.bool,
  onLayout: PropTypes.func,
  horizontal: PropTypes.bool,
  rtl: PropTypes.bool,
  size: PropTypes.shape({
    width: PropTypes.number,
    height: PropTypes.number,
  }),
  refCallback: PropTypes.func,
};

const defaultProps = {
  children: null,
  className: '',
  style: {},
  gridRef: null,
  component: 'div',
  itemComponent: 'div',
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
  size: null,
  refCallback: () => {},
};

export class GridInline extends Component {
  static displayName = 'GridInline';

  static propTypes = propTypes;

  static defaultProps = defaultProps;

  containerRef = React.createRef();

  itemRefs = {};

  imgLoad = {};

  mounted = false;

  constructor(props) {
    super(props);
    this.state = this.doLayout(props);
  }

  componentDidMount() {
    this.mounted = true;
    this.updateLayout(this.props);
  }

  componentDidUpdate(prevProps) {
    if (!shallowequal(prevProps, this.props)) {
      this.updateLayout(this.props);
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    // Clean up any image loading listeners
    Object.keys(this.imgLoad).forEach((key) => {
      if (this.imgLoad[key]) {
        this.imgLoad[key].off('always');
      }
    });
  }

  setStateIfNeeded(state) {
    if (this.mounted) {
      this.setState(state);
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
    if (this.mounted && typeof props.onLayout === 'function') {
      props.onLayout();
    }
    return results;
  }

  doLayoutForClient(props) {
    const { size, children, columnWidth, gutterWidth, gutterHeight } = props;
    const { width: containerWidth = 0 } = size || {};

    const [maxColumn, colWidth] = getColumnLengthAndWidth(
      containerWidth,
      columnWidth,
      gutterWidth
    );

    if (!containerWidth || !maxColumn || !children) {
      return {
        rects: [],
        actualWidth: containerWidth,
        height: 0,
        columnWidth: colWidth,
      };
    }

    const columnHeights = createArray(0, maxColumn);

    const rects = React.Children.toArray(children)
      .filter(isValidElement)
      .map((child) => {
        const column = columnHeights.indexOf(Math.min(...columnHeights));
        const height = this.getItemHeight(child.key);
        const left = Math.round(column * colWidth + column * gutterWidth);
        const top = Math.round(columnHeights[column]);
        columnHeights[column] = top + Math.round(height) + gutterHeight;
        return { top, left, width: colWidth, height };
      });

    const gridWidth = maxColumn * colWidth + (maxColumn - 1) * gutterWidth;
    const height = Math.max(...columnHeights) - gutterHeight;

    return {
      rects,
      actualWidth: gridWidth,
      height,
      columnWidth: colWidth,
    };
  }

  doLayoutForSSR(props) {
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

  updateLayout(props) {
    if (!this.mounted) return;
    const nextProps = props || this.props;
    const newLayout = this.doLayout(nextProps);
    this.setStateIfNeeded(newLayout);
  }

  handleItemRef = (key, node) => {
    if (node) {
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

  render() {
    const {
      className,
      style,
      component: GridComponent,
      itemComponent,
      children,
      rtl,
    } = this.props;
    const { rects, height } = this.state;

    const containerStyle = {
      position: 'relative',
      height,
      ...style,
    };

    const validChildren
      = React.Children.toArray(children).filter(isValidElement);

    const Wrapper = GridComponent || 'div';
    const ItemWrapper = itemComponent || 'div';

    return (
      <Wrapper
        data-testid="stack-grid-container"
        className={className}
        style={containerStyle}
        ref={this.containerRef}
      >
        {validChildren.map((child, i) => (
          <GridItem
            key={child.key}
            itemKey={child.key}
            index={i}
            component={ItemWrapper}
            rect={rects[i]}
            rtl={rtl}
            ref={(node) => this.handleItemRef(child.key, node)}
          >
            {child}
          </GridItem>
        ))}
      </Wrapper>
    );
  }
}

export default sizeMe({ monitorHeight: true })(GridInline);
