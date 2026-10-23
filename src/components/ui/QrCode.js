import React, { useMemo } from 'react';
import { View } from 'react-native';
import qrcode from 'qrcode-generator';

/**
 * A QR code for `value`, drawn as square modules like the rest of the pixel
 * art. Each row is one View of dark runs, so a 29x29 code is a few hundred
 * views rather than eight hundred. `size` is the full width including the
 * quiet zone.
 */
export function QrCode({ value, size = 64, dark = '#000000', light = '#FFFFFF' }) {
  const rows = useMemo(() => {
    const code = qrcode(0, 'M');
    code.addData(value);
    code.make();
    const count = code.getModuleCount();
    const out = [];
    for (let r = 0; r < count; r++) {
      const runs = [];
      let start = null;
      for (let c = 0; c <= count; c++) {
        const isDark = c < count && code.isDark(r, c);
        if (isDark && start === null) start = c;
        if (!isDark && start !== null) {
          runs.push([start, c - start]);
          start = null;
        }
      }
      out.push(runs);
    }
    return { count, runs: out };
  }, [value]);

  // Two modules of quiet zone on every side, the minimum scanners need.
  // Modules snap to a third of a point (one pixel on a 3x screen) so no
  // hairline seams show between rows.
  const module = Math.max(1 / 3, Math.floor((size / (rows.count + 4)) * 3) / 3);
  const side = module * (rows.count + 4);
  return (
    <View style={{ width: side, height: side, backgroundColor: light, padding: module * 2 }}>
      {rows.runs.map((runs, r) => (
        <View key={r} style={{ height: module, flexDirection: 'row' }}>
          {runs.map(([start, length]) => (
            <View
              key={start}
              style={{
                position: 'absolute',
                left: start * module,
                width: length * module,
                height: module,
                backgroundColor: dark,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
