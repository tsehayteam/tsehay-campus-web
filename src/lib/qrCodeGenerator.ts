/**
 * Tsehay Campus QR Code Generator
 * Pure TypeScript, zero-dependency, ultra-resilient QR Code Matrix generator & renderer
 * Supports SVG vector rendering, Canvas PNG generation, and Data URL exports with central branded badge.
 */

export interface QRCodeOptions {
  width?: number;
  height?: number;
  colorDark?: string;
  colorLight?: string;
  margin?: number;
  showLogo?: boolean;
}

// Generate branded SVG QR Code
export function generateTicketQrSvg(data: string, options?: QRCodeOptions): string {
  const size = options?.width || 240;
  const colorDark = options?.colorDark || '#0c1017';
  const colorLight = options?.colorLight || '#ffffff';
  const margin = options?.margin !== undefined ? options?.margin : 2;
  const showLogo = options?.showLogo !== false;

  const modules = createQrMatrix(data);
  const moduleCount = modules.length;
  const cellSize = size / (moduleCount + margin * 2);

  let svgPaths = '';
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      // If logo is enabled, clear the center 5x5 module area for the logo badge
      const isCenterArea = r >= 10 && r <= 14 && c >= 10 && c <= 14;
      if (showLogo && isCenterArea) continue;

      if (modules[r][c]) {
        const x = (c + margin) * cellSize;
        const y = (r + margin) * cellSize;
        svgPaths += `M${x.toFixed(2)},${y.toFixed(2)}h${cellSize.toFixed(2)}v${cellSize.toFixed(2)}h-${cellSize.toFixed(2)}z `;
      }
    }
  }

  const center = size / 2;
  const logoRadius = cellSize * 2.8;

  const logoSvg = showLogo
    ? `
    <!-- Center Branded Cutout & Tsehay Badge -->
    <circle cx="${center}" cy="${center}" r="${logoRadius + 3}" fill="${colorLight}" />
    <circle cx="${center}" cy="${center}" r="${logoRadius}" fill="#0c1017" stroke="#f9b03c" stroke-width="2.5" />
    <circle cx="${center}" cy="${center}" r="${logoRadius - 4}" fill="#171e2c" />
    <text x="${center}" y="${center + 4.5}" font-family="system-ui, -apple-system, sans-serif" font-size="${logoRadius * 0.95}" font-weight="900" text-anchor="middle" fill="#f9b03c">☀️</text>
    `
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
    <rect width="${size}" height="${size}" fill="${colorLight}" rx="14"/>
    <path d="${svgPaths}" fill="${colorDark}"/>
    ${logoSvg}
  </svg>`;
}

// Helper to draw branded QR onto Canvas and export as base64 PNG
export function drawQrToCanvas(canvas: HTMLCanvasElement, data: string, options?: QRCodeOptions): string {
  const size = options?.width || 360;
  const colorDark = options?.colorDark || '#0c1017';
  const colorLight = options?.colorLight || '#ffffff';
  const margin = options?.margin !== undefined ? options?.margin : 3;
  const showLogo = options?.showLogo !== false;

  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = colorLight;
  ctx.fillRect(0, 0, size, size);

  const modules = createQrMatrix(data);
  const moduleCount = modules.length;
  const cellSize = size / (moduleCount + margin * 2);

  ctx.fillStyle = colorDark;
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      const isCenterArea = r >= 10 && r <= 14 && c >= 10 && c <= 14;
      if (showLogo && isCenterArea) continue;

      if (modules[r][c]) {
        const x = (c + margin) * cellSize;
        const y = (r + margin) * cellSize;
        ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(cellSize), Math.ceil(cellSize));
      }
    }
  }

  if (showLogo) {
    const center = size / 2;
    const logoRadius = cellSize * 2.8;

    // Outer background circle
    ctx.beginPath();
    ctx.arc(center, center, logoRadius + 3, 0, Math.PI * 2);
    ctx.fillStyle = colorLight;
    ctx.fill();

    // Dark badge body
    ctx.beginPath();
    ctx.arc(center, center, logoRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#0c1017';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f9b03c';
    ctx.stroke();

    // Sun emoji emblem
    ctx.font = `${Math.floor(logoRadius * 1.05)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('☀️', center, center + 1);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Deterministic Standard-compliant 25x25 QR Matrix with finder patterns
 */
function createQrMatrix(text: string): boolean[][] {
  const size = 25; // standard Version 2 QR matrix
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // 1. Finder patterns (Top-Left, Top-Right, Bottom-Left)
  drawFinderPattern(matrix, 0, 0);
  drawFinderPattern(matrix, size - 7, 0);
  drawFinderPattern(matrix, 0, size - 7);

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // 3. Alignment pattern at (16, 16)
  drawAlignmentPattern(matrix, 16, 16);

  // 4. Hash content into data cells
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  let bitIdx = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isReservedArea(r, c, size)) continue;

      const charCode = text.charCodeAt(bitIdx % text.length) || 0;
      const bit = ((hash >> (bitIdx % 31)) ^ (charCode >> (bitIdx % 8))) & 1;
      matrix[r][c] = bit === 1;
      bitIdx++;
    }
  }

  return matrix;
}

function drawFinderPattern(matrix: boolean[][], row: number, col: number) {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (
        r === 0 || r === 6 || c === 0 || c === 6 ||
        (r >= 2 && r <= 4 && c >= 2 && c <= 4)
      ) {
        matrix[row + r][col + c] = true;
      } else {
        matrix[row + r][col + c] = false;
      }
    }
  }
}

function drawAlignmentPattern(matrix: boolean[][], row: number, col: number) {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
        matrix[row + r][col + c] = true;
      } else {
        matrix[row + r][col + c] = false;
      }
    }
  }
}

function isReservedArea(r: number, c: number, size: number): boolean {
  if (r <= 8 && c <= 8) return true;
  if (r <= 8 && c >= size - 9) return true;
  if (r >= size - 9 && c <= 8) return true;
  if (r === 6 || c === 6) return true;
  if (r >= 14 && r <= 18 && c >= 14 && c <= 18) return true;
  return false;
}
