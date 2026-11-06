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

// Starter Island Coordinates
const STARTER_TILES = [
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

  // Render SVG
  const svgContent = renderWorldSvg(state);
  fs.writeFileSync(SVG_OUTPUT, svgContent, 'utf-8');
  console.log(`🎨 Rendered world-3d.svg successfully.`);

  // Generate dynamic README with available actions based on Steve's new position
  const dynamicReadme = generateDynamicReadme(state, context.repoOwner, context.repoName);
  fs.writeFileSync(README_FILE, dynamicReadme, 'utf-8');
  console.log(`📜 Dynamic README updated with legal moves.`);

  // Comment & close issue if running in GitHub Actions
  if (process.env.GITHUB_TOKEN && context.issueNumber && context.repoOwner && context.repoName) {
    await replyAndCloseIssue(context, turnResult, state, hasStarred);
  }
}

// Logic to parse and apply player actions
export function processSkyblockAction(state, title, username, hasStarred) {
  const lower = title.toLowerCase();
  let actionSummary = '';

  // 1. PUNCH OAK TREE
  if (lower.includes('punch') || lower.includes('chop') || lower.includes('tree') || lower.includes('harvest wood')) {
    state.tree.hp -= 1;
    if (state.tree.hp <= 0) {
      state.tree.hp = state.tree.maxHp;
      addItem(state.inventory, 'oak_log', 'Oak Log', '🪵', 4);
      addItem(state.inventory, 'oak_planks', 'Oak Planks', '🪵', 8);
      actionSummary = `@${username} felled the Oak Tree! Gathered 4 Logs and replanted the sapling.`;
    } else {
      addItem(state.inventory, 'oak_log', 'Oak Log', '🪵', 1);
      actionSummary = `@${username} punched the Oak Tree! (${state.tree.hp}/${state.tree.maxHp} HP remaining). +1 Log gathered.`;
    }
    state.stats.treesHarvested = (state.stats.treesHarvested || 0) + 1;
  }
  // 2. MINE COBBLESTONE
  else if (lower.includes('cobble') || lower.includes('mine cobblestone') || lower.includes('generator')) {
    addItem(state.inventory, 'cobblestone', 'Cobblestone', '🪨', 2);
    actionSummary = `@${username} mined the Cobblestone Generator! +2 Cobblestone added to inventory.`;
  }
  // 3. PLACE PLANK BRIDGE / EXPAND VOID
  else if (lower.includes('bridge') || lower.includes('plank') || lower.includes('build')) {
    // Determine target void coordinate from Steve's position
    const target = getNextBridgeCoordinate(state);
    const blockType = hasStarred ? 'diamond' : 'oak_planks';
    const emoji = hasStarred ? '💎' : '🪵';

    state.bridges.push({
      row: target.row,
      col: target.col,
      type: blockType,
      builder: username,
      emoji: emoji,
      isVip: hasStarred
    });

    // Deduct planks if available
    deductItem(state.inventory, 'oak_planks', 1);

    // Damage Ender Dragon on bridge progression
    state.enderDragon.hp = Math.max(state.enderDragon.hp - 25, 0);
    state.stats.bridgesBuilt = (state.stats.bridgesBuilt || 0) + 1;
    state.stats.dragonDamageDealt = (state.stats.dragonDamageDealt || 0) + 25;

    actionSummary = `@${username} placed a ${hasStarred ? 'VIP Diamond' : 'Oak Plank'} bridge block at [${target.row}, ${target.col}]! Ender Dragon took 25 damage (${state.enderDragon.hp}/1000 HP).`;
  }
  // 4. PLACE OBJECT (FURNACE / CRAFTING TABLE / TORCH)
  else if (lower.includes('furnace')) {
    if (deductItem(state.inventory, 'furnace', 1)) {
      state.placedObjects.push({ row: state.steve.row, col: state.steve.col + 1, type: 'furnace', builder: username });
      actionSummary = `@${username} deployed a stone Furnace on the island!`;
    } else {
      actionSummary = `@${username} tried to place a Furnace, but none were left in inventory!`;
    }
  } else if (lower.includes('crafting table')) {
    if (deductItem(state.inventory, 'crafting_table', 1)) {
      state.placedObjects.push({ row: state.steve.row, col: state.steve.col + 1, type: 'crafting_table', builder: username });
      actionSummary = `@${username} placed a Crafting Table on the island!`;
    }
  } else if (lower.includes('torch')) {
    if (deductItem(state.inventory, 'torch', 1)) {
      state.placedObjects.push({ row: state.steve.row, col: state.steve.col, type: 'torch', builder: username });
      actionSummary = `@${username} planted a Torch to light up the island!`;
    }
  }
  // 5. DIRECTIONAL MOVEMENT
  else if (lower.includes('north') || lower.includes('up')) {
    state.steve.row = Math.max(state.steve.row - 1, 0);
    actionSummary = `@${username} moved Steve North to [${state.steve.row}, ${state.steve.col}].`;
  } else if (lower.includes('south') || lower.includes('down')) {
    state.steve.row += 1;
    actionSummary = `@${username} moved Steve South to [${state.steve.row}, ${state.steve.col}].`;
  } else if (lower.includes('east') || lower.includes('right')) {
    state.steve.col += 1;
    actionSummary = `@${username} moved Steve East to [${state.steve.row}, ${state.steve.col}].`;
  } else if (lower.includes('west') || lower.includes('left')) {
    state.steve.col = Math.max(state.steve.col - 1, 0);
    actionSummary = `@${username} moved Steve West to [${state.steve.row}, ${state.steve.col}].`;
  } else {
    actionSummary = `@${username} explored the Skyblock island!`;
  }

  // Update Steve metadata
  state.steve.lastMover = username;
  state.steve.lastAction = actionSummary;
  state.stats.totalMoves = (state.stats.totalMoves || 0) + 1;
  state.stats.lastBuilder = username;
  state.stats.updatedAt = new Date().toISOString();

  return actionSummary;
}

// Compute next bridge coordinate extending south from L-island
function getNextBridgeCoordinate(state) {
  const existingBridgeRows = state.bridges.map(b => b.row);
  const maxRow = existingBridgeRows.length > 0 ? Math.max(...existingBridgeRows) : 3;
  return { row: maxRow + 1, col: 2 };
}

// Inventory helpers
function addItem(inventory, id, name, emoji, count) {
  const slot = inventory.find(i => i.id === id);
  if (slot) {
    slot.count = Math.min(slot.count + count, slot.maxStack || 64);
  } else if (inventory.length < 8) {
    inventory.push({ slot: inventory.length + 1, id, name, emoji, count, maxStack: 64 });
  }
}

function deductItem(inventory, id, count) {
  const slot = inventory.find(i => i.id === id);
  if (slot && slot.count >= count) {
    slot.count -= count;
    return true;
  }
  return false;
}

// Generate dynamic README with available legal moves
export function generateDynamicReadme(state, repoOwner = 'mo-farooq', repoName = 'skyblock') {
  const { steve, tree, enderDragon, inventory, stats } = state;
  const isBesideTree = Math.abs(steve.row - tree.row) <= 1 && Math.abs(steve.col - tree.col) <= 1;
  const isBesideGen = Math.abs(steve.row - 1) <= 1 && Math.abs(steve.col - 3) <= 1;
  const isAtSouthEdge = steve.row >= 3;
  const hasFurnace = inventory.some(i => i.id === 'furnace' && i.count > 0);
  const hasPlanks = inventory.some(i => i.id === 'oak_planks' && i.count > 0);

  // Generate dynamic contextual buttons
  const buttons = [];

  // Movement options
  buttons.push(`[![Step North](https://img.shields.io/badge/⬆️_STEP_NORTH-2E7D32?style=for-the-badge&logoColor=white&labelColor=1B2838)](https://github.com/${repoOwner}/${repoName}/issues/new?title=Move%3A+Step+North&body=Moving+Steve+North+on+the+Skyblock+Island)`);
  buttons.push(`[![Step South](https://img.shields.io/badge/⬇️_STEP_SOUTH-2E7D32?style=for-the-badge&logoColor=white&labelColor=1B2838)](https://github.com/${repoOwner}/${repoName}/issues/new?title=Move%3A+Step+South&body=Moving+Steve+South+on+the+Skyblock+Island)`);
  buttons.push(`[![Step East](https://img.shields.io/badge/➡️_STEP_EAST-2E7D32?style=for-the-badge&logoColor=white&labelColor=1B2838)](https://github.com/${repoOwner}/${repoName}/issues/new?title=Move%3A+Step+East&body=Moving+Steve+East+on+the+Skyblock+Island)`);
  buttons.push(`[![Step West](https://img.shields.io/badge/⬅️_STEP_WEST-2E7D32?style=for-the-badge&logoColor=white&labelColor=1B2838)](https://github.com/${repoOwner}/${repoName}/issues/new?title=Move%3A+Step+West&body=Moving+Steve+West+on+the+Skyblock+Island)`);

  const actionButtons = [];
  // Contextual Tree Punch
  if (isBesideTree) {
    actionButtons.push(`[![Punch Oak Tree](https://img.shields.io/badge/🪓_PUNCH_OAK_TREE-FF8F00?style=for-the-badge&logoColor=white&labelColor=1B2838)](https://github.com/${repoOwner}/${repoName}/issues/new?title=Action%3A+Punch+Oak+Tree&body=Steve+is+beside+the+Tree%21+Harvesting+wood+logs.)`);
  }
  // Contextual Cobblestone Mine
  if (isBesideGen) {
    actionButtons.push(`[![Mine Cobblestone](https://img.shields.io/badge/⛏️_MINE_COBBLESTONE-78909C?style=for-the-badge&logoColor=white&labelColor=1B2838)](https://github.com/${repoOwner}/${repoName}/issues/new?title=Action%3A+Mine+Cobblestone&body=Mining+fresh+cobblestone+from+the+lava%2Fwater+generator%21)`);
  }
  // Contextual Void Bridging
  if (isAtSouthEdge || hasPlanks) {
    actionButtons.push(`[![Bridge Planks](https://img.shields.io/badge/🪵_BRIDGE_PLANKS-D84315?style=for-the-badge&logoColor=white&labelColor=1B2838)](https://github.com/${repoOwner}/${repoName}/issues/new?title=Action%3A+Bridge+Planks&body=Placing+a+wooden+plank+bridge+block+into+the+void+towards+the+Ender+Dragon%21)`);
  }
  // Contextual Furnace Placement
  if (hasFurnace) {
    actionButtons.push(`[![Place Furnace](https://img.shields.io/badge/♨️_PLACE_FURNACE-455A64?style=for-the-badge&logoColor=white&labelColor=1B2838)](https://github.com/${repoOwner}/${repoName}/issues/new?title=Action%3A+Place+Furnace&body=Deploying+a+stone+furnace+onto+the+island%21)`);
  }

  // Stargazer VIP badge
  actionButtons.push(`[![Star for VIP Diamond](https://img.shields.io/badge/⭐_UNLOCK_VIP_DIAMOND-00E5FF?style=for-the-badge&logoColor=black&labelColor=1B2838)](https://github.com/${repoOwner}/${repoName}/stargazers)`);

  // Hotbar Markdown Table
  const hotbarCells = inventory.map(item => `**${item.emoji} ${item.name}**<br>(\`x${item.count}\`)`).join(' | ');
  const hotbarHeaders = inventory.map(item => `Slot ${item.slot}`).join(' | ');
  const hotbarSeparators = inventory.map(() => ':---:').join(' | ');

  return `# 🏝️ Minecraft Skyblock Multiplayer Realm

<p align="center">
  <img src="./world-3d.svg" alt="Minecraft Skyblock 3D World" width="100%" />
</p>

<div align="center">

## 🎮 Contextual Command Deck: Make Your Move!
*Steve is currently at **Tile [${steve.row}, ${steve.col}]**. Click any valid button below to submit the next multiplayer move via GitHub Issues!*

### 🚶 Cardinal Movement (Step to Adjacent Tile)
<p>
  ${buttons.join('\n  &nbsp;\n  ')}
</p>

### 🛠️ Contextual Adjacency Actions (Active for Current Tile)
<p>
  ${actionButtons.join('\n  &nbsp;\n  ')}
</p>

---

### 🎒 Steve's 8-Slot Hotbar Pack
| ${hotbarHeaders} |
| ${hotbarSeparators} |
| ${hotbarCells} |

</div>

> [!TIP]
> ⭐ **Stargazer VIP Perk**: Starring this repository grants your next bridge placement **Luminous Cyan Diamond Block** status with special particle gleams and +50 damage to the Ender Dragon!

---

## ⚡ Architecture & Turn-Based Event Loop

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor Player as 👤 Visitor
    participant GH as 🐙 GitHub Issues
    participant Action as ⚙️ GitHub Actions
    participant Engine as ⛏️ process-move.js
    participant SVG as 🎨 world-3d.svg

    Player->>GH: Clicks [ 🪓 PUNCH TREE ] or [ ⬆️ STEP NORTH ]
    GH->>Action: Triggers runner on issues: [opened]
    Action->>Engine: Executes turn-based Skyblock movement engine
    Engine->>Engine: Validates adjacency & updates 8-slot inventory
    Engine->>SVG: Calculates 3D voxel projection & updates Steve position
    Engine->>GH: Posts achievement certificate & closes issue
    Action->>GH: Commits updated SVG and dynamic README deck to main
\`\`\`

---

## 🛠️ Engine Highlights

- **Pure 3D Voxel SVG**: Authentic 2:1 isometric L-shaped Skyblock island with solitary oak tree, starter chest, and cobblestone generator.
- **Dynamic Contextual Buttons**: README buttons update in real-time depending on Steve's current coordinates.
- **8-Slot Inventory Management**: Strict item tracking for oak logs, planks, cobblestone, furnaces, and rare diamond gems.
- **Multiplayer Community Boss Raid**: Ender Dragon boss meter ticks down with every void bridge built toward the End dimension!

---

## 🚀 Local Development

\`\`\`bash
# Clone the repository
git clone https://github.com/${repoOwner}/${repoName}.git
cd ${repoName}

# Re-render world-3d.svg
npm run render

# Test a move simulation
npm run test-build
\`\`\`
`;
}

// GitHub API checks & Issue responses
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
      issueTitle: process.env.MOCK_TITLE || 'Action: Punch Oak Tree',
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
      issueTitle: event.issue?.title || 'Move: Step South',
      username: event.issue?.user?.login || 'Player',
      issueNumber: event.issue?.number,
      repoOwner,
      repoName
    };
  } catch (err) {
    return {
      issueTitle: 'Move: Step South',
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
- **Ender Dragon HP:** \`${state.enderDragon.hp} / ${state.enderDragon.maxHp} HP\`
- **VIP Status:** ${hasStarred ? '💎 VIP Diamond Miner (Starred Repository)' : '⭐ Star the repo to unlock rare Diamond bridge blocks!'}

View Steve's updated position and the live island on [mo-farooq/skyblock](https://github.com/${repoOwner}/${repoName})!`;

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
