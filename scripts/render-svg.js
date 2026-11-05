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

  // Defaults if fewer than 3
  const defaultDrops = [
    { builder: 'alex_dev', emoji: '🏢', type: 'tower', name: 'Gold Skyscraper', row: 3, col: 1, isVip: true },
    { builder: 'priya_codes', emoji: '☕', type: 'cafe', name: '3D Chai Hub', row: 4, col: 4, isVip: false },
    { builder: 'rohan_ml', emoji: '🌲', type: 'park', name: 'Voxel Pine', row: 3, col: 5, isVip: false }
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

  const announcement = escapeXml(mayor.announcement || 'Tile (1,1) just upgraded to an AI Citadel after Farooq’s commit streak! Click a command below to drop a 3D block on an open tile!');

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
      <!-- Top Grass Deck -->
      <polygon points="304,195 484,285 304,375 124,285" fill="#6EE7B7" stroke="#34D399" stroke-width="1"/>

      <!-- Left Earth/Clay Wall (Thickness = 26px) -->
      <polygon points="124,285 304,375 304,401 124,311" fill="#F59E0B"/>
      <polygon points="124,298 304,388 304,401 124,311" fill="#D97706"/>

      <!-- Right Earth/Clay Wall (Darker Shade for 3D Depth) -->
      <polygon points="304,375 484,285 484,311 304,401" fill="#B45309"/>
      <polygon points="304,388 484,298 484,311 304,401" fill="#92400E"/>

      <!-- 2. ISOMETRIC CONTRIBUTION GRID LINES (6x6 Tiles, step dx=30, dy=15) -->
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

      <!-- 3. ISOMETRIC RIVER TILES (Row C=3 cutting across island) -->
      <polygon points="244,255 274,270 244,285 214,270" fill="#38BDF8"/>
      <polygon points="274,270 304,285 274,300 244,285" fill="#38BDF8"/>
      <polygon points="304,285 334,300 304,315 274,300" fill="#0284C7"/>
      <polygon points="334,300 364,315 334,330 304,315" fill="#38BDF8"/>
      <polygon points="214,270 244,285 214,300 184,285" fill="#38BDF8"/>
      <polygon points="184,285 214,300 184,315 154,300" fill="#7DD3FC"/>
      <!-- Waterfall cascading down Left Cliff -->
      <polygon points="154,300 184,315 184,341 154,326" fill="#38BDF8"/>
      <polygon points="162,304 176,311 176,337 162,330" fill="#E0F2FE" opacity="0.8"/>

      <!-- 4. GREEN COMMIT ELEVATION BLOCKS -->
      <!-- Back-Top Block (0,1) - Height 18 -->
      <g>
        <polygon points="274,192 304,207 274,222 244,207" fill="#86EFAC"/>
        <polygon points="244,207 274,222 274,240 244,225" fill="#22C55E"/>
        <polygon points="274,222 304,207 304,225 274,240" fill="#15803D"/>
      </g>
      <!-- Mid-Left Block (0,2) - Height 32 -->
      <g>
        <polygon points="244,193 274,208 244,223 214,208" fill="#4ADE80"/>
        <polygon points="214,208 244,223 244,255 214,240" fill="#16A34A"/>
        <polygon points="244,223 274,208 274,240 244,255" fill="#14532D"/>
      </g>

      <!-- 5. 3D AI RESEARCH CITADEL (Tile 1,1) -->
      <g>
        <polygon points="274,165 304,180 304,255 274,240" fill="#8B5CF6"/>
        <polygon points="304,180 334,165 334,240 304,255" fill="#5B21B6"/>
        <polygon points="304,150 334,165 304,180 274,165" fill="#C4B5FD"/>
        <polygon points="282,182 296,189 296,199 282,192" fill="#FEF08A"/>
        <polygon points="282,202 296,209 296,219 282,212" fill="#FEF08A"/>
        <polygon points="312,189 326,182 326,192 312,199" fill="#FDE047"/>
        <polygon points="312,209 326,202 326,212 312,219" fill="#FDE047"/>

        <!-- Tier 2 Mini Voxel Core on Roof -->
        <polygon points="289,145 304,152.5 304,168 289,160.5" fill="#38BDF8"/>
        <polygon points="304,152.5 319,145 319,160.5 304,168" fill="#0284C7"/>
        <polygon points="304,137.5 319,145 304,152.5 289,145" fill="#BAE6FD"/>

        <!-- Floating Hologram Cube -->
        <g class="floating-holo">
          <polygon points="304,112 314,117 304,122 294,117" fill="#FEF08A"/>
          <polygon points="294,117 304,122 304,134 294,129" fill="#F59E0B"/>
          <polygon points="304,122 314,117 314,129 304,134" fill="#B45309"/>
        </g>
        <rect x="260" y="84" width="88" height="18" rx="9" fill="#1E293B" opacity="0.9"/>
        <text x="304" y="96.5" text-anchor="middle" fill="#BAE6FD" class="font-ui" font-size="9.5" font-weight="800">🧠 AI Citadel Lv.5</text>
      </g>

      <!-- 6. VIP GOLDEN STARGAZER SKYSCRAPER (Tile 3,1) -->
      <g>
        <polygon points="334,180 364,195 364,255 334,240" fill="#FBBF24"/>
        <polygon points="364,195 394,180 394,240 364,255" fill="#D97706"/>
        <polygon points="364,165 394,180 364,195 334,180" fill="#FEF08A"/>
        <polygon points="340,195 358,204 358,212 340,203" fill="#FFFFFF" opacity="0.8"/>
        <polygon points="340,213 358,222 358,230 340,221" fill="#FFFFFF" opacity="0.8"/>
        <rect x="330" y="138" width="68" height="18" rx="9" fill="#FEF3C7" stroke="#F59E0B" stroke-width="1.5"/>
        <text x="364" y="150.5" text-anchor="middle" fill="#B45309" class="font-ui" font-size="9.5" font-weight="800">★ @alex_dev</text>
      </g>

      <!-- 7. FRONTEND DESIGN STUDIO (Tile 2,4) -->
      <g>
        <polygon points="244,270 274,285 274,330 244,315" fill="#FB7185"/>
        <polygon points="274,285 304,270 304,315 274,330" fill="#E11D48"/>
        <polygon points="274,255 304,270 274,285 244,270" fill="#FECDD3"/>
        <polygon points="274,261 292,270 274,279 256,270" fill="#38BDF8"/>
        <polygon points="252,284 268,292 268,306 252,298" fill="#FEF08A"/>
        <polygon points="280,292 296,284 296,298 280,306" fill="#FFE4E6"/>
      </g>

      <!-- 8. 24/7 CHAI & CODE HUB (Tile 4,4) -->
      <g>
        <polygon points="304,317 334,332 334,360 304,345" fill="#F97316"/>
        <polygon points="334,332 364,317 364,345 334,360" fill="#C2410C"/>
        <polygon points="334,302 364,317 334,332 304,317" fill="#FFEDD5"/>
        <rect x="302" y="276" width="64" height="17" rx="8" fill="#FFFFFF" opacity="0.92"/>
        <text x="334" y="288" text-anchor="middle" fill="#C2410C" class="font-ui" font-size="9" font-weight="800">☕ Chai Hub</text>
      </g>

      <!-- 9. 3D VOXEL PINE TREES -->
      <!-- Tree 1 at Tile (3,5) -->
      <g>
        <polygon points="298,350 304,353 304,363 298,360" fill="#92400E"/>
        <polygon points="304,353 310,350 310,360 304,363" fill="#78350F"/>
        <polygon points="304,322 318,329 304,336 290,329" fill="#6EE7B7"/>
        <polygon points="290,329 304,336 304,354 290,347" fill="#10B981"/>
        <polygon points="304,336 318,329 318,347 304,354" fill="#047857"/>
      </g>

      <!-- Tree 2 at Tile (5,2) -->
      <g>
        <polygon points="418,260 424,263 424,273 418,270" fill="#92400E"/>
        <polygon points="424,263 430,260 430,270 424,273" fill="#78350F"/>
        <polygon points="424,232 438,239 424,246 410,239" fill="#86EFAC"/>
        <polygon points="410,239 424,246 424,264 410,257" fill="#22C55E"/>
        <polygon points="424,246 438,239 438,257 424,264" fill="#15803D"/>
      </g>
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
