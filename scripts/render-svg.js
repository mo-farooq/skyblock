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
    steve = { row: 3, col: 2, lastMover: 'mo-farooq' },
    tree = { row: 0, col: 1, hp: 4, maxHp: 4 },
    inventory = []
  } = stateData;

  // Projection math:
  // Canvas: 920 x 540
  // Origin: (460, 185)
  // Step vectors: dx = 36, dy = 18
  function getTileCenter(r, c) {
    const cx = 460 + (c - r) * 36;
    const cy = 185 + (c + r) * 18;
    return { cx, cy };
  }

  // Authentic 27-block classic SkyBlock L-island surface coordinates
  const surfaceTiles = [];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      if ((r < 3 && c < 3) || (r >= 3 && c < 6)) {
        surfaceTiles.push({ r, c });
      }
    }
  }

  // Sort surface tiles depth-wise: (r + c) ascending
  surfaceTiles.sort((a, b) => (a.r + a.b) - (b.r + b.c));

  // Render top grass diamond for each tile
  let grassTilesSvg = '';
  for (const t of surfaceTiles) {
    const { cx, cy } = getTileCenter(t.r, t.c);
    grassTilesSvg += `
    <polygon points="${cx},${cy - 18} ${cx + 36},${cy} ${cx},${cy + 18} ${cx - 36},${cy}" fill="#5B8731" stroke="#4C7026" stroke-width="0.8"/>
    <polygon points="${cx},${cy - 10} ${cx + 18},${cy - 1} ${cx},${cy + 8} ${cx - 18},${cy - 1}" fill="#6E9F3D" opacity="0.6"/>`;
  }

  // Cliff face extrusions (4 blocks deep = 44px)
  // South-West Front Face (along row 5, cols 0..5): 6 tiles long
  let leftCliffSvg = '';
  for (let c = 0; c < 6; c++) {
    const { cx, cy } = getTileCenter(5, c);
    const depth = 44;
    leftCliffSvg += `
    <!-- Left cliff at (5,${c}) -->
    <polygon points="${cx - 36},${cy} ${cx},${cy + 18} ${cx},${cy + 18 + depth} ${cx - 36},${cy + depth}" fill="#866043" stroke="#66462C" stroke-width="0.8"/>
    <!-- Grass fringe overhang -->
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
    <!-- Right cliff at (${t.r},${t.c}) -->
    <polygon points="${cx},${cy + 18} ${cx + 36},${cy} ${cx + 36},${cy + depth} ${cx},${cy + 18 + depth}" fill="#694B32" stroke="#4F3622" stroke-width="0.8"/>
    <!-- Grass fringe overhang -->
    <polygon points="${cx},${cy + 18} ${cx + 36},${cy} ${cx + 36},${cy + 6} ${cx + 18},${cy + 18} ${cx},${cy + 24}" fill="#3D5A1E"/>
    <line x1="${cx + 18}" y1="${cy + 22}" x2="${cx + 18}" y2="${cy + 36}" stroke="#523924" stroke-width="1.5" opacity="0.5"/>`;
  }

  // Bedrock single bottom cornerstone
  const spawnCenter = getTileCenter(4, 2);
  const bedrockSvg = `
  <!-- Single Bedrock Block on Island Underside -->
  <polygon points="${spawnCenter.cx - 20},${spawnCenter.cy + 42} ${spawnCenter.cx + 20},${spawnCenter.cy + 42} ${spawnCenter.cx},${spawnCenter.cy + 58}" fill="#2E2E2E"/>
  <polygon points="${spawnCenter.cx - 20},${spawnCenter.cy + 42} ${spawnCenter.cx},${spawnCenter.cy + 58} ${spawnCenter.cx - 10},${spawnCenter.cy + 48}" fill="#1F1F1F"/>`;

  // Solitary Oak Tree at (0, 1)
  const treeTile = getTileCenter(tree.row || 0, tree.col || 1);
  const treeSvg = renderAuthenticOakTree(treeTile.cx, treeTile.cy);

  // Starter Chest at (5, 5) - far corner of the L
  const chestTile = getTileCenter(5, 5);
  const chestSvg = renderAuthenticChest(chestTile.cx, chestTile.cy);

  // Steve Rig at (steve.row, steve.col) - Empty Handed!
  const steveTile = getTileCenter(steve.row || 3, steve.col || 2);
  const steveSvg = renderSoloSteve(steveTile.cx, steveTile.cy);

  // Hotbar Inventory Slots - Initially 0 items!
  const slotWidth = 46;
  const startX = 460 - (9 * slotWidth) / 2; // Centered
  const hotbarY = 472;

  let hotbarSvg = '';
  for (let idx = 0; idx < 9; idx++) {
    const x = startX + idx * slotWidth;
    const isSelected = idx === 0;
    const item = inventory[idx]; // Null or empty if initial state

    hotbarSvg += `
    <!-- Slot ${idx + 1} -->
    <rect x="${x}" y="${hotbarY}" width="42" height="46" rx="2" fill="#3A3A3A" stroke="${isSelected ? '#FFFFFF' : '#1E1E1E'}" stroke-width="${isSelected ? '2.5' : '1.8'}"/>
    <rect x="${x + 2}" y="${hotbarY + 2}" width="38" height="42" rx="1" fill="#252525"/>
    ${item && item.emoji ? `<text x="${x + 21}" y="${hotbarY + 27}" font-size="20" text-anchor="middle">${item.emoji}</text>` : ''}
    ${item && item.count > 1 ? `<text x="${x + 36}" y="${hotbarY + 41}" fill="#FFFFFF" class="font-mc" font-size="8.5" font-weight="700" text-anchor="end">${item.count}</text>` : ''}
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 540" width="100%" height="100%">
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
      50% { transform: translateY(-7px); }
    }
    @keyframes armSwing {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(-18deg); }
    }

    .mc-island { animation: floatIsland 5s ease-in-out infinite; }
    .steve-arm { animation: armSwing 2s ease-in-out infinite; transform-origin: 34px 42px; }
  </style>

  <!-- ================= CANVAS BACKGROUND ================= -->
  <rect x="0" y="0" width="920" height="540" rx="10" fill="#18191A"/>
  <rect x="4" y="4" width="912" height="532" rx="8" fill="#28292C" stroke="#0E0F10" stroke-width="3"/>
  <rect x="8" y="8" width="904" height="524" rx="6" fill="#141517"/>

  <!-- ================= 1. CLEAN TOP STATUS HUD (NO CLUTTER) ================= -->
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

  <!-- Title & Status -->
  <text x="84" y="38" fill="#FFFFFF" class="font-mc" font-size="13" font-weight="700">MINECRAFT SKYBLOCK</text>
  <text x="84" y="55" fill="#55FF55" class="font-mc" font-size="9">SOLO SURVIVAL • EMPTY-HANDED START</text>

  <!-- Hearts & Hunger Bars -->
  <g transform="translate(560, 28)">
    <text x="0" y="15" font-size="14">❤️❤️❤️❤️❤️</text>
    <text x="86" y="15" font-size="14">🍗🍗🍗🍗🍗</text>
    <text x="0" y="32" fill="#FFAA00" class="font-mc" font-size="8">FULL HEALTH</text>
    <text x="86" y="32" fill="#FFAA00" class="font-mc" font-size="8">FULL HUNGER</text>
  </g>

  <!-- Level Badge -->
  <g transform="translate(760, 23)">
    <rect width="128" height="40" rx="3" fill="#1A1B1C" stroke="#55FF55" stroke-width="1.5"/>
    <text x="64" y="18" fill="#AAAAAA" class="font-mc" font-size="7.5" text-anchor="middle">EXPERIENCE</text>
    <text x="64" y="34" fill="#55FF55" class="font-mc" font-size="13" font-weight="700" text-anchor="middle">LEVEL 0</text>
  </g>

  <!-- ================= 2. 3D SKY VIEWPORT (AUTHENTIC SKYBLOCK) ================= -->
  <rect x="20" y="80" width="880" height="380" rx="6" fill="#1A2233" stroke="#3D4248" stroke-width="2"/>

  <g clip-path="url(#skyClip)">
    <!-- Sky Background -->
    <rect x="20" y="80" width="880" height="380" fill="url(#skyVoid)"/>

    <!-- Minecraft Pixel Clouds -->
    <rect x="60" y="105" width="170" height="26" fill="#FFFFFF" opacity="0.85" rx="2"/>
    <rect x="140" y="95" width="100" height="26" fill="#FFFFFF" opacity="0.85" rx="2"/>
    <rect x="650" y="115" width="200" height="28" fill="#FFFFFF" opacity="0.8" rx="2"/>
    <rect x="740" y="105" width="110" height="28" fill="#FFFFFF" opacity="0.8" rx="2"/>

    <!-- The Authentic L-Shaped Skyblock Island -->
    <g class="mc-island" filter="url(#islandShadow)">

      <!-- Bedrock Tip -->
      ${bedrockSvg}

      <!-- Front Cliff Faces (Dirt Extrusions) -->
      ${leftCliffSvg}
      ${rightCliffSvg}

      <!-- Top Grass Surface (27 Tiles) -->
      ${grassTilesSvg}

      <!-- Solitary Oak Tree at (0, 1) -->
      ${treeSvg}

      <!-- Starter Wooden Chest at (5, 5) -->
      ${chestSvg}

      <!-- Steve (Empty-Handed Lone Survivor) -->
      ${steveSvg}

    </g>
  </g>

  <!-- ================= 3. AUTHENTIC MINECRAFT HOTBAR (INVENTORY: 0 ITEMS) ================= -->
  <rect x="20" y="466" width="880" height="58" rx="4" fill="#202224" stroke="#3D4044" stroke-width="2"/>
  <rect x="24" y="470" width="872" height="50" rx="3" fill="#161718"/>

  <!-- 9 Hotbar Slots -->
  <g transform="translate(0, 0)">
    ${hotbarSvg}
  </g>
</svg>`;
}

// Authentic Minecraft Oak Tree at (0, 1)
function renderAuthenticOakTree(cx, cy) {
  return `
  <!-- Authentic Skyblock Oak Tree -->
  <g class="oak-tree">
    <!-- Tree Trunk (4 blocks high) -->
    <polygon points="${cx - 10},${cy - 18} ${cx + 4},${cy - 10} ${cx + 4},${cy + 10} ${cx - 10},${cy + 2}" fill="#6B5130"/>
    <polygon points="${cx + 4},${cy - 10} ${cx + 18},${cy - 18} ${cx + 18},${cy + 2} ${cx + 4},${cy + 10}" fill="#4F3B23"/>

    <!-- Trunk Bark Grain Lines -->
    <line x1="${cx - 3}" y1="${cy - 14}" x2="${cx - 3}" y2="${cy + 6}" stroke="#543E23" stroke-width="1.2"/>
    <line x1="${cx + 11}" y1="${cy - 14}" x2="${cx + 11}" y2="${cy + 6}" stroke="#3D2E18" stroke-width="1.2"/>

    <!-- Cubic Foliage - Lower Big Cluster -->
    <polygon points="${cx},${cy - 72} ${cx + 44},${cy - 50} ${cx},${cy - 28} ${cx - 44},${cy - 50}" fill="#4C802E"/>
    <polygon points="${cx - 44},${cy - 50} ${cx},${cy - 28} ${cx},${cy - 4} ${cx - 44},${cy - 26}" fill="#386420"/>
    <polygon points="${cx},${cy - 28} ${cx + 44},${cy - 50} ${cx + 44},${cy - 26} ${cx},${cy - 4}" fill="#264714"/>

    <!-- Cubic Foliage - Top Crown Cluster -->
    <polygon points="${cx},${cy - 96} ${cx + 28},${cy - 82} ${cx},${cy - 68} ${cx - 28},${cy - 82}" fill="#5FA33A"/>
    <polygon points="${cx - 28},${cy - 82} ${cx},${cy - 68} ${cx},${cy - 48} ${cx - 28},${cy - 62}" fill="#4C802E"/>
    <polygon points="${cx},${cy - 68} ${cx + 28},${cy - 82} ${cx + 28},${cy - 62} ${cx},${cy - 48}" fill="#386420"/>
  </g>`;
}

// Authentic Minecraft Wooden Starter Chest at (5, 5)
function renderAuthenticChest(cx, cy) {
  const roofY = cy - 24;
  return `
  <!-- Starter Wooden Chest -->
  <g class="starter-chest">
    <!-- Box Body -->
    <polygon points="${cx - 16},${roofY} ${cx},${roofY + 8} ${cx},${cy + 6} ${cx - 16},${cy - 2}" fill="#7D5127" stroke="#4A2F14" stroke-width="1"/>
    <polygon points="${cx},${roofY + 8} ${cx + 16},${roofY} ${cx + 16},${cy - 2} ${cx},${cy + 6}" fill="#5A3A1C" stroke="#3D2611" stroke-width="1"/>
    <polygon points="${cx},${roofY - 8} ${cx + 16},${roofY} ${cx},${roofY + 8} ${cx - 16},${roofY}" fill="#9E6732" stroke="#4A2F14" stroke-width="1"/>

    <!-- Black Chest Trim -->
    <line x1="${cx - 16}" y1="${roofY + 3}" x2="${cx}" y2="${roofY + 11}" stroke="#1E1E1E" stroke-width="1.2"/>
    <line x1="${cx}" y1="${roofY + 11}" x2="${cx + 16}" y2="${roofY + 3}" stroke="#1E1E1E" stroke-width="1.2"/>

    <!-- Front Iron Latch -->
    <rect x="${cx - 2.5}" y="${roofY + 5}" width="5" height="7" rx="1" fill="#E0E0E0" stroke="#000000" stroke-width="0.8"/>
  </g>`;
}

// Steve Solo Survivor Rig (EMPTY HANDED)
function renderSoloSteve(cx, cy) {
  return `
  <!-- Steve (Solo Survivor - Empty Handed) -->
  <g class="steve-actor" data-character="steve">
    <!-- Contact Shadow -->
    <ellipse cx="${cx}" cy="${cy + 4}" rx="20" ry="9" fill="#000000" opacity="0.4"/>

    <!-- Boots -->
    <polygon points="${cx - 10},${cy - 2} ${cx - 3},${cy + 2} ${cx - 3},${cy - 8} ${cx - 10},${cy - 12}" fill="#3A3A3A"/>
    <polygon points="${cx - 3},${cy + 2} ${cx + 3},${cy - 2} ${cx + 3},${cy - 12} ${cx - 3},${cy - 8}" fill="#242424"/>
    <polygon points="${cx + 4},${cy + 2} ${cx + 11},${cy - 2} ${cx + 11},${cy - 12} ${cx + 4},${cy - 8}" fill="#3A3A3A"/>
    <polygon points="${cx + 11},${cy - 2} ${cx + 17},${cy - 5} ${cx + 17},${cy - 15} ${cx + 11},${cy - 12}" fill="#242424"/>

    <!-- Blue Denim Pants -->
    <polygon points="${cx - 9},${cy - 11} ${cx - 1},${cy - 7} ${cx - 1},${cy - 26} ${cx - 9},${cy - 30}" fill="#2B3CA3"/>
    <polygon points="${cx + 2},${cy - 7} ${cx + 11},${cy - 11} ${cx + 11},${cy - 30} ${cx + 2},${cy - 26}" fill="#1B266B"/>

    <!-- Cyan Shirt / Torso -->
    <polygon points="${cx},${cy - 54} ${cx + 16},${cy - 46} ${cx},${cy - 38} ${cx - 16},${cy - 46}" fill="#00BDBD"/>
    <polygon points="${cx - 16},${cy - 46} ${cx},${cy - 38} ${cx},${cy - 24} ${cx - 16},${cy - 32}" fill="#008E8E"/>
    <polygon points="${cx},${cy - 38} ${cx + 16},${cy - 46} ${cx + 16},${cy - 32} ${cx},${cy - 24}" fill="#006363"/>

    <!-- Cubic Head -->
    <polygon points="${cx},${cy - 74} ${cx + 13},${cy - 68} ${cx},${cy - 62} ${cx - 13},${cy - 68}" fill="#4A3018"/>
    <polygon points="${cx - 13},${cy - 68} ${cx},${cy - 62} ${cx},${cy - 45} ${cx - 13},${cy - 51}" fill="#BD8B72"/>
    <polygon points="${cx - 13},${cy - 68} ${cx},${cy - 62} ${cx},${cy - 58} ${cx - 13},${cy - 64}" fill="#4A3018"/>
    <polygon points="${cx},${cy - 62} ${cx + 13},${cy - 68} ${cx + 13},${cy - 51} ${cx},${cy - 45}" fill="#996D57"/>

    <!-- Pixel Eyes -->
    <rect x="${cx - 10}" y="${cy - 57}" width="4" height="3" fill="#FFFFFF"/>
    <rect x="${cx - 6}" y="${cy - 57}" width="3" height="3" fill="#2B3CA3"/>

    <!-- Left Arm -->
    <polygon points="${cx - 18},${cy - 45} ${cx - 13},${cy - 42} ${cx - 13},${cy - 26} ${cx - 18},${cy - 29}" fill="#008E8E"/>
    <polygon points="${cx - 18},${cy - 29} ${cx - 13},${cy - 26} ${cx - 13},${cy - 18} ${cx - 18},${cy - 21}" fill="#BD8B72"/>

    <!-- Right Arm (EMPTY HANDED, swinging naturally) -->
    <g class="steve-arm">
      <polygon points="${cx + 13},${cy - 42} ${cx + 18},${cy - 45} ${cx + 18},${cy - 29} ${cx + 13},${cy - 26}" fill="#006363"/>
      <polygon points="${cx + 13},${cy - 26} ${cx + 18},${cy - 29} ${cx + 18},${cy - 21} ${cx + 13},${cy - 18}" fill="#BD8B72"/>
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
    console.log(`[SVG Engine] Successfully rendered Minecraft Skyblock to: ${SVG_OUTPUT}`);
  } catch (err) {
    console.error(`[SVG Engine Error]:`, err);
    process.exit(1);
  }
}
