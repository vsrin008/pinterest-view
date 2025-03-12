import React, { Component } from 'react';
import PropTypes from 'prop-types';
import shallowequal from 'shallowequal';
import { transition } from '../utils/style-helper';
// Removed unused imports: requestAnimationFrame, cancelAnimationFrame

const getTransitionStyles = (type, props) =>
  props[type](props.rect, props.containerSize, props.index);

const getPositionStyles = (rect, zIndex, rtl) => {
  if (!rect) return {};
  return {
    transform: `translateX(${rtl ? -Math.round(rect.left) : Math.round(rect.left)}px) translateY(${Math.round(rect.top)}px)`,
    zIndex,
  };
};

export default class GridItem extends Component {
  static propTypes = {
    index: PropTypes.number,
    component: PropTypes.string,
    rect: PropTypes.shape({
      top: PropTypes.number,
      left: PropTypes.number,
      width: PropTypes.number,
      height: PropTypes.number,
    }),
    containerSize: PropTypes.shape({
      width: PropTypes.number,
      height: PropTypes.number,
      actualWidth: PropTypes.number,
    }),
    duration: PropTypes.number,
    easing: PropTypes.string,
    appearDelay: PropTypes.number,
    /* eslint-disable react/no-unused-prop-types */
    appear: PropTypes.func, // used dynamically in getTransitionStyles
    appeared: PropTypes.func, // used dynamically in getTransitionStyles
    enter: PropTypes.func, // used dynamically in getTransitionStyles
    entered: PropTypes.func, // used dynamically in getTransitionStyles
    leaved: PropTypes.func, // used dynamically in getTransitionStyles
    /* eslint-enable react/no-unused-prop-types */
    units: PropTypes.shape({
      length: PropTypes.string,
      angle: PropTypes.string,
    }),
    onMounted: PropTypes.func,
    onUnmount: PropTypes.func,
    rtl: PropTypes.bool,
    style: PropTypes.shape({}),
    children: PropTypes.node,
  };

  static defaultProps = {
    component: 'div',
    duration: 0,
    easing: 'ease-out',
    appearDelay: 0,
    appear: () => ({}),
    appeared: () => ({}),
    enter: () => ({}),
    entered: () => ({}),
    leaved: () => ({}),
    units: {
      length: 'px',
      angle: 'deg',
    },
    onMounted: () => {},
    onUnmount: () => {},
    rtl: false,
    style: {},
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!shallowequal(nextProps, prevState.prevProps)) {
      const { rect, duration, easing, rtl } = nextProps;
      const isSignificantChange
        = Math.abs((prevState.prevProps?.rect?.top || 0) - (rect?.top || 0)) > 1
        || Math.abs((prevState.prevProps?.rect?.left || 0) - (rect?.left || 0)) > 1;

      if (isSignificantChange) {
        return {
          ...prevState,
          ...getPositionStyles(rect, 2, rtl),
          transition: transition(['transform'], duration, easing),
          prevProps: nextProps,
        };
      }

      return {
        ...prevState,
        ...getPositionStyles(rect, 1, rtl),
        prevProps: nextProps,
      };
    }
    return null;
  }

  constructor(props) {
    super(props);
    this.mounted = false;
    this.appearTimer = null;

    this.state = {
      ...(props.rect ? getPositionStyles(props.rect, 1, props.rtl) : {}),
      ...(props.rect ? getTransitionStyles('appear', props) : {}),
      prevProps: props,
    };
  }

  componentDidMount() {
    this.mounted = true;
    const { onMounted } = this.props;
    onMounted(this);
  }

  componentWillUnmount() {
    this.mounted = false;
    clearTimeout(this.appearTimer);
    this.appearTimer = null;
    const { onUnmount } = this.props;
    onUnmount(this);
  }

  /* eslint-disable react/no-unused-class-component-methods */
  componentWillAppear(callback) {
    const { rect, rtl, duration, easing, appearDelay, index } = this.props;
    // Ensure initial position is set before animation starts
    this.setStateIfNeeded({
      ...this.state,
      ...getPositionStyles(rect, 1, rtl),
      transition: 'none',
    });

    // Start appearance animation after a brief delay
    this.appearTimer = setTimeout(() => {
      this.setStateIfNeeded({
        ...this.state,
        ...getTransitionStyles('appear', this.props),
        transition: transition(['opacity', 'transform'], duration, easing),
      });
      callback();
    }, appearDelay * index);
  }

  componentDidAppear() {
    this.setAppearedStyles();
  }

  componentWillEnter(callback) {
    this.setEnterStyles();
    this.forceUpdate(callback);
  }

  componentDidEnter() {
    this.setEnteredStyles();
  }

  componentWillLeave(callback) {
    const { duration } = this.props;
    this.setLeaveStyles();
    setTimeout(callback, duration);
  }
  /* eslint-enable react/no-unused-class-component-methods */

  setStateIfNeeded(state) {
    if (this.mounted) {
      this.setState(state);
    }
  }

  setAppearedStyles() {
    const { rect, rtl } = this.props;
    this.setStateIfNeeded({
      ...this.state,
      ...getTransitionStyles('appeared', this.props),
      ...getPositionStyles(rect, 1, rtl),
    });
  }

  setEnterStyles() {
    const { rect, rtl } = this.props;
    this.setStateIfNeeded({
      ...this.state,
      ...getPositionStyles(rect, 2, rtl),
      ...getTransitionStyles('enter', this.props),
    });
  }

  setEnteredStyles() {
    const { rect, rtl } = this.props;
    this.setStateIfNeeded({
      ...this.state,
      ...getTransitionStyles('entered', this.props),
      ...getPositionStyles(rect, 1, rtl),
    });
  }

  setLeaveStyles() {
    const { rect, rtl } = this.props;
    this.setStateIfNeeded({
      ...this.state,
      ...getPositionStyles(rect, 2, rtl),
      ...getTransitionStyles('leaved', this.props),
    });
  }

  render() {
    const {
      component: Element,
      style,
      children,
      rect,
      rtl,
      duration,
      easing,
    } = this.props;
    if (!rect) return null;

    const elementStyle = {
      position: 'absolute',
      top: 0,
      ...(rtl ? { right: 0 } : { left: 0 }),
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      transition: duration && easing ? `all ${duration}ms ${easing}` : undefined,
      ...this.state,
      ...style,
    };

    return <Element style={elementStyle}>{children}</Element>;
  }
}
