# pintrest-view

[![npm version](https://badge.fury.io/js/%40zapperwing%2Fpintrest-view.svg)](https://www.npmjs.com/package/@zapperwing/pintrest-view)
[![npm downloads](https://img.shields.io/npm/dm/@zapperwing/pintrest-view.svg)](https://www.npmjs.com/package/@zapperwing/pintrest-view)

A Pinterest-style grid layout component for React.js with responsive design and dynamic content support. Create beautiful, responsive grid layouts that automatically adjust to your content.

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
    >
      <div key="item1">First Item</div>
      <div key="item2">Second Item</div>
      <div key="item3">Third Item</div>
    </StackGrid>
  );
};
```

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
```

### Tips for Custom Components

1. **Height Calculation**: The grid automatically detects the rendered height of your components. No special configuration needed!

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
| `onLayout`           | `function`         | `null`