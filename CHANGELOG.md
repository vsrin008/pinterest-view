# Changelog

## 2.0.0 (2025-01-27)

### 🎉 Major New Feature: Frozen Layout System

**Frozen Layout** is a powerful new feature that allows you to lock the current grid layout to prevent automatic rearrangements while still allowing new items to be added incrementally. This is perfect for content management systems, social media feeds, and any application where you want to maintain user context.

#### New API Methods

```javascript
// Freeze the current layout - prevents automatic rearrangements
gridRef.current.freeze();

// Unfreeze the layout - allows normal automatic updates  
gridRef.current.unfreeze();

// Force a manual layout update
gridRef.current.layout();
```

#### Key Features

- **Layout Preservation**: Existing items maintain their exact positions and don't move when frozen
- **Incremental Addition**: New items are automatically placed at the bottom of the shortest columns
- **Accurate Height Measurement**: The grid temporarily renders all items to measure real heights for precise placement
- **Event-Driven Architecture**: No timeouts or polling - uses efficient event-based height measurement
- **Virtualization Compatible**: Performance benefits maintained even during frozen state
- **Single Layout Calculation**: Updates happen in one batch for optimal performance

#### Use Cases

- **Content Management Systems**: Freeze layout when users are viewing content, add new posts without disrupting the current view
- **Social Media Feeds**: Prevent layout shifts when new posts load, maintain user's reading position  
- **E-commerce Product Grids**: Freeze layout during product browsing, add new products without rearranging existing ones
- **Dashboard Widgets**: Lock widget positions during data updates, preserve user's dashboard configuration

### Technical Improvements

- **Pure Layout Computation**: Decoupled layout calculation from rendering for better stability
- **Stable Position Mapping**: Maintains a `rectsMap` for consistent item positioning
- **Height Measurement Optimization**: Only measures new items during frozen state
- **Enhanced Debug Logging**: Added comprehensive logging for troubleshooting frozen layout behavior
- **Improved Error Handling**: Better handling of edge cases during layout freezing/unfreezing

### Performance Enhancements

- **Event-driven height measurement** replaces timeout-based retry loops
- **Efficient column height calculation** from existing items only
- **Maintained virtualization performance** during frozen state
- **Single-pass layout updates** for new items

### Breaking Changes

- None - this is a fully backward compatible release

### Migration Guide

No migration required! The frozen layout feature is opt-in and doesn't affect existing functionality.

## 1.3.0 (2025-01-27)

### New Features

- **Added `scrollContainer` prop** to support custom scroll containers instead of always using `window`
  - Allows the grid to work properly inside scrollable divs, modals, sidebars, and other containers
  - Maintains virtualization performance benefits when used in embedded layouts
  - Falls back to window scrolling when no container is provided
  - Automatically handles scroll event listeners and viewport calculations for custom containers

### Performance Improvements

- **Optimized virtualization for custom containers** with proper viewport height calculations
- **Improved scroll handling** to work with both window and custom scroll containers
- **Enhanced debug logging** to show which scroll container is being used

### Bug Fixes

- Fixed `this.scroller is null` error that occurred during initial render
- Improved initialization of scroll container to prevent null access errors
- Better handling of scroll container changes during component updates

### Demo Enhancements

- Added toggle for testing custom scroll container functionality
- Added container height control to demonstrate different container sizes
- Improved key generation to prevent duplicate keys
- Removed unused `horizontal` prop from demo
- Enhanced button states and user experience

## 1.1.0 (2025-06-17)

### Performance Improvements

- **Major performance optimizations** for large grids and frequent updates
- Added **debounced ResizeObserver** to prevent cascade of height updates
- Implemented **React.memo** for GridItem to prevent unnecessary re-renders
- Added **CSS containment** (`contain: layout style`) for better reflow isolation
- Optimized **scroll handling** with requestAnimationFrame for smoother performance
- Added **height cache cleanup** to prevent memory leaks when items are removed
- Improved **column finding algorithm** from O(n*m) to O(n) complexity
- Made **virtualization buffer configurable** for better performance tuning
- Added **conditional transitions** to prevent performance issues during initial render

### Features

- Added `virtualizationBuffer` prop to configure virtualization buffer size (default: 800px)
- Enhanced debug logging with throttled output to prevent console spam
- Improved layout recalculation efficiency for height changes
- Better handling of expandable items without layout shifts

### Bug Fixes

- Fixed memory leaks from height cache not being cleaned up
- Improved scroll performance on mobile devices
- Better handling of rapid height changes
- Fixed potential layout thrashing during animations

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
