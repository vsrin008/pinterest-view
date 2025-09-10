/**
 * Pure function to compute layout for given keys
 * @param {string[]} keys - ordered array of React child keys
 * @param {Map<string,number>} heightCache - cached heights for items
 * @param {Object} config - layout configuration
 * @param {number} config.columnCount - number of columns
 * @param {number} config.columnWidth - width of each column
 * @param {number} config.gutterWidth - horizontal gutter between columns
 * @param {number} config.gutterHeight - vertical gutter between items
 * @param {number} config.offsetX - horizontal offset for alignment
 * @returns {Object} - map of key to rect { top, left, width, height }
 */
export default function computeLayout(keys, heightCache, config) {
  const { columnCount, columnWidth, gutterWidth, gutterHeight, offsetX = 0 } = config;
  const columnHeights = new Array(columnCount).fill(0);
  const rectsMap = {};

  keys.forEach((key) => {
    // Find shortest column
    let shortestColumnIndex = 0;
    let minHeight = columnHeights[0];
    for (let i = 1; i < columnHeights.length; i += 1) {
      if (columnHeights[i] < minHeight) {
        minHeight = columnHeights[i];
        shortestColumnIndex = i;
      }
    }

    // Get item height
    const height = heightCache.get(key) || 200;

    // Calculate position with alignment offset
    const left = offsetX + shortestColumnIndex * (columnWidth + gutterWidth);
    const top = columnHeights[shortestColumnIndex];

    // Store rect
    rectsMap[key] = {
      top,
      left,
      width: columnWidth,
      height,
    };

    // Update column height
    columnHeights[shortestColumnIndex] = top + height + gutterHeight;
  });

  return rectsMap;
}

/**
 * Compute container height from rects
 * @param {Object} rectsMap - map of key to rect
 * @param {Object} config - layout configuration
 * @returns {number} - container height
 */
export function computeContainerHeight(rectsMap, { gutterHeight }) {
  const rects = Object.values(rectsMap);
  if (rects.length === 0) return 0;
  
  const maxBottom = Math.max(...rects.map(rect => rect.top + rect.height));
  return maxBottom - gutterHeight;
} 