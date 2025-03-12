import React from 'react';
import PropTypes from 'prop-types';

const GridItem = React.forwardRef(
  (
    {
      itemKey,
      index,
      component: Element,
      rect = { top: 0, left: 0, width: 0, height: 0 },
      style,
      rtl,
      transition,
      duration,
      easing,
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
      top: `${rect.top || 0}px`,
      ...(rtl ? { right: `${rect.left || 0}px` } : { left: `${rect.left || 0}px` }),
      width: `${rect.width || 0}px`,
      height: `${rect.height || 0}px`,
      ...(transition && {
        transition: `${transition} ${duration}ms ${easing}`,
      }),
      zIndex: 1,
    };

    return (
      <Element {...rest} ref={ref} className="grid-item" style={itemStyle}>
        {children}
      </Element>
    );
  }
);

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
  transition: PropTypes.string,
  duration: PropTypes.number,
  easing: PropTypes.string,
  children: PropTypes.node,
};

export default GridItem;
