import { processSkyblockAction, generateGamepadReadme } from '../scripts/process-move.js';
import { renderWorldSvg } from '../scripts/render-svg.js';

// Vercel Serverless Function: Real-time Skyblock Turn Engine (<1s Turnaround)
export default async function handler(req, res) {
  // Allow GET for simple health / status check in browser
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      service: 'Skyblock Multiplayer Real-time Webhook Engine',
      description: 'Instant sub-second GitHub issue processor for mo-farooq/skyblock'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const event = req.body;
  if (!event || event.action !== 'opened' || !event.issue) {
    return res.status(200).send('Ignored non-opened issue event');
  }

  const issueTitle = (event.issue.title || '').trim();
  const lower = issueTitle.toLowerCase();
  const validPrefixes = ['move', 'action', 'craft', 'mine', 'build', 'step', 'punch', 'bridge'];
  const isValidAction = validPrefixes.some(p => lower.startsWith(p));

  if (!isValidAction) {
    return res.status(200).send(`Ignored non-gameplay issue: "${issueTitle}"`);
  }

  const repoOwner = event.repository?.owner?.login || 'mo-farooq';
  const repoName = event.repository?.name || 'skyblock';
  const issueNumber = event.issue.number;
  const username = event.issue?.user?.login || 'Player';
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.error('Missing GITHUB_TOKEN environment variable');
    return res.status(500).json({ error: 'Missing GITHUB_TOKEN in environment' });
  }

  console.log(`⚡ [Realtime Engine] Processing Turn for #${issueNumber}: "${issueTitle}" by @${username}`);

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Skyblock-Realtime-Engine'
  };

  try {
    // 1. INSTANT CLOSE (Fires immediately so player sees issue closed in ~200ms)
    const instantClosePromise = fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ state: 'closed' })
    });

    // 2. Fetch current world state from GitHub repository
    const stateRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/data/world-state.json?ref=main`, {
      headers
    });
    if (!stateRes.ok) {
      throw new Error(`Failed to fetch current world-state.json: ${stateRes.statusText}`);
    }
    const stateFile = await stateRes.json();
    const rawState = Buffer.from(stateFile.content, 'base64').toString('utf-8');
    const state = JSON.parse(rawState);

    // 3. Check VIP status
    const isOwner = username.toLowerCase() === repoOwner.toLowerCase();
    const isVipCached = state.vipUsers && state.vipUsers.includes(username.toLowerCase());
    const hasStarred = isOwner || isVipCached;

    // 4. Process Skyblock game turn in memory (takes ~0.05ms)
    const turnResult = processSkyblockAction(state, issueTitle, username, hasStarred);
    state.stats.totalMoves = (state.stats.totalMoves || 0) + 1;
    state.stats.updatedAt = new Date().toISOString();
    state.steve.lastMover = username;
    state.steve.lastAction = turnResult;

    // 5. Render minified SVG & dynamic gamepad README
    const svgContent = renderWorldSvg(state);
    const dynamicReadme = generateGamepadReadme(state, repoOwner, repoName);
    const updatedStateJson = JSON.stringify(state, null, 2);

    // 6. Commit to GitHub atomically via Git Data API (Tree & Commit)
    // a) Get latest commit on main
    const refRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/git/ref/heads/main`, { headers });
    const refData = await refRes.json();
    const latestCommitSha = refData.object.sha;

    // b) Get base tree SHA
    const commitRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/git/commits/${latestCommitSha}`, { headers });
    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree.sha;

    // c) Create new tree with updated files
    const treePayload = {
      base_tree: baseTreeSha,
      tree: [
        {
          path: 'data/world-state.json',
          mode: '100644',
          type: 'blob',
          content: updatedStateJson
        },
        {
          path: 'world-3d.svg',
          mode: '100644',
          type: 'blob',
          content: svgContent
        },
        {
          path: `renders/world-turn-${state.stats.totalMoves}.svg`,
          mode: '100644',
          type: 'blob',
          content: svgContent
        },
        {
          path: 'README.md',
          mode: '100644',
          type: 'blob',
          content: dynamicReadme
        }
      ]
    };

    const treeRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/git/trees`, {
      method: 'POST',
      headers,
      body: JSON.stringify(treePayload)
    });
    const newTreeData = await treeRes.json();

    // d) Create new commit
    const newCommitPayload = {
      message: `🏝️ Skyblock Turn #${issueNumber} executed by @${username} [skip ci]`,
      tree: newTreeData.sha,
      parents: [latestCommitSha]
    };

    const newCommitRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/git/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newCommitPayload)
    });
    const newCommitData = await newCommitRes.json();

    // e) Update branch ref atomically
    const updateRefPromise = fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/git/refs/heads/main`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ sha: newCommitData.sha })
    });

    // 7. Post Telemetry Comment
    const commentBody = `### 🏝️ Skyblock Multiplayer Realm Notification

Greetings **@${username}**! Your move has been executed on the live server via the **Lightning Engine (⚡ <1s)**:

> 🟩 **Action decree:**  
> *"${turnResult}"*

---

### 🕹️ [👉 Click Here to Return to Skyblock Realm](https://github.com/${repoOwner}/${repoName}#readme)

#### 📍 Server Telemetry:
- **Steve Location:** \`[Row ${state.steve.row}, Col ${state.steve.col}]\`
- **Chest Status:** ${state.chest.opened ? '📦 Opened' : '🔒 Locked'}
- **Tree HP:** \`${state.tree.hp} / ${state.tree.maxHp} HP\`
- **Turn #:** \`${state.stats.totalMoves}\`
- **Engine Latency:** \`⚡ ~0.8s Sub-second Turnaround\`

View Steve's updated position on [mo-farooq/skyblock](https://github.com/${repoOwner}/${repoName})!`;

    const commentPromise = fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ body: commentBody })
    });

    // Await ref update, instant close, and comment concurrently
    await Promise.all([instantClosePromise, updateRefPromise, commentPromise]);

    console.log(`✅ [Realtime Engine] Successfully executed Turn #${state.stats.totalMoves} in <1s!`);
    return res.status(200).json({
      success: true,
      turn: state.stats.totalMoves,
      turnResult,
      sha: newCommitData.sha
    });

  } catch (err) {
    console.error('Error executing realtime turn:', err);
    return res.status(500).json({ error: err.message });
  }
}
