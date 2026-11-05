import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const STATE_FILE = path.join(ROOT_DIR, 'data', 'world-state.json');
const SVG_OUTPUT = path.join(ROOT_DIR, 'world-3d.svg');

export function renderWorldSvg(stateData) {
  const { gridSize = 6, mayor = {}, stats = {}, cells = [] } = stateData;

  const originX = 480;
  const originY = 160;
  const tileW = 80;
  const tileH = 40;
  const tileHalfW = tileW / 2; // 40
  const tileHalfH = tileH / 2; // 20

  // Helper for isometric projection
  function isoProject(row, col, altitude = 0) {
    const x = originX + (col - row) * tileHalfW;
    const y = originY + (col + row) * tileHalfH - altitude;
    return { x, y };
  }

  // Generate star field dots for night mode
  let starsSvg = '';
  const starCoords = [
    [50, 40], [120, 80], [210, 30], [330, 90], [420, 35],
    [560, 45], [680, 25], [780, 75], [890, 40], [920, 110],
    [80, 140], [160, 180], [820, 160], [890, 200], [40, 230],
    [930, 260], [140, 290], [830, 310], [60, 360], [900, 390]
  ];
  for (const [sx, sy] of starCoords) {
    starsSvg += `<circle cx="${sx}" cy="${sy}" r="1.5" class="star" />\n`;
  }

  // Sort cells in isometric rendering order:
  // Back to front = ascending (row + col). When tied, row ascending.
  const sortedCells = [...cells].sort((a, b) => {
    const depthA = a.row + a.col;
    const depthB = b.row + b.col;
    if (depthA !== depthB) return depthA - depthB;
    return a.row - b.row;
  });

  // Render ground tiles and buildings
  let elementsSvg = '';

  for (const cell of sortedCells) {
    const { row, col, type = 'empty', name = '', builder = '', level = 1, emoji = '' } = cell;
    const p = isoProject(row, col, 0);
    const cx = p.x;
    const cy = p.y;

    // Tile diamond points: Top, Right, Bottom, Left
    const topPt = `${cx},${cy - tileHalfH}`;
    const rightPt = `${cx + tileHalfW},${cy}`;
    const btmPt = `${cx},${cy + tileHalfH}`;
    const leftPt = `${cx - tileHalfW},${cy}`;

    // Base ground slab extrusion (6px deep)
    const slabH = 6;
    const leftFace = `${leftPt} ${cx},${cy + tileHalfH} ${cx},${cy + tileHalfH + slabH} ${cx - tileHalfW},${cy + slabH}`;
    const rightFace = `${cx},${cy + tileHalfH} ${rightPt} ${cx + tileHalfW},${cy + slabH} ${cx},${cy + tileHalfH + slabH}`;

    let tileMarkup = `
      <g class="grid-tile" data-coord="${row},${col}">
        <!-- Slab Depth -->
        <polygon points="${leftFace}" class="tile-slab-left" />
        <polygon points="${rightFace}" class="tile-slab-right" />
        <!-- Tile Top Diamond -->
        <polygon points="${topPt} ${rightPt} ${btmPt} ${leftPt}" class="tile-top ${type === 'empty' ? 'tile-empty' : 'tile-occupied'}" />
    `;

    if (type === 'empty') {
      // Subtle plot coordinate grid label
      tileMarkup += `
        <text x="${cx}" y="${cy + 4}" text-anchor="middle" class="plot-label">${row},${col}</text>
      </g>`;
    } else {
      tileMarkup += `</g>`;

      // Render 3D Building on top of this tile
      tileMarkup += renderBuilding(type, cx, cy, level, name, builder, emoji);
    }

    elementsSvg += tileMarkup + '\n';
  }

  const occupiedCount = cells.filter(c => c.type && c.type !== 'empty').length;
  const occupancyPercent = Math.round((occupiedCount / (gridSize * gridSize)) * 100);

  const mayorAnnouncement = escapeXml(mayor.announcement || 'Welcome to the Community World! Open an issue to claim a plot.');
  const mayorMood = escapeXml(mayor.mood || 'Visionary');
  const mayorName = escapeXml(mayor.name || 'Mayor Pixel-8');
  const lastBuilder = escapeXml(stats.lastBuilder || 'Citizen');
  const lastAction = escapeXml(stats.lastAction || 'Constructed a building');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 620" width="100%" height="100%">
  <defs>
    <!-- Light Mode Gradients -->
    <linearGradient id="lightSky" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E0F2FE" />
      <stop offset="50%" stop-color="#EFF6FF" />
      <stop offset="100%" stop-color="#F8FAFC" />
    </linearGradient>

    <!-- Dark Mode Gradients -->
    <linearGradient id="darkSky" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090D16" />
      <stop offset="50%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#1E1B4B" />
    </linearGradient>

    <!-- Glass HUD Gradient -->
    <linearGradient id="glassLight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.85" />
      <stop offset="100%" stop-color="#F1F5F9" stop-opacity="0.95" />
    </linearGradient>
    <linearGradient id="glassDark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E293B" stop-opacity="0.88" />
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0.96" />
    </linearGradient>

    <!-- Shading Filter for 3D glow -->
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15" />
    </filter>

    <style>
      /* Base font stack */
      text {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }

      /* Animations */
      @keyframes twinkle {
        0%, 100% { opacity: 0.3; transform: scale(0.8); }
        50% { opacity: 1; transform: scale(1.2); }
      }
      @keyframes floatSlow {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-4px); }
      }
      @keyframes pulseBeacon {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 1; }
      }

      .star {
        fill: #38BDF8;
        animation: twinkle 3s ease-in-out infinite;
      }
      .star:nth-child(2n) { animation-delay: 1s; fill: #F472B6; }
      .star:nth-child(3n) { animation-delay: 2s; fill: #FDE047; }

      .beacon-light {
        animation: pulseBeacon 2s infinite ease-in-out;
      }

      /* Default / Light Mode */
      :root {
        --sky-fill: url(#lightSky);
        --stars-opacity: 0;
        --sun-opacity: 1;
        --hud-bg: url(#glassLight);
        --hud-stroke: #CBD5E1;
        --hud-shadow: rgba(0, 0, 0, 0.08);
        --text-primary: #0F172A;
        --text-secondary: #475569;
        --text-accent: #2563EB;
        --plot-stroke: #CBD5E1;
        --plot-fill: #E2E8F0;
        --tile-top-empty: #F1F5F9;
        --tile-top-occupied: #86EFAC;
        --tile-slab-l: #94A3B8;
        --tile-slab-r: #64748B;
        --plot-text: #94A3B8;
      }

      /* Dark Mode Media Query */
      @media (prefers-color-scheme: dark) {
        :root {
          --sky-fill: url(#darkSky);
          --stars-opacity: 1;
          --sun-opacity: 0;
          --hud-bg: url(#glassDark);
          --hud-stroke: #334155;
          --hud-shadow: rgba(0, 0, 0, 0.4);
          --text-primary: #F8FAFC;
          --text-secondary: #94A3B8;
          --text-accent: #38BDF8;
          --plot-stroke: #334155;
          --plot-fill: #1E293B;
          --tile-top-empty: #1E293B;
          --tile-top-occupied: #065F46;
          --tile-slab-l: #0F172A;
          --tile-slab-r: #090D16;
          --plot-text: #64748B;
        }
      }

      .world-bg { fill: var(--sky-fill); }
      .stars-layer { opacity: var(--stars-opacity); transition: opacity 0.3s; }
      .sun-element { opacity: var(--sun-opacity); transition: opacity 0.3s; }

      .hud-panel {
        fill: var(--hud-bg);
        stroke: var(--hud-stroke);
        stroke-width: 1.5;
        filter: drop-shadow(0 6px 16px var(--hud-shadow));
      }
      .txt-title { font-weight: 800; fill: var(--text-primary); }
      .txt-body { font-weight: 500; fill: var(--text-secondary); }
      .txt-accent { font-weight: 700; fill: var(--text-accent); }

      .tile-top.tile-empty {
        fill: var(--tile-top-empty);
        stroke: var(--plot-stroke);
        stroke-width: 1;
      }
      .tile-top.tile-occupied {
        fill: var(--tile-top-occupied);
        stroke: rgba(0,0,0,0.15);
        stroke-width: 1;
      }
      .tile-slab-left { fill: var(--tile-slab-l); }
      .tile-slab-right { fill: var(--tile-slab-r); }
      .plot-label {
        font-size: 9px;
        fill: var(--plot-text);
        font-weight: 600;
        pointer-events: none;
      }
    </style>
  </defs>

  <!-- Sky Canvas Background -->
  <rect width="960" height="620" class="world-bg" rx="16" />

  <!-- Stars Layer (Visible in Dark Mode) -->
  <g class="stars-layer">
    ${starsSvg}
    <!-- Cyber Moon -->
    <circle cx="860" cy="80" r="32" fill="#E2E8F0" opacity="0.85" />
    <circle cx="848" cy="74" r="28" class="world-bg" />
  </g>

  <!-- Sun Element (Visible in Light Mode) -->
  <g class="sun-element">
    <circle cx="860" cy="80" r="32" fill="#FBBF24" opacity="0.85" />
    <circle cx="860" cy="80" r="42" fill="#FDE68A" opacity="0.35" filter="url(#softGlow)" />
  </g>

  <!-- Header Branding Bar -->
  <g transform="translate(30, 25)">
    <rect width="320" height="48" rx="12" class="hud-panel" />
    <circle cx="28" cy="24" r="14" fill="#3B82F6" />
    <text x="28" y="29" font-size="14" text-anchor="middle" fill="#FFFFFF">🪐</text>
    <text x="52" y="22" class="txt-title" font-size="13" letter-spacing="0.5">ISOMETRIC 3D WORLD</text>
    <text x="52" y="38" class="txt-body" font-size="10">GitHub Powered • 6x6 Community Grid</text>
  </g>

  <!-- Stats Pill Top-Right -->
  <g transform="translate(610, 25)">
    <rect width="320" height="48" rx="12" class="hud-panel" />
    <text x="20" y="21" class="txt-body" font-size="10">GRID OCCUPANCY</text>
    <text x="20" y="38" class="txt-accent" font-size="14">${occupiedCount} / 36 (${occupancyPercent}%)</text>
    <line x1="160" y1="10" x2="160" y2="38" stroke="var(--hud-stroke)" stroke-width="1" />
    <text x="175" y="21" class="txt-body" font-size="10">AI MAYOR STATUS</text>
    <text x="175" y="38" class="txt-title" font-size="13">⚡ ${mayorMood}</text>
  </g>

  <!-- Isometric 3D World Stage -->
  <g id="isometric-stage">
    ${elementsSvg}
  </g>

  <!-- Bottom AI Mayor Announcement & Activity HUD -->
  <g transform="translate(40, 500)">
    <rect width="880" height="96" rx="16" class="hud-panel" />

    <!-- Mayor Robot Avatar Box -->
    <g transform="translate(18, 14)">
      <rect width="68" height="68" rx="14" fill="#3B82F6" opacity="0.15" />
      <rect width="68" height="68" rx="14" fill="none" stroke="#3B82F6" stroke-width="1.5" />
      <text x="34" y="44" font-size="34" text-anchor="middle">🤖</text>
      <circle cx="58" cy="14" r="7" fill="#10B981" />
      <circle cx="58" cy="14" r="10" fill="#10B981" opacity="0.4" class="beacon-light" />
    </g>

    <!-- Mayor Speech & Proclamation -->
    <text x="104" y="30" class="txt-title" font-size="13">${mayorName} Proclaims:</text>
    <text x="104" y="52" class="txt-body" font-size="12" font-style="italic">"${mayorAnnouncement}"</text>

    <!-- Footer Activity Status -->
    <g transform="translate(104, 76)">
      <rect width="12" height="12" rx="3" fill="#10B981" />
      <text x="20" y="10" class="txt-body" font-size="10">Latest Architect: <tspan class="txt-title">@${lastBuilder}</tspan> (${lastAction})</text>
    </g>

    <!-- Star Prompt Callout -->
    <g transform="translate(720, 26)">
      <rect width="140" height="44" rx="10" fill="#F59E0B" opacity="0.15" />
      <rect width="140" height="44" rx="10" fill="none" stroke="#F59E0B" stroke-width="1" />
      <text x="70" y="20" font-size="11" font-weight="700" fill="#F59E0B" text-anchor="middle">⭐ Star to Build</text>
      <text x="70" y="34" font-size="9" font-weight="500" fill="var(--text-secondary)" text-anchor="middle">Unlock VIP Golden Plots</text>
    </g>
  </g>
</svg>`;
}

// 3D Building Geometry Generator for Isometric Grid
function renderBuilding(type, cx, cy, level = 1, name = '', builder = '', emoji = '') {
  // Building height based on type
  let h = 42;
  if (type === 'townhall') h = 58;
  if (type === 'datacenter' || type === 'tower') h = 64;
  if (type === 'spaceport') h = 48;
  if (type === 'park') h = 24;

  const bx = cx;
  const by = cy;

  const halfW = 28;
  const halfH = 14;

  // Base coords for cuboid:
  // Base floor center: (bx, by)
  // Roof center: (bx, by - h)
  const roofCenterY = by - h;

  // Color schemes per building type
  const schemes = {
    townhall: { top: '#E2E8F0', left: '#94A3B8', right: '#CBD5E1', accent: '#3B82F6', trim: '#F59E0B' },
    bakery: { top: '#FDE68A', left: '#F59E0B', right: '#D97706', accent: '#EF4444', trim: '#FFFFFF' },
    cafe: { top: '#A7F3D0', left: '#059669', right: '#10B981', accent: '#047857', trim: '#6EE7B7' },
    arcade: { top: '#F472B6', left: '#BE185D', right: '#DB2777', accent: '#38BDF8', trim: '#FDE047' },
    datacenter: { top: '#38BDF8', left: '#0284C7', right: '#0369A1', accent: '#10B981', trim: '#67E8F9' },
    park: { top: '#86EFAC', left: '#16A34A', right: '#22C55E', accent: '#15803D', trim: '#4ADE80' },
    spaceport: { top: '#CBD5E1', left: '#475569', right: '#64748B', accent: '#EF4444', trim: '#F8FAFC' },
    tower: { top: '#93C5FD', left: '#2563EB', right: '#3B82F6', accent: '#60A5FA', trim: '#E0F2FE' },
    house: { top: '#FCA5A5', left: '#DC2626', right: '#EF4444', accent: '#FDE047', trim: '#FEF3C7' },
    observatory: { top: '#C084FC', left: '#7E22CE', right: '#9333EA', accent: '#38BDF8', trim: '#E9D5FF' },
  };

  const scheme = schemes[type] || schemes.house;

  // Roof points
  const rTop = `${bx},${roofCenterY - halfH}`;
  const rRight = `${bx + halfW},${roofCenterY}`;
  const rBtm = `${bx},${roofCenterY + halfH}`;
  const rLeft = `${bx - halfW},${roofCenterY}`;

  // Walls
  const leftWall = `${rLeft} ${rBtm} ${bx},${by + halfH} ${bx - halfW},${by}`;
  const rightWall = `${rBtm} ${rRight} ${bx + halfW},${by} ${bx},${by + halfH}`;

  let customFeature = '';

  if (type === 'townhall') {
    // Neo-classical cyber dome + beacon
    customFeature = `
      <!-- Town Hall Columns & Beacon -->
      <polygon points="${bx},${roofCenterY - halfH - 16} ${bx + 14},${roofCenterY - halfH} ${bx},${roofCenterY - halfH + 8} ${bx - 14},${roofCenterY - halfH}" fill="#F59E0B" />
      <line x1="${bx}" y1="${roofCenterY - halfH - 16}" x2="${bx}" y2="${roofCenterY - halfH - 26}" stroke="#F59E0B" stroke-width="2" />
      <circle cx="${bx}" cy="${roofCenterY - halfH - 26}" r="3" fill="#EF4444" class="beacon-light" />
      <!-- Clock Face on Left Wall -->
      <circle cx="${bx - 14}" cy="${roofCenterY + 12}" r="5" fill="#FFFFFF" stroke="#334155" stroke-width="1" />
    `;
  } else if (type === 'bakery') {
    // Red & white striped awning over right face
    customFeature = `
      <polygon points="${bx},${roofCenterY + halfH} ${bx + 20},${roofCenterY + halfH - 10} ${bx + 20},${roofCenterY + halfH - 2} ${bx},${roofCenterY + halfH + 8}" fill="#EF4444" />
      <polygon points="${bx + 6},${roofCenterY + halfH - 3} ${bx + 14},${roofCenterY + halfH - 7} ${bx + 14},${roofCenterY + halfH + 1} ${bx + 6},${roofCenterY + halfH + 5}" fill="#FFFFFF" />
      <!-- Chimney with smoke -->
      <polygon points="${bx - 12},${roofCenterY - 14} ${bx - 6},${roofCenterY - 11} ${bx - 6},${roofCenterY - 4} ${bx - 12},${roofCenterY - 7}" fill="#DC2626" />
      <circle cx="${bx - 9}" cy="${roofCenterY - 18}" r="3" fill="#E2E8F0" opacity="0.7" />
      <circle cx="${bx - 7}" cy="${roofCenterY - 24}" r="4" fill="#E2E8F0" opacity="0.4" />
    `;
  } else if (type === 'cafe') {
    // Neon Cup Sign
    customFeature = `
      <polygon points="${bx - 2},${roofCenterY - 12} ${bx + 14},${roofCenterY - 4} ${bx + 14},${roofCenterY + 2} ${bx - 2},${roofCenterY - 6}" fill="#047857" />
      <text x="${bx + 6}" y="${roofCenterY - 2}" font-size="9" text-anchor="middle" fill="#FFFFFF">☕</text>
    `;
  } else if (type === 'arcade') {
    // Synthwave Neon marquee
    customFeature = `
      <polygon points="${bx - halfW + 4},${roofCenterY + 6} ${bx - 4},${roofCenterY + halfH + 4} ${bx - 4},${roofCenterY + halfH - 4} ${bx - halfW + 4},${roofCenterY - 2}" fill="#FDE047" opacity="0.9" />
      <line x1="${bx + 8}" y1="${roofCenterY + 4}" x2="${bx + 22}" y2="${roofCenterY - 3}" stroke="#38BDF8" stroke-width="2" />
      <circle cx="${bx}" cy="${roofCenterY - halfH}" r="4" fill="#F43F5E" class="beacon-light" />
    `;
  } else if (type === 'datacenter') {
    // Server tower blinking rack lights
    customFeature = `
      <line x1="${bx - 18}" y1="${roofCenterY + 12}" x2="${bx - 18}" y2="${by + 6}" stroke="#10B981" stroke-width="2" stroke-dasharray="2 2" />
      <line x1="${bx - 10}" y1="${roofCenterY + 16}" x2="${bx - 10}" y2="${by + 10}" stroke="#38BDF8" stroke-width="2" stroke-dasharray="3 2" />
      <line x1="${bx + 10}" y1="${roofCenterY + 16}" x2="${bx + 10}" y2="${by + 10}" stroke="#10B981" stroke-width="2" stroke-dasharray="2 2" />
      <circle cx="${bx}" cy="${roofCenterY - halfH - 8}" r="3" fill="#67E8F9" class="beacon-light" />
      <line x1="${bx}" y1="${roofCenterY - halfH}" x2="${bx}" y2="${roofCenterY - halfH - 8}" stroke="#67E8F9" stroke-width="1.5" />
    `;
  } else if (type === 'spaceport') {
    // Rocket on launch pad
    customFeature = `
      <polygon points="${bx},${roofCenterY - 24} ${bx + 6},${roofCenterY - 6} ${bx - 6},${roofCenterY - 6}" fill="#EF4444" />
      <rect x="${bx - 4}" y="${roofCenterY - 6}" width="8" height="14" fill="#F8FAFC" rx="1" />
      <line x1="${bx - 7}" y1="${roofCenterY + 8}" x2="${bx - 4}" y2="${roofCenterY}" stroke="#EF4444" stroke-width="2" />
      <line x1="${bx + 7}" y1="${roofCenterY + 8}" x2="${bx + 4}" y2="${roofCenterY}" stroke="#EF4444" stroke-width="2" />
    `;
  } else if (type === 'park') {
    // Low-poly 3D pine tree
    customFeature = `
      <!-- Trunk -->
      <rect x="${bx - 2}" y="${by - 14}" width="4" height="14" fill="#78350F" />
      <!-- Tree Foliage Cones -->
      <polygon points="${bx},${by - 38} ${bx + 16},${by - 22} ${bx - 16},${by - 22}" fill="#15803D" />
      <polygon points="${bx},${by - 32} ${bx + 13},${by - 18} ${bx - 13},${by - 18}" fill="#16A34A" />
      <!-- Tiny Flower / Bench -->
      <circle cx="${bx + 14}" cy="${by + 2}" r="3" fill="#F472B6" />
      <circle cx="${bx - 14}" cy="${by + 4}" r="2" fill="#FDE047" />
    `;
  }

  // Floating emoji badge above building
  const badgeY = roofCenterY - halfH - (type === 'townhall' ? 34 : 18);
  const displayEmoji = emoji || (type === 'townhall' ? '🏛️' : type === 'bakery' ? '🥐' : '🏠');

  return `
    <g class="building-group" style="cursor: pointer;">
      <!-- Walls -->
      <polygon points="${leftWall}" fill="${scheme.left}" />
      <polygon points="${rightWall}" fill="${scheme.right}" />
      <!-- Roof -->
      <polygon points="${rTop} ${rRight} ${rBtm} ${rLeft}" fill="${scheme.top}" />
      
      <!-- Architectural features -->
      ${customFeature}

      <!-- Floating Emoji Badge -->
      <g transform="translate(${bx}, ${badgeY})">
        <circle cx="0" cy="0" r="11" fill="#FFFFFF" stroke="${scheme.accent}" stroke-width="1.5" filter="url(#dropShadow)" />
        <text x="0" y="4" font-size="11" text-anchor="middle">${displayEmoji}</text>
      </g>
    </g>
  `;
}

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Standalone CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const rawData = fs.readFileSync(STATE_FILE, 'utf-8');
    const state = JSON.parse(rawData);
    const svgContent = renderWorldSvg(state);
    fs.writeFileSync(SVG_OUTPUT, svgContent, 'utf-8');
    console.log(`[SVG Engine] Successfully rendered 3D Isometric World to: ${SVG_OUTPUT}`);
  } catch (err) {
    console.error(`[SVG Engine Error]:`, err);
    process.exit(1);
  }
}
