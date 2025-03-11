import React, { Component } from "react";
import PropTypes from "prop-types";
import shallowequal from "shallowequal";
import invariant from "invariant";
import { transition } from "../utils/style-helper";
import {
  requestAnimationFrame,
  cancelAnimationFrame,
} from "../animations/request-animation-frame";

const getTransitionStyles = (type, props) => {
  const { rect, containerSize, index } = props;
  return props[type](rect, containerSize, index);
};

const getPositionStyles = (rect, zIndex, rtl) => ({
  transform: `translateX(${
    rtl ? -Math.round(rect.left) : Math.round(rect.left)
  }px) translateY(${Math.round(rect.top)}px)`,
  zIndex,
});

export default class GridItem extends Component {
  static propTypes = {
    itemKey: PropTypes.string,
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
    appear: PropTypes.func,
    appeared: PropTypes.func,
    enter: PropTypes.func,
    entered: PropTypes.func,
    leaved: PropTypes.func,
    units: PropTypes.shape({
      length: PropTypes.string,
      angle: PropTypes.string,
    }),
    vendorPrefix: PropTypes.bool,
    userAgent: PropTypes.string,
    onMounted: PropTypes.func,
    onUnmount: PropTypes.func,
    rtl: PropTypes.bool,
    style: PropTypes.object,
    children: PropTypes.node,
  };

  static defaultProps = {
    component: "div",
    duration: 0,
    easing: "ease-out",
    appearDelay: 0,
    appear: () => ({}),
    appeared: () => ({}),
    enter: () => ({}),
    entered: () => ({}),
    leaved: () => ({}),
    units: {
      length: "px",
      angle: "deg",
    },
    vendorPrefix: true,
    userAgent: null,
    onMounted: () => {},
    onUnmount: () => {},
    rtl: false,
    style: {},
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!shallowequal(nextProps, prevState.prevProps)) {
      const { rect, duration, easing, rtl } = nextProps;
      const isSignificantChange =
        Math.abs((prevState.prevProps?.rect?.top || 0) - (rect?.top || 0)) >
          1 ||
        Math.abs((prevState.prevProps?.rect?.left || 0) - (rect?.left || 0)) >
          1;

      if (isSignificantChange) {
        return {
          ...prevState,
          ...getPositionStyles(rect, 2, rtl),
          transition: transition(["transform"], duration, easing),
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
    this.node = null;

    this.state = {
      ...getPositionStyles(props.rect, 1, props.rtl),
      ...getTransitionStyles("appear", props),
      prevProps: props,
    };
  }

  componentDidMount() {
    this.mounted = true;
    this.props.onMounted(this);
  }

  componentWillUnmount() {
    this.mounted = false;
    clearTimeout(this.appearTimer);
    this.appearTimer = null;
    this.props.onUnmount(this);
  }

  componentWillAppear(callback) {
    // Ensure initial position is set before animation starts
    this.setStateIfNeeded({
      ...this.state,
      ...getPositionStyles(this.props.rect, 1, this.props.rtl),
      transition: "none",
    });

    // Start appearance animation after a brief delay
    this.appearTimer = setTimeout(() => {
      this.setStateIfNeeded({
        ...this.state,
        ...getTransitionStyles("appear", this.props),
        transition: transition(
          ["opacity", "transform"],
          this.props.duration,
          this.props.easing
        ),
      });
      callback();
    }, this.props.appearDelay * this.props.index);
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
    this.setLeaveStyles();
    setTimeout(callback, this.props.duration);
  }

  setStateIfNeeded(state) {
    if (this.mounted) {
      this.setState(state);
    }
  }

  setAppearedStyles() {
    this.setStateIfNeeded({
      ...this.state,
      ...getTransitionStyles("appeared", this.props),
      ...getPositionStyles(this.props.rect, 1, this.props.rtl),
    });
  }

  setEnterStyles() {
    this.setStateIfNeeded({
      ...this.state,
      ...getPositionStyles(this.props.rect, 2, this.props.rtl),
      ...getTransitionStyles("enter", this.props),
    });
  }

  setEnteredStyles() {
    this.setStateIfNeeded({
      ...this.state,
      ...getTransitionStyles("entered", this.props),
      ...getPositionStyles(this.props.rect, 1, this.props.rtl),
    });
  }

  setLeaveStyles() {
    this.setStateIfNeeded({
      ...this.state,
      ...getPositionStyles(this.props.rect, 2, this.props.rtl),
      ...getTransitionStyles("leaved", this.props),
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
      position: "absolute",
      top: 0,
      ...(rtl ? { right: 0 } : { left: 0 }),
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      transition:
        duration && easing ? `all ${duration}ms ${easing}` : undefined,
      ...this.state,
      ...style,
    };

    return <Element style={elementStyle}>{children}</Element>;
  }
}
