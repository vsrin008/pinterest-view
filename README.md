# pintrest-view

[![npm version](https://badge.fury.io/js/%40zapperwing%2Fpintrest-view.svg)](https://www.npmjs.com/package/@zapperwing/pintrest-view)
[![npm downloads](https://img.shields.io/npm/dm/%40zapperwing%2Fpintrest-view.svg)](https://www.npmjs.com/package/@zapperwing/pintrest-view)

A Pinterest-style grid layout component for React.js with responsive design, dynamic content support, and **frozen layout capabilities**. Create beautiful, responsive grid layouts that automatically adjust to your content while maintaining user experience with layout control.

## Features

- 🎯 Simple API with minimal configuration required
- 📱 Responsive design with flexible column widths (pixels or percentages)
- 🌐 RTL (Right-to-Left) support for international layouts
- ↔️ Both vertical and horizontal layout options
- 🖼️ Automatic image handling with layout adjustments
- 🎨 Works with any React component
- 🚀 Optimized performance with minimal DOM operations
- 🖥️ Server-side rendering support
- 🔄 Smooth transitions during layout changes
- 🏎️ **Virtualized Rendering** – render only visible items for large grids to improve performance
- 🧊 **Frozen Layout System** – lock layouts to prevent unwanted rearrangements while allowing incremental content addition

## Installation

```bash
# Using npm
npm install @zapperwing/pintrest-view

# Using yarn
yarn add @zapperwing/pintrest-view
```

Make sure you have `react` and `react-dom` installed in your project (version 17.0.0 or higher).

## Quick Start

Here's a simple example to get you started:

```jsx
import React from "react";
import StackGrid from "@zapperwing/pintrest-view";

const SimpleGrid = () => {
  return (
    <StackGrid 
      columnWidth={300}
      gutterWidth={15} 
      gutterHeight={15}
      virtualized={true}  // Enable virtualization for performance with many items
    >
      <div key="item1">First Item</div>
      <div key="item2">Second Item</div>
      <div key="item3">Third Item</div>
    </StackGrid>
  );
};

export default SimpleGrid;
```

## Frozen Layout Feature

The frozen layout system allows you to lock the current layout to prevent automatic rearrangements while still allowing new items to be added incrementally. This is perfect for content management systems, social media feeds, and any application where you want to maintain user context.

### Basic Frozen Layout Usage

```jsx
import React, { useState, useRef } from "react";
import StackGrid from "@zapperwing/pintrest-view";

const FrozenLayoutExample = () => {
  const [items, setItems] = useState(initialItems);
  const [isLayoutFrozen, setIsLayoutFrozen] = useState(false);
  const [isGridReady, setIsGridReady] = useState(false);
  const gridRef = useRef(null);

  const handleFreezeToggle = () => {
    if (gridRef.current) {
      if (isLayoutFrozen) {
        gridRef.current.unfreeze();
        setIsLayoutFrozen(false);
      } else {
        gridRef.current.freeze();
        setIsLayoutFrozen(true);
      }
    }
  };

  const addItems = () => {
    const newItems = generateNewItems();
    setItems([...items, ...newItems]);
  };

  return (
    <div>
      <button 
        onClick={handleFreezeToggle}
        disabled={!isGridReady}
        style={{
          backgroundColor: isLayoutFrozen ? '#d9534f' : '#5cb85c',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        {isLayoutFrozen ? 'Unfreeze Layout' : 'Freeze Layout'}
      </button>
      
      <button onClick={addItems}>Add Items</button>
      
      <StackGrid
        ref={(ref) => {
          gridRef.current = ref;
          setIsGridReady(!!ref);
        }}
        columnWidth={300}
        gutterWidth={20}
        gutterHeight={20}
        virtualized={true}
      >
        {items.map(item => (
          <div key={item.id}>{item.content}</div>
        ))}
      </StackGrid>
    </div>
  );
};
```

### Frozen Layout API

#### Methods Available on Grid Ref

```javascript
// Freeze the current layout - prevents automatic rearrangements
gridRef.current.freeze();

// Unfreeze the layout - allows normal automatic updates
gridRef.current.unfreeze();

// Force a manual layout update
gridRef.current.layout();
```

#### How Frozen Layout Works

1. **Freeze**: When you call `freeze()`, the grid stores the current column configuration and item positions
2. **Preserve**: Existing items maintain their exact positions and don't move
3. **Add**: New items can be added and are automatically placed at the bottom of the shortest columns
4. **Measure**: The grid temporarily renders all items to measure their real heights
5. **Place**: New items are positioned using accurate height measurements
6. **Unfreeze**: When you call `unfreeze()`, normal automatic layout behavior resumes

### Use Cases for Frozen Layout

- **Content Management Systems**: Freeze layout when users are viewing content, add new posts without disrupting the current view
- **Social Media Feeds**: Prevent layout shifts when new posts load, maintain user's reading position
- **E-commerce Product Grids**: Freeze layout during product browsing, add new products without rearranging existing ones
- **Dashboard Widgets**: Lock widget positions during data updates, preserve user's dashboard configuration

## Using Custom Components

The grid can handle any React component as a child. The only requirement is that each child must have a unique `key` prop:

```jsx
import React from "react";
import StackGrid from "@zapperwing/pintrest-view";
import YourCustomCard from "./YourCustomCard";

const GridWithCustomComponents = () => {
  const items = [
    { id: 1, title: "First Card", content: "Some content..." },
    { id: 2, title: "Second Card", content: "More content..." },
    // ... more items
  ];

  return (
    <StackGrid 
      columnWidth={300}
      gutterWidth={15} 
      gutterHeight={15}
      monitorImagesLoaded={true} // Important if your components contain images
      virtualized={true}         // Activate virtualization for large grids
    >
      {items.map(item => (
        <YourCustomCard
          key={item.id.toString()} // Unique key is required
          title={item.title}
          content={item.content}
        />
      ))}
    </StackGrid>
  );
};

export default GridWithCustomComponents;
```

### Tips for Custom Components

1. **Height Calculation**: The grid automatically detects the rendered height of your components. No special configuration is needed.
2. **Images**: If your components contain images, set `monitorImagesLoaded={true}` to ensure proper layout after images load.
3. **Dynamic Content**: If your component's height might change (e.g., expandable cards), call `updateLayout()` after the change:

```jsx
const ExpandableCard = ({ content, gridRef }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    // Update grid layout after expansion/collapse
    if (gridRef.current) {
      gridRef.current.updateLayout();
    }
  };

  return (
    <div>
      <h3>Card Title</h3>
      {isExpanded ? <p>{content}</p> : null}
      <button onClick={handleToggle}>
        {isExpanded ? 'Show Less' : 'Show More'}
      </button>
    </div>
  );
};
```

## Props

| Property               | Type                | Default     | Description                                                                                         |
|------------------------|---------------------|-------------|-----------------------------------------------------------------------------------------------------|
| `className`            | `string`            | `undefined` | Additional CSS class for the grid container                                                         |
| `style`                | `object`            | `{}`        | Additional styles for the grid container                                                            |
| `gridRef`              | `function`          | `null`      | Ref callback to access the grid instance                                                            |
| `component`            | `string`            | `"div"`     | HTML tag for the grid container                                                                     |
| `itemComponent`        | `string`            | `"span"`    | HTML tag for grid items                                                                             |
| `columnWidth`          | `number \| string`  | `150`       | Width of each column (px or percentage). Example: `150` or `"33.33%"`                              |
| `gutterWidth`          | `number`            | `5`         | Horizontal spacing between items (px)                                                               |
| `gutterHeight`         | `number`            | `5`         | Vertical spacing between items (px)                                                                 |
| `monitorImagesLoaded`  | `boolean`           | `false`     | Whether to monitor and reflow when images load                                                      |
| `enableSSR`            | `boolean`           | `false`     | Enable server-side rendering support                                                                |
| `onLayout`             | `function`          | `null`      | Callback after layout is complete                                                                   |
| `horizontal`           | `boolean`           | `false`     | Whether to use horizontal layout                                                                  |
| `rtl`                  | `boolean`           | `false`     | Enable right-to-left layouts                                                                        |
| `virtualized`          | `boolean`           | `false`     | **Enable virtualization** – only render items within (or near) the viewport for better performance with large grids |
| `debug`                | `boolean`           | `false`     | Enable debug logging for troubleshooting                                                             |

## Performance Features

### Virtualization
Enable virtualization for large grids to improve performance:
```jsx
<StackGrid virtualized={true}>
  {/* Only visible items are rendered */}
</StackGrid>
```

### Frozen Layout Performance
- **Event-driven architecture** - no timeouts or polling
- **Efficient height measurement** - only measures new items
- **Maintained virtualization** - performance not compromised during frozen state
- **Single layout calculation** - updates happen in one batch

## License

MIT
