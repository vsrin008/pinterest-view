// @flow
import { createPrefixer } from "inline-style-prefixer";
import {
  createCSSTransformBuilder,
  properties,
} from "easy-css-transform-builder";

export type Units = {
  length: string,
  angle: string,
};

const isTransformProp = (v) => properties.indexOf(v) > -1;

export const transition = (
  props: Array<string>,
  duration: number,
  easing: string
) => props.map((prop) => `${prop} ${duration}ms ${easing}`).join(",");

export const buildStyles = (
  styles: Object,
  units: Units,
  vendorPrefix: boolean,
  userAgent: ?string
) => {
  const builder = createCSSTransformBuilder(units);
  const finalStyles = {};
  const transformStyles = {};

  Object.keys(styles).forEach((key) => {
    const value = styles[key];

    if (isTransformProp(key)) {
      transformStyles[key] = value;

      if (key === "perspective") {
        finalStyles[key] = value;
      }
    } else {
      finalStyles[key] = value;
    }
  });

  const transform = builder(transformStyles, units);
  if (transform !== "") {
    finalStyles.transform = transform;
  }

  if (vendorPrefix) {
    const prefixer = createPrefixer({ userAgent });
    return prefixer(finalStyles);
  }

  return finalStyles;
};
