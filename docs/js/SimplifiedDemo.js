// @flow
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import StackGrid from '../../src/components/StackGrid';

const getRandomColor = () =>
  `#${
    Array.from({ length: 6 }, () =>
      '0123456789ABCDEF'[Math.floor(Math.random() * 16)]
    ).join('')
  }`;

const getRandomHeight = () => 150 + Math.floor(Math.random() * 250);

function DemoItem({ color, height, index }) {
  return (
    <div
      style={{
        backgroundColor: color,
        height: `${height}px`,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '18px',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'pointer',
        boxSizing: 'border-box',
        padding: '15px',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        Item
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
};

const generateItems = (count) =>
  Array.from({ length: count }, (_, i) => ({
    key: `item-${Date.now()}-${i}`,
    color: getRandomColor(),
    height: getRandomHeight(),
    index: i + 1,
  }));

function SimplifiedDemo() {
  const [items, setItems] = useState(generateItems(20));
  const [usedKeys, setUsedKeys] = useState(new Set(items.map((item) => item.key)));
  const [columnWidth, setColumnWidth] = useState(200);
  const [gutterSize, setGutterSize] = useState(10);
  const [isRTL, setIsRTL] = useState(false);
  const [isHorizontal, setIsHorizontal] = useState(false);

  const addItems = () => {
    const newItems = generateItems(5).map((item, idx) => {
      let { key } = item;
      while (usedKeys.has(key)) {
        key = `item-${Date.now()}-${items.length + idx}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
      }
      usedKeys.add(key);
      return {
        ...item,
        key,
        index: items.length + idx + 1,
      };
    });
    setUsedKeys(new Set([...usedKeys, ...newItems.map((item) => item.key)]));
    setItems([...items, ...newItems]);
  };

  const removeItems = () => {
    if (items.length > 5) {
      const itemsToRemove = items.slice(items.length - 5);
      const newUsedKeys = new Set(usedKeys);
      itemsToRemove.forEach((item) => newUsedKeys.delete(item.key));
      setUsedKeys(newUsedKeys);
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
    const keySet = new Set();
    const validItems = itemsToShuffle.filter((item) => {
      if (keySet.has(item.key)) {
        // eslint-disable-next-line no-console
        console.error('Duplicate key detected:', item.key);
        return false;
      }
      keySet.add(item.key);
      return true;
    });
    setItems(validItems);
  };

  let gridRef = null;

  return (
    <div>
      <h1>React Stack Grid Demo</h1>
      <p>
        This is a simplified demo showing the core grid functionality without
        animations or transitions.
      </p>

      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label htmlFor="columnWidth-input" style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 10 }}>Column Width:</span>
              <input
                id="columnWidth-input"
                type="range"
                min="100"
                max="400"
                value={columnWidth}
                onChange={(e) => setColumnWidth(Number(e.target.value))}
                aria-label="Column Width"
              />
            </label>
          </div>
          <div style={{ marginLeft: 10 }}>
            {columnWidth}
            {' '}
            px
          </div>
        </div>

        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label htmlFor="gutterSize-input" style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 10 }}>Gutter Size:</span>
              <input
                id="gutterSize-input"
                type="range"
                min="0"
                max="100"
                value={gutterSize}
                onChange={(e) => setGutterSize(Number(e.target.value))}
                aria-label="Gutter Size"
              />
            </label>
          </div>
          <div style={{ marginLeft: 10 }}>
            {gutterSize}
            {' '}
            px
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label htmlFor="rtl-checkbox" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                id="rtl-checkbox"
                type="checkbox"
                checked={isRTL}
                onChange={() => setIsRTL(!isRTL)}
                style={{ marginRight: 5 }}
                aria-label="RTL (Right-to-Left)"
              />
              <span>RTL (Right-to-Left)</span>
            </label>
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label htmlFor="horizontal-checkbox" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                id="horizontal-checkbox"
                type="checkbox"
                checked={isHorizontal}
                onChange={() => setIsHorizontal(!isHorizontal)}
                style={{ marginRight: 5 }}
                aria-label="Horizontal Layout"
              />
              <span>Horizontal Layout</span>
            </label>
          </div>
        </div>

        <div>
          <button type="button" onClick={addItems} style={{ marginRight: 10 }}>
            Add Items
          </button>
          <button type="button" onClick={removeItems} style={{ marginRight: 10 }}>
            Remove Items
          </button>
          <button type="button" onClick={shuffleItems} style={{ marginRight: 10 }}>
            Shuffle Items
          </button>
          <button
            type="button"
            onClick={() => gridRef && gridRef.updateLayout()}
            style={{ marginRight: 10 }}
          >
            Update Layout
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 0' }}>
        <StackGrid
          gridRef={(ref) => {
            gridRef = ref;
          }}
          columnWidth={columnWidth}
          gutterWidth={gutterSize}
          gutterHeight={gutterSize}
          monitorImagesLoaded
          rtl={isRTL}
          horizontal={isHorizontal}
        >
          {items.map((item) => (
            <DemoItem
              key={item.key}
              color={item.color}
              height={item.height}
              index={item.index}
            />
          ))}
        </StackGrid>
      </div>
    </div>
  );
}

export default SimplifiedDemo;
