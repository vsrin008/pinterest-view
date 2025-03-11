# react-stack-grid-upgraded

A modernized and simplified version of react-stack-grid, providing a Pinterest-like grid layout component for React.js with improved performance and reliability.

## Features

- Simple and efficient grid layout
- Responsive design support
- RTL support
- Horizontal/Vertical layouts
- Automatic image handling with layout reflow
- Zero-configuration option with sensible defaults
- Flow type definitions
- Improved layout validation and duplicate key detection
- Simplified and optimized rendering without complex animations

## Install

```bash
$ npm install react-stack-grid-upgraded
```

## Quick Example

```javascript
import React from "react";
import StackGrid from "react-stack-grid-upgraded";

const MyComponent = () => {
  return (
    <StackGrid columnWidth={150} gutterWidth={10} gutterHeight={10}>
      <div key="key1">Item 1</div>
      <div key="key2">Item 2</div>
      <div key="key3">Item 3</div>
    </StackGrid>
  );
};
```

## Props

| Property              | Type               | Default     | Description                                    |
| :-------------------- | :----------------- | :---------- | :--------------------------------------------- |
| `className`           | `string`           | `undefined` | Additional CSS class for the grid container    |
| `style`               | `object`           | `{}`        | Additional styles for the grid container       |
| `gridRef`             | `function`         | `null`      | Ref callback to access the grid instance       |
| `component`           | `string`           | `"div"`     | HTML tag for the grid container                |
| `itemComponent`       | `string`           | `"span"`    | HTML tag for grid items                        |
| `columnWidth`         | `number \| string` | `150`       | Width of each column (px or percentage)        |
| `gutterWidth`         | `number`           | `5`         | Horizontal spacing between items               |
| `gutterHeight`        | `number`           | `5`         | Vertical spacing between items                 |
| `monitorImagesLoaded` | `boolean`          | `false`     | Whether to monitor and reflow when images load |
| `enableSSR`           | `boolean`          | `false`     | Enable server-side rendering support           |
| `onLayout`            | `function`         | `null`      | Callback when layout updates                   |
| `horizontal`          | `boolean`          | `false`     | Enable horizontal layout mode                  |
| `rtl`                 | `boolean`          | `false`     | Enable right-to-left layout                    |

## Instance Methods

### updateLayout()

Manually trigger a layout update. Useful when item contents change:

```javascript
class MyComponent extends React.Component {
  handleContentChange = () => {
    this.grid.updateLayout();
  };

  render() {
    return (
      <StackGrid gridRef={(grid) => (this.grid = grid)}>
        {/* items */}
      </StackGrid>
    );
  }
}
```

## Layout Validation and Error Prevention

The grid implements several safeguards to ensure reliable layouts:

1. **Duplicate Key Detection**: The grid automatically detects and logs warnings for duplicate keys among child elements.
2. **Layout Validation**: After each update, the grid validates item positions to prevent overlaps.
3. **Automatic Height Adjustment**: Items automatically adjust their height based on content, including loaded images.
4. **Safe Item References**: The grid validates item references to prevent duplicate or invalid refs.

## Performance Optimizations

### Simplified Animation System

This version uses CSS transitions for smooth item movements without complex animation libraries. This results in:

- Better performance
- Reduced bundle size
- Simpler implementation
- More reliable item positioning

### Image Handling

When using images, enable `monitorImagesLoaded` for automatic layout updates:

```javascript
<StackGrid monitorImagesLoaded={true}>
  <img src="..." alt="..." />
  <img src="..." alt="..." />
</StackGrid>
```

The grid will:

- Monitor image load events
- Automatically reflow when images complete loading
- Handle dynamic content height changes
- Clean up image load listeners on unmount

### Responsive Layout

Create responsive layouts by adjusting the columnWidth based on container width:

```javascript
import React from "react";
import StackGrid from "react-stack-grid-upgraded";

const ResponsiveGrid = () => {
  const getColumnWidth = (containerWidth) => {
    if (containerWidth < 768) return "100%";
    if (containerWidth < 1024) return "50%";
    return "33.33%";
  };

  return <StackGrid columnWidth={getColumnWidth}>{/* items */}</StackGrid>;
};
```

## Running the Demo

To run the demo locally:

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the demo server:
   ```bash
   npm run demo
   ```
4. Open http://localhost:3000 in your browser

The demo showcases:

- Basic grid layout
- Dynamic item addition/removal
- Responsive behavior
- RTL support
- Image handling

## Types

The package includes Flow type definitions for better development experience. While not TypeScript, these types provide similar benefits:

- Type checking for props
- Autocomplete in supported editors
- Runtime type checking in development

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

When contributing, please:

- Follow the existing code style
- Add tests for any new functionality
- Update documentation as needed
- Ensure all tests pass
