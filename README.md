# 🏝️ Minecraft Skyblock Survival

<p align="center">
  <img src="./world-3d.svg" alt="Minecraft Skyblock 3D Isometric Island" width="100%" />
</p>

<div align="center">

## 🎮 Contextual Command Deck: Make Your Move!
*Steve is currently at **Tile [3, 2]**. Click any valid button below to submit the next move via GitHub Issues!*

### 🚶 Cardinal Movement (Step to Adjacent Tile)
<p>
  <a href="https://github.com/mo-farooq/skyblock/issues/new?title=Move%3A+Step+North&body=Moving+Steve+North+on+the+Skyblock+Island"><img src="https://img.shields.io/badge/⬆️_STEP_NORTH-2E7D32?style=for-the-badge&logoColor=white&labelColor=1B2838" height="40" alt="Step North"/></a>
  &nbsp;
  <a href="https://github.com/mo-farooq/skyblock/issues/new?title=Move%3A+Step+South&body=Moving+Steve+South+on+the+Skyblock+Island"><img src="https://img.shields.io/badge/⬇️_STEP_SOUTH-2E7D32?style=for-the-badge&logoColor=white&labelColor=1B2838" height="40" alt="Step South"/></a>
  &nbsp;
  <a href="https://github.com/mo-farooq/skyblock/issues/new?title=Move%3A+Step+East&body=Moving+Steve+East+on+the+Skyblock+Island"><img src="https://img.shields.io/badge/➡️_STEP_EAST-2E7D32?style=for-the-badge&logoColor=white&labelColor=1B2838" height="40" alt="Step East"/></a>
  &nbsp;
  <a href="https://github.com/mo-farooq/skyblock/issues/new?title=Move%3A+Step+West&body=Moving+Steve+West+on+the+Skyblock+Island"><img src="https://img.shields.io/badge/⬅️_STEP_WEST-2E7D32?style=for-the-badge&logoColor=white&labelColor=1B2838" height="40" alt="Step West"/></a>
</p>

### 🛠️ Contextual Actions
<p>
  <a href="https://github.com/mo-farooq/skyblock/issues/new?title=Action%3A+Punch+Oak+Tree&body=Steve+is+harvesting+wood+from+the+solitary+oak+tree%21"><img src="https://img.shields.io/badge/🪓_PUNCH_OAK_TREE-FF8F00?style=for-the-badge&logoColor=white&labelColor=1B2838" height="38" alt="Punch Oak Tree"/></a>
  &nbsp;
  <a href="https://github.com/mo-farooq/skyblock/issues/new?title=Action%3A+Open+Starter+Chest&body=Opening+the+starter+chest+at+the+corner+of+the+island%21"><img src="https://img.shields.io/badge/📦_OPEN_CHEST-8D6E63?style=for-the-badge&logoColor=white&labelColor=1B2838" height="38" alt="Open Chest"/></a>
  &nbsp;
  <a href="https://github.com/mo-farooq/skyblock/issues/new?title=Action%3A+Bridge+Planks&body=Placing+an+oak+plank+bridge+block+into+the+void%21"><img src="https://img.shields.io/badge/🪵_BRIDGE_PLANKS-D84315?style=for-the-badge&logoColor=white&labelColor=1B2838" height="38" alt="Bridge Planks"/></a>
  &nbsp;
  <a href="https://github.com/mo-farooq/skyblock/stargazers"><img src="https://img.shields.io/badge/⭐_UNLOCK_VIP_DIAMOND-00E5FF?style=for-the-badge&logoColor=black&labelColor=1B2838" height="38" alt="Unlock VIP"/></a>
</p>

</div>

---

## ⚡ How It Works

- **Authentic Minecraft SkyBlock**: Faithfully modeled on Noobcrew's classic 2011 27-block L-island layout with 4 vertical dirt layers and a bedrock cornerstone.
- **Single Character**: Steve survives alone in the infinite sky with a solitary oak tree, a starter wooden chest (lava bucket & ice block), and an authentic 9-slot inventory hotbar.
- **Pure Turn-Based Logic**: Grid movement and contextual actions are evaluated on each GitHub Issue turn and committed back to the main branch via GitHub Actions in ~15 seconds.

---

## 🚀 Local Development

```bash
# Clone repository
git clone https://github.com/mo-farooq/skyblock.git
cd skyblock

# Re-render world-3d.svg
npm run render

# Test a mock turn
npm run test-build
```
