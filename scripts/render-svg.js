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

  const occupiedCells = cells.filter(c => c.type && c.type !== 'empty' && c.type !== 'river' && c.type !== 'elevation');
  const totalBlocks = occupiedCells.length;
  const buildersSet = new Set(occupiedCells.map(c => c.builder).filter(Boolean));
  const buildersCount = Math.max(buildersSet.size, 1);

  // Recent 3 Drops for Right Sidebar (formatted as Minecraft Achievements)
  const recentDrops = [...occupiedCells]
    .sort((a, b) => {
      const timeA = new Date(a.upgradedAt || a.builtAt || 0).getTime();
      const timeB = new Date(b.upgradedAt || b.builtAt || 0).getTime();
      return timeB - timeA;
    })
    .slice(0, 3);

  const defaultDrops = [
    { builder: 'mo-farooq', emoji: '💎', type: 'diamond', name: 'Diamond Ore Cache', row: 0, col: 2, isVip: true },
    { builder: 'alex_dev', emoji: '🏰', type: 'castle', name: 'Cobblestone Fort', row: 3, col: 1, isVip: true },
    { builder: 'priya_codes', emoji: '🍞', type: 'bakery', name: 'Village Bakery', row: 4, col: 4, isVip: false }
  ];

  while (recentDrops.length < 3) {
    const filler = defaultDrops[recentDrops.length];
    if (filler) recentDrops.push(filler);
    else break;
  }

  // Generate Minecraft Achievement Pills for Right Sidebar
  let dropsSvg = '';
  const dropYPositions = [284, 340, 396];

  recentDrops.forEach((drop, idx) => {
    const yPos = dropYPositions[idx] || 284;
    const isVip = drop.isVip || (drop.level && drop.level > 1);
    const dropEmoji = drop.emoji || (drop.type === 'diamond' ? '💎' : drop.type === 'bakery' ? '🥐' : '🧱');
    const dropBuilder = escapeXml(drop.builder || 'Miner');
    const dropDesc = escapeXml(`Placed ${drop.name || drop.type} at (${drop.row},${drop.col})`);

    dropsSvg += `
    <!-- Achievement Box ${idx + 1} -->
    <rect x="624" y="${yPos}" width="252" height="46" rx="4" fill="#313233" stroke="#585858" stroke-width="2"/>
    <rect x="626" y="${yPos + 2}" width="248" height="42" rx="3" fill="#212121"/>
    <!-- Item Icon Box -->
    <rect x="632" y="${yPos + 8}" width="30" height="30" rx="3" fill="#3A3A3A" stroke="#181818" stroke-width="2"/>
    <text x="647" y="${yPos + 28}" text-anchor="middle" font-size="14">${dropEmoji}</text>
    <text x="672" y="${yPos + 20}" fill="${isVip ? '#55FFFF' : '#FFAA00'}" class="font-mc" font-size="11" font-weight="700">@${dropBuilder} ${isVip ? '★ VIP' : ''}</text>
    <text x="672" y="${yPos + 35}" fill="#AAAAAA" class="font-mc" font-size="9.5">${dropDesc}</text>
    `;
  });

  // Isometric Grid Projection Math
  // Island Center Origin: (304, 195)
  // Step vectors: dx = 30, dy = 15
  function getTileCenter(row, col) {
    const cx = 304 + (col - row) * 30;
    const cy = 195 + (col + row + 1) * 15;
    return { cx, cy };
  }

  // Sort occupied cells by depth (row + col) ascending
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

  // Steve & Alex Voxel Character Rigs
  const stevePos = getTileCenter(2, 2);
  const alexPos = getTileCenter(2, 4);

  const steveSvg = renderMinecraftSteve(stevePos.cx, stevePos.cy);
  const alexSvg = renderMinecraftAlex(alexPos.cx, alexPos.cy);

  const announcement = escapeXml(mayor.announcement || 'Achievement Unlocked: Farooq upgraded the Village to Level 42! Grab a pickaxe and place a block.');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 580" width="100%" height="100%">
  <defs>
    <!-- Minecraft Pixel Texture Patterns & Gradients -->
    <linearGradient id="mcSky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#78A7FF"/>
      <stop offset="60%" stop-color="#B2D0FF"/>
      <stop offset="100%" stop-color="#D8E8FF"/>
    </linearGradient>

    <!-- Ender Dragon Boss Bar Gradient -->
    <linearGradient id="dragonBar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#CC00FF"/>
      <stop offset="50%" stop-color="#E066FF"/>
      <stop offset="100%" stop-color="#9900CC"/>
    </linearGradient>

    <!-- Diamond Gleam Gradient -->
    <linearGradient id="diamondGleam" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A0FFFF"/>
      <stop offset="50%" stop-color="#4DEDDE"/>
      <stop offset="100%" stop-color="#2CBAA8"/>
    </linearGradient>

    <filter id="mcShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="8" flood-color="#000000" flood-opacity="0.35"/>
    </filter>

    <clipPath id="viewportClip">
      <rect x="24" y="112" width="560" height="348" rx="6"/>
    </clipPath>
  </defs>

  <style>
    /* Minecraft Pixel Font Stack */
    @import url('https://fonts.googleapis.com/css2?family=VT323&amp;family=Press+Start+2P&amp;family=Share+Tech+Mono&amp;display=swap');
    .font-mc { font-family: 'Press Start 2P', 'VT323', 'Courier New', monospace; }
    .font-ui { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

    /* 60fps Keyframe Animations */
    @keyframes floatIsland {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-7px); }
    }
    @keyframes steveIdle {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-4px); }
    }
    @keyframes armSwing {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(-18deg); }
    }
    @keyframes xpPulse {
      0%, 100% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.3); opacity: 1; }
    }
    @keyframes dragonBarPulse {
      0%, 100% { opacity: 0.95; }
      50% { opacity: 0.75; }
    }

    .mc-island { animation: floatIsland 5s ease-in-out infinite; }
    .steve-actor { animation: steveIdle 3.2s ease-in-out infinite; }
    .alex-actor { animation: steveIdle 3.4s ease-in-out infinite; animation-delay: 0.4s; }
    .steve-arm { animation: armSwing 1.8s ease-in-out infinite; transform-origin: 318px 238px; }
    .xp-orb { animation: xpPulse 1.6s infinite ease-in-out; }
    .boss-meter { animation: dragonBarPulse 2s infinite ease-in-out; }
  </style>

  <!-- ================= MINECRAFT BEDROCK / STONE CONTAINER ================= -->
  <rect x="0" y="0" width="920" height="580" rx="12" fill="#2A2A2A"/>
  <!-- Bevel Border Frame -->
  <rect x="6" y="6" width="908" height="568" rx="8" fill="#3C3F41" stroke="#1E1E1E" stroke-width="4"/>
  <rect x="12" y="12" width="896" height="556" rx="6" fill="#181818"/>

  <!-- ================= 1. MINECRAFT HEADER / XP BAR ================= -->
  <rect x="24" y="20" width="872" height="74" rx="4" fill="#313233" stroke="#555555" stroke-width="2"/>
  <rect x="28" y="24" width="864" height="66" rx="2" fill="#262626"/>

  <!-- Player Avatar Face (Steve / Farooq Skin) -->
  <g transform="translate(42, 33)">
    <rect width="48" height="48" rx="2" fill="#181818" stroke="#000000" stroke-width="2"/>
    <!-- Steve Hair -->
    <rect x="4" y="4" width="40" height="14" fill="#4A3018"/>
    <!-- Face Skin -->
    <rect x="4" y="18" width="40" height="26" fill="#BD8B72"/>
    <!-- Pixel Eyes -->
    <rect x="8" y="24" width="8" height="6" fill="#FFFFFF"/>
    <rect x="12" y="24" width="4" height="6" fill="#2B3CA3"/>
    <rect x="32" y="24" width="8" height="6" fill="#FFFFFF"/>
    <rect x="32" y="24" width="4" height="6" fill="#2B3CA3"/>
    <!-- Nose & Beard/Mouth -->
    <rect x="20" y="30" width="8" height="6" fill="#A06950"/>
    <rect x="16" y="36" width="16" height="4" fill="#693820"/>
  </g>

  <!-- Player Name & Realm -->
  <text x="106" y="50" fill="#FFFFFF" class="font-mc" font-size="14" font-weight="700">Mohammad Farooq</text>
  <text x="106" y="70" fill="#55FF55" class="font-mc" font-size="9.5">[VIP ARCHITECT] Survival World • Day 840</text>

  <!-- Minecraft Hearts Bar -->
  <g transform="translate(430, 36)">
    <text x="0" y="14" font-size="12">❤️❤️❤️❤️❤️</text>
    <text x="80" y="14" font-size="12">❤️❤️❤️❤️❤️</text>
    <text x="0" y="32" fill="#FFAA00" class="font-mc" font-size="8">10/10 HEARTS</text>
  </g>

  <!-- Hunger Drumsticks Bar -->
  <g transform="translate(590, 36)">
    <text x="0" y="14" font-size="12">🍗🍗🍗🍗🍗</text>
    <text x="75" y="14" font-size="12">🍗🍗🍗🍗🍗</text>
    <text x="0" y="32" fill="#AAAAAA" class="font-mc" font-size="8">HUNGER FULL</text>
  </g>

  <!-- XP Level Badge -->
  <g transform="translate(755, 33)">
    <rect width="125" height="48" rx="3" fill="#202020" stroke="#55FF55" stroke-width="1.5"/>
    <text x="62" y="22" fill="#55FF55" class="font-mc" font-size="8" text-anchor="middle">LEVEL</text>
    <text x="62" y="42" fill="#55FF55" class="font-mc" font-size="16" font-weight="700" text-anchor="middle">42</text>
  </g>

  <!-- ================= 2. 3D ISOMETRIC VIEWPORT ================= -->
  <rect x="24" y="112" width="560" height="348" rx="6" fill="#202020" stroke="#444444" stroke-width="2"/>

  <g clip-path="url(#viewportClip)">
    <!-- Sky Background with Minecraft Clouds -->
    <rect x="24" y="112" width="560" height="348" fill="url(#mcSky)"/>

    <!-- Minecraft Blocky Pixel Clouds -->
    <rect x="60" y="130" width="120" height="24" fill="#FFFFFF" opacity="0.85"/>
    <rect x="140" y="122" width="70" height="24" fill="#FFFFFF" opacity="0.85"/>
    <rect x="360" y="140" width="140" height="22" fill="#FFFFFF" opacity="0.8"/>
    <rect x="440" y="132" width="90" height="22" fill="#FFFFFF" opacity="0.8"/>

    <!-- Ender Dragon Boss Bar Overlay -->
    <g transform="translate(144, 126)">
      <rect x="0" y="0" width="320" height="16" rx="2" fill="#111111" stroke="#444444" stroke-width="1.5"/>
      <rect x="2" y="2" width="265" height="12" rx="1" fill="url(#dragonBar)" class="boss-meter"/>
      <text x="160" y="11.5" text-anchor="middle" fill="#FFFFFF" class="font-mc" font-size="7.5" font-weight="700">Ender Dragon (820/1000)</text>
    </g>

    <!-- ================= THE 3D MINECRAFT VOXEL ISLAND ================= -->
    <g class="mc-island" filter="url(#mcShadow)">

      <!-- 1. BASE VOXEL PLATFORM (Minecraft Dirt & Grass Blocks) -->
      <!-- Top Grass Surface (Isometric Diamond) -->
      <polygon points="304,195 484,285 304,375 124,285" fill="#5B8731"/>

      <!-- Pixel Grass Overlay Details -->
      <g fill="#70A83B" opacity="0.7">
        <polygon points="304,210 334,225 304,240 274,225"/>
        <polygon points="364,240 394,255 364,270 334,255"/>
        <polygon points="244,240 274,255 244,270 214,255"/>
        <polygon points="304,300 334,315 304,330 274,315"/>
      </g>

      <!-- Left Cliff: Dirt Layer with Jagged Grass Fringe -->
      <!-- Dirt Base -->
      <polygon points="124,285 304,375 304,405 124,315" fill="#866043"/>
      <!-- Stone / Bedrock Underlayer -->
      <polygon points="124,315 304,405 304,425 124,335" fill="#595959"/>
      <!-- Jagged Green Grass Fringe Overhang -->
      <polygon points="124,285 304,375 304,385 284,380 270,388 250,381 230,387 210,380 190,386 170,379 150,385 135,378 124,295" fill="#4C7026"/>

      <!-- Right Cliff: Darker Dirt & Bedrock for 3D Depth -->
      <polygon points="304,375 484,285 484,315 304,405" fill="#694B32"/>
      <polygon points="304,405 484,315 484,335 304,425" fill="#444444"/>
      <!-- Right Grass Fringe -->
      <polygon points="304,375 484,285 484,295 465,290 450,297 430,290 410,298 390,291 370,297 350,290 330,296 315,290 304,385" fill="#3D5A1E"/>

      <!-- 2. MINECRAFT GRID LINES (Pixel Grid) -->
      <g stroke="#3E5C21" stroke-width="1" opacity="0.35">
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

      <!-- 3. WATER STREAM & WATERFALL (Minecraft Water Blocks) -->
      <polygon points="244,255 274,270 244,285 214,270" fill="#295C8F" opacity="0.88"/>
      <polygon points="274,270 304,285 274,300 244,285" fill="#295C8F" opacity="0.88"/>
      <polygon points="304,285 334,300 304,315 274,300" fill="#1F4770" opacity="0.88"/>
      <polygon points="334,300 364,315 334,330 304,315" fill="#295C8F" opacity="0.88"/>
      <polygon points="214,270 244,285 214,300 184,285" fill="#3D74B0" opacity="0.88"/>
      <polygon points="184,285 214,300 184,315 154,300" fill="#528ED4" opacity="0.88"/>
      <!-- Water cascading over Cliff -->
      <polygon points="154,300 184,315 184,345 154,330" fill="#295C8F" opacity="0.9"/>
      <polygon points="160,305 178,314 178,340 160,331" fill="#FFFFFF" opacity="0.6"/>

      <!-- 4. OAK WOOD TREES (Minecraft Cubic Foliage) -->
      <!-- Tree 1 at Tile (5,1) -->
      <g>
        <!-- Trunk -->
        <polygon points="418,252 424,255 424,275 418,272" fill="#6B5130"/>
        <polygon points="424,255 430,252 430,272 424,275" fill="#4F3B23"/>
        <!-- Layer 1 Leaves -->
        <polygon points="424,220 442,229 424,238 406,229" fill="#386420"/>
        <polygon points="406,229 424,238 424,258 406,249" fill="#2A4B17"/>
        <polygon points="424,238 442,229 442,249 424,258" fill="#1E3810"/>
        <!-- Top Leaf Cube -->
        <polygon points="424,208 436,214 424,220 412,214" fill="#4C802E"/>
      </g>

      <!-- 5. DYNAMIC CITIZEN MINECRAFT BLOCKS -->
      ${dynamicBlocksSvg}

      <!-- 6. MINECRAFT STEVE RIG -->
      ${steveSvg}

      <!-- 7. MINECRAFT ALEX RIG -->
      ${alexSvg}

    </g>

    <!-- Viewport HUD Banner -->
    <rect x="42" y="415" width="230" height="30" rx="3" fill="#111111" opacity="0.9" stroke="#333333" stroke-width="1.5"/>
    <text x="54" y="434" fill="#55FF55" class="font-mc" font-size="8.5">⛏️ Voxel Engine • 60 FPS CSS</text>

    <rect x="360" y="415" width="206" height="30" rx="3" fill="#111111" opacity="0.9" stroke="#55FFFF" stroke-width="1.5"/>
    <text x="463" y="434" text-anchor="middle" fill="#55FFFF" class="font-mc" font-size="8.5">⭐ Star = Diamond Block</text>
  </g>

  <!-- ================= 3. RIGHT SIDEBAR: RECENT MINECRAFT DROPS ================= -->
  <rect x="604" y="112" width="292" height="348" rx="6" fill="#262626" stroke="#444444" stroke-width="2"/>

  <!-- Quest / Boss Box -->
  <rect x="618" y="126" width="264" height="120" rx="4" fill="#181818" stroke="#585858" stroke-width="1.5"/>
  <text x="632" y="148" fill="#FFAA00" class="font-mc" font-size="9" font-weight="700">⚔️ ACTIVE RAID QUEST</text>
  <text x="632" y="170" fill="#FFFFFF" class="font-mc" font-size="10.5">Defeat the Wither</text>
  <text x="632" y="188" fill="#AAAAAA" class="font-mc" font-size="8.5">Realm Defense: 84%</text>

  <!-- Quest Health Bar -->
  <rect x="632" y="198" width="236" height="12" rx="2" fill="#333333"/>
  <rect x="634" y="200" width="198" height="8" rx="1" fill="#55FF55"/>
  <text x="868" y="222" text-anchor="end" fill="#55FF55" class="font-mc" font-size="8">840 / 1000 HP</text>

  <text x="628" y="272" fill="#FFAA00" class="font-mc" font-size="9" font-weight="700">🏆 RECENT VOXEL BUILDS</text>
  ${dropsSvg}

  <!-- ================= 4. BOTTOM MINECRAFT HOTBAR & CHAT LOG ================= -->
  <rect x="24" y="478" width="872" height="80" rx="6" fill="#262626" stroke="#444444" stroke-width="2"/>

  <!-- Hotbar 9 Slots -->
  <g transform="translate(42, 492)">
    <!-- Slot 1 (Selected) -->
    <rect x="0" y="0" width="46" height="52" rx="3" fill="#8F8F8F" stroke="#FFFFFF" stroke-width="2.5"/>
    <text x="23" y="32" font-size="20" text-anchor="middle">⛏️</text>

    <!-- Slot 2 -->
    <rect x="52" y="0" width="46" height="52" rx="3" fill="#3C3C3C" stroke="#222222" stroke-width="2"/>
    <text x="75" y="32" font-size="20" text-anchor="middle">⚔️</text>

    <!-- Slot 3 -->
    <rect x="104" y="0" width="46" height="52" rx="3" fill="#3C3C3C" stroke="#222222" stroke-width="2"/>
    <text x="127" y="32" font-size="20" text-anchor="middle">🥐</text>

    <!-- Slot 4 -->
    <rect x="156" y="0" width="46" height="52" rx="3" fill="#3C3C3C" stroke="#222222" stroke-width="2"/>
    <text x="179" y="32" font-size="20" text-anchor="middle">🪵</text>

    <!-- Slot 5 -->
    <rect x="208" y="0" width="46" height="52" rx="3" fill="#3C3C3C" stroke="#222222" stroke-width="2"/>
    <text x="231" y="32" font-size="20" text-anchor="middle">💎</text>
  </g>

  <!-- Minecraft Chat Box Log -->
  <g transform="translate(310, 492)">
    <rect width="570" height="52" rx="3" fill="#181818" stroke="#383838" stroke-width="1.5"/>
    <text x="16" y="22" fill="#55FFFF" class="font-mc" font-size="9.5">&lt;Server&gt; <tspan fill="#FFFFFF">${announcement}</tspan></text>
    <text x="16" y="38" fill="#FFAA00" class="font-mc" font-size="8.5">Click any issue command button below to craft a block onto the island!</text>
  </g>
</svg>`;
}

// 3D Voxel Minecraft Steve Character Rig
function renderMinecraftSteve(cx, cy) {
  return `
  <!-- ================= MINECRAFT STEVE RIG ================= -->
  <g class="steve-actor" data-character="steve">
    <!-- Contact Shadow -->
    <ellipse cx="${cx}" cy="${cy + 2}" rx="16" ry="7" fill="#000000" opacity="0.35"/>

    <!-- Steve Boots / Shoes -->
    <polygon points="${cx - 9},${cy - 2} ${cx - 3},${cy} ${cx - 3},${cy - 8} ${cx - 9},${cy - 10}" fill="#404040"/>
    <polygon points="${cx - 3},${cy} ${cx + 2},${cy - 2} ${cx + 2},${cy - 10} ${cx - 3},${cy - 8}" fill="#2B2B2B"/>
    <polygon points="${cx + 3},${cy} ${cx + 9},${cy - 2} ${cx + 9},${cy - 10} ${cx + 3},${cy - 8}" fill="#404040"/>
    <polygon points="${cx + 9},${cy - 2} ${cx + 14},${cy - 4} ${cx + 14},${cy - 12} ${cx + 9},${cy - 10}" fill="#2B2B2B"/>

    <!-- Steve Denim Blue Pants -->
    <polygon points="${cx - 8},${cy - 10} ${cx - 1},${cy - 7} ${cx - 1},${cy - 22} ${cx - 8},${cy - 25}" fill="#2B3CA3"/>
    <polygon points="${cx + 2},${cy - 7} ${cx + 9},${cy - 10} ${cx + 9},${cy - 25} ${cx + 2},${cy - 22}" fill="#1B266B"/>

    <!-- Steve Cyan Shirt / Torso -->
    <polygon points="${cx},${cy - 43} ${cx + 13},${cy - 36} ${cx},${cy - 30} ${cx - 13},${cy - 36}" fill="#00A8A8"/>
    <polygon points="${cx - 13},${cy - 36} ${cx},${cy - 30} ${cx},${cy - 19} ${cx - 13},${cy - 25}" fill="#008080"/>
    <polygon points="${cx},${cy - 30} ${cx + 13},${cy - 36} ${cx + 13},${cy - 25} ${cx},${cy - 19}" fill="#005A5A"/>

    <!-- Steve Cubic Head -->
    <!-- Head Top (Brown Hair) -->
    <polygon points="${cx},${cy - 57} ${cx + 10},${cy - 52} ${cx},${cy - 47} ${cx - 10},${cy - 52}" fill="#4A3018"/>
    <!-- Head Left Face (Skin Tone + Hair Top) -->
    <polygon points="${cx - 10},${cy - 52} ${cx},${cy - 47} ${cx},${cy - 35} ${cx - 10},${cy - 40}" fill="#BD8B72"/>
    <polygon points="${cx - 10},${cy - 52} ${cx},${cy - 47} ${cx},${cy - 44} ${cx - 10},${cy - 49}" fill="#4A3018"/>
    <!-- Head Right Face -->
    <polygon points="${cx},${cy - 47} ${cx + 10},${cy - 52} ${cx + 10},${cy - 40} ${cx},${cy - 35}" fill="#996D57"/>

    <!-- Steve Pixel Eyes -->
    <rect x="${cx - 8}" y="${cy - 44}" width="3" height="2" fill="#FFFFFF"/>
    <rect x="${cx - 5}" y="${cy - 44}" width="2" height="2" fill="#2B3CA3"/>

    <!-- Steve Left Arm -->
    <polygon points="${cx - 14},${cy - 35} ${cx - 10},${cy - 33} ${cx - 10},${cy - 21} ${cx - 14},${cy - 23}" fill="#008080"/>
    <polygon points="${cx - 14},${cy - 23} ${cx - 10},${cy - 21} ${cx - 10},${cy - 16} ${cx - 14},${cy - 18}" fill="#BD8B72"/>

    <!-- Steve Right Arm wielding Diamond Pickaxe -->
    <g class="steve-arm">
      <polygon points="${cx + 10},${cy - 33} ${cx + 14},${cy - 35} ${cx + 14},${cy - 23} ${cx + 10},${cy - 21}" fill="#005A5A"/>
      <!-- Pickaxe Handle -->
      <line x1="${cx + 12}" y1="${cy - 20}" x2="${cx + 25}" y2="${cy - 35}" stroke="#866043" stroke-width="2.5"/>
      <!-- Diamond Pickaxe Head -->
      <polygon points="${cx + 20},${cy - 40} ${cx + 28},${cy - 33} ${cx + 27},${cy - 31} ${cx + 19},${cy - 38}" fill="url(#diamondGleam)"/>
    </g>

    <!-- Floating XP Orbs (Animated) -->
    <circle cx="${cx + 22}" cy="${cy - 48}" r="3" fill="#55FF55" class="xp-orb"/>
    <circle cx="${cx - 18}" cy="${cy - 36}" r="2.5" fill="#FFFF55" class="xp-orb" style="animation-delay: 0.8s;"/>

    <!-- Steve Player Tag -->
    <g transform="translate(${cx}, ${cy - 68})">
      <rect x="-45" y="-8" width="90" height="16" rx="2" fill="#000000" opacity="0.8"/>
      <text x="0" y="4" text-anchor="middle" fill="#FFFFFF" class="font-mc" font-size="8">Steve @mo-farooq</text>
    </g>
  </g>`;
}

// 3D Voxel Minecraft Alex Character Rig
function renderMinecraftAlex(cx, cy) {
  return `
  <!-- ================= MINECRAFT ALEX RIG ================= -->
  <g class="alex-actor" data-character="alex">
    <ellipse cx="${cx}" cy="${cy + 2}" rx="14" ry="6" fill="#000000" opacity="0.3"/>

    <!-- Alex Boots -->
    <polygon points="${cx - 7},${cy - 1} ${cx - 2},${cy + 1} ${cx - 2},${cy - 7} ${cx - 7},${cy - 9}" fill="#404040"/>
    <polygon points="${cx + 2},${cy + 1} ${cx + 7},${cy - 1} ${cx + 7},${cy - 9} ${cx + 2},${cy - 7}" fill="#2B2B2B"/>

    <!-- Alex Brown Trousers -->
    <polygon points="${cx - 6},${cy - 9} ${cx},${cy - 6} ${cx},${cy - 20} ${cx - 6},${cy - 23}" fill="#543825"/>
    <polygon points="${cx + 1},${cy - 6} ${cx + 7},${cy - 9} ${cx + 7},${cy - 23} ${cx + 1},${cy - 20}" fill="#3D281A"/>

    <!-- Alex Green Tunic -->
    <polygon points="${cx},${cy - 40} ${cx + 12},${cy - 34} ${cx},${cy - 28} ${cx - 12},${cy - 34}" fill="#5B8731"/>
    <polygon points="${cx - 12},${cy - 34} ${cx},${cy - 28} ${cx},${cy - 18} ${cx - 12},${cy - 24}" fill="#466826"/>
    <polygon points="${cx},${cy - 28} ${cx + 12},${cy - 34} ${cx + 12},${cy - 24} ${cx},${cy - 18}" fill="#334C1B"/>

    <!-- Alex Cubic Head with Ginger Hair -->
    <polygon points="${cx},${cy - 54} ${cx + 9},${cy - 49} ${cx},${cy - 44} ${cx - 9},${cy - 49}" fill="#BE5C28"/>
    <polygon points="${cx - 9},${cy - 49} ${cx},${cy - 44} ${cx},${cy - 32} ${cx - 9},${cy - 37}" fill="#BD8B72"/>
    <polygon points="${cx - 9},${cy - 49} ${cx},${cy - 44} ${cx},${cy - 41} ${cx - 9},${cy - 46}" fill="#BE5C28"/>
    <polygon points="${cx},${cy - 44} ${cx + 9},${cy - 49} ${cx + 9},${cy - 37} ${cx},${cy - 32}" fill="#996D57"/>

    <!-- Alex Green Pixel Eyes -->
    <rect x="${cx - 7}" y="${cy - 41}" width="3" height="2" fill="#FFFFFF"/>
    <rect x="${cx - 4}" y="${cy - 41}" width="2" height="2" fill="#388731"/>

    <!-- Alex Holding Iron Sword -->
    <line x1="${cx + 10}" y1="${cy - 22}" x2="${cx + 20}" y2="${cy - 34}" stroke="#D8D8D8" stroke-width="2.5"/>
    <polygon points="${cx + 19},${cy - 36} ${cx + 22},${cy - 32} ${cx + 18},${cy - 32}" fill="#EAEAEA"/>

    <!-- Alex Player Tag -->
    <g transform="translate(${cx}, ${cy - 64})">
      <rect x="-35" y="-8" width="70" height="16" rx="2" fill="#000000" opacity="0.8"/>
      <text x="0" y="4" text-anchor="middle" fill="#FFAA00" class="font-mc" font-size="8">Alex @Co-Op</text>
    </g>
  </g>`;
}

// 3D Minecraft Voxel Block Render (Grass, Diamond, Castle, Oak, TNT, Furnace)
function renderMinecraftVoxel(cx, cy, type, name, builder, level = 1, emoji = '', row = 0, col = 0) {
  let h = 40;
  if (type === 'diamond' || type === 'tower') h = 50;
  if (type === 'castle') h = 58;

  const roofY = cy - h;

  // Minecraft block palettes
  const palettes = {
    diamond: { top: '#4DEDDE', left: '#2CBAA8', right: '#1A8F81', tagBg: '#181818', tagTxt: '#55FFFF', tagEmoji: '💎' },
    castle: { top: '#909090', left: '#6E6E6E', right: '#525252', tagBg: '#181818', tagTxt: '#FFAA00', tagEmoji: '🏰' },
    bakery: { top: '#C49758', left: '#966F38', right: '#705124', tagBg: '#181818', tagTxt: '#FFAA00', tagEmoji: '🥐' },
    cafe: { top: '#D9933B', left: '#B06F23', right: '#824E11', tagBg: '#181818', tagTxt: '#FFAA00', tagEmoji: '☕' },
    park: { top: '#5B8731', left: '#4A6E27', right: '#37521D', tagBg: '#181818', tagTxt: '#55FF55', tagEmoji: '🌲' },
    tree: { top: '#5B8731', left: '#4A6E27', right: '#37521D', tagBg: '#181818', tagTxt: '#55FF55', tagEmoji: '🌲' }
  };

  const pal = palettes[type] || palettes.diamond;

  const leftWall = `${cx - 30},${roofY} ${cx},${roofY + 15} ${cx},${cy + 15} ${cx - 30},${cy}`;
  const rightWall = `${cx},${roofY + 15} ${cx + 30},${roofY} ${cx + 30},${cy} ${cx},${cy + 15}`;
  const roof = `${cx},${roofY - 15} ${cx + 30},${roofY} ${cx},${roofY + 15} ${cx - 30},${roofY}`;

  const isVip = level > 1;
  const tagText = `${pal.tagEmoji} @${escapeXml(builder)}`;
  const tagWidth = Math.max(tagText.length * 7 + 16, 68);

  return `
  <!-- Minecraft Voxel Block at (${row},${col}) -->
  <g class="mc-block" data-tile="${row},${col}">
    <polygon points="${leftWall}" fill="${pal.left}"/>
    <polygon points="${rightWall}" fill="${pal.right}"/>
    <polygon points="${roof}" fill="${pal.top}"/>
    
    <!-- Minecraft Grid Texture Lines on Cube -->
    <line x1="${cx - 15}" y1="${roofY + 7}" x2="${cx - 15}" y2="${cy + 7}" stroke="#000000" stroke-width="1" opacity="0.15"/>
    <line x1="${cx + 15}" y1="${roofY + 7}" x2="${cx + 15}" y2="${cy + 7}" stroke="#000000" stroke-width="1" opacity="0.15"/>

    <!-- Minecraft Tag -->
    <g transform="translate(${cx}, ${roofY - 26})">
      <rect x="${-tagWidth / 2}" y="-8" width="${tagWidth}" height="16" rx="2" fill="${pal.tagBg}" stroke="${isVip ? '#55FFFF' : '#444444'}" stroke-width="1.5"/>
      <text x="0" y="4" text-anchor="middle" fill="${pal.tagTxt}" class="font-mc" font-size="7.5">${tagText}</text>
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

// Standalone CLI execution
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
