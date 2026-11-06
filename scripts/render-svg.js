import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const STATE_FILE = path.join(ROOT_DIR, 'data', 'world-state.json');
const SVG_OUTPUT = path.join(ROOT_DIR, 'world-3d.svg');

export function renderWorldSvg(stateData) {
  const {
    steve = { row: 2, col: 2, lastMover: 'mo-farooq' },
    tree = { hp: 4, maxHp: 4 },
    enderDragon = { hp: 850, maxHp: 1000 },
    inventory = [],
    stats = {},
    starterIsland = [],
    bridges = [],
    placedObjects = []
  } = stateData;

  // Isometric Grid Projection Math
  // Canvas: 920x540
  // Center Origin: (460, 200)
  // Step vectors: dx = 42, dy = 21
  function getTileCenter(row, col) {
    const cx = 460 + (col - row) * 42;
    const cy = 200 + (col + row) * 21;
    return { cx, cy };
  }

  // Draw starter L-island ground tiles
  const islandTiles = [
    { row: 0, col: 2 },
    { row: 1, col: 2 },
    { row: 1, col: 3 },
    { row: 2, col: 2 },
    { row: 2, col: 3 },
    { row: 2, col: 4 },
    { row: 3, col: 2 },
    { row: 3, col: 3 },
    { row: 3, col: 4 }
  ];

  // Render ground voxels
  let groundSvg = '';
  // Sort tiles depth-wise (row + col) ascending
  const allGround = [...islandTiles].sort((a, b) => (a.row + a.col) - (b.row + b.col));
  for (const t of allGround) {
    const { cx, cy } = getTileCenter(t.row, t.col);
    groundSvg += renderGrassTile(cx, cy, t.row, t.col);
  }

  // Render Void Bridges
  let bridgesSvg = '';
  const sortedBridges = [...bridges].sort((a, b) => (a.row + a.col) - (b.row + b.col));
  for (const b of sortedBridges) {
    const { cx, cy } = getTileCenter(b.row, b.col);
    bridgesSvg += renderBridgeVoxel(cx, cy, b.type, b.builder, b.emoji, b.row, b.col, b.isVip);
  }

  // Render Placed Objects (Torches, Crafting Tables, Furnaces)
  let objectsSvg = '';
  for (const obj of placedObjects) {
    const { cx, cy } = getTileCenter(obj.row, obj.col);
    if (obj.type === 'torch') {
      objectsSvg += renderTorch(cx, cy);
    } else if (obj.type === 'crafting_table') {
      objectsSvg += renderCraftingTable(cx, cy, obj.builder);
    } else if (obj.type === 'furnace') {
      objectsSvg += renderFurnace(cx, cy, obj.builder);
    }
  }

  // Solitary Oak Tree at [0, 2]
  const treePos = getTileCenter(0, 2);
  const treeSvg = renderSkyblockTree(treePos.cx, treePos.cy, tree.hp, tree.maxHp);

  // Starter Chest at [1, 2]
  const chestPos = getTileCenter(1, 2);
  const chestSvg = renderStarterChest(chestPos.cx, chestPos.cy);

  // Cobblestone Generator at [1, 3]
  const genPos = getTileCenter(1, 3);
  const genSvg = renderCobblestoneGenerator(genPos.cx, genPos.cy);

  // Steve Rig at steve.row, steve.col
  const stevePos = getTileCenter(steve.row, steve.col);
  const steveSvg = renderMinecraftSteve(stevePos.cx, stevePos.cy, steve.lastMover);

  // Alex Rig at [2, 4]
  const alexPos = getTileCenter(2, 4);
  const alexSvg = renderMinecraftAlex(alexPos.cx, alexPos.cy);

  const dragonWidth = Math.max(Math.min((enderDragon.hp / enderDragon.maxHp) * 340, 340), 10);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 540" width="100%" height="100%">
  <defs>
    <!-- Sky Gradient -->
    <linearGradient id="skyVoid" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3D6CD9"/>
      <stop offset="60%" stop-color="#7EA4F8"/>
      <stop offset="100%" stop-color="#C2D6FF"/>
    </linearGradient>

    <!-- Ender Dragon Boss Bar -->
    <linearGradient id="dragonBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#A500D6"/>
      <stop offset="50%" stop-color="#E352FF"/>
      <stop offset="100%" stop-color="#7B00A0"/>
    </linearGradient>

    <!-- Diamond Gleam -->
    <linearGradient id="diamondGleam" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E8FFFF"/>
      <stop offset="50%" stop-color="#00FFFF"/>
      <stop offset="100%" stop-color="#009999"/>
    </linearGradient>

    <!-- Lava Glow -->
    <linearGradient id="lavaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF9900"/>
      <stop offset="60%" stop-color="#FF3300"/>
      <stop offset="100%" stop-color="#CC1100"/>
    </linearGradient>

    <!-- Island Drop Shadow -->
    <filter id="voidShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="16" flood-color="#000000" flood-opacity="0.5"/>
    </filter>

    <clipPath id="skyClip">
      <rect x="20" y="86" width="880" height="388" rx="8"/>
    </clipPath>
  </defs>

  <style>
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&amp;family=Share+Tech+Mono&amp;display=swap');
    .font-mc { font-family: 'Press Start 2P', 'Courier New', monospace; }
    .font-ui { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

    @keyframes floatIsland {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-7px); }
    }
    @keyframes armSwing {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(-24deg); }
    }
    @keyframes xpOrbPulse {
      0%, 100% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.35); opacity: 1; }
    }
    @keyframes dragonWing {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-8px) rotate(2deg); }
    }
    @keyframes steamRise {
      0% { transform: translateY(0px); opacity: 0.8; }
      100% { transform: translateY(-16px); opacity: 0; }
    }

    .mc-island { animation: floatIsland 5s ease-in-out infinite; }
    .steve-arm { animation: armSwing 1.6s ease-in-out infinite; transform-origin: 36px 44px; }
    .xp-orb { animation: xpOrbPulse 1.6s infinite ease-in-out; }
    .dragon-actor { animation: dragonWing 4s ease-in-out infinite; }
    .steam-particle { animation: steamRise 1.8s infinite linear; }
  </style>

  <!-- ================= FRAME ================= -->
  <rect x="0" y="0" width="920" height="540" rx="12" fill="#18191A"/>
  <rect x="4" y="4" width="912" height="532" rx="10" fill="#2A2B2E" stroke="#101112" stroke-width="3"/>
  <rect x="10" y="10" width="900" height="520" rx="8" fill="#141517"/>

  <!-- ================= 1. MINECRAFT HEADER ================= -->
  <rect x="20" y="16" width="880" height="60" rx="6" fill="#252628" stroke="#404245" stroke-width="2"/>

  <!-- Steve Avatar -->
  <g transform="translate(32, 25)">
    <rect width="42" height="42" rx="3" fill="#111111" stroke="#000000" stroke-width="2"/>
    <rect x="4" y="4" width="34" height="12" fill="#4A3018"/>
    <rect x="4" y="16" width="34" height="22" fill="#BD8B72"/>
    <rect x="8" y="21" width="7" height="5" fill="#FFFFFF"/>
    <rect x="11" y="21" width="4" height="5" fill="#2B3CA3"/>
    <rect x="26" y="21" width="7" height="5" fill="#FFFFFF"/>
    <rect x="26" y="21" width="4" height="5" fill="#2B3CA3"/>
    <rect x="17" y="27" width="8" height="5" fill="#A06950"/>
    <rect x="14" y="32" width="14" height="3" fill="#693820"/>
  </g>

  <!-- Player Title & Location -->
  <text x="88" y="41" fill="#FFFFFF" class="font-mc" font-size="12" font-weight="700">Mohammad Farooq's Skyblock</text>
  <text x="88" y="58" fill="#55FF55" class="font-mc" font-size="9">★ STEVE AT TILE [${steve.row}, ${steve.col}] • HARDCORE SURVIVAL</text>

  <!-- Hearts & Food -->
  <g transform="translate(560, 30)">
    <text x="0" y="15" font-size="14">❤️❤️❤️❤️❤️</text>
    <text x="88" y="15" font-size="14">🍗🍗🍗🍗🍗</text>
    <text x="0" y="32" fill="#FFAA00" class="font-mc" font-size="8">FULL HEALTH</text>
    <text x="88" y="32" fill="#FFAA00" class="font-mc" font-size="8">FULL HUNGER</text>
  </g>

  <!-- Turn Counter Badge -->
  <g transform="translate(760, 25)">
    <rect width="128" height="42" rx="4" fill="#18191A" stroke="#55FF55" stroke-width="1.5"/>
    <text x="64" y="18" fill="#AAAAAA" class="font-mc" font-size="7.5" text-anchor="middle">TOTAL TURNS</text>
    <text x="64" y="36" fill="#55FF55" class="font-mc" font-size="12" font-weight="700" text-anchor="middle">MOVE #${stats.totalMoves || 42}</text>
  </g>

  <!-- ================= 2. 3D SKYBLOCK VIEWPORT ================= -->
  <rect x="20" y="86" width="880" height="388" rx="8" fill="#1C2333" stroke="#3D4248" stroke-width="2"/>

  <g clip-path="url(#skyClip)">
    <!-- Infinite Sky Background -->
    <rect x="20" y="86" width="880" height="388" fill="url(#skyVoid)"/>

    <!-- Minecraft Blocky Clouds -->
    <rect x="40" y="110" width="160" height="28" fill="#FFFFFF" opacity="0.85" rx="2"/>
    <rect x="120" y="100" width="100" height="28" fill="#FFFFFF" opacity="0.85" rx="2"/>
    <rect x="660" y="125" width="200" height="30" fill="#FFFFFF" opacity="0.8" rx="2"/>
    <rect x="750" y="115" width="110" height="30" fill="#FFFFFF" opacity="0.8" rx="2"/>

    <!-- Ender Dragon Flying Silhouette -->
    <g class="dragon-actor" transform="translate(680, 160)">
      <!-- Dragon Body & Wings -->
      <polygon points="0,15 35,0 70,15 45,22 0,22" fill="#181818"/>
      <polygon points="15,10 35,-15 50,5" fill="#222222"/>
      <polygon points="40,10 65,-12 60,8" fill="#181818"/>
      <!-- Glowing Purple Eyes -->
      <rect x="62" y="13" width="3" height="3" fill="#D600FF"/>
      <rect x="66" y="13" width="3" height="3" fill="#D600FF"/>
      <text x="35" y="35" text-anchor="middle" fill="#E352FF" class="font-mc" font-size="7">Ender Dragon</text>
    </g>

    <!-- Ender Dragon Boss Bar Overlay -->
    <g transform="translate(260, 98)">
      <rect x="0" y="0" width="400" height="22" rx="3" fill="#0C0C0D" stroke="#333333" stroke-width="2"/>
      <rect x="3" y="3" width="${dragonWidth}" height="16" rx="2" fill="url(#dragonBarGrad)"/>
      <text x="200" y="15" text-anchor="middle" fill="#FFFFFF" class="font-mc" font-size="8.5" font-weight="700">⚔️ Ender Dragon (${enderDragon.hp} / ${enderDragon.maxHp} HP)</text>
    </g>

    <!-- ================= THE L-SHAPED SKYBLOCK ISLAND ================= -->
    <g class="mc-island" filter="url(#voidShadow)">

      <!-- L-Island Base Cliff Extrusions (Dirt & Bedrock Layers) -->
      <!-- Dirt Layers -->
      <polygon points="376,263 460,305 460,335 376,293" fill="#866043"/>
      <polygon points="460,305 586,242 586,272 460,335" fill="#694B32"/>
      <!-- Bedrock bottom -->
      <polygon points="376,293 460,335 460,350 376,308" fill="#4A4A4A"/>
      <polygon points="460,335 586,272 586,287 460,350" fill="#333333"/>

      <!-- Ground Voxels -->
      ${groundSvg}

      <!-- Void Bridge Blocks -->
      ${bridgesSvg}

      <!-- Solitary Oak Tree at [0, 2] -->
      ${treeSvg}

      <!-- Starter Wooden Chest at [1, 2] -->
      ${chestSvg}

      <!-- Cobblestone Generator at [1, 3] -->
      ${genSvg}

      <!-- Placed Objects (Torches, Crafting Table, Furnaces) -->
      ${objectsSvg}

      <!-- Alex Rig at [2, 4] -->
      ${alexSvg}

      <!-- Steve Rig at [steve.row, steve.col] -->
      ${steveSvg}

    </g>

    <!-- Viewport Info Pills -->
    <rect x="34" y="434" width="240" height="26" rx="4" fill="#0E1012" opacity="0.9" stroke="#333333" stroke-width="1.5"/>
    <text x="46" y="451" fill="#55FF55" class="font-mc" font-size="8">🏝️ L-Island Skyblock • Turn-Based</text>

    <rect x="670" y="434" width="216" height="26" rx="4" fill="#0E1012" opacity="0.9" stroke="#00FFFF" stroke-width="1.5"/>
    <text x="778" y="451" text-anchor="middle" fill="#00FFFF" class="font-mc" font-size="8">⭐ Star = VIP Diamond Bridge</text>
  </g>

  <!-- ================= 3. BOTTOM SERVER TICKER ================= -->
  <rect x="20" y="482" width="880" height="44" rx="6" fill="#202224" stroke="#3D4044" stroke-width="2"/>
  <rect x="24" y="486" width="872" height="36" rx="4" fill="#141517"/>
  <text x="40" y="509" fill="#00FFFF" class="font-mc" font-size="9.5">&lt;Server&gt; <tspan fill="#FFFFFF">Steve is standing at Tile [${steve.row}, ${steve.col}]. Select an action below to make the next multiplayer move!</tspan></text>
</svg>`;
}

// 3D Voxel Grass Tile
function renderGrassTile(cx, cy, row, col) {
  const top = `${cx},${cy - 21} ${cx + 42},${cy} ${cx},${cy + 21} ${cx - 42},${cy}`;
  const left = `${cx - 42},${cy} ${cx},${cy + 21} ${cx},${cy + 35} ${cx - 42},${cy + 14}`;
  const right = `${cx},${cy + 21} ${cx + 42},${cy} ${cx + 42},${cy + 14} ${cx},${cy + 35}`;

  return `
  <!-- Grass Tile (${row},${col}) -->
  <g data-tile="${row},${col}">
    <polygon points="${left}" fill="#866043"/>
    <polygon points="${right}" fill="#694B32"/>
    <polygon points="${top}" fill="#5B8731"/>
    <!-- Top Grass Detail -->
    <polygon points="${cx},${cy - 12} ${cx + 20},${cy - 2} ${cx},${cy + 8} ${cx - 20},${cy - 2}" fill="#6FA33C" opacity="0.75"/>
    <!-- Overhang Green Fringe -->
    <polygon points="${cx - 42},${cy} ${cx},${cy + 21} ${cx},${cy + 25} ${cx - 42},${cy + 4}" fill="#4C7026"/>
    <polygon points="${cx},${cy + 21} ${cx + 42},${cy} ${cx + 42},${cy + 4} ${cx},${cy + 25}" fill="#3D5A1E"/>
  </g>`;
}

// 3D Void Bridge Voxel Block
function renderBridgeVoxel(cx, cy, type, builder, emoji, row, col, isVip) {
  const h = 32;
  const roofY = cy - h;

  const palettes = {
    oak_planks: { top: '#B88746', left: '#9E6F33', right: '#7D5422', border: '#FFAA00', txt: '#FFAA00', emoji: '🪵' },
    cobblestone: { top: '#999999', left: '#757575', right: '#595959', border: '#AAAAAA', txt: '#FFFFFF', emoji: '🪨' },
    diamond: { top: '#4DEDDE', left: '#2CBAA8', right: '#1A8F81', border: '#00FFFF', txt: '#00FFFF', emoji: '💎' }
  };

  const pal = palettes[type] || palettes.oak_planks;
  const left = `${cx - 42},${roofY} ${cx},${roofY + 21} ${cx},${cy + 21} ${cx - 42},${cy}`;
  const right = `${cx},${roofY + 21} ${cx + 42},${roofY} ${cx + 42},${cy} ${cx},${cy + 21}`;
  const roof = `${cx},${roofY - 21} ${cx + 42},${roofY} ${cx},${roofY + 21} ${cx - 42},${roofY}`;

  const tagText = `${pal.emoji} @${escapeXml(builder || 'Player')}`;
  const tagWidth = Math.max(tagText.length * 7.5 + 16, 76);

  return `
  <!-- Bridge Block at (${row},${col}) -->
  <g class="bridge-block" data-tile="${row},${col}">
    <polygon points="${left}" fill="${pal.left}"/>
    <polygon points="${right}" fill="${pal.right}"/>
    <polygon points="${roof}" fill="${pal.top}"/>

    <!-- Player Tag -->
    <g transform="translate(${cx}, ${roofY - 24})">
      <rect x="${-tagWidth / 2}" y="-9" width="${tagWidth}" height="18" rx="3" fill="#000000" opacity="0.9" stroke="${isVip ? '#00FFFF' : pal.border}" stroke-width="1.5"/>
      <text x="0" y="4" text-anchor="middle" fill="${isVip ? '#00FFFF' : pal.txt}" class="font-mc" font-size="7.5" font-weight="700">${tagText}</text>
    </g>
  </g>`;
}

// Solitary Skyblock Oak Tree at [0, 2]
function renderSkyblockTree(cx, cy, hp = 4, maxHp = 4) {
  return `
  <!-- Solitary Oak Tree [0, 2] -->
  <g class="skyblock-tree">
    <!-- Trunk -->
    <polygon points="${cx - 10},${cy - 20} ${cx + 4},${cy - 12} ${cx + 4},${cy + 6} ${cx - 10},${cy - 2}" fill="#6B5130"/>
    <polygon points="${cx + 4},${cy - 12} ${cx + 18},${cy - 20} ${cx + 18},${cy - 2} ${cx + 4},${cy + 6}" fill="#4F3B23"/>

    <!-- Cubic Foliage Lower Layer -->
    <polygon points="${cx},${cy - 70} ${cx + 38},${cy - 50} ${cx},${cy - 30} ${cx - 38},${cy - 50}" fill="#4C802E"/>
    <polygon points="${cx - 38},${cy - 50} ${cx},${cy - 30} ${cx},${cy - 10} ${cx - 38},${cy - 30}" fill="#386420"/>
    <polygon points="${cx},${cy - 30} ${cx + 38},${cy - 50} ${cx + 38},${cy - 30} ${cx},${cy - 10}" fill="#264714"/>

    <!-- Cubic Foliage Top Cube -->
    <polygon points="${cx},${cy - 90} ${cx + 24},${cy - 78} ${cx},${cy - 66} ${cx - 24},${cy - 78}" fill="#5FA33A"/>
    <polygon points="${cx - 24},${cy - 78} ${cx},${cy - 66} ${cx},${cy - 50} ${cx - 24},${cy - 62}" fill="#4C802E"/>
    <polygon points="${cx},${cy - 66} ${cx + 24},${cy - 78} ${cx + 24},${cy - 62} ${cx},${cy - 50}" fill="#386420"/>

    <!-- Tree HP Badge -->
    <g transform="translate(${cx}, ${cy - 104})">
      <rect x="-48" y="-9" width="96" height="18" rx="3" fill="#000000" opacity="0.9" stroke="#55FF55" stroke-width="1.5"/>
      <text x="0" y="4" text-anchor="middle" fill="#55FF55" class="font-mc" font-size="7.5">🌲 TREE (${hp}/${maxHp} HP)</text>
    </g>
  </g>`;
}

// Starter Wooden Chest at [1, 2]
function renderStarterChest(cx, cy) {
  const roofY = cy - 24;
  return `
  <!-- Starter Chest [1, 2] -->
  <g class="starter-chest">
    <!-- Box Body -->
    <polygon points="${cx - 16},${roofY} ${cx},${roofY + 8} ${cx},${cy + 4} ${cx - 16},${cy - 4}" fill="#7D5127"/>
    <polygon points="${cx},${roofY + 8} ${cx + 16},${roofY} ${cx + 16},${cy - 4} ${cx},${cy + 4}" fill="#5A3A1C"/>
    <polygon points="${cx},${roofY - 8} ${cx + 16},${roofY} ${cx},${roofY + 8} ${cx - 16},${roofY}" fill="#9E6732"/>
    <!-- Iron Latch -->
    <rect x="${cx - 2}" y="${roofY + 4}" width="4" height="6" fill="#D6D6D6" stroke="#000000" stroke-width="0.8"/>

    <!-- Chest Tag -->
    <g transform="translate(${cx}, ${roofY - 18})">
      <rect x="-38" y="-8" width="76" height="16" rx="2" fill="#000000" opacity="0.85" stroke="#FFAA00" stroke-width="1.2"/>
      <text x="0" y="4" text-anchor="middle" fill="#FFAA00" class="font-mc" font-size="7">📦 CHEST</text>
    </g>
  </g>`;
}

// Cobblestone Generator at [1, 3]
function renderCobblestoneGenerator(cx, cy) {
  const roofY = cy - 22;
  return `
  <!-- Cobblestone Generator [1, 3] -->
  <g class="cobblestone-gen">
    <!-- Water block (Left) -->
    <polygon points="${cx - 28},${roofY + 6} ${cx - 10},${roofY + 15} ${cx - 10},${cy + 5} ${cx - 28},${cy - 4}" fill="#2E6BA8"/>
    <polygon points="${cx - 10},${roofY + 15} ${cx - 10},${roofY + 5} ${cx - 28},${roofY - 4} ${cx - 28},${roofY + 6}" fill="#4A8CE0"/>

    <!-- Lava block (Right) -->
    <polygon points="${cx + 10},${roofY + 15} ${cx + 28},${roofY + 6} ${cx + 28},${cy - 4} ${cx + 10},${cy + 5}" fill="url(#lavaGrad)"/>
    <polygon points="${cx + 10},${roofY + 15} ${cx + 10},${roofY + 5} ${cx + 28},${roofY - 4} ${cx + 28},${roofY + 6}" fill="#FF6600"/>

    <!-- Generated Cobblestone (Center) -->
    <polygon points="${cx - 10},${roofY + 5} ${cx},${roofY + 10} ${cx},${cy + 8} ${cx - 10},${cy + 3}" fill="#6E6E6E"/>
    <polygon points="${cx},${roofY + 10} ${cx + 10},${roofY + 5} ${cx + 10},${cy + 3} ${cx},${cy + 8}" fill="#545454"/>
    <polygon points="${cx},${roofY} ${cx + 10},${roofY + 5} ${cx},${roofY + 10} ${cx - 10},${roofY + 5}" fill="#8A8A8A"/>

    <!-- Rising Steam Particle -->
    <circle cx="${cx}" cy="${roofY - 4}" r="2.5" fill="#FFFFFF" opacity="0.75" class="steam-particle"/>

    <!-- Generator Tag -->
    <g transform="translate(${cx}, ${roofY - 18})">
      <rect x="-42" y="-8" width="84" height="16" rx="2" fill="#000000" opacity="0.85" stroke="#FFFFFF" stroke-width="1.2"/>
      <text x="0" y="4" text-anchor="middle" fill="#FFFFFF" class="font-mc" font-size="6.5">⚡ COBBLE GEN</text>
    </g>
  </g>`;
}

// 3D Torch
function renderTorch(cx, cy) {
  return `
  <!-- Torch at (${cx},${cy}) -->
  <g class="placed-torch">
    <!-- Stick -->
    <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 22}" stroke="#6B4724" stroke-width="3" stroke-linecap="square"/>
    <!-- Yellow Flame Glow -->
    <circle cx="${cx}" cy="${cy - 25}" r="5" fill="#FFCC00" opacity="0.9"/>
    <circle cx="${cx}" cy="${cy - 25}" r="9" fill="#FFAA00" opacity="0.35"/>
  </g>`;
}

// 3D Crafting Table
function renderCraftingTable(cx, cy, builder) {
  const roofY = cy - 28;
  return `
  <!-- Crafting Table -->
  <g class="crafting-table">
    <polygon points="${cx - 20},${roofY} ${cx},${roofY + 10} ${cx},${cy + 5} ${cx - 20},${cy - 5}" fill="#805329"/>
    <polygon points="${cx},${roofY + 10} ${cx + 20},${roofY} ${cx + 20},${cy - 5} ${cx},${cy + 5}" fill="#5E3C1B"/>
    <polygon points="${cx},${roofY - 10} ${cx + 20},${roofY} ${cx},${roofY + 10} ${cx - 20},${roofY}" fill="#A67038"/>
    <!-- Grid markings on top -->
    <line x1="${cx - 7}" y1="${roofY - 3}" x2="${cx + 7}" y2="${roofY + 4}" stroke="#4D2F12" stroke-width="1"/>
  </g>`;
}

// 3D Furnace
function renderFurnace(cx, cy, builder) {
  const roofY = cy - 28;
  return `
  <!-- Furnace -->
  <g class="furnace">
    <polygon points="${cx - 20},${roofY} ${cx},${roofY + 10} ${cx},${cy + 5} ${cx - 20},${cy - 5}" fill="#545454"/>
    <polygon points="${cx},${roofY + 10} ${cx + 20},${roofY} ${cx + 20},${cy - 5} ${cx},${cy + 5}" fill="#404040"/>
    <polygon points="${cx},${roofY - 10} ${cx + 20},${roofY} ${cx},${roofY + 10} ${cx - 20},${roofY}" fill="#757575"/>
    <!-- Glowing furnace fire opening -->
    <rect x="${cx - 12}" y="${roofY + 8}" width="8" height="6" fill="#FF5500"/>
  </g>`;
}

// 3D Steve Rig
function renderMinecraftSteve(cx, cy, lastMover) {
  return `
  <!-- Steve Rig -->
  <g class="steve-actor" data-character="steve">
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
    <g transform="translate(${cx}, ${cy - 94})">
      <rect x="-64" y="-11" width="128" height="22" rx="3" fill="#000000" stroke="#55FF55" stroke-width="1.8"/>
      <text x="0" y="5" text-anchor="middle" fill="#FFFFFF" class="font-mc" font-size="8.5" font-weight="700">Steve @${escapeXml(lastMover || 'mo-farooq')}</text>
    </g>
  </g>`;
}

// 3D Alex Rig
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
    <g transform="translate(${cx}, ${cy - 90})">
      <rect x="-48" y="-11" width="96" height="22" rx="3" fill="#000000" stroke="#FFAA00" stroke-width="1.5"/>
      <text x="0" y="5" text-anchor="middle" fill="#FFAA00" class="font-mc" font-size="8.5" font-weight="700">Alex @Co-Op</text>
    </g>
  </g>`;
}

function escapeXml(unsafe) {
  return String(unsafe || '')
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
    console.log(`[SVG Engine] Successfully rendered Minecraft Skyblock World to: ${SVG_OUTPUT}`);
  } catch (err) {
    console.error(`[SVG Engine Error]:`, err);
    process.exit(1);
  }
}
