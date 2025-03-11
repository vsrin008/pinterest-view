// @flow

export const fadeUp = {
  appear: (rect) => ({
    opacity: 0,
    transform: `translateY(${rect.height}px)`,
  }),
  appeared: () => ({
    opacity: 1,
    transform: "translateY(0)",
  }),
  enter: (rect) => ({
    opacity: 0,
    transform: `translateY(${rect.height}px)`,
  }),
  entered: () => ({
    opacity: 1,
    transform: "translateY(0)",
  }),
  leaved: (rect) => ({
    opacity: 0,
    transform: `translateY(${rect.height}px)`,
  }),
};

export const fadeDown = {
  appear: (rect) => ({
    opacity: 0,
    transform: `translateY(-${rect.height}px)`,
  }),
  appeared: () => ({
    opacity: 1,
    transform: "translateY(0)",
  }),
  enter: (rect) => ({
    opacity: 0,
    transform: `translateY(-${rect.height}px)`,
  }),
  entered: () => ({
    opacity: 1,
    transform: "translateY(0)",
  }),
  leaved: (rect) => ({
    opacity: 0,
    transform: `translateY(-${rect.height}px)`,
  }),
};

export const fadeLeft = {
  appear: (rect) => ({
    opacity: 0,
    transform: `translateX(${rect.width}px)`,
  }),
  appeared: () => ({
    opacity: 1,
    transform: "translateX(0)",
  }),
  enter: (rect) => ({
    opacity: 0,
    transform: `translateX(${rect.width}px)`,
  }),
  entered: () => ({
    opacity: 1,
    transform: "translateX(0)",
  }),
  leaved: (rect) => ({
    opacity: 0,
    transform: `translateX(${rect.width}px)`,
  }),
};

export const fadeRight = {
  appear: (rect) => ({
    opacity: 0,
    transform: `translateX(-${rect.width}px)`,
  }),
  appeared: () => ({
    opacity: 1,
    transform: "translateX(0)",
  }),
  enter: (rect) => ({
    opacity: 0,
    transform: `translateX(-${rect.width}px)`,
  }),
  entered: () => ({
    opacity: 1,
    transform: "translateX(0)",
  }),
  leaved: (rect) => ({
    opacity: 0,
    transform: `translateX(-${rect.width}px)`,
  }),
};
