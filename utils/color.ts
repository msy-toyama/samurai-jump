
const colorCache: Record<string, [number, number, number]> = {};

export function hexToRgb(hex: string): [number, number, number] {
  if (colorCache[hex]) {
    return colorCache[hex];
  }
  
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  const rgb: [number, number, number] = result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0];
    
  colorCache[hex] = rgb;
  return rgb;
}

export function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  
  // Clamp t to [0, 1] to be safe
  const cl = Math.max(0, Math.min(1, t));

  const r = Math.round(r1 + (r2 - r1) * cl);
  const g = Math.round(g1 + (g2 - g1) * cl);
  const b = Math.round(b1 + (b2 - b1) * cl);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
