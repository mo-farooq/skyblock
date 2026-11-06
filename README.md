# 🏝️ Minecraft Skyblock Survival

<p align="center">
  <img src="./world-3d.svg" alt="Minecraft Skyblock 3D Isometric Island" width="100%" />
</p>

<div align="center">

## 🎮 Dynamic Gamepad Controller: Make Your Move!
*Steve is at **Tile [1, 2]**. Buttons appear and disappear dynamically based on available moves!*

<table>
  <tr>
    <th align="center" colspan="3">🕹️ D-PAD MOVEMENT</th>
    <th width="40"></th>
    <th align="center">⚡ AVAILABLE ACTIONS</th>
  </tr>
  <tr>
    <td></td>
    <td align="center">
      <a href="https://github.com/mo-farooq/skyblock/issues/new?title=Move%3A+Step+Forward&body=Moving+Steve+Forward"><img src="https://img.shields.io/badge/⬆️_FORWARD-2E7D32?style=for-the-badge&logoColor=white&labelColor=1B2838" height="42" alt="Forward"/></a>
    </td>
    <td></td>
    <td></td>
    <td align="center" rowspan="3">
      <a href="https://github.com/mo-farooq/skyblock/issues/new?title=Action%3A+Punch+Oak+Tree&body=Punching+the+solitary+oak+tree+for+wood%21"><img src="https://img.shields.io/badge/🪓_[A]_PUNCH_TREE-FF8F00?style=for-the-badge&logoColor=white&labelColor=1B2838" height="42" alt="Punch Tree"/></a><br><br><a href="https://github.com/mo-farooq/skyblock/stargazers"><img src="https://img.shields.io/badge/⭐_[Y]_VIP_STAR-00E5FF?style=for-the-badge&logoColor=black&labelColor=1B2838" height="42" alt="VIP Star"/></a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://github.com/mo-farooq/skyblock/issues/new?title=Move%3A+Step+Left&body=Moving+Steve+Left"><img src="https://img.shields.io/badge/⬅️_LEFT-2E7D32?style=for-the-badge&logoColor=white&labelColor=1B2838" height="42" alt="Left"/></a>
    </td>
    <td align="center">
      <img src="https://img.shields.io/badge/🕹️_STEVE-000000?style=for-the-badge&logoColor=white" height="38"/>
    </td>
    <td align="center">
      <em>(Void)</em>
    </td>
    <td></td>
  </tr>
  <tr>
    <td></td>
    <td align="center">
      <a href="https://github.com/mo-farooq/skyblock/issues/new?title=Move%3A+Step+Backward&body=Moving+Steve+Backward"><img src="https://img.shields.io/badge/⬇️_BACKWARD-2E7D32?style=for-the-badge&logoColor=white&labelColor=1B2838" height="42" alt="Backward"/></a>
    </td>
    <td></td>
    <td></td>
  </tr>
</table>

</div>

---

## ⚡ How It Works

- **Authentic Minecraft SkyBlock**: Faithfully modeled on Noobcrew's classic 2011 27-block L-island layout with 4 vertical dirt layers and a bedrock cornerstone.
- **Empty-Handed Start**: Steve spawns completely empty-handed with 0 inventory items. Players must navigate to the solitary oak tree to punch wood and reach the starter chest for supplies!
- **Dynamic Appearing & Disappearing Gamepad**:
  - **FORWARD, BACKWARD, LEFT, and RIGHT** only appear if the target tile exists on the island. If facing the void, the step button disappears and displays *(Void)*.
  - **[A] PUNCH TREE** appears **only** when Steve walks beside the tree at [0, 1].
  - **[B] OPEN CHEST** appears **only** when Steve walks beside the starter chest at [5, 5].
  - **[X] BRIDGE VOID** appears **only** once wood planks have been gathered into inventory.

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
