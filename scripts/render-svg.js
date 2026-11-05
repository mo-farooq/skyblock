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

  // Filter occupied building cells (exclude empty and terrain)
  const occupiedCells = cells.filter(c => c.type && c.type !== 'empty' && c.type !== 'river' && c.type !== 'elevation');
  const totalBuildings = occupiedCells.length;
  const buildersSet = new Set(occupiedCells.map(c => c.builder).filter(Boolean));
  const buildersCount = Math.max(buildersSet.size, 1);

  // Recent 3 Drops for Right Sidebar
  const recentDrops = [...occupiedCells]
    .sort((a, b) => {
      const timeA = new Date(a.upgradedAt || a.builtAt || 0).getTime();
      const timeB = new Date(b.upgradedAt || b.builtAt || 0).getTime();
      return timeB - timeA;
    })
    .slice(0, 3);

  // Fallbacks if fewer than 3
  const defaultDrops = [
    { builder: 'mo-farooq', emoji: '🥐', type: 'bakery', name: 'Quantum Croissant Bakery', row: 0, col: 2, isVip: true },
    { builder: 'alex_dev', emoji: '🏢', type: 'tower', name: 'Gold Skyscraper', row: 3, col: 1, isVip: true },
    { builder: 'priya_codes', emoji: '☕', type: 'cafe', name: '3D Chai Hub', row: 4, col: 4, isVip: false }
  ];

  while (recentDrops.length < 3) {
    const filler = defaultDrops[recentDrops.length];
    if (filler) recentDrops.push(filler);
    else break;
  }

  // Sidebar drops HTML
  let dropsSvg = '';
  const dropYPositions = [284, 340, 396];
  const dropCircleColors = ['#FEF08A', '#FFEDD5', '#DCFCE7'];

  recentDrops.forEach((drop, idx) => {
    const yPos = dropYPositions[idx] || 284;
    const isVip = drop.isVip || (drop.level && drop.level > 1);
    const dropEmoji = drop.emoji || (drop.type === 'bakery' ? '🥐' : drop.type === 'cafe' ? '☕' : '🏢');
    const dropBuilder = escapeXml(drop.builder || 'Architect');
    const dropDesc = escapeXml(`Built ${drop.name || drop.type} at Tile (${drop.row},${drop.col})`);
    const circleFill = dropCircleColors[idx] || '#FEF08A';

    dropsSvg += `
    <rect x="624" y="${yPos}" width="252" height="46" rx="14" fill="#EEF2F9" filter="url(#neo-pill)"/>
    <circle cx="647" cy="${yPos + 23}" r="14" fill="${circleFill}"/>
    <text x="647" y="${yPos + 28}" text-anchor="middle" font-size="12">${dropEmoji}</text>
    <text x="670" y="${yPos + 19}" fill="#1E293B" class="font-ui" font-size="12" font-weight="800">@${dropBuilder} ${isVip ? '<tspan fill="#D97706" font-size="10">★ VIP</tspan>' : ''}</text>
    <text x="670" y="${yPos + 35}" fill="#64748B" class="font-ui" font-size="11" font-weight="600">${dropDesc}</text>
    `;
  });

  // Calculate pixel coordinates for 6x6 isometric grid:
  // Origin: top corner of island (304, 195)
  // Step vectors: dx = 30, dy = 15
  function getTileCenter(row, col) {
    const cx = 304 + (col - row) * 30;
    const cy = 195 + (col + row + 1) * 15;
    return { cx, cy };
  }

  // Sort occupied cells by isometric depth: (row + col) ascending
  const sortedOccupied = [...occupiedCells].sort((a, b) => {
    const depthA = a.row + a.col;
    const depthB = b.row + b.col;
    if (depthA !== depthB) return depthA - depthB;
    return a.row - b.row;
  });

  // Render dynamic buildings from the state
  let dynamicBuildingsSvg = '';
  for (const cell of sortedOccupied) {
    const { row, col, type, name, builder, level = 1, emoji = '' } = cell;
    const { cx, cy } = getTileCenter(row, col);
    dynamicBuildingsSvg += renderDynamicVoxel(cx, cy, type, name, builder, level, emoji, row, col) + '\n';
  }

  const announcement = escapeXml(mayor.announcement || 'Tile (1,1) upgraded to AI Citadel! Click a button below to lay your 3D voxel cornerstone on the live canvas.');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 580" width="100%" height="100%">
  <defs>
    <!-- Neomorphic UI Filters -->
    <filter id="neo-raised" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="6" dy="6" stdDeviation="7" flood-color="#CBD5E1" flood-opacity="0.75"/>
      <feDropShadow dx="-6" dy="-6" stdDeviation="7" flood-color="#FFFFFF" flood-opacity="0.95"/>
    </filter>
    <filter id="neo-pill" x="-15%" y="-15%" width="135%" height="135%">
      <feDropShadow dx="3" dy="3" stdDeviation="4" flood-color="#CBD5E1" flood-opacity="0.7"/>
      <feDropShadow dx="-3" dy="-3" stdDeviation="4" flood-color="#FFFFFF" flood-opacity="0.95"/>
    </filter>
    <filter id="iso-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="12" flood-color="#334155" flood-opacity="0.18"/>
    </filter>

    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#E0F2FE"/>
      <stop offset="100%" stop-color="#F8FAFC"/>
    </linearGradient>
    <linearGradient id="hpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10B981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <clipPath id="viewportClip">
      <rect x="24" y="112" width="560" height="348" rx="24"/>
    </clipPath>
  </defs>

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
    @keyframes pulseBeacon {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
    .iso-world { animation: hoverBoard 5s ease-in-out infinite; }
    .floating-holo { animation: floatCube 3.2s ease-in-out infinite; }
    .beacon-light { animation: pulseBeacon 2s infinite; }
  </style>

  <!-- ================= MAIN BOARD BACKGROUND ================= -->
  <rect x="0" y="0" width="920" height="580" rx="28" fill="#EEF2F9"/>

  <!-- ================= 1. TOP NEOMORPHIC BAR ================= -->
  <rect x="24" y="20" width="872" height="74" rx="20" fill="#EEF2F9" filter="url(#neo-raised)"/>
  <circle cx="62" cy="57" r="22" fill="#EEF2F9" filter="url(#neo-pill)"/>
  <circle cx="62" cy="57" r="18" fill="#6366F1"/>
  <text x="62" y="63" text-anchor="middle" fill="#FFFFFF" class="font-ui" font-size="15" font-weight="800">MF</text>
  <circle cx="77" cy="71" r="6" fill="#10B981" stroke="#EEF2F9" stroke-width="2.5"/>

  <text x="98" y="52" fill="#1E293B" class="font-ui" font-size="18" font-weight="800">Mohammad Farooq Sheikh</text>
  <text x="98" y="71" fill="#64748B" class="font-ui" font-size="12.5" font-weight="600">AI &amp; Data Science • 3D Isometric Commit Civilization</text>

  <!-- Stat Pills -->
  <rect x="475" y="37" width="128" height="40" rx="14" fill="#EEF2F9" filter="url(#neo-pill)"/>
  <text x="492" y="61" font-size="15">🧊</text>
  <text x="515" y="53" fill="#64748B" class="font-ui" font-size="10" font-weight="700">VOXEL GRID</text>
  <text x="515" y="67" fill="#1E293B" class="font-ui" font-size="12.5" font-weight="800">Lv. 14 Island</text>

  <rect x="617" y="37" width="132" height="40" rx="14" fill="#EEF2F9" filter="url(#neo-pill)"/>
  <text x="634" y="61" font-size="15">🔥</text>
  <text x="657" y="53" fill="#64748B" class="font-ui" font-size="10" font-weight="700">3D BLOCKS</text>
  <text x="657" y="67" fill="#059669" class="font-ui" font-size="12.5" font-weight="800">${totalBuildings * 140} Commits</text>

  <rect x="763" y="37" width="115" height="40" rx="14" fill="#EEF2F9" filter="url(#neo-pill)"/>
  <text x="780" y="61" font-size="15">⭐</text>
  <text x="803" y="53" fill="#64748B" class="font-ui" font-size="10" font-weight="700">CITIZENS</text>
  <text x="803" y="67" fill="#D97706" class="font-ui" font-size="12.5" font-weight="800">${buildersCount} Builders</text>

  <!-- ================= 2. 3D ISOMETRIC VIEWPORT ================= -->
  <rect x="24" y="112" width="560" height="348" rx="24" fill="#EEF2F9" filter="url(#neo-raised)"/>

  <g clip-path="url(#viewportClip)">
    <rect x="24" y="112" width="560" height="348" rx="24" fill="url(#skyGrad)"/>
    <rect x="24" y="112" width="560" height="348" rx="24" fill="none" stroke="#CBD5E1" stroke-width="3" opacity="0.6"/>

    <!-- ================= THE 3D ISOMETRIC WORLD ================= -->
    <g class="iso-world" filter="url(#iso-shadow)">

      <!-- 1. BASE ISOMETRIC PLATFORM -->
      <polygon points="304,195 484,285 304,375 124,285" fill="#6EE7B7" stroke="#34D399" stroke-width="1"/>

      <!-- Left Earth/Clay Wall -->
      <polygon points="124,285 304,375 304,401 124,311" fill="#F59E0B"/>
      <polygon points="124,298 304,388 304,401 124,311" fill="#D97706"/>

      <!-- Right Earth/Clay Wall -->
      <polygon points="304,375 484,285 484,311 304,401" fill="#B45309"/>
      <polygon points="304,388 484,298 484,311 304,401" fill="#92400E"/>

      <!-- 2. ISOMETRIC CONTRIBUTION GRID LINES (6x6 Tiles) -->
      <g stroke="#10B981" stroke-width="1" opacity="0.45">
        <line x1="274" y1="210" x2="454" y2="300"/>
        <line x1="244" y1="225" x2="424" y2="315"/>
        <line x1="214" y1="240" x2="394" y2="330"/>
        <line x1="184" y1="255" x2="364" y2="345"/>
        <line x1="154" y1="270" x2="334" y2="360"/>
        <line x1="334" y1="210" x2="154" y2="300"/>
        <line x1="364" y1="225" x2="184" y2="315"/>
        <line x1="394" y1="240" x2="214" y2="330"/>
        <line x1="424" y1="255" x2="244" y2="345"/>
        <line x1="454" y1="270" x2="274" y2="360"/>
      </g>

      <!-- 3. ISOMETRIC RIVER TILES + WATERFALL -->
      <polygon points="244,255 274,270 244,285 214,270" fill="#38BDF8"/>
      <polygon points="274,270 304,285 274,300 244,285" fill="#38BDF8"/>
      <polygon points="304,285 334,300 304,315 274,300" fill="#0284C7"/>
      <polygon points="334,300 364,315 334,330 304,315" fill="#38BDF8"/>
      <polygon points="214,270 244,285 214,300 184,285" fill="#38BDF8"/>
      <polygon points="184,285 214,300 184,315 154,300" fill="#7DD3FC"/>
      <!-- Waterfall -->
      <polygon points="154,300 184,315 184,341 154,326" fill="#38BDF8"/>
      <polygon points="162,304 176,311 176,337 162,330" fill="#E0F2FE" opacity="0.8"/>

      <!-- 4. GREEN COMMIT ELEVATION BLOCKS -->
      <g>
        <polygon points="274,192 304,207 274,222 244,207" fill="#86EFAC"/>
        <polygon points="244,207 274,222 274,240 244,225" fill="#22C55E"/>
        <polygon points="274,222 304,207 304,225 274,240" fill="#15803D"/>
      </g>
      <g>
        <polygon points="244,193 274,208 244,223 214,208" fill="#4ADE80"/>
        <polygon points="214,208 244,223 244,255 214,240" fill="#16A34A"/>
        <polygon points="244,223 274,208 274,240 244,255" fill="#14532D"/>
      </g>

      <!-- 5. DYNAMIC CITIZEN BUILDINGS ON 6x6 GRID -->
      ${dynamicBuildingsSvg}

    </g>

    <!-- Viewport HUD Pills -->
    <rect x="42" y="410" width="225" height="34" rx="12" fill="#FFFFFF" opacity="0.92"/>
    <text x="56" y="431" fill="#1E293B" class="font-ui" font-size="11.5" font-weight="700">🧊 2.5D Isometric Engine • 60fps CSS</text>

    <rect x="358" y="410" width="208" height="34" rx="12" fill="#1E293B" opacity="0.92"/>
    <text x="462" y="431" text-anchor="middle" fill="#FDE047" class="font-ui" font-size="11" font-weight="700">⭐ Star Repo = Gold Voxel Tower</text>
  </g>

  <!-- ================= 3. RIGHT SIDEBAR: TELEMETRY & LOG ================= -->
  <rect x="604" y="112" width="292" height="348" rx="24" fill="#EEF2F9" filter="url(#neo-raised)"/>

  <text x="628" y="144" fill="#64748B" class="font-ui" font-size="11" font-weight="800" letter-spacing="0.8">⚡ ACTIVE CO-OP BOSS EVENT</text>
  <rect x="624" y="156" width="252" height="86" rx="16" fill="#EEF2F9" filter="url(#neo-pill)"/>
  <text x="640" y="180" fill="#1E293B" class="font-ui" font-size="13.5" font-weight="800">🦖 Mergezilla at Grid (5,4)</text>
  <text x="640" y="198" fill="#64748B" class="font-ui" font-size="11" font-weight="600">Island Shield Integrity: 78%</text>
  <rect x="640" y="210" width="220" height="10" rx="5" fill="#CBD5E1"/>
  <rect x="640" y="210" width="172" height="10" rx="5" fill="url(#hpGrad)"/>
  <text x="860" y="180" text-anchor="end" fill="#059669" class="font-mono" font-size="11" font-weight="700">780/1000</text>

  <text x="628" y="272" fill="#64748B" class="font-ui" font-size="11" font-weight="800" letter-spacing="0.8">🏗️ RECENT 3D VOXEL DROPS</text>
  ${dropsSvg}

  <!-- ================= 4. BOTTOM AI MAYOR TICKER ================= -->
  <rect x="24" y="478" width="872" height="80" rx="20" fill="#EEF2F9" filter="url(#neo-raised)"/>
  <rect x="42" y="495" width="132" height="46" rx="14" fill="#6366F1"/>
  <text x="108" y="515" text-anchor="middle" fill="#FFFFFF" class="font-ui" font-size="11" font-weight="800">🤖 AI MAYOR LOG</text>
  <text x="108" y="531" text-anchor="middle" fill="#E0E7FF" class="font-mono" font-size="9.5" font-weight="600">ISO-ENGINE v3.0</text>

  <rect x="190" y="493" width="688" height="50" rx="14" fill="#E2E8F0"/>
  <text x="208" y="514" fill="#1E293B" class="font-ui" font-size="13" font-weight="700">
    “${announcement}”
  </text>
  <text x="208" y="532" fill="#475569" class="font-ui" font-size="12.5" font-weight="600">
    Click a command below to drop a 3D block on an open tile!
  </text>
</svg>`;
}

// Render dynamic 3D Voxel building at given isometric coordinate
function renderDynamicVoxel(cx, cy, type, name, builder, level = 1, emoji = '', row = 0, col = 0) {
  // If pine tree / park
  if (type === 'park' || type === 'tree') {
    return `
    <!-- 3D Voxel Pine at Tile (${row},${col}) -->
    <g class="voxel-block" data-tile="${row},${col}">
      <polygon points="${cx - 6},${cy - 10} ${cx},${cy - 7} ${cx},${cy + 3} ${cx - 6},${cy}" fill="#92400E"/>
      <polygon points="${cx},${cy - 7} ${cx + 6},${cy - 10} ${cx + 6},${cy} ${cx},${cy + 3}" fill="#78350F"/>
      <polygon points="${cx},${cy - 38} ${cx + 14},${cy - 31} ${cx},${cy - 24} ${cx - 14},${cy - 31}" fill="#6EE7B7"/>
      <polygon points="${cx - 14},${cy - 31} ${cx},${cy - 24} ${cx},${cy - 6} ${cx - 14},${cy - 13}" fill="#10B981"/>
      <polygon points="${cx},${cy - 24} ${cx + 14},${cy - 31} ${cx + 14},${cy - 13} ${cx},${cy - 6}" fill="#047857"/>
    </g>`;
  }

  // Heights per building
  let h = 50;
  if (type === 'citadel' || type === 'townhall') h = 75;
  if (type === 'tower' || type === 'skyscraper') h = 60;
  if (type === 'bakery') h = 48;
  if (type === 'cafe') h = 42;
  if (type === 'studio') h = 45;

  const roofY = cy - h;

  // Colors per type
  const palettes = {
    citadel: { top: '#C4B5FD', left: '#8B5CF6', right: '#5B21B6', tagBg: '#1E293B', tagTxt: '#BAE6FD', defaultEmoji: '🧠' },
    townhall: { top: '#C4B5FD', left: '#8B5CF6', right: '#5B21B6', tagBg: '#1E293B', tagTxt: '#BAE6FD', defaultEmoji: '🏛️' },
    tower: { top: '#FEF08A', left: '#FBBF24', right: '#D97706', tagBg: '#FEF3C7', tagTxt: '#B45309', defaultEmoji: '🏢' },
    skyscraper: { top: '#FEF08A', left: '#FBBF24', right: '#D97706', tagBg: '#FEF3C7', tagTxt: '#B45309', defaultEmoji: '🏢' },
    bakery: { top: '#FED7AA', left: '#F97316', right: '#C2410C', tagBg: '#FFEDD5', tagTxt: '#9A3412', defaultEmoji: '🥐' },
    cafe: { top: '#99F6E4', left: '#14B8A6', right: '#0F766E', tagBg: '#CCFBF1', tagTxt: '#115E59', defaultEmoji: '☕' },
    arcade: { top: '#FBCFE8', left: '#EC4899', right: '#BE185D', tagBg: '#FCE7F3', tagTxt: '#831843', defaultEmoji: '🎮' },
    datacenter: { top: '#BAE6FD', left: '#0EA5E9', right: '#0369A1', tagBg: '#E0F2FE', tagTxt: '#075985', defaultEmoji: '🤖' },
    spaceport: { top: '#CBD5E1', left: '#64748B', right: '#334155', tagBg: '#F1F5F9', tagTxt: '#1E293B', defaultEmoji: '🚀' },
    observatory: { top: '#C7D2FE', left: '#6366F1', right: '#4338CA', tagBg: '#EEF2FF', tagTxt: '#3730A3', defaultEmoji: '🔭' },
    studio: { top: '#FECDD3', left: '#FB7185', right: '#E11D48', tagBg: '#FFE4E6', tagTxt: '#9F1239', defaultEmoji: '🎨' },
    house: { top: '#FECDD3', left: '#FB7185', right: '#E11D48', tagBg: '#FFE4E6', tagTxt: '#9F1239', defaultEmoji: '🏠' }
  };

  const pal = palettes[type] || palettes.tower;

  // Geometry:
  // Base floor corners: (cx - 30, cy), (cx, cy + 15), (cx + 30, cy), (cx, cy - 15)
  // Roof corners: (cx - 30, roofY), (cx, roofY + 15), (cx + 30, roofY), (cx, roofY - 15)
  const leftWall = `${cx - 30},${roofY} ${cx},${roofY + 15} ${cx},${cy + 15} ${cx - 30},${cy}`;
  const rightWall = `${cx},${roofY + 15} ${cx + 30},${roofY} ${cx + 30},${cy} ${cx},${cy + 15}`;
  const roof = `${cx},${roofY - 15} ${cx + 30},${roofY} ${cx},${roofY + 15} ${cx - 30},${roofY}`;

  // Lit windows
  const windows = `
    <polygon points="${cx - 22},${roofY + 17} ${cx - 8},${roofY + 24} ${cx - 8},${roofY + 34} ${cx - 22},${roofY + 27}" fill="#FEF08A"/>
    <polygon points="${cx + 8},${roofY + 24} ${cx + 22},${roofY + 17} ${cx + 22},${roofY + 27} ${cx + 8},${roofY + 34}" fill="#FDE047"/>
  `;

  // Floating Hologram Cube
  const holo = `
    <g class="floating-holo">
      <polygon points="${cx},${roofY - 38} ${cx + 10},${roofY - 33} ${cx},${roofY - 28} ${cx - 10},${roofY - 33}" fill="#FEF08A"/>
      <polygon points="${cx - 10},${roofY - 33} ${cx},${roofY - 28} ${cx},${roofY - 16} ${cx - 10},${roofY - 21}" fill="#F59E0B"/>
      <polygon points="${cx},${roofY - 28} ${cx + 10},${roofY - 33} ${cx + 10},${roofY - 21} ${cx},${roofY - 16}" fill="#B45309"/>
    </g>
  `;

  const isVip = level > 1;
  const tagText = isVip ? `★ @${escapeXml(builder)}` : `${emoji || pal.defaultEmoji} @${escapeXml(builder)}`;
  const tagWidth = Math.max(tagText.length * 6.8 + 18, 68);

  const tag = `
    <rect x="${cx - tagWidth / 2}" y="${roofY - 66}" width="${tagWidth}" height="18" rx="9" fill="${pal.tagBg}" stroke="${isVip ? '#F59E0B' : 'none'}" stroke-width="1.5" opacity="0.95"/>
    <text x="${cx}" y="${roofY - 53.5}" text-anchor="middle" fill="${pal.tagTxt}" class="font-ui" font-size="9.5" font-weight="800">${tagText}</text>
  `;

  return `
  <!-- Building at Tile (${row},${col}) -->
  <g class="voxel-block" data-tile="${row},${col}">
    <polygon points="${leftWall}" fill="${pal.left}"/>
    <polygon points="${rightWall}" fill="${pal.right}"/>
    <polygon points="${roof}" fill="${pal.top}"/>
    ${windows}
    ${holo}
    ${tag}
  </g>`;
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
