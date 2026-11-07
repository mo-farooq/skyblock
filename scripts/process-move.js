import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderWorldSvg } from './render-svg.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const STATE_FILE = path.join(ROOT_DIR, 'data', 'world-state.json');
const SVG_OUTPUT = path.join(ROOT_DIR, 'world-3d.svg');
const README_FILE = path.join(ROOT_DIR, 'README.md');

// Helper to test if a tile (r, c) is on the authentic 27-block Skyblock L-island or an existing bridge
function isWalkable(r, c, state) {
  if (r < 0 || c < 0 || r > 8 || c > 8) return false;
  const onIsland = (r < 3 && c < 3) || (r >= 3 && c < 6);
  if (onIsland) return true;
  if (state.bridges && state.bridges.some(b => b.row === r && b.col === c)) return true;
  return false;
}

// Generate standard GitHub Issue URL with clean title and body encoding
function createIssueUrl(repoOwner, repoName, title, body) {
  const encTitle = encodeURIComponent(title);
  const encBody = encodeURIComponent(body || 'Click "Submit new issue" to execute this turn on the live Skyblock realm!');
  return `https://github.com/${repoOwner}/${repoName}/issues/new?title=${encTitle}&body=${encBody}`;
}

async function main() {
  console.log('⛏️ [Skyblock Engine] Processing turn-based move...');

  const context = await getEventContext();
  console.log(`👤 Player: @${context.username}`);
  console.log(`📋 Issue #${context.issueNumber}: "${context.issueTitle}"`);

  const hasStarred = await checkUserStar(context.repoOwner, context.repoName, context.username);
  console.log(`⭐ Star Status: ${hasStarred ? 'Verified VIP Stargazer!' : 'Citizen Miner'}`);

  const rawState = fs.readFileSync(STATE_FILE, 'utf-8');
  const state = JSON.parse(rawState);

  // Process the action
  const turnResult = processSkyblockAction(state, context.issueTitle, context.username, hasStarred);
  console.log(`🎮 Turn Result:`, turnResult);

  // Save updated state
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');

  // Render SVG with camera anchoring
  const svgContent = renderWorldSvg(state);
  fs.writeFileSync(SVG_OUTPUT, svgContent, 'utf-8');
  console.log(`🎨 Rendered world-3d.svg with camera anchoring successfully.`);

  // Generate dynamic README with gamepad layout & dynamic crafting bench
  const dynamicReadme = generateGamepadReadme(state, context.repoOwner, context.repoName);
  fs.writeFileSync(README_FILE, dynamicReadme, 'utf-8');
  console.log(`📜 Dynamic README updated with Gamepad & Crafting Bench.`);

  // Comment & close issue if running in GitHub Actions
  if (process.env.GITHUB_TOKEN && context.issueNumber && context.repoOwner && context.repoName) {
    await replyAndCloseIssue(context, turnResult, state, hasStarred);
  }
}

// Logic to parse and apply player actions
export function processSkyblockAction(state, title, username, hasStarred) {
  const lower = title.toLowerCase();
  let actionSummary = '';

  // 1. OPEN STARTER CHEST
  if (lower.includes('chest') || lower.includes('open chest')) {
    if (!state.chest.opened) {
      state.chest.opened = true;
      addItem(state.inventory, 'lava_bucket', 'Lava Bucket', '🌋', 1);
      addItem(state.inventory, 'ice_block', 'Ice Block', '🧊', 1);
      addItem(state.inventory, 'bread', 'Bread', '🍞', 3);
      actionSummary = `@${username} opened the Starter Chest! Looted 1 Lava Bucket, 1 Ice Block, and 3 Bread.`;
    } else {
      actionSummary = `@${username} peeked into the Starter Chest, but it was already looted!`;
    }
    state.stats.chestsOpened = (state.stats.chestsOpened || 0) + 1;
  }
  // 2. PUNCH OAK TREE
  else if (lower.includes('punch') || lower.includes('chop') || lower.includes('tree') || lower.includes('wood')) {
    state.tree.hp -= 1;
    if (state.tree.hp <= 0) {
      state.tree.hp = state.tree.maxHp;
      addItem(state.inventory, 'oak_log', 'Oak Log', '🪵', 4);
      addItem(state.inventory, 'oak_planks', 'Oak Planks', '🪵', 8);
      actionSummary = `@${username} felled the Oak Tree! Harvested 4 Oak Logs and 8 Planks, replanting the sapling.`;
    } else {
      addItem(state.inventory, 'oak_log', 'Oak Log', '🪵', 1);
      actionSummary = `@${username} punched the Oak Tree! (${state.tree.hp}/${state.tree.maxHp} HP). +1 Log gathered.`;
    }
    state.stats.treesHarvested = (state.stats.treesHarvested || 0) + 1;
  }
  // 3. CRAFTING RECIPES (SIMPLIFIED & DYNAMIC)
  else if (lower.includes('craft 4 planks') || lower.includes('craft planks')) {
    if (deductItem(state.inventory, 'oak_log', 1)) {
      addItem(state.inventory, 'oak_planks', 'Oak Planks', '🪵', 4);
      actionSummary = `@${username} crafted 4 Oak Planks from 1 Oak Log!`;
    } else {
      actionSummary = `@${username} tried to craft planks, but has no Oak Logs!`;
    }
  } else if (lower.includes('craft 4 sticks') || lower.includes('craft sticks')) {
    if (deductItem(state.inventory, 'oak_planks', 2)) {
      addItem(state.inventory, 'stick', 'Stick', '🥢', 4);
      actionSummary = `@${username} crafted 4 Wooden Sticks from 2 Planks!`;
    } else {
      actionSummary = `@${username} tried to craft sticks, but has insufficient Planks!`;
    }
  } else if (lower.includes('craft crafting table') || lower.includes('craft bench')) {
    if (deductItem(state.inventory, 'oak_planks', 4)) {
      addItem(state.inventory, 'crafting_table', 'Crafting Table', '🪚', 1);
      actionSummary = `@${username} crafted a Crafting Table from 4 Planks!`;
    } else {
      actionSummary = `@${username} tried to craft a Crafting Table, but has insufficient Planks!`;
    }
  } else if (lower.includes('craft stone pickaxe') || lower.includes('craft pickaxe')) {
    if (deductItem(state.inventory, 'cobblestone', 3) && deductItem(state.inventory, 'stick', 2)) {
      addItem(state.inventory, 'stone_pickaxe', 'Stone Pickaxe', '⛏️', 1);
      actionSummary = `@${username} crafted a Stone Pickaxe from 3 Cobblestone and 2 Sticks!`;
    } else {
      actionSummary = `@${username} tried to craft a Pickaxe, but lacks Cobblestone or Sticks!`;
    }
  } else if (lower.includes('craft furnace')) {
    if (deductItem(state.inventory, 'cobblestone', 8)) {
      addItem(state.inventory, 'furnace', 'Furnace', '♨️', 1);
      actionSummary = `@${username} crafted a Stone Furnace from 8 Cobblestone!`;
    } else {
      actionSummary = `@${username} tried to craft a Furnace, but lacks 8 Cobblestone!`;
    }
  }
  // 4. DIRECTIONAL MOVEMENT
  else if (lower.includes('forward') || lower.includes('north') || lower.includes('up')) {
    const targetRow = state.steve.row - 1;
    if (isWalkable(targetRow, state.steve.col, state)) {
      state.steve.row = targetRow;
      actionSummary = `@${username} moved Steve Forward to [${state.steve.row}, ${state.steve.col}]. Camera centered!`;
    } else {
      actionSummary = `@${username} tried to move Forward, but reached the island edge facing the void!`;
    }
  } else if (lower.includes('backward') || lower.includes('south') || lower.includes('down')) {
    const targetRow = state.steve.row + 1;
    if (isWalkable(targetRow, state.steve.col, state)) {
      state.steve.row = targetRow;
      actionSummary = `@${username} moved Steve Backward to [${state.steve.row}, ${state.steve.col}]. Camera centered!`;
    } else {
      actionSummary = `@${username} tried to move Backward, but reached the island edge facing the void!`;
    }
  } else if (lower.includes('right') || lower.includes('east')) {
    const targetCol = state.steve.col + 1;
    if (isWalkable(state.steve.row, targetCol, state)) {
      state.steve.col = targetCol;
      actionSummary = `@${username} moved Steve Right to [${state.steve.row}, ${state.steve.col}]. Camera centered!`;
    } else {
      actionSummary = `@${username} tried to move Right, but reached the island edge facing the void!`;
    }
  } else if (lower.includes('left') || lower.includes('west')) {
    const targetCol = state.steve.col - 1;
    if (isWalkable(state.steve.row, targetCol, state)) {
      state.steve.col = targetCol;
      actionSummary = `@${username} moved Steve Left to [${state.steve.row}, ${state.steve.col}]. Camera centered!`;
    } else {
      actionSummary = `@${username} tried to move Left, but reached the island edge facing the void!`;
    }
  }
  // 5. PLACE PLANK BRIDGE
  else if (lower.includes('bridge') || lower.includes('plank')) {
    if (deductItem(state.inventory, 'oak_planks', 1)) {
      const bridgeRow = state.steve.row + 1;
      const bridgeCol = state.steve.col;
      state.bridges = state.bridges || [];
      state.bridges.push({ row: bridgeRow, col: bridgeCol, type: hasStarred ? 'diamond' : 'oak_planks', builder: username });
      actionSummary = `@${username} placed a bridge block at [${bridgeRow}, ${bridgeCol}] expanding the island!`;
    } else {
      actionSummary = `@${username} tried to bridge, but has no planks in inventory!`;
    }
  } else {
    actionSummary = `@${username} surveyed the Skyblock realm!`;
  }

  // Update Steve metadata
  state.steve.lastMover = username;
  state.steve.lastAction = actionSummary;
  state.stats.totalMoves = (state.stats.totalMoves || 0) + 1;
  state.stats.lastBuilder = username;
  state.stats.updatedAt = new Date().toISOString();

  return actionSummary;
}

function addItem(inventory, id, name, emoji, count) {
  const slot = inventory.find(i => i.id === id);
  if (slot) {
    slot.count = Math.min(slot.count + count, 64);
  } else if (inventory.length < 9) {
    inventory.push({ slot: inventory.length + 1, id, name, emoji, count });
  }
}

function deductItem(inventory, id, count) {
  const slot = inventory.find(i => i.id === id);
  if (slot && slot.count >= count) {
    slot.count -= count;
    if (slot.count === 0) {
      const index = inventory.indexOf(slot);
      if (index > -1) inventory.splice(index, 1);
    }
    return true;
  }
  return false;
}

// Generate Gamepad Controller Layout with DYNAMIC CRAFTING BENCH & PRE-FILLED ISSUE URLS
export function generateGamepadReadme(state, repoOwner = 'mo-farooq', repoName = 'skyblock') {
  const { steve, tree, chest, inventory } = state;

  // 1. Dynamic D-Pad Movement Buttons (Only appear if target tile is walkable!)
  const canGoNorth = isWalkable(steve.row - 1, steve.col, state);
  const canGoSouth = isWalkable(steve.row + 1, steve.col, state);
  const canGoEast = isWalkable(steve.row, steve.col + 1, state);
  const canGoWest = isWalkable(steve.row, steve.col - 1, state);

  const forwardUrl = createIssueUrl(repoOwner, repoName, 'Move: Step Forward', 'Moving Steve Forward on the Skyblock Island.');
  const backwardUrl = createIssueUrl(repoOwner, repoName, 'Move: Step Backward', 'Moving Steve Backward on the Skyblock Island.');
  const leftUrl = createIssueUrl(repoOwner, repoName, 'Move: Step Left', 'Moving Steve Left on the Skyblock Island.');
  const rightUrl = createIssueUrl(repoOwner, repoName, 'Move: Step Right', 'Moving Steve Right on the Skyblock Island.');

  const forwardBtn = canGoNorth
    ? `<a href="${forwardUrl}" data-turbo="false"><img src="https://img.shields.io/badge/⬆️_FORWARD-2E7D32?style=for-the-badge&logoColor=white&labelColor=1B2838" height="42" alt="Forward"/></a>`
    : `<em>(Void)</em>`;

  const backwardBtn = canGoSouth
    ? `<a href="${backwardUrl}" data-turbo="false"><img src="https://img.shields.io/badge/⬇️_BACKWARD-2E7D32?style=for-the-badge&logoColor=white&labelColor=1B2838" height="42" alt="Backward"/></a>`
    : `<em>(Void)</em>`;

  const leftBtn = canGoWest
    ? `<a href="${leftUrl}" data-turbo="false"><img src="https://img.shields.io/badge/⬅️_LEFT-2E7D32?style=for-the-badge&logoColor=white&labelColor=1B2838" height="42" alt="Left"/></a>`
    : `<em>(Void)</em>`;

  const rightBtn = canGoEast
    ? `<a href="${rightUrl}" data-turbo="false"><img src="https://img.shields.io/badge/➡️_RIGHT-2E7D32?style=for-the-badge&logoColor=white&labelColor=1B2838" height="42" alt="Right"/></a>`
    : `<em>(Void)</em>`;

  // 2. Dynamic Action Buttons (Appear ONLY when in range!)
  const isBesideTree = Math.abs(steve.row - tree.row) <= 1 && Math.abs(steve.col - tree.col) <= 1;
  const isBesideChest = Math.abs(steve.row - chest.row) <= 1 && Math.abs(steve.col - chest.col) <= 1;
  const hasPlanks = inventory.some(i => i.id === 'oak_planks' && i.count > 0);

  const actionButtons = [];
  if (isBesideTree) {
    const punchUrl = createIssueUrl(repoOwner, repoName, 'Action: Punch Oak Tree', 'Punching the solitary oak tree to harvest wood logs!');
    actionButtons.push(`<a href="${punchUrl}" data-turbo="false"><img src="https://img.shields.io/badge/🪓_[A]_PUNCH_TREE-FF8F00?style=for-the-badge&logoColor=white&labelColor=1B2838" height="42" alt="Punch Tree"/></a>`);
  }
  if (isBesideChest && !chest.opened) {
    const chestUrl = createIssueUrl(repoOwner, repoName, 'Action: Open Starter Chest', 'Opening the starter chest to loot lava and ice blocks!');
    actionButtons.push(`<a href="${chestUrl}" data-turbo="false"><img src="https://img.shields.io/badge/📦_[B]_OPEN_CHEST-8D6E63?style=for-the-badge&logoColor=white&labelColor=1B2838" height="42" alt="Open Chest"/></a>`);
  }
  if (hasPlanks) {
    const bridgeUrl = createIssueUrl(repoOwner, repoName, 'Action: Bridge Planks', 'Placing an oak plank bridge block into the void!');
    actionButtons.push(`<a href="${bridgeUrl}" data-turbo="false"><img src="https://img.shields.io/badge/🪵_[X]_BRIDGE_VOID-D84315?style=for-the-badge&logoColor=white&labelColor=1B2838" height="42" alt="Bridge Void"/></a>`);
  }
  actionButtons.push(`<a href="https://github.com/${repoOwner}/${repoName}/stargazers"><img src="https://img.shields.io/badge/⭐_[Y]_VIP_STAR-00E5FF?style=for-the-badge&logoColor=black&labelColor=1B2838" height="42" alt="VIP Star"/></a>`);

  // 3. Dynamic Crafting Recipes (Appear ONLY when Steve holds the exact ingredients!)
  const logCount = (inventory.find(i => i.id === 'oak_log') || {}).count || 0;
  const plankCount = (inventory.find(i => i.id === 'oak_planks') || {}).count || 0;
  const stickCount = (inventory.find(i => i.id === 'stick') || {}).count || 0;
  const cobbleCount = (inventory.find(i => i.id === 'cobblestone') || {}).count || 0;

  const craftButtons = [];
  if (logCount >= 1) {
    const url = createIssueUrl(repoOwner, repoName, 'Action: Craft 4 Planks', 'Crafting 4 Oak Planks from 1 Oak Log.');
    craftButtons.push(`<a href="${url}" data-turbo="false"><img src="https://img.shields.io/badge/🔨_CRAFT_4_PLANKS-B88746?style=for-the-badge&logoColor=white&labelColor=1B2838" height="38" alt="Craft Planks"/></a>`);
  }
  if (plankCount >= 2) {
    const url = createIssueUrl(repoOwner, repoName, 'Action: Craft 4 Sticks', 'Crafting 4 Wooden Sticks from 2 Planks.');
    craftButtons.push(`<a href="${url}" data-turbo="false"><img src="https://img.shields.io/badge/🔨_CRAFT_4_STICKS-8D6E63?style=for-the-badge&logoColor=white&labelColor=1B2838" height="38" alt="Craft Sticks"/></a>`);
  }
  if (plankCount >= 4) {
    const url = createIssueUrl(repoOwner, repoName, 'Action: Craft Crafting Table', 'Crafting a Crafting Table from 4 Planks.');
    craftButtons.push(`<a href="${url}" data-turbo="false"><img src="https://img.shields.io/badge/🔨_CRAFT_TABLE-A67038?style=for-the-badge&logoColor=white&labelColor=1B2838" height="38" alt="Craft Table"/></a>`);
  }
  if (cobbleCount >= 3 && stickCount >= 2) {
    const url = createIssueUrl(repoOwner, repoName, 'Action: Craft Stone Pickaxe', 'Crafting a Stone Pickaxe from 3 Cobblestone and 2 Sticks.');
    craftButtons.push(`<a href="${url}" data-turbo="false"><img src="https://img.shields.io/badge/⛏️_CRAFT_PICKAXE-78909C?style=for-the-badge&logoColor=white&labelColor=1B2838" height="38" alt="Craft Pickaxe"/></a>`);
  }
  if (cobbleCount >= 8) {
    const url = createIssueUrl(repoOwner, repoName, 'Action: Craft Furnace', 'Crafting a Stone Furnace from 8 Cobblestone.');
    craftButtons.push(`<a href="${url}" data-turbo="false"><img src="https://img.shields.io/badge/♨️_CRAFT_FURNACE-455A64?style=for-the-badge&logoColor=white&labelColor=1B2838" height="38" alt="Craft Furnace"/></a>`);
  }

  const craftSection = craftButtons.length > 0
    ? `### 🔨 Available Crafting Recipes (Based on Current Inventory)\n<p>\n  ${craftButtons.join(' &nbsp; ')}\n</p>`
    : `### 🔨 Crafting Bench\n<em>(Inventory has no craftable ingredients. Punch the Oak Tree or loot the Starter Chest to gather materials!)</em>`;

  return `# 🏝️ Minecraft Skyblock Survival

<p align="center">
  <img src="./world-3d.svg" alt="Minecraft Skyblock 3D Isometric Island" width="100%" />
</p>

<div align="center">

## 🎮 Dynamic Gamepad Controller: Make Your Move!
*Steve is at **Tile [${steve.row}, ${steve.col}]**. The camera is locked to Steve, and buttons update in real-time!*

> 💡 **How to Play:** Click any button below &rarr; click the green **"Create"** button on GitHub &rarr; Steve moves & the island updates in ~15s!

<table>
  <tr>
    <th align="center" colspan="3">🕹️ D-PAD MOVEMENT</th>
    <th width="40"></th>
    <th align="center">⚡ AVAILABLE ACTIONS</th>
  </tr>
  <tr>
    <td></td>
    <td align="center">
      ${forwardBtn}
    </td>
    <td></td>
    <td></td>
    <td align="center" rowspan="3">
      ${actionButtons.join('<br><br>')}
    </td>
  </tr>
  <tr>
    <td align="center">
      ${leftBtn}
    </td>
    <td align="center">
      <img src="https://img.shields.io/badge/🕹️_STEVE-000000?style=for-the-badge&logoColor=white" height="38"/>
    </td>
    <td align="center">
      ${rightBtn}
    </td>
    <td></td>
  </tr>
  <tr>
    <td></td>
    <td align="center">
      ${backwardBtn}
    </td>
    <td></td>
    <td></td>
  </tr>
</table>

${craftSection}

</div>

---

## ⚡ How It Works

- **Authentic Minecraft SkyBlock**: Faithfully modeled on Noobcrew's classic 2011 27-block L-island layout with 4 vertical dirt layers and a bedrock cornerstone.
- **Camera-Anchored Viewport**: Steve is locked permanently at the center of the screen; the floating platform translates smoothly beneath him as he navigates across the void!
- **Dynamic Crafting Bench**: Recipe buttons only appear when Steve holds the exact ingredients in his hotbar pack.
- **Empty-Handed Start**: Steve spawns with 0 inventory items. Gather oak logs to craft planks, sticks, and tools!

---

## 🚀 Local Development

\`\`\`bash
# Clone repository
git clone https://github.com/${repoOwner}/${repoName}.git
cd ${repoName}

# Re-render world-3d.svg
npm run render

# Test a mock turn
npm run test-build
\`\`\`
`;
}

async function checkUserStar(owner, repo, username) {
  if (!process.env.GITHUB_TOKEN) return false;
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/stargazers`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'User-Agent': 'Skyblock-Engine'
      }
    });
    if (!res.ok) return false;
    const stargazers = await res.json();
    return Array.isArray(stargazers) && stargazers.some(s => s.login?.toLowerCase() === username?.toLowerCase());
  } catch (err) {
    return false;
  }
}

async function getEventContext() {
  const isMock = process.argv.includes('--mock') || !process.env.GITHUB_EVENT_PATH;
  if (isMock) {
    return {
      issueTitle: process.env.MOCK_TITLE || 'Move: Step Forward',
      username: process.env.MOCK_USER || 'mo-farooq',
      issueNumber: 42,
      repoOwner: 'mo-farooq',
      repoName: 'skyblock'
    };
  }

  try {
    const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf-8'));
    const [repoOwner, repoName] = (event.repository?.full_name || 'mo-farooq/skyblock').split('/');
    return {
      issueTitle: event.issue?.title || 'Move: Step Forward',
      username: event.issue?.user?.login || 'Player',
      issueNumber: event.issue?.number,
      repoOwner,
      repoName
    };
  } catch (err) {
    return {
      issueTitle: 'Move: Step Forward',
      username: 'Player',
      issueNumber: 1,
      repoOwner: 'mo-farooq',
      repoName: 'skyblock'
    };
  }
}

async function replyAndCloseIssue(context, actionSummary, state, hasStarred) {
  const { repoOwner, repoName, issueNumber, username } = context;
  const token = process.env.GITHUB_TOKEN;

  const comment = `### 🏝️ Skyblock Multiplayer Realm Notification

Greetings **@${username}**! Your move has been executed on the live server:

> 🟩 **Action decree:**  
> *"${actionSummary}"*

---

#### 📍 Server Telemetry:
- **Steve Location:** \`[Row ${state.steve.row}, Col ${state.steve.col}]\`
- **Chest Status:** ${state.chest.opened ? '📦 Opened' : '🔒 Locked'}
- **Tree HP:** \`${state.tree.hp} / ${state.tree.maxHp} HP\`
- **VIP Status:** ${hasStarred ? '💎 VIP Diamond Miner (Starred Repository)' : '⭐ Star the repo to unlock rare Diamond bridge blocks!'}

View Steve's updated position on [mo-farooq/skyblock](https://github.com/${repoOwner}/${repoName})!`;

  try {
    await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Skyblock-Bot'
      },
      body: JSON.stringify({ body: comment })
    });

    await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}`, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Skyblock-Bot'
      },
      body: JSON.stringify({ state: 'closed' })
    });
  } catch (err) {
    console.error('Failed replying to issue:', err.message);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('Fatal engine error:', err);
    process.exit(1);
  });
}
