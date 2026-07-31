import React, { useMemo } from 'react';
import { View } from 'react-native';

/**
 * PixelSprite renders a bitmap-style sprite from a 2D grid of single-character
 * color keys. Each non-transparent cell becomes a small square View, giving an
 * authentic pixel-art look without any image assets.
 *
 * Usage:
 *   <PixelSprite
 *     grid={["..A..", ".AAA.", "AAAAA"]}
 *     palette={{ A: '#C98A3B' }}
 *     pixelSize={6}
 *   />
 *
 * A space or '.' means a transparent cell.
 */
export default function PixelSprite({ grid, palette, pixelSize = 6, style }) {
  const { rows, cols } = useMemo(
    () => ({
      rows: grid.length,
      cols: grid.reduce((max, row) => Math.max(max, row.length), 0),
    }),
    [grid]
  );

  const cells = useMemo(() => {
    const out = [];
    for (let y = 0; y < grid.length; y += 1) {
      const row = grid[y];
      for (let x = 0; x < row.length; x += 1) {
        const key = row[x];
        if (key === ' ' || key === '.') continue;
        const color = palette[key];
        if (!color) continue;
        out.push({ x, y, color, key: `${x}-${y}` });
      }
    }
    return out;
  }, [grid, palette]);

  return (
    <View
      style={[
        {
          width: cols * pixelSize,
          height: rows * pixelSize,
        },
        style,
      ]}
    >
      {cells.map((cell) => (
        <View
          key={cell.key}
          style={{
            position: 'absolute',
            left: cell.x * pixelSize,
            top: cell.y * pixelSize,
            width: pixelSize,
            height: pixelSize,
            backgroundColor: cell.color,
          }}
        />
      ))}
    </View>
  );
}
