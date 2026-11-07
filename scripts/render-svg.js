import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const STATE_FILE = path.join(ROOT_DIR, 'data', 'world-state.json');
const SVG_OUTPUT = path.join(ROOT_DIR, 'world-3d.svg');

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function minifySvg(rawSvg) {
  if (!rawSvg) return '';
  return rawSvg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .trim();
}

export function renderWorldSvg(stateData) {
  const {
    steve = { row: 1, col: 1, facing: 'south', lastMover: 'mo-farooq', lastAction: 'Welcome to Skyblock!' },
    tree = { row: 0, col: 1, hp: 4, maxHp: 4 },
    chest = { row: 5, col: 5, opened: false },
    inventory = [],
    bridges = [],
    stats = { totalMoves: 1 }
  } = stateData;

  // 🏝️ ANCHORED ISOMETRIC WORLD COORDINATES MATH
  // The Skyblock Island is anchored rock-solid in the center of the viewport (460, 195).
  // Steve physically traverses tile by tile across the diamond grid!
  const islandAnchorX = 460;
  const islandAnchorY = 195;

  function getTileCenter(r, c) {
    const cx = islandAnchorX + (c - r) * 36;
    const cy = islandAnchorY + (c + r) * 18;
    return { cx, cy };
  }

  // 1. Surface island tiles (Authentic 27-block classic SkyBlock L-island)
  const islandTiles = [];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      if ((r < 3 && c < 3) || (r >= 3 && c < 6)) {
        islandTiles.push({ r, c, type: 'grass' });
      }
    }
  }

  // 2. Incorporate placed bridge blocks (Oak Planks or Diamond)
  const bridgeMap = new Map();
  if (Array.isArray(bridges)) {
    for (const b of bridges) {
      bridgeMap.set(`${b.row},${b.col}`, b.type || 'oak_planks');
    }
  }

  const allTiles = [];
  for (const t of islandTiles) {
    const key = `${t.r},${t.c}`;
    if (bridgeMap.has(key)) {
      allTiles.push({ r: t.r, c: t.c, type: bridgeMap.get(key), isBridge: true });
      bridgeMap.delete(key);
    } else {
      allTiles.push(t);
    }
  }

  // Any bridges extending into the void beyond original island
  for (const [key, type] of bridgeMap.entries()) {
    const [r, c] = key.split(',').map(Number);
    allTiles.push({ r, c, type, isBridge: true, isVoidBridge: true });
  }

  // Sort surface tiles depth-wise: (r + c) ascending
  allTiles.sort((a, b) => (a.r + a.c) - (b.r + b.c));

  // Render surface tiles & Steve's active tile selector
  let tilesSvg = '';
  for (const t of allTiles) {
    const { cx, cy } = getTileCenter(t.r, t.c);
    const isSteveTile = t.r === steve.row && t.c === steve.col;

    if (t.isBridge) {
      tilesSvg += renderBridgeBlock(cx, cy, t.type);
    } else {
      tilesSvg += `
      <!-- Grass Tile [${t.r}, ${t.c}] -->
      <polygon points="${cx},${cy - 18} ${cx + 36},${cy} ${cx},${cy + 18} ${cx - 36},${cy}" fill="#5B8731" stroke="#4C7026" stroke-width="0.8"/>
      <polygon points="${cx},${cy - 10} ${cx + 18},${cy - 1} ${cx},${cy + 8} ${cx - 18},${cy - 1}" fill="#6E9F3D" opacity="0.6"/>`;
    }

    // Active block selector ring under Steve's feet on his exact tile
    if (isSteveTile) {
      tilesSvg += `
      <!-- Steve Active Tile Selector -->
      <polygon points="${cx},${cy - 18} ${cx + 36},${cy} ${cx},${cy + 18} ${cx - 36},${cy}" fill="rgba(255, 255, 85, 0.22)" stroke="#FFFF55" stroke-width="2.5" stroke-dasharray="6,3"/>`;
    }
  }

  // Cliff face extrusions (4 blocks deep = 44px)
  // South-West Front Face (along row 5, cols 0..5): 6 tiles long
  let leftCliffSvg = '';
  for (let c = 0; c < 6; c++) {
    const { cx, cy } = getTileCenter(5, c);
    const depth = 44;
    leftCliffSvg += `
    <polygon points="${cx - 36},${cy} ${cx},${cy + 18} ${cx},${cy + 18 + depth} ${cx - 36},${cy + depth}" fill="#866043" stroke="#66462C" stroke-width="0.8"/>
    <polygon points="${cx - 36},${cy} ${cx},${cy + 18} ${cx},${cy + 24} ${cx - 18},${cy + 18} ${cx - 36},${cy + 6}" fill="#4C7026"/>
    <line x1="${cx - 18}" y1="${cy + 22}" x2="${cx - 18}" y2="${cy + 36}" stroke="#6E4E33" stroke-width="1.5" opacity="0.5"/>`;
  }

  // South-East Front Face (col 2 for rows 0..2, and col 5 for rows 3..5)
  let rightCliffSvg = '';
  const rightTiles = [
    { r: 0, c: 2 },
    { r: 1, c: 2 },
    { r: 2, c: 2 },
    { r: 3, c: 5 },
    { r: 4, c: 5 },
    { r: 5, c: 5 }
  ];
  for (const t of rightTiles) {
    const { cx, cy } = getTileCenter(t.r, t.c);
    const depth = 44;
    rightCliffSvg += `
    <polygon points="${cx},${cy + 18} ${cx + 36},${cy} ${cx + 36},${cy + depth} ${cx},${cy + 18 + depth}" fill="#694B32" stroke="#4F3622" stroke-width="0.8"/>
    <polygon points="${cx},${cy + 18} ${cx + 36},${cy} ${cx + 36},${cy + 6} ${cx + 18},${cy + 18} ${cx},${cy + 24}" fill="#3D5A1E"/>
    <line x1="${cx + 18}" y1="${cy + 22}" x2="${cx + 18}" y2="${cy + 36}" stroke="#523924" stroke-width="1.5" opacity="0.5"/>`;
  }

  // Bedrock bottom cornerstone
  const spawnCenter = getTileCenter(4, 2);
  const bedrockSvg = `
  <polygon points="${spawnCenter.cx - 20},${spawnCenter.cy + 42} ${spawnCenter.cx + 20},${spawnCenter.cy + 42} ${spawnCenter.cx},${spawnCenter.cy + 58}" fill="#2E2E2E"/>
  <polygon points="${spawnCenter.cx - 20},${spawnCenter.cy + 42} ${spawnCenter.cx},${spawnCenter.cy + 58} ${spawnCenter.cx - 10},${spawnCenter.cy + 48}" fill="#1F1F1F"/>`;

  // Landmark Tile Centers
  const treeTile = getTileCenter(tree.row ?? 0, tree.col ?? 1);
  const chestTile = getTileCenter(chest.row ?? 5, chest.col ?? 5);
  const steveTile = getTileCenter(steve.row ?? 1, steve.col ?? 1);

  // Depth-sorted actors (Tree, Chest, Steve) so Steve naturally renders behind or in front of landmarks!
  const actors = [
    {
      depthKey: (tree.row ?? 0) + (tree.col ?? 1) + 0.2,
      svg: renderAuthenticOakTree(treeTile.cx, treeTile.cy, tree.hp ?? 4, tree.maxHp ?? 4)
    },
    {
      depthKey: (chest.row ?? 5) + (chest.col ?? 5) + 0.2,
      svg: renderAuthenticChest(chestTile.cx, chestTile.cy, chest.opened ?? false)
    },
    {
      depthKey: (steve.row ?? 1) + (steve.col ?? 1) + 0.5,
      svg: renderSoloSteve(steveTile.cx, steveTile.cy, inventory, steve.lastMover, steve.facing)
    }
  ];
  actors.sort((a, b) => a.depthKey - b.depthKey);
  const actorsSvg = actors.map(a => a.svg).join('\n');

  // Hotbar Inventory Slots - Real-Time Reflection of Inventory State!
  const slotWidth = 46;
  const startX = 460 - (9 * slotWidth) / 2; // Centered
  const hotbarY = 472;

  let hotbarSvg = '';
  for (let idx = 0; idx < 9; idx++) {
    const x = startX + idx * slotWidth;
    const isSelected = idx === 0;
    const item = inventory[idx];

    hotbarSvg += `
    <!-- Slot ${idx + 1} -->
    <rect x="${x}" y="${hotbarY}" width="42" height="46" rx="2" fill="#3A3A3A" stroke="${isSelected ? '#FFFFFF' : '#1E1E1E'}" stroke-width="${isSelected ? '2.5' : '1.8'}"/>
    <rect x="${x + 2}" y="${hotbarY + 2}" width="38" height="42" rx="1" fill="#252525"/>
    ${item && item.emoji ? `<text x="${x + 21}" y="${hotbarY + 27}" font-size="20" text-anchor="middle">${item.emoji}</text>` : ''}
    ${item && item.count > 1 ? `<text x="${x + 36}" y="${hotbarY + 41}" fill="#FFFFFF" class="font-mc" font-size="8.5" font-weight="700" text-anchor="end">${item.count}</text>` : ''}
    `;
  }

  const currentTurn = stats.totalMoves || 1;
  const currentLevel = Math.floor(currentTurn / 3);
  const safeActionText = escapeXml(steve.lastAction || 'Steve entered the Skyblock realm!');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 540" width="100%" height="100%">
  <defs>
    <!-- Sky Void Gradient -->
    <linearGradient id="skyVoid" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#4B7BE5"/>
      <stop offset="65%" stop-color="#89B4FA"/>
      <stop offset="100%" stop-color="#D6E4FF"/>
    </linearGradient>

    <!-- Island Drop Shadow -->
    <filter id="islandShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="28" stdDeviation="18" flood-color="#000000" flood-opacity="0.55"/>
    </filter>

    <clipPath id="skyClip">
      <rect x="20" y="80" width="880" height="380" rx="6"/>
    </clipPath>
  </defs>

  <style>
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&amp;display=swap');
    .font-mc { font-family: 'Press Start 2P', monospace; }

    @keyframes floatIsland {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-4px); }
    }

    .mc-island { animation: floatIsland 5s ease-in-out infinite; }
  </style>

  <!-- ================= CANVAS BACKGROUND ================= -->
  <rect x="0" y="0" width="920" height="540" rx="10" fill="#18191A"/>
  <rect x="4" y="4" width="912" height="532" rx="8" fill="#28292C" stroke="#0E0F10" stroke-width="3"/>
  <rect x="8" y="8" width="904" height="524" rx="6" fill="#141517"/>

  <!-- ================= 1. CLEAN TOP STATUS HUD (HIGH VISIBILITY) ================= -->
  <rect x="20" y="16" width="880" height="54" rx="4" fill="#252628" stroke="#424548" stroke-width="2"/>

  <!-- Steve Avatar -->
  <g transform="translate(30, 23)">
    <rect width="40" height="40" rx="2" fill="#111111" stroke="#000000" stroke-width="2"/>
    <rect x="4" y="4" width="32" height="11" fill="#4A3018"/>
    <rect x="4" y="15" width="32" height="21" fill="#BD8B72"/>
    <rect x="7" y="20" width="7" height="5" fill="#FFFFFF"/>
    <rect x="10" y="20" width="4" height="5" fill="#2B3CA3"/>
    <rect x="25" y="20" width="7" height="5" fill="#FFFFFF"/>
    <rect x="25" y="20" width="4" height="5" fill="#2B3CA3"/>
    <rect x="16" y="25" width="8" height="5" fill="#A06950"/>
    <rect x="13" y="30" width="14" height="3" fill="#693820"/>
  </g>

  <!-- Title & Mode -->
  <text x="84" y="38" fill="#FFFFFF" class="font-mc" font-size="13" font-weight="700">MINECRAFT SKYBLOCK</text>
  <text x="84" y="55" fill="#55FF55" class="font-mc" font-size="9">STEVE AT TILE [${steve.row}, ${steve.col}] • FACING ${(steve.facing || 'south').toUpperCase()}</text>

  <!-- Hearts & Hunger Bars -->
  <g transform="translate(550, 28)">
    <text x="0" y="15" font-size="14">❤️❤️❤️❤️❤️</text>
    <text x="86" y="15" font-size="14">🍗🍗🍗🍗🍗</text>
    <text x="0" y="32" fill="#FFAA00" class="font-mc" font-size="8">FULL HEALTH</text>
    <text x="86" y="32" fill="#FFAA00" class="font-mc" font-size="8">FULL HUNGER</text>
  </g>

  <!-- Level Badge -->
  <g transform="translate(760, 23)">
    <rect width="128" height="40" rx="3" fill="#1A1B1C" stroke="#55FF55" stroke-width="1.5"/>
    <text x="64" y="16" fill="#AAAAAA" class="font-mc" font-size="7" text-anchor="middle">TURN #${currentTurn}</text>
    <text x="64" y="33" fill="#55FF55" class="font-mc" font-size="12" font-weight="700" text-anchor="middle">LEVEL ${currentLevel}</text>
  </g>

  <!-- ================= 2. 3D SKY VIEWPORT (CAMERA LOCKED ON STEVE) ================= -->
  <rect x="20" y="80" width="880" height="380" rx="6" fill="#1A2233" stroke="#3D4248" stroke-width="2"/>

  <g clip-path="url(#skyClip)">
    <!-- Sky Background -->
    <rect x="20" y="80" width="880" height="380" fill="url(#skyVoid)"/>

    <!-- Minecraft Pixel Clouds -->
    <rect x="60" y="105" width="170" height="26" fill="#FFFFFF" opacity="0.85" rx="2"/>
    <rect x="140" y="95" width="100" height="26" fill="#FFFFFF" opacity="0.85" rx="2"/>
    <rect x="650" y="115" width="200" height="28" fill="#FFFFFF" opacity="0.8" rx="2"/>
    <rect x="740" y="105" width="110" height="28" fill="#FFFFFF" opacity="0.8" rx="2"/>

    <!-- Turn & Action Live Ticker Banner -->
    <g transform="translate(32, 90)">
      <rect width="856" height="26" rx="3" fill="#10141D" opacity="0.85" stroke="#353D4D" stroke-width="1"/>
      <circle cx="16" cy="13" r="4" fill="#55FF55"/>
      <text x="28" y="17" fill="#FFAA00" class="font-mc" font-size="8" font-weight="700">LATEST MOVE:</text>
      <text x="145" y="17" fill="#FFFFFF" class="font-mc" font-size="8">${safeActionText}</text>
    </g>

    <!-- The Floating Platform (Anchored Isometric World) -->
    <g class="mc-island" filter="url(#islandShadow)">

      <!-- Bedrock Tip -->
      ${bedrockSvg}

      <!-- Front Cliff Faces (Dirt Extrusions) -->
      ${leftCliffSvg}
      ${rightCliffSvg}

      <!-- Island Surface & Bridge Tiles -->
      ${tilesSvg}

      <!-- Depth-Sorted Actors (Oak Tree, Starter Chest, Steve) -->
      ${actorsSvg}

    </g>
  </g>

  <!-- ================= 3. AUTHENTIC MINECRAFT HOTBAR ================= -->
  <rect x="20" y="466" width="880" height="58" rx="4" fill="#202224" stroke="#3D4044" stroke-width="2"/>
  <rect x="24" y="470" width="872" height="50" rx="3" fill="#161718"/>

  <!-- 9 Hotbar Slots -->
  <g transform="translate(0, 0)">
    ${hotbarSvg}
  </g>
</svg>`;

  return minifySvg(svg);
}

// Placed Bridge Block (Oak Planks or Diamond)
function renderBridgeBlock(cx, cy, type = 'oak_planks') {
  const isDiamond = type === 'diamond';
  const topFill = isDiamond ? '#55FFFF' : '#B88746';
  const topStroke = isDiamond ? '#00AAAA' : '#8D5B28';
  const leftFill = isDiamond ? '#00CCCC' : '#9E6E32';
  const leftStroke = isDiamond ? '#008888' : '#73481D';
  const rightFill = isDiamond ? '#009999' : '#7D4F1C';
  const rightStroke = isDiamond ? '#006666' : '#59340F';
  const depth = 16;

  return `
  <!-- Bridge Block (${type}) -->
  <g class="bridge-block">
    <!-- Left Face -->
    <polygon points="${cx - 36},${cy} ${cx},${cy + 18} ${cx},${cy + 18 + depth} ${cx - 36},${cy + depth}" fill="${leftFill}" stroke="${leftStroke}" stroke-width="0.8"/>
    <!-- Right Face -->
    <polygon points="${cx},${cy + 18} ${cx + 36},${cy} ${cx + 36},${cy + depth} ${cx},${cy + 18 + depth}" fill="${rightFill}" stroke="${rightStroke}" stroke-width="0.8"/>
    <!-- Top Face -->
    <polygon points="${cx},${cy - 18} ${cx + 36},${cy} ${cx},${cy + 18} ${cx - 36},${cy}" fill="${topFill}" stroke="${topStroke}" stroke-width="0.8"/>
    <!-- Texture Detail -->
    ${!isDiamond ? `
    <line x1="${cx - 18}" y1="${cy - 9}" x2="${cx}" y2="${cy}" stroke="#73481D" stroke-width="0.8" opacity="0.6"/>
    <line x1="${cx}" y1="${cy}" x2="${cx + 18}" y2="${cy + 9}" stroke="#73481D" stroke-width="0.8" opacity="0.6"/>
    <line x1="${cx - 18}" y1="${cy + 9}" x2="${cx}" y2="${cy + 18}" stroke="#59340F" stroke-width="0.8" opacity="0.6"/>
    ` : `
    <polygon points="${cx},${cy - 10} ${cx + 18},${cy - 1} ${cx},${cy + 8} ${cx - 18},${cy - 1}" fill="#AAFFFF" opacity="0.7"/>
    `}
  </g>`;
}

// Authentic Minecraft Oak Tree with Visual Breaking Decals & Floating HP Bar
function renderAuthenticOakTree(cx, cy, hp = 4, maxHp = 4) {
  const hpPercent = hp / maxHp;
  let hpColor = '#55FF55';
  if (hpPercent <= 0.25) hpColor = '#FF5555';
  else if (hpPercent <= 0.5) hpColor = '#FFAA00';
  else if (hpPercent <= 0.75) hpColor = '#FFFF55';

  return `
  <!-- Authentic Skyblock Oak Tree -->
  <g class="oak-tree">
    <!-- Tree Trunk -->
    <polygon points="${cx - 10},${cy - 18} ${cx + 4},${cy - 10} ${cx + 4},${cy + 10} ${cx - 10},${cy + 2}" fill="#6B5130"/>
    <polygon points="${cx + 4},${cy - 10} ${cx + 18},${cy - 18} ${cx + 18},${cy + 2} ${cx + 4},${cy + 10}" fill="#4F3B23"/>

    <!-- Bark Lines -->
    <line x1="${cx - 3}" y1="${cy - 14}" x2="${cx - 3}" y2="${cy + 6}" stroke="#543E23" stroke-width="1.2"/>
    <line x1="${cx + 11}" y1="${cy - 14}" x2="${cx + 11}" y2="${cy + 6}" stroke="#3D2E18" stroke-width="1.2"/>

    <!-- Wood Punching Decals (Cracks appear when tree is damaged) -->
    ${hp < maxHp ? `
    <line x1="${cx - 6}" y1="${cy - 10}" x2="${cx + 1}" y2="${cy - 2}" stroke="#1E140A" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="${cx + 1}" y1="${cy - 2}" x2="${cx - 3}" y2="${cy + 6}" stroke="#1E140A" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="${cx + 6}" y1="${cy - 8}" x2="${cx + 12}" y2="${cy}" stroke="#1E140A" stroke-width="2.2" stroke-linecap="round"/>
    ` : ''}
    ${hp <= 1 ? `
    <line x1="${cx - 8}" y1="${cy - 2}" x2="${cx + 2}" y2="${cy - 6}" stroke="#140D07" stroke-width="2.5"/>
    <line x1="${cx + 2}" y1="${cy - 6}" x2="${cx + 15}" y2="${cy - 3}" stroke="#140D07" stroke-width="2.5"/>
    ` : ''}

    <!-- Cubic Foliage Lower Cluster -->
    <polygon points="${cx},${cy - 72} ${cx + 44},${cy - 50} ${cx},${cy - 28} ${cx - 44},${cy - 50}" fill="#4C802E"/>
    <polygon points="${cx - 44},${cy - 50} ${cx},${cy - 28} ${cx},${cy - 4} ${cx - 44},${cy - 26}" fill="#386420"/>
    <polygon points="${cx},${cy - 28} ${cx + 44},${cy - 50} ${cx + 44},${cy - 26} ${cx},${cy - 4}" fill="#264714"/>

    <!-- Cubic Foliage Crown -->
    <polygon points="${cx},${cy - 96} ${cx + 28},${cy - 82} ${cx},${cy - 68} ${cx - 28},${cy - 82}" fill="#5FA33A"/>
    <polygon points="${cx - 28},${cy - 82} ${cx},${cy - 68} ${cx},${cy - 48} ${cx - 28},${cy - 62}" fill="#4C802E"/>
    <polygon points="${cx},${cy - 68} ${cx + 28},${cy - 82} ${cx + 28},${cy - 62} ${cx},${cy - 48}" fill="#386420"/>

    <!-- Tree HP Floating Durability Badge -->
    <g transform="translate(${cx}, ${cy - 106})">
      <rect x="-34" y="-12" width="68" height="15" rx="2" fill="#000000" opacity="0.65"/>
      <text x="0" y="-1" fill="${hpColor}" class="font-mc" font-size="7" text-anchor="middle">🪵 ${hp}/${maxHp} HP</text>
    </g>
  </g>`;
}

// Authentic Wooden Starter Chest with Open/Closed State
function renderAuthenticChest(cx, cy, opened = false) {
  const roofY = cy - 24;
  return `
  <!-- Starter Wooden Chest -->
  <g class="starter-chest">
    ${opened ? `
    <!-- Open Chest Lid tilted back -->
    <polygon points="${cx - 16},${roofY - 14} ${cx},${roofY - 6} ${cx},${roofY + 2} ${cx - 16},${roofY - 6}" fill="#9E6732" stroke="#4A2F14" stroke-width="1"/>
    <polygon points="${cx},${roofY - 6} ${cx + 16},${roofY - 14} ${cx + 16},${roofY - 6} ${cx},${roofY + 2}" fill="#7D5127" stroke="#4A2F14" stroke-width="1"/>
    <!-- Chest Base Interior (Gold glow) -->
    <polygon points="${cx - 16},${roofY} ${cx},${roofY + 8} ${cx},${cy + 6} ${cx - 16},${cy - 2}" fill="#5A3A1C" stroke="#3D2611" stroke-width="1"/>
    <polygon points="${cx},${roofY + 8} ${cx + 16},${roofY} ${cx + 16},${cy - 2} ${cx},${cy + 6}" fill="#4A2F14" stroke="#3D2611" stroke-width="1"/>
    <polygon points="${cx},${roofY - 4} ${cx + 14},${roofY + 3} ${cx},${roofY + 10} ${cx - 14},${roofY + 3}" fill="#FFAA00" opacity="0.4"/>
    <!-- Looted Badge -->
    <g transform="translate(${cx}, ${cy - 36})">
      <rect x="-30" y="-11" width="60" height="14" rx="2" fill="#000000" opacity="0.6"/>
      <text x="0" y="-1" fill="#FFAA00" class="font-mc" font-size="6.5" text-anchor="middle">📦 LOOTED</text>
    </g>
    ` : `
    <!-- Closed Chest -->
    <polygon points="${cx - 16},${roofY} ${cx},${roofY + 8} ${cx},${cy + 6} ${cx - 16},${cy - 2}" fill="#7D5127" stroke="#4A2F14" stroke-width="1"/>
    <polygon points="${cx},${roofY + 8} ${cx + 16},${roofY} ${cx + 16},${cy - 2} ${cx},${cy + 6}" fill="#5A3A1C" stroke="#3D2611" stroke-width="1"/>
    <polygon points="${cx},${roofY - 8} ${cx + 16},${roofY} ${cx},${roofY + 8} ${cx - 16},${roofY}" fill="#9E6732" stroke="#4A2F14" stroke-width="1"/>
    <line x1="${cx - 16}" y1="${roofY + 3}" x2="${cx}" y2="${roofY + 11}" stroke="#1E1E1E" stroke-width="1.2"/>
    <line x1="${cx}" y1="${roofY + 11}" x2="${cx + 16}" y2="${roofY + 3}" stroke="#1E1E1E" stroke-width="1.2"/>
    <rect x="${cx - 2.5}" y="${roofY + 5}" width="5" height="7" rx="1" fill="#E0E0E0" stroke="#000000" stroke-width="0.8"/>
    <!-- Starter Chest Badge -->
    <g transform="translate(${cx}, ${cy - 36})">
      <rect x="-32" y="-11" width="64" height="14" rx="2" fill="#000000" opacity="0.6"/>
      <text x="0" y="-1" fill="#55FF55" class="font-mc" font-size="6.5" text-anchor="middle">📦 STARTER</text>
    </g>
    `}
  </g>`;
}

// Steve Solo Survivor with Directional Facing & Minecraft Multiplayer Nametag
function renderSoloSteve(cx, cy, inventory = [], lastMover = 'mo-farooq', facing = 'south') {
  // Check if Steve has a held tool in slot 1 or pickaxe
  const heldPick = inventory.find(i => i.id === 'diamond_pickaxe' || i.id === 'stone_pickaxe' || i.id === 'pickaxe');
  const isFacingNorth = facing === 'north';
  const isFacingWest = facing === 'west';

  // If facing west, mirror Steve horizontally across cx
  const mirrorTransform = isFacingWest ? `transform="translate(${2 * cx}, 0) scale(-1, 1)"` : '';

  return `
  <!-- Steve Solo Survivor (Facing: ${facing}) -->
  <g class="steve-actor" data-character="steve" data-facing="${facing}" ${mirrorTransform}>
    <!-- Contact Shadow -->
    <ellipse cx="${cx}" cy="${cy + 4}" rx="18" ry="8" fill="#000000" opacity="0.45"/>

    <!-- Boots -->
    <polygon points="${cx - 10},${cy - 2} ${cx - 3},${cy + 2} ${cx - 3},${cy - 8} ${cx - 10},${cy - 12}" fill="#3A3A3A"/>
    <polygon points="${cx - 3},${cy + 2} ${cx + 3},${cy - 2} ${cx + 3},${cy - 12} ${cx - 3},${cy - 8}" fill="#242424"/>
    <polygon points="${cx + 4},${cy + 2} ${cx + 11},${cy - 2} ${cx + 11},${cy - 12} ${cx + 4},${cy - 8}" fill="#3A3A3A"/>
    <polygon points="${cx + 11},${cy - 2} ${cx + 17},${cy - 5} ${cx + 17},${cy - 15} ${cx + 11},${cy - 12}" fill="#242424"/>

    <!-- Pants -->
    <polygon points="${cx - 9},${cy - 11} ${cx - 1},${cy - 7} ${cx - 1},${cy - 26} ${cx - 9},${cy - 30}" fill="#2B3CA3"/>
    <polygon points="${cx + 2},${cy - 7} ${cx + 11},${cy - 11} ${cx + 11},${cy - 30} ${cx + 2},${cy - 26}" fill="#1B266B"/>

    <!-- Cyan Torso -->
    <polygon points="${cx},${cy - 54} ${cx + 16},${cy - 46} ${cx},${cy - 38} ${cx - 16},${cy - 46}" fill="#00BDBD"/>
    <polygon points="${cx - 16},${cy - 46} ${cx},${cy - 38} ${cx},${cy - 24} ${cx - 16},${cy - 32}" fill="#008E8E"/>
    <polygon points="${cx},${cy - 38} ${cx + 16},${cy - 46} ${cx + 16},${cy - 32} ${cx},${cy - 24}" fill="#006363"/>

    <!-- Head -->
    <polygon points="${cx},${cy - 74} ${cx + 13},${cy - 68} ${cx},${cy - 62} ${cx - 13},${cy - 68}" fill="#4A3018"/>
    <polygon points="${cx - 13},${cy - 68} ${cx},${cy - 62} ${cx},${cy - 45} ${cx - 13},${cy - 51}" fill="${isFacingNorth ? '#4A3018' : '#BD8B72'}"/>
    <polygon points="${cx - 13},${cy - 68} ${cx},${cy - 62} ${cx},${cy - 58} ${cx - 13},${cy - 64}" fill="#4A3018"/>
    <polygon points="${cx},${cy - 62} ${cx + 13},${cy - 68} ${cx + 13},${cy - 51} ${cx},${cy - 45}" fill="${isFacingNorth ? '#3D2611' : '#996D57'}"/>

    ${!isFacingNorth ? `
    <!-- Eyes -->
    <rect x="${cx - 10}" y="${cy - 57}" width="4" height="3" fill="#FFFFFF"/>
    <rect x="${cx - 6}" y="${cy - 57}" width="3" height="3" fill="#2B3CA3"/>
    ` : ''}

    <!-- Left Arm -->
    <polygon points="${cx - 18},${cy - 45} ${cx - 13},${cy - 42} ${cx - 13},${cy - 26} ${cx - 18},${cy - 29}" fill="#008E8E"/>
    <polygon points="${cx - 18},${cy - 29} ${cx - 13},${cy - 26} ${cx - 13},${cy - 18} ${cx - 18},${cy - 21}" fill="#BD8B72"/>

    <!-- Right Arm (Fixed: Naturally attached to shoulder, no detached sky swinging) -->
    <g>
      <polygon points="${cx + 13},${cy - 42} ${cx + 18},${cy - 45} ${cx + 18},${cy - 29} ${cx + 13},${cy - 26}" fill="#006363"/>
      <polygon points="${cx + 13},${cy - 26} ${cx + 18},${cy - 29} ${cx + 18},${cy - 21} ${cx + 13},${cy - 18}" fill="#BD8B72"/>
      ${heldPick ? `
      <!-- Pickaxe Tool in Hand -->
      <line x1="${cx + 15}" y1="${cy - 24}" x2="${cx + 34}" y2="${cy - 45}" stroke="#866043" stroke-width="3" stroke-linecap="round"/>
      <polygon points="${cx + 27},${cy - 50} ${cx + 39},${cy - 41} ${cx + 37},${cy - 38} ${cx + 25},${cy - 47}" fill="#00FFFF"/>
      ` : ''}
    </g>

    <!-- Minecraft Multiplayer Nametag -->
    <g transform="translate(${cx}, ${cy - 82})">
      <rect x="-46" y="-12" width="92" height="15" rx="2" fill="#000000" opacity="0.65"/>
      <text x="0" y="-1" fill="#FFFFFF" class="font-mc" font-size="7.5" text-anchor="middle">@${escapeXml(lastMover || 'mo-farooq')}</text>
    </g>
  </g>`;
}

// Standalone execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const rawData = fs.readFileSync(STATE_FILE, 'utf-8');
    const state = JSON.parse(rawData);
    const svgContent = renderWorldSvg(state);
    fs.writeFileSync(SVG_OUTPUT, svgContent, 'utf-8');

    const RENDERS_DIR = path.join(ROOT_DIR, 'renders');
    if (!fs.existsSync(RENDERS_DIR)) {
      fs.mkdirSync(RENDERS_DIR, { recursive: true });
    }
    const turnNum = state.stats?.totalMoves || 1;
    const turnSvgOutput = path.join(RENDERS_DIR, `world-turn-${turnNum}.svg`);
    fs.writeFileSync(turnSvgOutput, svgContent, 'utf-8');

    console.log(`[SVG Engine] Successfully rendered Minecraft Skyblock to ${SVG_OUTPUT} and ${turnSvgOutput}`);
  } catch (err) {
    console.error(`[SVG Engine Error]:`, err);
    process.exit(1);
  }
}
