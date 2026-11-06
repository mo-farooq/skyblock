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

  const occupiedCells = cells.filter(c => c.type && c.type !== 'empty');
  const totalBlocks = occupiedCells.length;

  // Projection math:
  // Island Center Origin: cx = 460, cy = 250 (Centered in 920x540 viewport)
  // Step vectors: dx = 38, dy = 19 (larger, clearer voxel grid)
  function getTileCenter(row, col) {
    const cx = 460 + (col - row) * 38;
    const cy = 230 + (col + row) * 19;
    return { cx, cy };
  }

  // Sort occupied cells by depth (row + col) ascending so far blocks render behind near ones
  const sortedOccupied = [...occupiedCells].sort((a, b) => {
    const depthA = a.row + a.col;
    const depthB = b.row + b.col;
    if (depthA !== depthB) return depthA - depthB;
    return a.row - b.row;
  });

  // Dynamic Minecraft voxel blocks from state
  let dynamicBlocksSvg = '';
  for (const cell of sortedOccupied) {
    const { row, col, type, name, builder, level = 1, emoji = '' } = cell;
    const { cx, cy } = getTileCenter(row, col);
    dynamicBlocksSvg += renderMinecraftVoxel(cx, cy, type, name, builder, level, emoji, row, col) + '\n';
  }

  // Steve & Alex Voxel Character Rigs positioned on the island
  const stevePos = getTileCenter(1, 1);
  const alexPos = getTileCenter(1, 4);

  const steveSvg = renderMinecraftSteve(stevePos.cx, stevePos.cy);
  const alexSvg = renderMinecraftAlex(alexPos.cx, alexPos.cy);

  const announcement = escapeXml(mayor.announcement || 'Welcome to Mohammad Farooq\'s Minecraft Realm! Choose an item below to craft live on the island.');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 540" width="100%" height="100%">
  <defs>
    <!-- Sky Gradient -->
    <linearGradient id="mcSky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#5B8BF5"/>
      <stop offset="65%" stop-color="#9BC0FF"/>
      <stop offset="100%" stop-color="#D6E5FF"/>
    </linearGradient>

    <!-- Ender Dragon Boss Bar -->
    <linearGradient id="dragonBar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#B000E8"/>
      <stop offset="50%" stop-color="#E255FF"/>
      <stop offset="100%" stop-color="#8000A8"/>
    </linearGradient>

    <!-- Diamond Gleam Gradient -->
    <linearGradient id="diamondGleam" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E0FFFF"/>
      <stop offset="50%" stop-color="#00FFFF"/>
      <stop offset="100%" stop-color="#009999"/>
    </linearGradient>

    <!-- Drop Shadow for Island -->
    <filter id="islandShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="12" flood-color="#000000" flood-opacity="0.45"/>
    </filter>

    <clipPath id="viewportClip">
      <rect x="20" y="88" width="880" height="380" rx="8"/>
    </clipPath>
  </defs>

  <style>
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&amp;family=Share+Tech+Mono&amp;display=swap');
    .font-mc { font-family: 'Press Start 2P', 'Courier New', monospace; }
    .font-ui { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

    @keyframes floatIsland {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }
    @keyframes armSwing {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(-25deg); }
    }
    @keyframes pulseOrb {
      0%, 100% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.4); opacity: 1; }
    }
    @keyframes bossBarGlow {
      0%, 100% { opacity: 0.95; }
      50% { opacity: 0.8; }
    }

    .mc-island { animation: floatIsland 4.5s ease-in-out infinite; }
    .steve-arm { animation: armSwing 1.6s ease-in-out infinite; transform-origin: 38px 46px; }
    .xp-orb { animation: pulseOrb 1.5s infinite ease-in-out; }
    .boss-meter { animation: bossBarGlow 2s infinite ease-in-out; }
  </style>

  <!-- ================= FRAME & BACKGROUND ================= -->
  <rect x="0" y="0" width="920" height="540" rx="12" fill="#1C1D1E"/>
  <rect x="4" y="4" width="912" height="532" rx="10" fill="#2E3033" stroke="#121314" stroke-width="3"/>
  <rect x="10" y="10" width="900" height="520" rx="8" fill="#18191A"/>

  <!-- ================= 1. CLEAN TOP MINECRAFT HUD ================= -->
  <rect x="20" y="18" width="880" height="58" rx="6" fill="#2B2C2E" stroke="#484A4D" stroke-width="2"/>

  <!-- Steve Avatar -->
  <g transform="translate(32, 26)">
    <rect width="42" height="42" rx="3" fill="#151515" stroke="#000000" stroke-width="2"/>
    <rect x="4" y="4" width="34" height="12" fill="#4A3018"/>
    <rect x="4" y="16" width="34" height="22" fill="#BD8B72"/>
    <rect x="8" y="21" width="7" height="5" fill="#FFFFFF"/>
    <rect x="11" y="21" width="4" height="5" fill="#2B3CA3"/>
    <rect x="26" y="21" width="7" height="5" fill="#FFFFFF"/>
    <rect x="26" y="21" width="4" height="5" fill="#2B3CA3"/>
    <rect x="17" y="27" width="8" height="5" fill="#A06950"/>
    <rect x="14" y="32" width="14" height="3" fill="#693820"/>
  </g>

  <!-- Player Title & Level -->
  <text x="88" y="43" fill="#FFFFFF" class="font-mc" font-size="13" font-weight="700">Mohammad Farooq's Realm</text>
  <text x="88" y="60" fill="#55FF55" class="font-mc" font-size="9.5">★ LEVEL 42 ARCHITECT • SURVIVAL MODE</text>

  <!-- Hearts & Food Status -->
  <g transform="translate(560, 32)">
    <text x="0" y="15" font-size="14">❤️❤️❤️❤️❤️</text>
    <text x="88" y="15" font-size="14">🍗🍗🍗🍗🍗</text>
    <text x="0" y="32" fill="#FFAA00" class="font-mc" font-size="8.5">FULL HEALTH</text>
    <text x="88" y="32" fill="#FFAA00" class="font-mc" font-size="8.5">FULL HUNGER</text>
  </g>

  <!-- Active Blocks Pill -->
  <g transform="translate(760, 26)">
    <rect width="128" height="42" rx="4" fill="#1C1D1E" stroke="#55FF55" stroke-width="1.5"/>
    <text x="64" y="19" fill="#AAAAAA" class="font-mc" font-size="7.5" text-anchor="middle">BLOCKS CRAFTED</text>
    <text x="64" y="36" fill="#55FF55" class="font-mc" font-size="13" font-weight="700" text-anchor="middle">${totalBlocks} BLOCKS</text>
  </g>

  <!-- ================= 2. EXPANDED 3D VIEWPORT (FULL FOCUS ON ISLAND) ================= -->
  <rect x="20" y="88" width="880" height="380" rx="8" fill="#1B2233" stroke="#444950" stroke-width="2"/>

  <g clip-path="url(#viewportClip)">
    <!-- Sky Background -->
    <rect x="20" y="88" width="880" height="380" fill="url(#mcSky)"/>

    <!-- Minecraft Blocky Clouds -->
    <rect x="40" y="110" width="180" height="32" fill="#FFFFFF" opacity="0.85" rx="2"/>
    <rect x="140" y="98" width="110" height="32" fill="#FFFFFF" opacity="0.85" rx="2"/>
    <rect x="620" y="120" width="220" height="36" fill="#FFFFFF" opacity="0.8" rx="2"/>
    <rect x="730" y="106" width="130" height="36" fill="#FFFFFF" opacity="0.8" rx="2"/>

    <!-- Ender Dragon Boss Bar (Clean & Bold) -->
    <g transform="translate(260, 102)">
      <rect x="0" y="0" width="400" height="22" rx="3" fill="#101010" stroke="#333333" stroke-width="2"/>
      <rect x="3" y="3" width="340" height="16" rx="2" fill="url(#dragonBar)" class="boss-meter"/>
      <text x="200" y="15" text-anchor="middle" fill="#FFFFFF" class="font-mc" font-size="9" font-weight="700">⚔️ Ender Dragon — 850 / 1000 HP</text>
    </g>

    <!-- ================= THE 3D MINECRAFT VOXEL ISLAND ================= -->
    <g class="mc-island" filter="url(#islandShadow)">

      <!-- 1. BASE VOXEL PLATFORM (Lush Dirt & Grass Layer) -->
      <!-- Top Grass Surface (Isometric Diamond) -->
      <polygon points="460,192 688,306 460,420 232,306" fill="#5B8731"/>

      <!-- Stylized Grass Highlights -->
      <polygon points="460,208 498,227 460,246 422,227" fill="#70A83B" opacity="0.85"/>
      <polygon points="536,246 574,265 536,284 498,265" fill="#70A83B" opacity="0.85"/>
      <polygon points="384,246 422,265 384,284 346,265" fill="#70A83B" opacity="0.85"/>
      <polygon points="460,322 498,341 460,360 422,341" fill="#70A83B" opacity="0.85"/>

      <!-- Left Cliff: Rich Dirt & Overhanging Green Grass Fringe -->
      <polygon points="232,306 460,420 460,458 232,344" fill="#866043"/>
      <polygon points="232,344 460,458 460,480 232,366" fill="#555555"/>
      <!-- Left Grass Fringe -->
      <polygon points="232,306 460,420 460,432 435,426 415,435 390,427 365,434 340,427 315,434 290,426 265,433 245,425 232,318" fill="#4C7026"/>

      <!-- Right Cliff: Shaded Dirt & Bedrock Layer -->
      <polygon points="460,420 688,306 688,344 460,458" fill="#694B32"/>
      <polygon points="460,458 688,344 688,366 460,480" fill="#3D3D3D"/>
      <!-- Right Grass Fringe -->
      <polygon points="460,420 688,306 688,318 665,325 645,317 620,325 595,318 570,325 545,317 520,325 495,317 475,325 460,432" fill="#3D5A1E"/>

      <!-- Clean Grid Lines -->
      <g stroke="#3E5C21" stroke-width="1.2" opacity="0.4">
        <line x1="422" y1="211" x2="650" y2="325"/>
        <line x1="384" y1="230" x2="612" y2="344"/>
        <line x1="346" y1="249" x2="574" y2="363"/>
        <line x1="308" y1="268" x2="536" y2="382"/>
        <line x1="270" y1="287" x2="498" y2="401"/>
        <line x1="498" y1="211" x2="270" y2="325"/>
        <line x1="536" y1="230" x2="308" y2="344"/>
        <line x1="574" y1="249" x2="346" y2="363"/>
        <line x1="612" y1="268" x2="384" y2="382"/>
        <line x1="650" y1="287" x2="422" y2="401"/>
      </g>

      <!-- 2. WATER STREAM & WATERFALL (Vivid Minecraft Blue) -->
      <polygon points="384,268 422,287 384,306 346,287" fill="#2E6BA8" opacity="0.9"/>
      <polygon points="422,287 460,306 422,325 384,306" fill="#2E6BA8" opacity="0.9"/>
      <polygon points="346,287 384,306 346,325 308,306" fill="#4287D6" opacity="0.9"/>
      <polygon points="308,306 346,325 308,344 270,325" fill="#5CA0F2" opacity="0.9"/>
      <!-- Waterfall over edge -->
      <polygon points="270,325 308,344 308,382 270,363" fill="#2E6BA8" opacity="0.9"/>
      <polygon points="276,330 302,343 302,376 276,363" fill="#FFFFFF" opacity="0.7"/>

      <!-- 3. CUBIC OAK WOOD TREE at Tile (4, 1) -->
      <g>
        <polygon points="530,285 540,290 540,318 530,313" fill="#6B5130"/>
        <polygon points="540,290 550,285 550,313 540,318" fill="#4F3B23"/>
        <!-- Big Cubic Oak Leaves -->
        <polygon points="540,240 568,254 540,268 512,254" fill="#386420"/>
        <polygon points="512,254 540,268 540,296 512,282" fill="#2A4B17"/>
        <polygon points="540,268 568,254 568,282 540,296" fill="#1E3810"/>
        <polygon points="540,222 558,231 540,240 522,231" fill="#4C802E"/>
      </g>

      <!-- 4. DYNAMIC MINECRAFT VOXEL BLOCKS -->
      ${dynamicBlocksSvg}

      <!-- 5. MINECRAFT STEVE RIG (Wielding Diamond Pickaxe) -->
      ${steveSvg}

      <!-- 6. MINECRAFT ALEX RIG (Holding Iron Sword) -->
      ${alexSvg}

    </g>

    <!-- Bottom Corner Badges -->
    <rect x="36" y="430" width="230" height="26" rx="4" fill="#111111" opacity="0.88" stroke="#333333" stroke-width="1.5"/>
    <text x="48" y="447" fill="#55FF55" class="font-mc" font-size="8.5">⛏️ Pure SVG • 60 FPS CSS</text>

    <rect x="660" y="430" width="224" height="26" rx="4" fill="#111111" opacity="0.88" stroke="#00FFFF" stroke-width="1.5"/>
    <text x="772" y="447" text-anchor="middle" fill="#00FFFF" class="font-mc" font-size="8.5">⭐ Star = VIP Diamond</text>
  </g>

  <!-- ================= 3. CLEAN BOTTOM SERVER TICKER ================= -->
  <rect x="20" y="480" width="880" height="46" rx="6" fill="#222325" stroke="#444648" stroke-width="2"/>
  <rect x="24" y="484" width="872" height="38" rx="4" fill="#18191A"/>
  <text x="40" y="508" fill="#00FFFF" class="font-mc" font-size="10">&lt;Server&gt; <tspan fill="#FFFFFF">${announcement}</tspan></text>
</svg>`;
}

// 3D Voxel Minecraft Steve Character Rig
function renderMinecraftSteve(cx, cy) {
  return `
  <!-- Steve Rig -->
  <g class="steve-actor" data-character="steve">
    <!-- Contact Shadow -->
    <ellipse cx="${cx}" cy="${cy + 4}" rx="22" ry="10" fill="#000000" opacity="0.4"/>

    <!-- Boots -->
    <polygon points="${cx - 12},${cy - 2} ${cx - 4},${cy + 2} ${cx - 4},${cy - 9} ${cx - 12},${cy - 13}" fill="#3A3A3A"/>
    <polygon points="${cx - 4},${cy + 2} ${cx + 4},${cy - 2} ${cx + 4},${cy - 13} ${cx - 4},${cy - 9}" fill="#242424"/>
    <polygon points="${cx + 5},${cy + 2} ${cx + 13},${cy - 2} ${cx + 13},${cy - 13} ${cx + 5},${cy - 9}" fill="#3A3A3A"/>
    <polygon points="${cx + 13},${cy - 2} ${cx + 20},${cy - 5} ${cx + 20},${cy - 16} ${cx + 13},${cy - 13}" fill="#242424"/>

    <!-- Denim Jeans -->
    <polygon points="${cx - 11},${cy - 12} ${cx - 1},${cy - 7} ${cx - 1},${cy - 28} ${cx - 11},${cy - 33}" fill="#2B3CA3"/>
    <polygon points="${cx + 3},${cy - 7} ${cx + 13},${cy - 12} ${cx + 13},${cy - 33} ${cx + 3},${cy - 28}" fill="#1B266B"/>

    <!-- Cyan Shirt / Torso -->
    <polygon points="${cx},${cy - 58} ${cx + 18},${cy - 49} ${cx},${cy - 40} ${cx - 18},${cy - 49}" fill="#00BDBD"/>
    <polygon points="${cx - 18},${cy - 49} ${cx},${cy - 40} ${cx},${cy - 25} ${cx - 18},${cy - 34}" fill="#008E8E"/>
    <polygon points="${cx},${cy - 40} ${cx + 18},${cy - 49} ${cx + 18},${cy - 34} ${cx},${cy - 25}" fill="#006363"/>

    <!-- Cubic Head -->
    <polygon points="${cx},${cy - 78} ${cx + 14},${cy - 71} ${cx},${cy - 64} ${cx - 14},${cy - 71}" fill="#4A3018"/>
    <polygon points="${cx - 14},${cy - 71} ${cx},${cy - 64} ${cx},${cy - 47} ${cx - 14},${cy - 54}" fill="#BD8B72"/>
    <polygon points="${cx - 14},${cy - 71} ${cx},${cy - 64} ${cx},${cy - 60} ${cx - 14},${cy - 67}" fill="#4A3018"/>
    <polygon points="${cx},${cy - 64} ${cx + 14},${cy - 71} ${cx + 14},${cy - 54} ${cx},${cy - 47}" fill="#996D57"/>

    <!-- Eyes -->
    <rect x="${cx - 11}" y="${cy - 60}" width="4" height="3" fill="#FFFFFF"/>
    <rect x="${cx - 7}" y="${cy - 60}" width="3" height="3" fill="#2B3CA3"/>

    <!-- Left Arm -->
    <polygon points="${cx - 20},${cy - 48} ${cx - 14},${cy - 45} ${cx - 14},${cy - 28} ${cx - 20},${cy - 31}" fill="#008E8E"/>
    <polygon points="${cx - 20},${cy - 31} ${cx - 14},${cy - 28} ${cx - 14},${cy - 20} ${cx - 20},${cy - 23}" fill="#BD8B72"/>

    <!-- Right Arm swinging Diamond Pickaxe -->
    <g class="steve-arm">
      <polygon points="${cx + 14},${cy - 45} ${cx + 20},${cy - 48} ${cx + 20},${cy - 31} ${cx + 14},${cy - 28}" fill="#006363"/>
      <!-- Wooden Handle -->
      <line x1="${cx + 17}" y1="${cy - 26}" x2="${cx + 36}" y2="${cy - 48}" stroke="#866043" stroke-width="3.5" stroke-linecap="round"/>
      <!-- Diamond Pickaxe Head -->
      <polygon points="${cx + 29},${cy - 54} ${cx + 41},${cy - 44} ${cx + 39},${cy - 41} ${cx + 27},${cy - 51}" fill="url(#diamondGleam)"/>
    </g>

    <!-- Floating XP Orbs -->
    <circle cx="${cx + 32}" cy="${cy - 62}" r="4" fill="#55FF55" class="xp-orb"/>
    <circle cx="${cx - 24}" cy="${cy - 48}" r="3.5" fill="#FFFF55" class="xp-orb" style="animation-delay: 0.75s;"/>

    <!-- High-Contrast Tag -->
    <g transform="translate(${cx}, ${cy - 92})">
      <rect x="-62" y="-11" width="124" height="22" rx="3" fill="#000000" stroke="#55FF55" stroke-width="1.5"/>
      <text x="0" y="5" text-anchor="middle" fill="#FFFFFF" class="font-mc" font-size="9" font-weight="700">Steve @mo-farooq</text>
    </g>
  </g>`;
}

// 3D Voxel Minecraft Alex Character Rig
function renderMinecraftAlex(cx, cy) {
  return `
  <!-- Alex Rig -->
  <g class="alex-actor" data-character="alex">
    <ellipse cx="${cx}" cy="${cy + 4}" rx="20" ry="9" fill="#000000" opacity="0.35"/>

    <!-- Alex Boots -->
    <polygon points="${cx - 10},${cy - 1} ${cx - 3},${cy + 2} ${cx - 3},${cy - 8} ${cx - 10},${cy - 11}" fill="#3A3A3A"/>
    <polygon points="${cx + 3},${cy + 2} ${cx + 10},${cy - 1} ${cx + 10},${cy - 11} ${cx + 3},${cy - 8}" fill="#242424"/>

    <!-- Alex Brown Pants -->
    <polygon points="${cx - 9},${cy - 10} ${cx},${cy - 6} ${cx},${cy - 26} ${cx - 9},${cy - 30}" fill="#543825"/>
    <polygon points="${cx + 1},${cy - 6} ${cx + 10},${cy - 10} ${cx + 10},${cy - 30} ${cx + 1},${cy - 26}" fill="#3D281A"/>

    <!-- Alex Green Tunic -->
    <polygon points="${cx},${cy - 54} ${cx + 16},${cy - 46} ${cx},${cy - 38} ${cx - 16},${cy - 46}" fill="#5B8731"/>
    <polygon points="${cx - 16},${cy - 46} ${cx},${cy - 38} ${cx},${cy - 23} ${cx - 16},${cy - 31}" fill="#466826"/>
    <polygon points="${cx},${cy - 38} ${cx + 16},${cy - 46} ${cx + 16},${cy - 31} ${cx},${cy - 23}" fill="#334C1B"/>

    <!-- Alex Ginger Hair & Head -->
    <polygon points="${cx},${cy - 74} ${cx + 12},${cy - 68} ${cx},${cy - 62} ${cx - 12},${cy - 68}" fill="#BE5C28"/>
    <polygon points="${cx - 12},${cy - 68} ${cx},${cy - 62} ${cx},${cy - 45} ${cx - 12},${cy - 51}" fill="#BD8B72"/>
    <polygon points="${cx - 12},${cy - 68} ${cx},${cy - 62} ${cx},${cy - 58} ${cx - 12},${cy - 64}" fill="#BE5C28"/>
    <polygon points="${cx},${cy - 62} ${cx + 12},${cy - 68} ${cx + 12},${cy - 51} ${cx},${cy - 45}" fill="#996D57"/>

    <!-- Alex Eyes -->
    <rect x="${cx - 10}" y="${cy - 57}" width="4" height="3" fill="#FFFFFF"/>
    <rect x="${cx - 6}" y="${cy - 57}" width="3" height="3" fill="#388731"/>

    <!-- Alex Holding Iron Sword -->
    <line x1="${cx + 13}" y1="${cy - 28}" x2="${cx + 28}" y2="${cy - 44}" stroke="#E0E0E0" stroke-width="3.5" stroke-linecap="round"/>
    <polygon points="${cx + 26},${cy - 48} ${cx + 31},${cy - 42} ${cx + 25},${cy - 42}" fill="#FFFFFF"/>

    <!-- High-Contrast Tag -->
    <g transform="translate(${cx}, ${cy - 88})">
      <rect x="-50" y="-11" width="100" height="22" rx="3" fill="#000000" stroke="#FFAA00" stroke-width="1.5"/>
      <text x="0" y="5" text-anchor="middle" fill="#FFAA00" class="font-mc" font-size="9" font-weight="700">Alex @Co-Op</text>
    </g>
  </g>`;
}

// 3D Minecraft Voxel Block Render
function renderMinecraftVoxel(cx, cy, type, name, builder, level = 1, emoji = '', row = 0, col = 0) {
  let h = 48;
  if (type === 'diamond' || type === 'tower') h = 58;
  if (type === 'castle') h = 68;

  const roofY = cy - h;

  const palettes = {
    diamond: { top: '#4DEDDE', left: '#2CBAA8', right: '#1A8F81', tagBorder: '#00FFFF', tagTxt: '#00FFFF', tagEmoji: '💎' },
    castle: { top: '#A0A0A0', left: '#7A7A7A', right: '#5E5E5E', tagBorder: '#FFAA00', tagTxt: '#FFAA00', tagEmoji: '🏰' },
    bakery: { top: '#D9A766', left: '#AD8045', right: '#825C2D', tagBorder: '#FFAA00', tagTxt: '#FFAA00', tagEmoji: '🍞' },
    cafe: { top: '#E09B48', left: '#B57428', right: '#875114', tagBorder: '#FFAA00', tagTxt: '#FFAA00', tagEmoji: '☕' },
    park: { top: '#5B8731', left: '#4A6E27', right: '#37521D', tagBorder: '#55FF55', tagTxt: '#55FF55', tagEmoji: '🌲' },
    tree: { top: '#5B8731', left: '#4A6E27', right: '#37521D', tagBorder: '#55FF55', tagTxt: '#55FF55', tagEmoji: '🌲' }
  };

  const pal = palettes[type] || palettes.diamond;

  const leftWall = `${cx - 38},${roofY} ${cx},${roofY + 19} ${cx},${cy + 19} ${cx - 38},${cy}`;
  const rightWall = `${cx},${roofY + 19} ${cx + 38},${roofY} ${cx + 38},${cy} ${cx},${cy + 19}`;
  const roof = `${cx},${roofY - 19} ${cx + 38},${roofY} ${cx},${roofY + 19} ${cx - 38},${roofY}`;

  const isVip = level > 1;
  const tagText = `${pal.tagEmoji} @${escapeXml(builder)}`;
  const tagWidth = Math.max(tagText.length * 8 + 20, 84);

  return `
  <!-- Voxel Block (${row},${col}) -->
  <g class="mc-block" data-tile="${row},${col}">
    <polygon points="${leftWall}" fill="${pal.left}"/>
    <polygon points="${rightWall}" fill="${pal.right}"/>
    <polygon points="${roof}" fill="${pal.top}"/>

    <!-- Block Border Accents -->
    <polyline points="${cx - 38},${roofY} ${cx},${roofY + 19} ${cx + 38},${roofY}" fill="none" stroke="#FFFFFF" stroke-width="1.2" opacity="0.3"/>
    <line x1="${cx}" y1="${roofY + 19}" x2="${cx}" y2="${cy + 19}" stroke="#000000" stroke-width="1.2" opacity="0.35"/>

    <!-- Clear, Highly Legible Tag -->
    <g transform="translate(${cx}, ${roofY - 30})">
      <rect x="${-tagWidth / 2}" y="-10" width="${tagWidth}" height="20" rx="3" fill="#000000" opacity="0.9" stroke="${isVip ? '#00FFFF' : pal.tagBorder}" stroke-width="1.8"/>
      <text x="0" y="4" text-anchor="middle" fill="${isVip ? '#00FFFF' : pal.tagTxt}" class="font-mc" font-size="8.5" font-weight="700">${tagText}</text>
    </g>
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

// Standalone execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const rawData = fs.readFileSync(STATE_FILE, 'utf-8');
    const state = JSON.parse(rawData);
    const svgContent = renderWorldSvg(state);
    fs.writeFileSync(SVG_OUTPUT, svgContent, 'utf-8');
    console.log(`[SVG Engine] Successfully rendered Minecraft 3D Isometric World to: ${SVG_OUTPUT}`);
  } catch (err) {
    console.error(`[SVG Engine Error]:`, err);
    process.exit(1);
  }
}
