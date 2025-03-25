// @flow
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import StackGrid from '../../src/components/StackGrid';

const COLUMN_WIDTH_MIN = 100;
const COLUMN_WIDTH_MAX = 400;
const GUTTER_SIZE_MIN = 0;
const GUTTER_SIZE_MAX = 100;

const getRandomColor = () =>
  `#${
    Array.from({ length: 6 }, () =>
      '0123456789ABCDEF'[Math.floor(Math.random() * 16)]
    ).join('')
  }`;

const getRandomHeight = () => 200 + Math.floor(Math.random() * 300);

function DemoItem({ color, height, index }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const baseHeight = height;
  const expandedHeight = baseHeight + 100;

  return (
    <div
      style={{
        backgroundColor: color,
        height: `${isExpanded ? expandedHeight : baseHeight}px`,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '18px',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
        boxSizing: 'border-box',
        padding: '15px',
        willChange: 'transform, height',
        position: 'relative',
        zIndex: isExpanded ? 2 : 1,
      }}
    >
      <div style={{ textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center' }}>
        <div>
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

      {isExpanded && (
        <div
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            marginTop: '10px',
            textAlign: 'center',
          }}
        >
          Expanded Content
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseOver={() => setIsHovered(true)}
        onMouseOut={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        style={{
          backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
          border: 'none',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
          marginTop: '10px',
          transition: 'background-color 0.2s ease',
        }}
      >
        {isExpanded ? 'Collapse' : 'Expand'}
      </button>
    </div>
  );
}

DemoItem.propTypes = {
  color: PropTypes.string.isRequired,
  height: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
};

const generateItems = (count, startIndex = 0) =>
  Array.from({ length: count }, (_, i) => ({
    key: `item-${Date.now()}-${i}`,
    type: 'demo',
    color: getRandomColor(),
    height: getRandomHeight(),
    index: startIndex + i + 1,
  }));

function SimplifiedDemo() {
  const [items, setItems] = useState(generateItems(10));
  const [usedKeys, setUsedKeys] = useState(new Set(items.map((item) => item.key)));
  const [columnWidth, setColumnWidth] = useState(300);
  const [gutterSize, setGutterSize] = useState(20);
  const [isRTL, setIsRTL] = useState(false);
  const [isHorizontal, setIsHorizontal] = useState(false);

  const handleColumnWidthChange = (value) => {
    const newValue = Math.min(COLUMN_WIDTH_MAX, Math.max(COLUMN_WIDTH_MIN, Number(value)));
    setColumnWidth(newValue);
  };

  const handleGutterSizeChange = (value) => {
    const newValue = Math.min(GUTTER_SIZE_MAX, Math.max(GUTTER_SIZE_MIN, Number(value)));
    setGutterSize(newValue);
  };

  const addItems = () => {
    const demoItemCount = items.length;
    const newItems = generateItems(5, demoItemCount).map((item) => {
      let { key } = item;
      while (usedKeys.has(key)) {
        key = `item-${Date.now()}-${items.length}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
      }
      usedKeys.add(key);
      return { ...item, key };
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
    setItems(itemsToShuffle);
  };

  let gridRef = null;

  return (
    <div>
      <h1>React Stack Grid Demo</h1>
      <p>
        This demo shows how the grid system can handle React components with dynamic heights
        and maintain smooth transitions during layout changes.
      </p>

      <div style={{ marginBottom: 20 }}>
        <div className="form-group">
          <label htmlFor="columnWidth">Column width:</label>
          <div className="control-group">
            <div className="input-with-slider">
              <input
                id="columnWidth"
                type="number"
                className="form-control"
                value={columnWidth}
                min={COLUMN_WIDTH_MIN}
                max={COLUMN_WIDTH_MAX}
                onChange={(e) => handleColumnWidthChange(e.target.value)}
              />
              <input
                type="range"
                className="form-range"
                min={COLUMN_WIDTH_MIN}
                max={COLUMN_WIDTH_MAX}
                value={columnWidth}
                onChange={(e) => handleColumnWidthChange(e.target.value)}
                aria-label="Column width slider"
              />
            </div>
          </div>
          <small className="form-text">
            Min: {COLUMN_WIDTH_MIN} px, Max: {COLUMN_WIDTH_MAX} px
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="gutterSize">Gutter size:</label>
          <div className="control-group">
            <div className="input-with-slider">
              <input
                id="gutterSize"
                type="number"
                className="form-control"
                value={gutterSize}
                min={GUTTER_SIZE_MIN}
                max={GUTTER_SIZE_MAX}
                onChange={(e) => handleGutterSizeChange(e.target.value)}
              />
              <input
                type="range"
                className="form-range"
                min={GUTTER_SIZE_MIN}
                max={GUTTER_SIZE_MAX}
                value={gutterSize}
                onChange={(e) => handleGutterSizeChange(e.target.value)}
                aria-label="Gutter size slider"
              />
            </div>
          </div>
          <small className="form-text">
            Min: {GUTTER_SIZE_MIN} px, Max: {GUTTER_SIZE_MAX} px
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="rtl" className="checkbox-label">
            <input
              id="rtl"
              type="checkbox"
              checked={isRTL}
              onChange={() => setIsRTL(!isRTL)}
            />
            <span>RTL</span>
          </label>
        </div>

        <div className="form-group">
          <label htmlFor="horizontal" className="checkbox-label">
            <input
              id="horizontal"
              type="checkbox"
              checked={isHorizontal}
              onChange={() => setIsHorizontal(!isHorizontal)}
            />
            <span>Horizontal</span>
          </label>
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
          // Enable virtualization here
          virtualized={true}
          gridRef={(ref) => {
            gridRef = ref;
          }}
          columnWidth={columnWidth}
          gutterWidth={gutterSize}
          gutterHeight={gutterSize}
          monitorImagesLoaded
          rtl={isRTL}
          horizontal={isHorizontal}
          style={{
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'transform',
          }}
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
