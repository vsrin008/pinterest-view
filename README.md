# react-stack-grid-upgraded

A modernized and simplified version of react-stack-grid, providing a Pinterest-like grid layout component for React.js with improved performance and reliability.

## Features

- Simple and efficient grid layout with minimal DOM operations
- Responsive design support with percentage or pixel-based column widths
- RTL (Right-to-Left) support for international layouts
- Horizontal/Vertical layout options
- Automatic image handling with layout reflow
- Zero-configuration option with sensible defaults
- Flow type definitions for better development experience
- Improved layout validation and duplicate key detection
- Simplified and optimized rendering without complex animations
- Server-side rendering support

## Installation

```bash
npm install react-stack-grid-upgraded
# or
yarn add react-stack-grid-upgraded
```

## Basic Usage

```javascript
import React from "react";
import StackGrid from "react-stack-grid-upgraded";

const MyComponent = () => {
  return (
    <StackGrid 
      columnWidth={150}
      gutterWidth={10} 
      gutterHeight={10}
    >
      <div key="key1">Item 1</div>
      <div key="key2">Item 2</div>
      <div key="key3">Item 3</div>
    </StackGrid>
  );
};
```

## How It Works

### Grid Layout Algorithm

The grid uses a sophisticated algorithm to position items:

1. **Column Width Calculation**:
   - For pixel values: Uses the exact width specified
   - For percentage values: Calculates based on container width
   - Formula: \`columnCount = Math.floor((containerWidth - (containerWidth / columnWidth - 1) * gutterWidth) / columnWidth)\`

2. **Item Placement**:
   - Vertical Mode (default):
     1. Finds the shortest column
     2. Places item at the bottom of that column
     3. Updates column height
   - Horizontal Mode:
     1. Fills columns left to right
     2. Moves to next column when height threshold reached
     3. Balances items across available width

3. **Position Calculation**:
   - Item positions are calculated using CSS transforms
   - Formula: \`transform: translateX(left)px translateY(top)px\`
   - RTL mode inverts the X-axis calculations

4. **Responsive Behavior**:
   - Monitors container width changes
   - Recalculates layout on resize
   - Supports dynamic column width adjustments

### Performance Optimizations

1. **DOM Operations**:
   - Uses CSS transforms instead of position properties
   - Batches layout updates using requestAnimationFrame
   - Minimizes reflows by updating all items simultaneously

2. **Image Handling**:
   - Optional image load monitoring
   - Automatic layout updates when images load
   - Cleanup of image listeners on unmount

3. **State Management**:
   - Uses shallow comparison for prop changes
   - Maintains minimal state
   - Efficient update checking

## Props

| Property              | Type               | Default     | Description                                                                                    |
|:---------------------|:-------------------|:------------|:-----------------------------------------------------------------------------------------------|
| `className`          | `string`           | `undefined` | Additional CSS class for the grid container                                                    |
| `style`              | `object`           | `{}`        | Additional styles for the grid container                                                       |
| `gridRef`            | `function`         | `null`      | Ref callback to access the grid instance                                                       |
| `component`          | `string`           | `"div"`     | HTML tag for the grid container                                                                |
| `itemComponent`      | `string`           | `"span"`    | HTML tag for grid items                                                                        |
| `columnWidth`        | `number \| string` | `150`       | Width of each column (px or percentage). Example: `150` or `"33.33%"`                         |
| `gutterWidth`        | `number`           | `5`         | Horizontal spacing between items (px)                                                          |
| `gutterHeight`       | `number`           | `5`         | Vertical spacing between items (px)                                                            |
| `monitorImagesLoaded`| `boolean`          | `false`     | Whether to monitor and reflow when images load                                                 |
| `enableSSR`          | `boolean`          | `false`     | Enable server-side rendering support                                                           |
| `onLayout`           | `function`         | `null`      | Callback when layout updates: `() => void`                                                     |
| `horizontal`         | `boolean`          | `false`     | Enable horizontal layout mode                                                                  |
| `rtl`                | `boolean`          | `false`     | Enable right-to-left layout                                                                    |

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
      <StackGrid gridRef={grid => this.grid = grid}>
        {/* items */}
      </StackGrid>
    );
  }
}
```

## Advanced Usage

### Responsive Layout

```javascript
import React from "react";
import StackGrid from "react-stack-grid-upgraded";

const ResponsiveGrid = () => {
  const getColumnWidth = (containerWidth) => {
    if (containerWidth < 768) return "100%";
    if (containerWidth < 1024) return "50%";
    return "33.33%";
  };

  return (
    <StackGrid columnWidth={getColumnWidth}>
      {/* items */}
    </StackGrid>
  );
};
```

### Image Handling

```javascript
<StackGrid monitorImagesLoaded={true}>
  <img src="..." alt="..." key="img1" />
  <img src="..." alt="..." key="img2" />
</StackGrid>
```

### RTL Support

```javascript
<StackGrid rtl={true} columnWidth={200}>
  {/* items */}
</StackGrid>
```

### Horizontal Layout

```javascript
<StackGrid horizontal={true} columnWidth={200}>
  {/* items */}
</StackGrid>
```

## Running the Demo

The demo showcases all features and provides a playground to experiment with different configurations.

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/react-stack-grid-upgraded.git
   cd react-stack-grid-upgraded
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Start the demo server:
   ```bash
   npm run demo
   # or
   yarn demo
   ```

4. Open http://localhost:3000 in your browser

## Development

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Start demo: `npm run demo`

### Testing

The project uses Jest and React Testing Library for testing:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run test:lint
```

### Building

```bash
# Build the library
npm run build

# Clean build directory
npm run clean
```

## Type Checking

The project includes Flow type definitions. To use Flow:

1. Install Flow in your project
2. Add Flow configuration
3. Run Flow type checking

## License

MIT

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests
5. Update documentation
6. Submit a pull request

When contributing, please:
- Follow the existing code style
- Add tests for any new functionality
- Update documentation as needed
- Ensure all tests pass
