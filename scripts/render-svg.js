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

  // Occupied cells
  const occupiedCells = cells.filter(c => c.type && c.type !== 'empty');
  const totalBuildings = occupiedCells.length;

  // Unique builders count
  const buildersSet = new Set(occupiedCells.map(c => c.builder).filter(Boolean));
  const buildersCount = Math.max(buildersSet.size, 1);

  // Recent drops (latest 2-3 occupied cells)
  const recentDrops = [...occupiedCells]
    .sort((a, b) => {
      const timeA = new Date(a.upgradedAt || a.builtAt || 0).getTime();
      const timeB = new Date(b.upgradedAt || b.builtAt || 0).getTime();
      return timeB - timeA;
    })
    .slice(0, 2);

  // If fewer than 2 drops, add mock fallback drops
  if (recentDrops.length < 1) {
    recentDrops.push({
      builder: 'alex_dev',
      emoji: '🏢',
      type: 'tower',
      name: 'Gold Skyscraper',
      row: 3,
      col: 1,
      isVip: true
    });
  }
  if (recentDrops.length < 2) {
    recentDrops.push({
      builder: 'priya_codes',
      emoji: '☕',
      type: 'cafe',
      name: '3D Chai Hub',
      row: 4,
      col: 4,
      isVip: false
    });
  }

  // Island grid origin and tile dimensions
  // Top corner of island: (304, 195)
  // Step vectors:
  // col direction (down-right): dx = +30, dy = +15
  // row direction (down-left):  dx = -30, dy = +15
  function getTileCenter(row, col) {
    const cx = 304 + (col - row) * 30;
    const cy = 195 + (col + row + 1) * 15;
    return { cx, cy };
  }

  // Sort occupied cells for isometric Painter's algorithm:
  // Ascending (row + col), then ascending row
  const sortedOccupied = [...occupiedCells].sort((a, b) => {
    const depthA = a.row + a.col;
    const depthB = b.row + b.col;
    if (depthA !== depthB) return depthA - depthB;
    return a.row - b.row;
  });

  // Render 3D Buildings
  let buildingsSvg = '';
  for (const cell of sortedOccupied) {
    const { row, col, type, name, builder, level = 1, emoji = '' } = cell;
    const { cx, cy } = getTileCenter(row, col);
    buildingsSvg += renderVoxelBuilding(cx, cy, type, name, builder, level, emoji, row, col) + '\n';
  }

  // Generate Recent Drops HTML
  let dropsSvg = '';
  const dropPositions = [284, 340];
  recentDrops.forEach((drop, idx) => {
    const yPos = dropPositions[idx] || 284;
    const isVip = drop.isVip || (drop.level && drop.level > 1);
    const dropEmoji = drop.emoji || '🏛️';
    const dropBuilder = escapeXml(drop.builder || 'Architect');
    const dropDesc = escapeXml(`Built ${drop.name || drop.type} at Tile (${drop.row},${drop.col})`);

    dropsSvg += `
    <rect x="624" y="${yPos}" width="252" height="46" rx="14" class="card-box" filter="url(#neo-raised)"/>
    <circle cx="647" cy="${yPos + 23}" r="14" fill="${isVip ? '#FDE047' : '#FFEDD5'}"/>
    <text x="647" y="${yPos + 28}" text-anchor="middle" font-size="12">${dropEmoji}</text>
    <text x="670" y="${yPos + 19}" class="font-ui text-title" font-size="12" font-weight="800">@${dropBuilder} ${isVip ? '<tspan fill="#F59E0B" font-size="10">★ VIP</tspan>' : ''}</text>
    <text x="670" y="${yPos + 35}" class="font-ui text-subtitle" font-size="11" font-weight="600">${dropDesc}</text>
    `;
  });

  const announcement = escapeXml(mayor.announcement || 'Theme synced with visitor profile! At night, the sky turns deep midnight and building windows start glowing.');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 580" width="100%" height="100%">
  <defs>
    <!-- ================= DAY & NIGHT CSS THEME VARIABLES ================= -->
    <style>
      .font-ui { font-family: 'Quicksand', 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      .font-mono { font-family: 'JetBrains Mono', 'Fira Code', monospace; }

      @keyframes hoverBoard {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-6px); }
      }
      @keyframes floatCube {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
      }
      @keyframes pulseGlow {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }
      .iso-world { animation: hoverBoard 5s ease-in-out infinite; }
      .floating-holo { animation: floatCube 3.2s ease-in-out infinite; }
      .window-glow { animation: pulseGlow 2.5s infinite; }

      /* DEFAULT: LIGHT / DAY THEME */
      :root {
        --bg-main: #EEF2F9;
        --card-bg: #EEF2F9;
        --text-main: #1E293B;
        --text-sub: #64748B;
        --sky-top: #E0F2FE;
        --sky-bottom: #F8FAFC;
        --sun-moon-fill: #FEF08A;
        --sun-moon-core: #F59E0B;
        --island-top: #6EE7B7;
        --island-cliff: #F59E0B;
        --island-cliff-dark: #D97706;
        --window-day: #FEF08A;
      }

      /* AUTOMATIC GITHUB DARK MODE DETECT */
      @media (prefers-color-scheme: dark) {
        :root {
          --bg-main: #0D1117;
          --card-bg: #161B22;
          --text-main: #F0F6FC;
          --text-sub: #8B949E;
          --sky-top: #0F172A;
          --sky-bottom: #1E1B4B;
          --sun-moon-fill: #FDE047;
          --sun-moon-core: #FACC15;
          --island-top: #065F46;
          --island-cliff: #78350F;
          --island-cliff-dark: #451A03;
          --window-day: #FBBF24;
        }
      }

      .bg-board { fill: var(--bg-main); transition: fill 0.3s ease; }
      .card-box { fill: var(--card-bg); transition: fill 0.3s ease; }
      .text-title { fill: var(--text-main); transition: fill 0.3s ease; }
      .text-subtitle { fill: var(--text-sub); transition: fill 0.3s ease; }
      .sky-top { stop-color: var(--sky-top); transition: stop-color 0.3s ease; }
      .sky-bottom { stop-color: var(--sky-bottom); transition: stop-color 0.3s ease; }
      .sun-moon { fill: var(--sun-moon-fill); }
      .island-grass { fill: var(--island-top); }
      .cliff-side { fill: var(--island-cliff); }
      .cliff-side-dark { fill: var(--island-cliff-dark); }
      .lit-window { fill: var(--window-day); }
    </style>

    <filter id="neo-raised" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="4" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.15"/>
    </filter>
    <filter id="iso-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="10" flood-color="#000000" flood-opacity="0.25"/>
    </filter>

    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" class="sky-top"/>
      <stop offset="100%" class="sky-bottom"/>
    </linearGradient>

    <clipPath id="viewportClip">
      <rect x="24" y="112" width="560" height="348" rx="24"/>
    </clipPath>
  </defs>

  <!-- ================= MAIN BOARD BACKGROUND ================= -->
  <rect x="0" y="0" width="920" height="580" rx="28" class="bg-board"/>

  <!-- ================= 1. TOP HEADER BAR ================= -->
  <rect x="24" y="20" width="872" height="74" rx="20" class="card-box" filter="url(#neo-raised)"/>
  <circle cx="62" cy="57" r="20" fill="#6366F1"/>
  <text x="62" y="63" text-anchor="middle" fill="#FFFFFF" class="font-ui" font-size="15" font-weight="800">MF</text>
  <circle cx="77" cy="71" r="6" fill="#10B981" stroke="#161B22" stroke-width="2.5"/>

  <text x="98" y="52" class="font-ui text-title" font-size="18" font-weight="800">Mohammad Farooq Sheikh</text>
  <text x="98" y="71" class="font-ui text-subtitle" font-size="12.5" font-weight="600">AI &amp; Data Science • Dynamic Day/Night Isometric Voxel World</text>

  <!-- Stat Pills -->
  <rect x="475" y="37" width="128" height="40" rx="14" class="card-box" filter="url(#neo-raised)"/>
  <text x="492" y="61" font-size="15">🌗</text>
  <text x="515" y="53" class="font-ui text-subtitle" font-size="10" font-weight="700">THEME MODE</text>
  <text x="515" y="67" class="font-ui text-title" font-size="12.5" font-weight="800">Auto Live</text>

  <rect x="617" y="37" width="132" height="40" rx="14" class="card-box" filter="url(#neo-raised)"/>
  <text x="634" y="61" font-size="15">🔥</text>
  <text x="657" y="53" class="font-ui text-subtitle" font-size="10" font-weight="700">3D BLOCKS</text>
  <text x="657" y="67" fill="#10B981" class="font-ui" font-size="12.5" font-weight="800">${totalBuildings} Plots Active</text>

  <rect x="763" y="37" width="115" height="40" rx="14" class="card-box" filter="url(#neo-raised)"/>
  <text x="780" y="61" font-size="15">⭐</text>
  <text x="803" y="53" class="font-ui text-subtitle" font-size="10" font-weight="700">CITIZENS</text>
  <text x="803" y="67" fill="#F59E0B" class="font-ui" font-size="12.5" font-weight="800">${buildersCount} Builders</text>

  <!-- ================= 2. 3D ISOMETRIC VIEWPORT ================= -->
  <rect x="24" y="112" width="560" height="348" rx="24" class="card-box" filter="url(#neo-raised)"/>

  <g clip-path="url(#viewportClip)">
    <rect x="24" y="112" width="560" height="348" rx="24" fill="url(#skyGrad)"/>
    <rect x="24" y="112" width="560" height="348" rx="24" fill="none" stroke="#64748B" stroke-width="2" opacity="0.3"/>

    <!-- ================= THE 3D ISOMETRIC WORLD ================= -->
    <g class="iso-world" filter="url(#iso-shadow)">

      <!-- Base Island Platform -->
      <polygon points="304,195 484,285 304,375 124,285" class="island-grass"/>
      <polygon points="124,285 304,375 304,401 124,311" class="cliff-side"/>
      <polygon points="304,375 484,285 484,311 304,401" class="cliff-side-dark"/>

      <!-- Grid Lines -->
      <g stroke="#34D399" stroke-width="1" opacity="0.3">
        <line x1="274" y1="210" x2="454" y2="300"/>
        <line x1="244" y1="225" x2="424" y2="315"/>
        <line x1="214" y1="240" x2="394" y2="330"/>
        <line x1="184" y1="255" x2="364" y2="345"/>
        <line x1="334" y1="210" x2="154" y2="300"/>
        <line x1="364" y1="225" x2="184" y2="315"/>
        <line x1="394" y1="240" x2="214" y2="330"/>
        <line x1="424" y1="255" x2="244" y2="345"/>
      </g>

      <!-- Rendered 3D Voxel Buildings -->
      ${buildingsSvg}

    </g>

    <rect x="42" y="410" width="225" height="34" rx="12" fill="#161B22" opacity="0.92"/>
    <text x="56" y="431" fill="#F0F6FC" class="font-ui" font-size="11.5" font-weight="700">🌗 Auto Day/Night GitHub Sync</text>
  </g>

  <!-- ================= 3. RIGHT SIDEBAR ================= -->
  <rect x="604" y="112" width="292" height="348" rx="24" class="card-box" filter="url(#neo-raised)"/>

  <text x="628" y="144" class="font-ui text-subtitle" font-size="11" font-weight="800" letter-spacing="0.8">⚡ ACTIVE CO-OP BOSS EVENT</text>
  <rect x="624" y="156" width="252" height="86" rx="16" class="card-box" filter="url(#neo-raised)"/>
  <text x="640" y="180" class="font-ui text-title" font-size="13.5" font-weight="800">🦖 Mergezilla at Grid (5,4)</text>
  <text x="640" y="198" class="font-ui text-subtitle" font-size="11" font-weight="600">Island Shield Integrity: 88%</text>

  <text x="628" y="272" class="font-ui text-subtitle" font-size="11" font-weight="800" letter-spacing="0.8">🏗️ RECENT 3D VOXEL DROPS</text>
  ${dropsSvg}

  <!-- ================= 4. BOTTOM AI MAYOR TICKER ================= -->
  <rect x="24" y="478" width="872" height="80" rx="20" class="card-box" filter="url(#neo-raised)"/>
  <rect x="42" y="495" width="132" height="46" rx="14" fill="#6366F1"/>
  <text x="108" y="515" text-anchor="middle" fill="#FFFFFF" class="font-ui" font-size="11" font-weight="800">🤖 AI MAYOR LOG</text>
  <text x="108" y="531" text-anchor="middle" fill="#E0E7FF" class="font-mono" font-size="9.5" font-weight="600">SYNC-ENGINE v3.1</text>

  <rect x="190" y="493" width="688" height="50" rx="14" fill="none"/>
  <text x="208" y="514" class="font-ui text-title" font-size="13" font-weight="700">
    “${announcement}”
  </text>
  <text x="208" y="532" class="font-ui text-subtitle" font-size="12.5" font-weight="600">
    Click any command button below to add your 3D voxel block to the island canvas!
  </text>
</svg>`;
}

// 3D Voxel Building Generator matching the style of the template
function renderVoxelBuilding(cx, cy, type, name, builder, level = 1, emoji = '', row = 0, col = 0) {
  // Height per type
  let h = 55;
  if (type === 'townhall' || type === 'citadel') h = 75;
  if (type === 'tower' || type === 'datacenter') h = 65;
  if (type === 'bakery' || type === 'cafe') h = 50;
  if (type === 'park') h = 28;

  // Colors per type matching the palette
  const palettes = {
    townhall: { top: '#A78BFA', left: '#7C3AED', right: '#5B21B6', tagBg: '#0F172A', tagTxt: '#38BDF8', defaultEmoji: '🧠' },
    citadel: { top: '#A78BFA', left: '#7C3AED', right: '#5B21B6', tagBg: '#0F172A', tagTxt: '#38BDF8', defaultEmoji: '🧠' },
    tower: { top: '#FDE047', left: '#F59E0B', right: '#B45309', tagBg: '#FEF3C7', tagTxt: '#78350F', defaultEmoji: '🏢' },
    bakery: { top: '#FDBA74', left: '#EA580C', right: '#C2410C', tagBg: '#FFEDD5', tagTxt: '#9A3412', defaultEmoji: '🥐' },
    cafe: { top: '#5EEAD4', left: '#0D9488', right: '#0F766E', tagBg: '#CCFBF1', tagTxt: '#115E59', defaultEmoji: '☕' },
    arcade: { top: '#F472B6', left: '#DB2777', right: '#9D174D', tagBg: '#FCE7F3', tagTxt: '#831843', defaultEmoji: '🎮' },
    datacenter: { top: '#67E8F9', left: '#0284C7', right: '#0369A1', tagBg: '#E0F2FE', tagTxt: '#075985', defaultEmoji: '🤖' },
    park: { top: '#86EFAC', left: '#16A34A', right: '#15803D', tagBg: '#DCFCE7', tagTxt: '#166534', defaultEmoji: '🌲' },
    spaceport: { top: '#CBD5E1', left: '#64748B', right: '#475569', tagBg: '#F1F5F9', tagTxt: '#334155', defaultEmoji: '🚀' },
    observatory: { top: '#C7D2FE', left: '#6366F1', right: '#4338CA', tagBg: '#EEF2FF', tagTxt: '#3730A3', defaultEmoji: '🔭' },
    house: { top: '#FDA4AF', left: '#E11D48', right: '#9F1239', tagBg: '#FFE4E6', tagTxt: '#881337', defaultEmoji: '🏠' }
  };

  const pal = palettes[type] || palettes.tower;
  const roofY = cy - h;

  // Geometry:
  // Base corners: (cx - 30, cy), (cx, cy + 15), (cx + 30, cy), (cx, cy - 15)
  // Roof corners: (cx - 30, roofY), (cx, roofY + 15), (cx + 30, roofY), (cx, roofY - 15)
  const leftWall = `${cx - 30},${roofY} ${cx},${roofY + 15} ${cx},${cy + 15} ${cx - 30},${cy}`;
  const rightWall = `${cx},${roofY + 15} ${cx + 30},${roofY} ${cx + 30},${cy} ${cx},${cy + 15}`;
  const roof = `${cx},${roofY - 15} ${cx + 30},${roofY} ${cx},${roofY + 15} ${cx - 30},${roofY}`;

  // Lit windows on walls for night glow
  let windowsMarkup = '';
  if (type !== 'park') {
    windowsMarkup = `
      <polygon points="${cx - 22},${roofY + 17} ${cx - 8},${roofY + 24} ${cx - 8},${roofY + 34} ${cx - 22},${roofY + 27}" class="lit-window window-glow"/>
      <polygon points="${cx - 22},${roofY + 37} ${cx - 8},${roofY + 44} ${cx - 8},${roofY + 54} ${cx - 22},${roofY + 47}" class="lit-window window-glow"/>
      <polygon points="${cx + 8},${roofY + 24} ${cx + 22},${roofY + 17} ${cx + 22},${roofY + 27} ${cx + 8},${roofY + 34}" class="lit-window window-glow"/>
      <polygon points="${cx + 8},${roofY + 44} ${cx + 22},${roofY + 37} ${cx + 22},${roofY + 47} ${cx + 8},${roofY + 54}" class="lit-window window-glow"/>
    `;
  }

  // Floating Hologram Cube
  const holoMarkup = `
    <g class="floating-holo">
      <polygon points="${cx},${roofY - 38} ${cx + 10},${roofY - 33} ${cx},${roofY - 28} ${cx - 10},${roofY - 33}" fill="#FDE047"/>
      <polygon points="${cx - 10},${roofY - 33} ${cx},${roofY - 28} ${cx},${roofY - 16} ${cx - 10},${roofY - 21}" fill="#D97706"/>
      <polygon points="${cx},${roofY - 28} ${cx + 10},${roofY - 33} ${cx + 10},${roofY - 21} ${cx},${roofY - 16}" fill="#B45309"/>
    </g>
  `;

  // Badge Tag
  const isVip = level > 1;
  const tagText = isVip ? `★ @${escapeXml(builder)}` : `${emoji || pal.defaultEmoji} @${escapeXml(builder)}`;
  const tagWidth = Math.max(tagText.length * 6.5 + 16, 68);

  const badgeMarkup = `
    <rect x="${cx - tagWidth / 2}" y="${roofY - 66}" width="${tagWidth}" height="18" rx="9" fill="${pal.tagBg}" stroke="${isVip ? '#F59E0B' : 'none'}" stroke-width="1.2" opacity="0.95"/>
    <text x="${cx}" y="${roofY - 53.5}" text-anchor="middle" fill="${pal.tagTxt}" class="font-ui" font-size="9.5" font-weight="800">${tagText}</text>
  `;

  return `
    <!-- Voxel Block (${row},${col}) -->
    <g class="voxel-block" data-pos="${row},${col}">
      <polygon points="${leftWall}" fill="${pal.left}"/>
      <polygon points="${rightWall}" fill="${pal.right}"/>
      <polygon points="${roof}" fill="${pal.top}"/>
      ${windowsMarkup}
      ${holoMarkup}
      ${badgeMarkup}
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
