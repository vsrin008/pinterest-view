// @flow
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import shallowequal from 'shallowequal';
import invariant from 'invariant';
import { transition } from '../utils/style-helper';
import {
  requestAnimationFrame,
  cancelAnimationFrame,
} from '../animations/request-animation-frame';

type Props = {
  itemKey: string,
  index: number,
  component: string,
  rect: {
    top: number,
    left: number,
    width: number,
    height: number,
  },
  containerSize: {
    width: number,
    height: number,
    actualWidth: number,
  },
  duration: number,
  easing: string,
  appearDelay: number,
  appear: Function,
  appeared: Function,
  enter: Function,
  entered: Function,
  leaved: Function,
  units: {
    length: string,
    angle: string,
  },
  vendorPrefix: boolean,
  userAgent: string,
  onMounted: Function,
  onUnmount: Function,
  rtl: boolean,
  style: Object,
  children: React$Node,
};

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
      display: 'block',
      position: 'absolute',
      top: 0,
      ...(rtl ? { right: 0 } : { left: 0 }),
      width: rect.width || 0,
      transform: `translateX(${
        rtl ? -(rect.left || 0) : rect.left || 0
      }px) translateY(${rect.top || 0}px)`,
      zIndex: 1,
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
  style: PropTypes.shape({}),
  rtl: PropTypes.bool,
  children: PropTypes.node,
};

export default GridItem;
