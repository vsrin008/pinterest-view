# Changelog

## 1.0.0 (2024-03-11)

### Breaking Changes

- Complete modernization of the codebase
- Removed animation system in favor of simpler, more performant layout
- Simplified API by removing unused props
- Fixed vertical gutter spacing issues
- Improved handling of duplicate items and key management
- Enhanced layout calculation for better stability
- Improved image loading and height calculations

### Features

- Added better support for RTL layouts
- Enhanced responsive layout handling
- Improved performance with optimized layout calculations
- Better handling of dynamic content changes
- Added validation for duplicate keys and refs

### Dependencies

- Updated all dependencies to latest versions
- Removed unused dependencies
- Simplified build system
- Added support for React 18
- Removed Flow types in favor of simpler JavaScript

### Documentation

- Completely revised documentation
- Added new examples for common use cases
- Simplified installation and usage instructions
- Updated API documentation to reflect current features

## 0.7.1

- Make transform coordinates round to the nearest integer to avoid blurriness. Thank you [@xaviergonz](https://github.com/xaviergonz)

## 0.7.0

- Add `itemComponent` props. Thank you [@solomonhawk](https://github.com/solomonhawk) ! [#35](https://github.com/tsuyoshiwada/react-stack-grid/issues/35)

## 0.6.0

- Add `rtl` props. Thank you [@azizghuloum](https://github.com/azizghuloum) !

## 0.5.0

- Add `horizontal` props. Thank you [@ilyalesik](https://github.com/ilyalesik) !

## 0.4.0

- Add `onLayout` props. Thanks for [@jarib](https://github.com/jarib) !

## 0.3.0

- Add `gridRef` props. Thanks for [@mquandalle](https://github.com/mquandalle) and [@derwydd](https://github.com/derwydd) !

## 0.2.2

- Fix calculations for percentage columns width [#16](https://github.com/tsuyoshiwada/react-stack-grid/pull/16)  
  Thanks [@mquandalle](https://github.com/mquandalle)!
- Migrate from react-addons-transition-group to react-transition-group. [#17](https://github.com/tsuyoshiwada/react-stack-grid/issues/17)
- Remove setState warning that occurs after unmounting.

## 0.2.1

- Support for React v15.5.x ~ (add `prop-types` package) [#2](https://github.com/tsuyoshiwada/react-stack-grid/issues/12)
- Fix lint and typechecking (flowtype)
- Update devDependencies

## 0.2.0

- Add `enableSSR` props. Thanks for [@egorAva](https://github.com/egorAva)! [#7](https://github.com/tsuyoshiwada/react-stack-grid/pull/7)

## 0.1.1

- Fix transition animation when sort order changed
- Update demo page (Added shuffle button)

## 0.1.0

### New feature

- Support column percentage width

### Bugfix

- Change waiting for size calculation of react-sizeme before rendering
- Fix warning when deleted before appear
- Remove propTypes warning when there is no children

## 0.0.2

- Fix files field in package.json

## 0.0.1

- First release.
