// @flow
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import StackGrid from '../../src/components/StackGrid';

const COLUMN_WIDTH = 300;
const GUTTER_SIZE = 20;
const STANDARD_HEIGHT = 200;
const LONG_CARD_HEIGHT = 600;

function DemoItem({ color, height, index, isLong }) {
  return (
    <div
      style={{
        backgroundColor: color,
        height: `${height}px`,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '18px',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        boxSizing: 'border-box',
        padding: '15px',
        position: 'relative',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        {isLong ? 'Long Card' : 'Standard Card'}
        <br />
        {index}
        <br />
        <small style={{ opacity: 0.8 }}>
          {height}
          <br />
          px
        </small>
      </div>
    </div>
  );
}

DemoItem.propTypes = {
  color: PropTypes.string.isRequired,
  height: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
  isLong: PropTypes.bool.isRequired,
};

const generateItems = (count) => {
  const items = [];
  for (let i = 0; i < count; i++) {
    // Make the 5th item (index 4) the long one
    const isLong = i === 4;
    items.push({
      key: `item-${i}`,
      type: 'demo',
      color: isLong ? '#FF6B6B' : '#4ECDC4',
      height: isLong ? LONG_CARD_HEIGHT : STANDARD_HEIGHT,
      index: i + 1,
      isLong,
    });
  }
  return items;
};

function BalancedGridDemo() {
  const [items, setItems] = useState(generateItems(20));
  const [columnWidth] = useState(COLUMN_WIDTH);
  const [gutterSize] = useState(GUTTER_SIZE);

  const addItems = () => {
    const newItems = generateItems(5).map((item, i) => ({
      ...item,
      key: `item-${items.length + i}`,
      index: items.length + i + 1,
    }));
    setItems([...items, ...newItems]);
  };

  const removeItems = () => {
    if (items.length > 5) {
      setItems(items.slice(0, items.length - 5));
    }
  };

  const shuffleItems = () => {
    const itemsToShuffle = [...items];
    for (let i = itemsToShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [itemsToShuffle[i], itemsToShuffle[j]] = [itemsToShuffle[j], itemsToShuffle[i]];
      itemsToShuffle[i].index = i + 1;
      itemsToShuffle[j].index = j + 1;
    }
    setItems(itemsToShuffle);
  };

  return (
    <div>
      <h1>Balanced Grid Demo</h1>
      <p>
        This demo shows a grid with standard-sized cards and one extra long card.
        The goal is to maintain balanced columns while preserving smooth virtualization.
      </p>

      <div style={{ marginBottom: 20 }}>
        <button type="button" onClick={addItems} style={{ marginRight: 10 }}>
          Add 5 Items
        </button>
        <button type="button" onClick={removeItems} style={{ marginRight: 10 }}>
          Remove 5 Items
        </button>
        <button type="button" onClick={shuffleItems}>
          Shuffle Items
        </button>
      </div>

      <StackGrid
        columnWidth={columnWidth}
        gutterWidth={gutterSize}
        gutterHeight={gutterSize}
        duration={0}
        appearDelay={0}
        appear={null}
        appeared={null}
        enter={null}
        entered={null}
        leaved={null}
        monitorImagesLoaded={false}
        virtualized
      >
        {items.map((item) => (
          <div key={item.key} itemType="demo">
            <DemoItem
              color={item.color}
              height={item.height}
              index={item.index}
              isLong={item.isLong}
            />
          </div>
        ))}
      </StackGrid>
    </div>
  );
}

export default BalancedGridDemo;
