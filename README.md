# Pirates' Conquest

A real-time, browser-based multiplayer game inspired by the mechanics of agar.io but with a seafaring twist and pixel art aesthetics. Control your pirate ship, collect resources, and engage in cannon battles to become the most feared pirate on the high seas.

## Features

- **Pixel Art Style**: Beautiful retro-inspired pixel art for all game elements
- **Real-Time Multiplayer**: Challenge other players in intense naval battles
- **Ship Customization**: Choose from six different ship designs
- **Resource Collection**: Gather wood to increase HP and size, find chests to unlock more cannons
- **Combat System**: Fire cannons from both sides of your ship to damage opponents and obstacles
- **Dynamic World**: Resources and obstacles spawn throughout the game world

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/pirates-conquest.git
   cd pirates-conquest
   ```

2. Install dependencies
   ```bash
   npm install
   ```

### Running the Game

1. Start the development servers (both client and API)
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

### Development

The project is structured as a monorepo with two main components:

- **client**: React-based frontend with Canvas rendering (port 3000)
- **api**: Node.js backend with Socket.IO for real-time communication (port 3001)

#### Client Development

```bash
npm run dev:client
```

#### API Development

```bash
npm run dev:api
```

## Game Controls

- **W**: Move forward
- **A/D**: Rotate ship left/right
- **Spacebar**: Fire cannons

## Game Mechanics

1. **Movement**: Ships only move forward and rotate (no backward movement)
2. **HP System**: Collect wood to gain HP and grow in size
3. **Cannons**: Unlock additional cannons by reaching HP thresholds (6, 11, 16, etc.)
4. **Resources**:
   - Wood Wreckage: +1 HP and slight size increase
   - Golden Chests: Unlock additional cannons
5. **Combat**: Each hit from a cannonball deals 1 damage
6. **Death**: Players drop resources on death and respawn with base stats

## Tech Stack

- **Frontend**: React, TypeScript, HTML5 Canvas, Tailwind CSS
- **Backend**: Node.js, Express, Socket.IO
- **Build Tools**: Vite

## License

This project is licensed under the MIT License - see the LICENSE file for details. 