// Removed Flow annotations

const requestAnimationFrame = (callback) => {
  if (typeof window === 'undefined') return -1;

  return (
    window.requestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.msRequestAnimationFrame
    || ((cb) => window.setTimeout(cb, 1000 / 60))
  )(callback);
};

const cancelAnimationFrame = (id) => {
  if (typeof window === 'undefined') return;

  (
    window.cancelAnimationFrame
    || window.webkitCancelAnimationFrame
    || window.mozCancelAnimationFrame
    || window.msCancelAnimationFrame
    || window.clearTimeout
  )(id);
};

export { requestAnimationFrame, cancelAnimationFrame };
