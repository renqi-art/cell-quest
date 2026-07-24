# Cell Quest (Cell Expedition)

**Cell Quest** is a side-scrolling action game (Metroidvania type) developed based on HTML5 Canvas and JavaScript, set in a fantastical microscopic world of the human body. Players will take on the roles of different blood cells, resist pathogen invasions, and complete the cell expedition.

## Core Features

*   **Three Protagonists**: White Blood Cell (WBC), Red Blood Cell (RBC), Platelet (PLT). Each character possesses unique skill trees, equipment, and combat styles.
*   **ATP Energy System**: An innovative energy management mechanism where energy serves as both currency and a life-sustaining resource. Low energy states will incur speed penalties, forcing players to find a balance between combat and resource management.
*   **Rich Levels**: Includes 6+ main stages covering scenes such as blood vessels, lungs, lymph nodes, etc. Built-in **Level Editor** supports custom level design.
*   **BOSS Challenges**: Face gigantic pathogen BOSSes and experience multi-stage combat mechanics.
*   **Complete Systems**: Skill tree system, equipment system, inventory system, achievements, and knowledge card system.

## Game Characters

1.  **White Blood Cell (WBC - White Blood Cell)**
    *   **Role**: Melee warrior, the team's core defensive force.
    *   **Abilities**: Possesses active skills such as Immune Rejection (Elastase Lance), Bactericidal Dash, etc.
    *   **Mechanic**: High mobility, skilled at entering the battlefield to deal cutting damage.

2.  **Red Blood Cell (RBC - Red Blood Cell)**
    *   **Role**: Agile ranger, responsible for transport and support.
    *   **Abilities**: Oxidative Burst, Phagocytic Bite.
    *   **Mechanic**: Excels at leveraging advantages within oxygen fields, possesses healing and sustainability capabilities.

3.  **Platelet (PLT - Platelet)**
    *   **Role**: Strategic supporter.
    *   **Abilities**: Bridge ability, can temporarily construct platforms to cross obstacles.
    *   **Mechanic**: Consumes energy to generate a fibrin bridge, creating terrain advantages for teammates.

## Quick Start

### Environment Preparation

This project relies on the Node.js runtime environment to start the local development server (to load resources correctly, it is recommended to run via a local server rather than opening files directly).

### Installation and Running

1.  Clone this repository to your local machine:
    ```bash
    git clone https://gitee.com/renqi-su/cell-quest.git
    cd cell-quest
    ```

2.  Start the server:
    ```bash
    node server.js
    ```

3.  Access via browser:
    ```
    http://localhost:8080
    ```

### Control Instructions

*   **Move**: Arrow Keys `←` `→` or `A` `D`
*   **Jump**: `Space` or `↑` `W`
*   **Crouch**: `↓` `S`
*   **Normal Attack/Skill 1**: `Z` / `J`
*   **Special Skill 2**: `X` / `K`
*   **Auxiliary Skill 3**: `C` / `L`
*   **Ultimate Skill 4**: `V` / `;`
*   **Interact**: Press `E` or `Enter` when near mechanisms or NPCs
*   **Pause**: `Esc`

*(Note: Specific key mappings can be viewed or customized in `js/game.js`)*

## Directory Structure

*   `index.html`: Game main entry point.
*   `editor.html`: Level editor entry point.
*   `css/style.css`: Game styles and UI interface.
*   `js/`:
    *   `game.js`: Game main logic, loop, and scene management.
    *   `entities.js`: Entity class definitions (Players, Enemies, Bosses).
    *   `config.js`: Game numerical configuration (Physics engine, skill parameters, drop tables).
    *   `levels/`: Official level data definitions.
*   `images/`: Game asset images and sprites.
*   `audio/`: Background music and sound effects.

## Development and Expansion

### Level Design

The game includes a powerful built-in level editor. Accessed via the main menu or through `editor.html`, you can:
*   Use Tiles to draw terrain.
*   Set enemy distributions and traps.
*   Place items and exits.
*   Export/Import JSON level codes for sharing.

### Modding

Game data (such as equipment attributes, skill values) is mainly managed centrally in `js/config.js` and `js/levels.js`. Developers can quickly adjust game balance or add new content by modifying these files.

## Tech Stack

*   **Rendering Engine**: Native HTML5 Canvas API
*   **Logic Language**: JavaScript (ES6+)
*   **Backend Service**: Node.js (for local resource loading)

## License

This project follows the open-source MIT License.

---

*Cell Quest (Cell Expedition) - Explore the microscopic world, safeguard human health.*