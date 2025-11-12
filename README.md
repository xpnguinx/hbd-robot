# HBD Robot
<img width="619" height="645" alt="screenshot" src="https://github.com/user-attachments/assets/92c2be9e-114b-40d3-bcd8-69e76d7e89df" />

A cyberpunk-themed, browser-based 3D hacking game where you play as a sentient robot navigating through a high-security corporate network on a mission to uncover the mysterious "Iceberg Protocol."


## Overview

HBD Robot is an immersive 3D role-playing game where you navigate through procedurally generated server rooms, interact with AI-powered NPCs, solve programming puzzles, and uncover the mysterious "Iceberg Protocol." The game combines elements of exploration, puzzle-solving, and hacking challenges in a retro-cyberpunk aesthetic with intuitive camera controls and smooth character movement.

## Features

- **Dynamic 3D Environment**: Explore procedurally generated network facilities rendered with THREE.js
- **Procedural Level Generation**: Each level is uniquely generated based on coordinates in the virtual world
- **AI-Powered NPCs**: Chat with NPCs powered by the Groq API, each with unique personalities and knowledge
- **Programming Challenges**: Solve various hacking-themed puzzles including:
  - Terminal command challenges
  - Regular expression pattern matching
  - Encryption/decryption puzzles
  - Logic problems
- **RPG Progression**: Increase skills (hacking, networking, cryptography) and collect access keys
- **Persistent Game State**: Your progress, conversations, and collected items are saved between sessions
- **Retro Cyberpunk Aesthetic**: Green terminal text, neon lighting, and hacker vibes throughout

## Technical Details

### Built With

- **PHP** (7.0+) for backend logic and server communication
- **THREE.js** for 3D rendering and environment
- **JavaScript** for game logic and user interaction
- **HTML5/CSS3** for UI elements and styling
- **Groq API** for NPC conversation generation

### Architecture

The game is structured as follows:

- **index.php**: Main entry point handling session management and AJAX requests
- **style.css**: Styling for all UI elements with cyberpunk theme
- **script.js**: Core game engine using THREE.js for rendering and game logic
- **level_generator.php**: Procedural level generation system
- **puzzle_generator.php**: Programming puzzle management
- **npc_handler.php**: NPC interaction system with Groq API integration

## Setup and Installation

### Prerequisites

- Web server with PHP 7.0+
- GROQ API key

### Installation

1. Clone the repository to your web server:
  ```
  git clone https://github.com/xpnguinx/hbd-robot.git
  ```

2. Environment variables: copy `.env.example` to `.env` and set your secrets (do NOT commit `.env`). At minimum set:
  - `GROQ_API_KEY` = your Groq API key used by `npc_handler.php`

3. Ensure your PHP server can read environment variables. The app auto-loads `.env` via `groq_config.php`.

4. Ensure Ollama (if used) is running locally if you keep that integration; otherwise, the game uses Groq for NPC chats.

5. Open your web browser and navigate to the game URL on your server

## How to Play

### Objectives

- Explore the facility and navigate through different server rooms
- Interact with NPCs to gather information about the Iceberg Protocol
- Solve puzzles to increase your skills and gain access to restricted areas
- Find and decode the Iceberg Protocol data

### Controls

- **WASD**: Move character (grid-stepped) - stays consistent across all camera views
- **Click**: Move to a square
- **Space**: Interact / confirm actions
- **E**: Open terminal (near computer)
- **ESC**: Close interfaces
- **V**: Cycle through camera views (Follow → Side → Top → Follow)
  - **Follow View** (default): Third-person view with camera positioned in front of character
  - **Side View**: Left-side profile view for detailed character inspection
  - **Top View**: Static overhead view with board rotation controls
- **Arrow Left/Right (Top View only)**: Rotate board 90° increments
- **R (Top View only)**: Reset board rotation to default
- **Scroll Wheel**: Adjust zoom distance in Follow and Side views
- **Top View UI**: On-screen panel (bottom-right) provides Zoom +/- and Rotate ⟲/⟳/R buttons

### Terminal Commands

The in-game terminal supports various commands:
- `help`: Display available commands
- `ls`: List files in current directory
- `cat [filename]`: Display file contents
- `whoami`: Display current user information
- `ping`: Test network connection
- `status`: Show system status
- `exit`: Close terminal

## Game Mechanics

### Procedural Level Generation

Each level is generated based on its coordinates in the virtual world. Different room templates (server rooms, offices, network hubs) are combined with randomized placement of NPCs, puzzles, and interactive objects.

### NPC Conversations

NPCs use the Groq API to generate contextual responses based on their personality profiles:
- **Sysadmin**: Technical, paranoid about security breaches
- **Junior Technician**: Nervous, accidentally shares sensitive information
- **Security AI**: Cold, precise, monitors for unauthorized access
- **Hacker**: Uses slang, helps player for their own agenda
- **Corporate Executive**: Arrogant, focused on the Iceberg Protocol

### Puzzle Types

- **Terminal Commands**: Execute correct Unix/Linux commands to access hidden data
- **Regex Patterns**: Create regular expressions that match specific patterns
- **Encryption Challenges**: Decode messages using various cryptographic techniques
- **Logic Puzzles**: Solve sequence and pattern problems

### Skills & Progression

Successfully completing puzzles rewards you with:
- **Skill Improvements**: Hacking, Networking, Cryptography
- **Access Keys**: Unlock restricted areas and systems
- **Story Progress**: Uncover more about the Iceberg Protocol

## Security and Deployment

- Secrets: Keep API keys in `.env` (loaded server-side). Never commit real keys.
- Add a `.gitignore` entry to exclude `.env` and any local assets/logs.
- The server reads `GROQ_API_KEY` from the environment and will log a warning if missing.
- Two camera modes reduce input lag by removing mouse-driven camera rotation/panning that previously caused performance issues.


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- HBD robot
