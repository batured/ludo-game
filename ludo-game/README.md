# 🎲 Multiplayer Ludo Game

A complete web-based multiplayer Ludo game with stunning 3D visual effects, database integration, and both local and online multiplayer support.

## Features

✅ **3D Visual Design**
- Realistic board with depth and shadows
- Animated 3D dice with rolling effects
- Glowing safe spots and particle effects
- Smooth token movements and transitions

✅ **Multiplayer Support**
- Local multiplayer (same device)
- Online multiplayer (multiple devices)
- Game creation and joining system
- Real-time game state synchronization

✅ **Database Integration**
- PostgreSQL database for game persistence
- User management and authentication
- Move history and game statistics
- Persistent game sessions

## Quick Start

### Option 1: Play Locally (Single HTML File)
1. Open `index.html` in your web browser
2. Enter your username
3. Choose "Local Multiplayer"
4. Select number of players (2-4)
5. Start playing!

### Option 2: Full Multiplayer Server
1. Install Node.js (version 18 or higher)
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up PostgreSQL database (optional for local play)
4. Start the server:
   ```bash
   node server/gameServer.js
   ```
5. Open http://localhost:5000 in your browser
6. Choose "Online Multiplayer" to create or join games

## File Structure

```
ludo-game/
├── index.html              # Main game file (standalone)
├── server/
│   ├── gameServer.js       # HTTP server for multiplayer
│   ├── gameManager.js      # Game logic and state management
│   ├── db.ts              # Database connection
│   └── storage.ts         # Data storage interface
├── shared/
│   └── schema.ts          # Database schema definitions
├── package.json           # Dependencies
├── drizzle.config.json    # Database configuration
└── README.md             # This file
```

## Game Rules

Ludo is a classic board game for 2-4 players:

1. **Objective**: Move all 4 tokens from home to the finish area
2. **Movement**: Roll dice to move tokens around the board
3. **Starting**: Roll a 6 to move tokens out of home
4. **Capturing**: Land on opponent's token to send it back home
5. **Safe Spots**: Star-marked spots protect tokens from capture
6. **Winning**: First player to get all tokens to finish wins

## Controls

- **Mouse/Touch**: Click dice to roll
- **Token Selection**: Click tokens to move them
- **Mobile Friendly**: Optimized for touch devices

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Development

To modify the game:

1. **Frontend**: Edit `index.html` for game interface and logic
2. **Backend**: Modify files in `server/` for multiplayer features
3. **Database**: Update `shared/schema.ts` for data structure changes

## Database Setup (Optional)

For full multiplayer functionality:

1. Install PostgreSQL
2. Create a database
3. Set DATABASE_URL environment variable
4. Run database migrations:
   ```bash
   npm run db:push
   ```

## Deployment

- **Static hosting**: Upload `index.html` to any web server
- **Full deployment**: Deploy entire project to platforms like Replit, Heroku, or Vercel

## Credits

Created with modern web technologies:
- HTML5 Canvas for game rendering
- CSS3 for 3D animations and effects
- JavaScript for game logic
- Node.js for server functionality
- PostgreSQL for data persistence

## License

Open source - feel free to modify and share!

---

Enjoy playing Ludo! 🎮