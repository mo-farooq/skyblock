import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderWorldSvg } from './render-svg.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const STATE_FILE = path.join(ROOT_DIR, 'data', 'world-state.json');
const SVG_OUTPUT = path.join(ROOT_DIR, 'world-3d.svg');

// Main execution flow
async function main() {
  console.log('🏛️  [Antigravity Town] Starting move processing...');

  // 1. Parse Event Context
  const context = await getEventContext();
  console.log(`👤 User: @${context.username}`);
  console.log(`📋 Issue #${context.issueNumber}: "${context.issueTitle}"`);

  // 2. Check Star Status
  const hasStarred = await checkUserStar(context.repoOwner, context.repoName, context.username);
  console.log(`⭐ Star Status: ${hasStarred ? 'Verified Stargazer!' : 'Citizen (Not yet starred)'}`);

  // 3. Consult AI Mayor (Gemini API)
  const mayorDecision = await consultGeminiMayor(context, hasStarred);
  console.log(`🤖 Mayor Decision:`, mayorDecision);

  // 4. Update Grid State
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  const placement = assignBuildingPlot(state, context.username, mayorDecision, hasStarred);
  console.log(`📍 Assigned Plot: Row ${placement.row}, Col ${placement.col} (${placement.name})`);

  // Update Mayor Metadata
  state.mayor = {
    name: 'Mayor Pixel-8 (AI)',
    mood: mayorDecision.mayorMood || 'Visionary',
    announcement: mayorDecision.proclamation
  };
  state.stats = {
    totalBuildings: state.cells.filter(c => c.type && c.type !== 'empty').length,
    lastBuilder: context.username,
    lastAction: `Built ${mayorDecision.buildingName}`,
    updatedAt: new Date().toISOString()
  };

  // Save updated state
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');

  // 5. Re-render world-3d.svg
  const svgContent = renderWorldSvg(state);
  fs.writeFileSync(SVG_OUTPUT, svgContent, 'utf-8');
  console.log(`🎨 Rendered updated world-3d.svg successfully!`);

  // 6. Comment on GitHub Issue & Close it (if running in GitHub Actions)
  if (process.env.GITHUB_TOKEN && context.issueNumber && context.repoOwner && context.repoName) {
    await replyAndCloseIssue(context, mayorDecision, placement, hasStarred);
  } else {
    console.log(`ℹ️ Local / Mock run completed. (No GitHub issue to update)`);
  }
}

// Extract event payload from GitHub Actions environment or fallback to mock
async function getEventContext() {
  const isMock = process.argv.includes('--mock') || !process.env.GITHUB_EVENT_PATH;

  if (isMock) {
    return {
      issueTitle: process.env.MOCK_TITLE || 'Build: 🥐 Galactic Croissant Bakery',
      issueBody: process.env.MOCK_BODY || 'I would like to open a cozy bakery for all spacefarers!',
      username: process.env.MOCK_USER || 'AntigravityPioneer',
      issueNumber: 42,
      repoOwner: 'mo-farooq',
      repoName: 'mo-farooq'
    };
  }

  try {
    const rawPayload = fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf-8');
    const event = JSON.parse(rawPayload);
    const repoFullName = (event.repository && event.repository.full_name) || process.env.GITHUB_REPOSITORY || 'owner/repo';
    const [repoOwner, repoName] = repoFullName.split('/');

    return {
      issueTitle: event.issue?.title || 'Build a surprise project',
      issueBody: event.issue?.body || '',
      username: event.issue?.user?.login || event.sender?.login || 'CuriousBuilder',
      issueNumber: event.issue?.number,
      repoOwner,
      repoName
    };
  } catch (err) {
    console.warn(`⚠️ Failed reading GITHUB_EVENT_PATH, defaulting to mock:`, err.message);
    return {
      issueTitle: 'Build: ☕ Neon Espresso Lab',
      issueBody: 'Coffee for the code warriors.',
      username: 'CodeTraveler',
      issueNumber: 99,
      repoOwner: 'mo-farooq',
      repoName: 'mo-farooq'
    };
  }
}

// Check if user has starred the repository via GitHub API
async function checkUserStar(owner, repo, username) {
  if (!owner || !repo || !username) return false;
  if (!process.env.GITHUB_TOKEN) return false;

  try {
    const url = `https://api.github.com/users/${username}/starred/${owner}/${repo}`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'User-Agent': 'Antigravity-Town-Mayor'
      }
    });

    // 204 No Content means starred
    if (res.status === 204) return true;
    if (res.status === 404) return false;

    // Alternative: check stargazers list
    const stargazersUrl = `https://api.github.com/repos/${owner}/${repo}/stargazers?per_page=100`;
    const sgRes = await fetch(stargazersUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'User-Agent': 'Antigravity-Town-Mayor'
      }
    });
    if (sgRes.ok) {
      const stargazers = await sgRes.json();
      return Array.isArray(stargazers) && stargazers.some(s => s.login.toLowerCase() === username.toLowerCase());
    }
  } catch (err) {
    console.warn(`Could not verify star status: ${err.message}`);
  }

  return false;
}

// Ask Gemini AI Mayor to evaluate the issue and craft a proclamation
async function consultGeminiMayor(context, hasStarred) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log(`ℹ️ GEMINI_API_KEY not found. Using algorithmic AI Mayor synthesis.`);
    return fallbackMayorDecision(context.issueTitle, context.username, hasStarred);
  }

  const prompt = `You are Mayor Pixel-8, the witty, eccentric, high-energy AI Mayor of Antigravity Town (a virtual 3D isometric GitHub community).
A citizen (@${context.username}) submitted an issue to build something.
Issue Title: "${context.issueTitle}"
Issue Body: "${context.issueBody}"
Citizen has starred repo: ${hasStarred}

Your job:
1. Identify or invent the best building type from this list: ["bakery", "cafe", "arcade", "datacenter", "park", "spaceport", "tower", "observatory", "house"]
2. Give it a creative, witty building name.
3. Pick a single appropriate emoji.
4. Write EXACTLY ONE hilarious, punchy sentence as Mayor Pixel-8 celebrating this new construction. ${hasStarred ? 'Acknowledge their VIP Stargazer nobility!' : 'Lovingly hint that a star on the repo earns them gold-plated bricks!'}
5. Pick a 1-word Mayor mood (e.g., "Ecstatic", "Caffeinated", "Hyped", "Cosmic").

Return ONLY a valid JSON object with keys:
{
  "buildingType": "bakery|cafe|arcade|datacenter|park|spaceport|tower|observatory|house",
  "buildingName": "String",
  "emoji": "String",
  "proclamation": "String (1 sentence)",
  "mayorMood": "String"
}`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.8
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidateText) {
      const parsed = JSON.parse(candidateText);
      return {
        buildingType: sanitizeType(parsed.buildingType),
        buildingName: parsed.buildingName || 'Antigravity Landmark',
        emoji: parsed.emoji || '🏗️',
        proclamation: parsed.proclamation || 'Another glorious monument rises in Antigravity Town!',
        mayorMood: parsed.mayorMood || 'Ecstatic'
      };
    }
  } catch (err) {
    console.warn(`⚠️ Gemini API call failed: ${err.message}. Falling back to Mayor heuristics.`);
  }

  return fallbackMayorDecision(context.issueTitle, context.username, hasStarred);
}

// Sanitize building type to known 3D isometric models
function sanitizeType(type) {
  const valid = ['bakery', 'cafe', 'arcade', 'datacenter', 'park', 'spaceport', 'tower', 'observatory', 'house'];
  if (!type) return 'house';
  const clean = type.toLowerCase().trim();
  return valid.includes(clean) ? clean : 'house';
}

// Fallback algorithm for Mayor logic when offline or API key is unset
function fallbackMayorDecision(title, username, hasStarred) {
  const lower = title.toLowerCase();

  let buildingType = 'house';
  let buildingName = 'Cosmic Haven';
  let emoji = '🏠';

  if (lower.includes('bakery') || lower.includes('croissant') || lower.includes('bread') || lower.includes('cake')) {
    buildingType = 'bakery';
    buildingName = 'Quantum Croissant Bakery';
    emoji = '🥐';
  } else if (lower.includes('cafe') || lower.includes('coffee') || lower.includes('tea') || lower.includes('espresso')) {
    buildingType = 'cafe';
    buildingName = 'Cyber Roast Coffee Lab';
    emoji = '☕';
  } else if (lower.includes('arcade') || lower.includes('game') || lower.includes('retro') || lower.includes('pixel')) {
    buildingType = 'arcade';
    buildingName = 'Synthwave 8-Bit Arcade';
    emoji = '🎮';
  } else if (lower.includes('datacenter') || lower.includes('server') || lower.includes('cloud') || lower.includes('ai')) {
    buildingType = 'datacenter';
    buildingName = 'Gemini Neural Datacenter';
    emoji = '🤖';
  } else if (lower.includes('park') || lower.includes('tree') || lower.includes('garden') || lower.includes('zen')) {
    buildingType = 'park';
    buildingName = 'Emerald Antigravity Sanctuary';
    emoji = '🌲';
  } else if (lower.includes('rocket') || lower.includes('space') || lower.includes('launch') || lower.includes('orbit')) {
    buildingType = 'spaceport';
    buildingName = 'Apollo-X Star Launchpad';
    emoji = '🚀';
  } else if (lower.includes('tower') || lower.includes('skyscraper') || lower.includes('hq') || lower.includes('office')) {
    buildingType = 'tower';
    buildingName = 'Skyline Innovation Tower';
    emoji = '🏢';
  } else if (lower.includes('telescope') || lower.includes('star') || lower.includes('observatory') || lower.includes('sky')) {
    buildingType = 'observatory';
    buildingName = 'Deep Horizon Observatory';
    emoji = '🔭';
  }

  const starSnippet = hasStarred
    ? `As an esteemed VIP Stargazer, your cornerstone is cast in pure gold!`
    : `Mayor Pixel-8 hints that starring the repository instantly unlocks royal gold permits!`;

  const proclamation = `By municipal decree, @${username}'s "${buildingName}" has been officially consecrated into our isometric skyline! ${starSnippet}`;

  return {
    buildingType,
    buildingName,
    emoji,
    proclamation,
    mayorMood: hasStarred ? 'Starstruck' : 'Resourceful'
  };
}

// Assign an isometric plot on the 6x6 grid
function assignBuildingPlot(state, username, decision, hasStarred) {
  const cells = state.cells;

  // Check if user already owns a plot to upgrade it
  const existingPlot = cells.find(c => c.builder && c.builder.toLowerCase() === username.toLowerCase());
  if (existingPlot) {
    existingPlot.level = (existingPlot.level || 1) + 1;
    existingPlot.type = decision.buildingType;
    existingPlot.name = decision.buildingName;
    existingPlot.emoji = decision.emoji;
    existingPlot.upgradedAt = new Date().toISOString();
    return existingPlot;
  }

  // Find first vacant plot
  const emptyPlot = cells.find(c => !c.type || c.type === 'empty');

  if (emptyPlot) {
    emptyPlot.type = decision.buildingType;
    emptyPlot.name = decision.buildingName;
    emptyPlot.builder = username;
    emptyPlot.emoji = decision.emoji;
    emptyPlot.level = hasStarred ? 2 : 1;
    emptyPlot.builtAt = new Date().toISOString();
    return emptyPlot;
  }

  // If 100% full, upgrade oldest non-townhall plot
  const candidate = cells.find(c => c.type !== 'townhall') || cells[0];
  candidate.level = (candidate.level || 1) + 1;
  candidate.name = `${decision.buildingName} Tower`;
  candidate.builder = username;
  candidate.type = decision.buildingType;
  candidate.emoji = decision.emoji;
  return candidate;
}

// Post response comment on GitHub Issue and close it
async function replyAndCloseIssue(context, mayorDecision, placement, hasStarred) {
  const { repoOwner, repoName, issueNumber, username } = context;
  const token = process.env.GITHUB_TOKEN;

  const commentBody = `### 🏛️ Municipal Bureau of Antigravity Town

Greetings **@${username}**! 

The AI Town Hall has ratified your construction permit. Here is the official decree:

> 🤖 **Mayor Pixel-8 Proclaims:**  
> *"${mayorDecision.proclamation}"*

---

#### 🗺️ Construction Coordinates:
- **Plot:** \`[Row ${placement.row}, Col ${placement.col}]\`
- **Building:** ${placement.emoji} **${placement.name}** (\`${placement.type}\`)
- **VIP Golden Permit:** ${hasStarred ? '✅ Verified Stargazer' : '⭐ Star the repo to upgrade to Golden Foundation!'}

Your building has now been rendered live into the **3D Isometric Community World**! Check out the updated skyline on the [Repository Profile](https://github.com/${repoOwner}/${repoName})!

---
*Generated autonomously by Google Antigravity & Gemini AI.*`;

  try {
    // 1. Post Comment
    await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Antigravity-Town-Mayor'
      },
      body: JSON.stringify({ body: commentBody })
    });

    // 2. Add Label and Close Issue
    await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}`, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Antigravity-Town-Mayor'
      },
      body: JSON.stringify({
        state: 'closed',
        labels: ['building-constructed', hasStarred ? 'vip-builder' : 'community-builder']
      })
    });

    console.log(`✅ Successfully replied to and closed Issue #${issueNumber}!`);
  } catch (err) {
    console.error(`❌ Failed to comment/close GitHub Issue:`, err.message);
  }
}

main().catch(err => {
  console.error('Fatal error in process-move:', err);
  process.exit(1);
});
