# ⛏️ Minecraft 3D Voxel Realm

<p align="center">
  <img src="./world-3d.svg" alt="Minecraft 3D Isometric Voxel Island" width="100%" />
</p>

<div align="center">

## 🎮 Quick-Craft Hotbar: Click to Place on the Live Island!
*Click any item below to trigger a pre-filled GitHub Issue. GitHub Actions places your block on the 3D island in seconds!*

<p>
  <a href="https://github.com/mo-farooq/mo-farooq/issues/new?title=Craft%3A+%F0%9F%92%8E+Diamond+Block&body=%23%23+Minecraft+Crafting+Request%0A%0ASteve%2C+I+struck+diamonds%21+Placing+a+rare+Diamond+Block+on+the+island%21"><img src="https://img.shields.io/badge/💎_MINE_DIAMOND-00E5FF?style=for-the-badge&logoColor=white&labelColor=1B2838" height="42" alt="Mine Diamond"/></a>
  &nbsp;
  <a href="https://github.com/mo-farooq/mo-farooq/issues/new?title=Craft%3A+%F0%9F%8F%B0+Cobblestone+Fort&body=%23%23+Minecraft+Crafting+Request%0A%0AConstructing+a+fortified+cobblestone+outpost+to+defend+against+night+raids%21"><img src="https://img.shields.io/badge/🏰_BUILD_CASTLE-9E9E9E?style=for-the-badge&logoColor=white&labelColor=1B2838" height="42" alt="Build Castle"/></a>
  &nbsp;
  <a href="https://github.com/mo-farooq/mo-farooq/issues/new?title=Craft%3A+%F0%9F%8C%B2+Oak+Grove&body=%23%23+Minecraft+Crafting+Request%0A%0APlanting+an+oak+sapling+to+grow+cubic+foliage+and+harvest+wood+logs%21"><img src="https://img.shields.io/badge/🌲_PLANT_OAK_TREE-4CAF50?style=for-the-badge&logoColor=white&labelColor=1B2838" height="42" alt="Plant Oak Tree"/></a>
  &nbsp;
  <a href="https://github.com/mo-farooq/mo-farooq/issues/new?title=Craft%3A+%F0%9F%92%A5+Redstone+Machine&body=%23%23+Minecraft+Crafting+Request%0A%0AWiring+a+redstone+circuit+with+repeaters+and+pressure+plates%21"><img src="https://img.shields.io/badge/💥_REDSTONE_TNT-FF5252?style=for-the-badge&logoColor=white&labelColor=1B2838" height="42" alt="Redstone TNT"/></a>
</p>

<p>
  <a href="https://github.com/mo-farooq/mo-farooq/issues/new?title=Craft%3A+%F0%9F%A5%90+Village+Bakery&body=%23%23+Minecraft+Crafting+Request%0A%0ACrafting+a+village+bakery+with+wheat+crops+to+keep+hunger+bars+full%21"><img src="https://img.shields.io/badge/🍞_VILLAGE_BAKERY-FFA726?style=for-the-badge&logoColor=white&labelColor=1B2838" height="38" alt="Bake Bread"/></a>
  &nbsp;
  <a href="https://github.com/mo-farooq/mo-farooq/issues/new?title=Craft%3A+%E2%98%95+Nether+Tavern&body=%23%23+Minecraft+Crafting+Request%0A%0ASetting+up+a+brewing+stand+and+cozy+coffee+tavern+for+weary+miners%21"><img src="https://img.shields.io/badge/☕_NETHER_TAVERN-AB47BC?style=for-the-badge&logoColor=white&labelColor=1B2838" height="38" alt="Brew Potion"/></a>
  &nbsp;
  <a href="https://github.com/mo-farooq/mo-farooq/issues/new?title=Craft%3A+%F0%9F%8F%B9+Pillager+Watchtower&body=%23%23+Minecraft+Crafting+Request%0A%0AErecting+a+tall+wood+and+cobblestone+lookout+to+spot+the+Ender+Dragon%21"><img src="https://img.shields.io/badge/🏹_WATCHTOWER-78909C?style=for-the-badge&logoColor=white&labelColor=1B2838" height="38" alt="Erect Tower"/></a>
  &nbsp;
  <a href="https://github.com/mo-farooq/mo-farooq/stargazers"><img src="https://img.shields.io/badge/⭐_UNLOCK_VIP_DIAMOND-FFD700?style=for-the-badge&logoColor=black&labelColor=2B2B2B" height="38" alt="Unlock VIP"/></a>
</p>

</div>

> [!TIP]
> ⭐ **Stargazer Perk**: Starring this repository unlocks **VIP Diamond & Netherite** status, giving your block rare cyan mineral gleams and special mention in Steve's realm decree!

---

## ⚡ Game Loop & Technical Architecture

```mermaid
sequenceDiagram
    autonumber
    actor Visitor as 👤 Player
    participant GH as 🐙 GitHub Issues
    participant Action as ⚙️ GitHub Actions
    participant Engine as ⛏️ process-move.js
    participant SVG as 🎨 world-3d.svg

    Visitor->>GH: Clicks [ 💎 MINE DIAMOND ] & submits Issue
    GH->>Action: Triggers runner on issues: [opened]
    Action->>Engine: Executes Node.js voxel placement engine
    Engine->>GH: Checks if player starred the repository (GitHub API)
    Engine->>SVG: Calculates 3D voxel projection & updates island
    Engine->>GH: Posts achievement decree & closes issue
    Action->>GH: Commits updated world-3d.svg atomically to main branch
```

---

## 🛠️ Technical Highlights

- **Pure Voxel SVG Engine**: Renders 2:1 isometric Minecraft dirt, grass fringe, and mineral blocks purely through polygon geometry with zero raster dependencies.
- **Steve & Alex Skeletal Keyframes**: Continuous 60 FPS CSS animations featuring idle breathing, pickaxe swinging, floating experience orbs (`.xp-orb`), and cascading water blocks.
- **Authentic Minecraft GUI**: Ender Dragon raid meter, 10-heart health bar (`❤️❤️❤️❤️❤️`), hunger drumsticks (`🍗🍗🍗🍗🍗`), Level 42 badge, and server announcement ticker.
- **Serverless Event-Driven State**: GitHub Actions handles turn resolution and git-syncs state atomically within 15 seconds.

---

## 🚀 Local Development

```bash
# Clone the repository
git clone https://github.com/mo-farooq/mo-farooq.git
cd mo-farooq

# Run a mock simulation of crafting a diamond block
npm run test-build

# Re-render world-3d.svg
npm run render
```
