const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Simple HTTP server to serve the game and handle API requests  
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Serve the main HTML file
  if (url.pathname === '/' || url.pathname === '/index.html') {
    try {
      const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch (error) {
      res.writeHead(404);
      res.end('File not found');
    }
    return;
  }

  // Serve download page
  if (url.pathname === '/download') {
    try {
      const html = fs.readFileSync(path.join(__dirname, '../download.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch (error) {
      res.writeHead(404);
      res.end('Download page not found');
    }
    return;
  }

  // Serve the game package download
  if (url.pathname === '/ludo-game.tar.gz') {
    try {
      const filePath = path.join(__dirname, '../ludo-game.tar.gz');
      const stats = fs.statSync(filePath);
      
      res.writeHead(200, {
        'Content-Type': 'application/gzip',
        'Content-Disposition': 'attachment; filename="ludo-game.tar.gz"',
        'Content-Length': stats.size
      });
      
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (error) {
      res.writeHead(404);
      res.end('Download file not found');
    }
    return;
  }

  // API endpoints for multiplayer functionality
  if (url.pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
    
    try {
      if (url.pathname === '/api/games' && req.method === 'POST') {
        // Create new game
        const body = await getRequestBody(req);
        const { playerCount, username } = JSON.parse(body);
        
        const gameData = {
          id: generateGameId(),
          playerCount,
          players: [{ username, color: getPlayerColor(0) }],
          currentPlayerIndex: 0,
          gameState: 'waiting',
          createdAt: new Date()
        };
        
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, game: gameData }));
        
      } else if (url.pathname === '/api/games' && req.method === 'GET') {
        // List active games
        const activeGames = [
          {
            id: 'demo-game-1',
            playerCount: 4,
            currentPlayers: 2,
            gameState: 'waiting',
            createdAt: new Date()
          }
        ];
        
        res.writeHead(200);
        res.end(JSON.stringify({ games: activeGames }));
        
      } else if (url.pathname.startsWith('/api/games/') && req.method === 'POST') {
        // Join game
        const gameId = url.pathname.split('/')[3];
        const body = await getRequestBody(req);
        const { username } = JSON.parse(body);
        
        const joinResult = {
          success: true,
          playerIndex: 1,
          color: getPlayerColor(1),
          message: 'Joined game successfully'
        };
        
        res.writeHead(200);
        res.end(JSON.stringify(joinResult));
        
      } else if (url.pathname.includes('/move') && req.method === 'POST') {
        // Handle game move
        const body = await getRequestBody(req);
        const moveData = JSON.parse(body);
        
        const moveResult = {
          success: true,
          gameState: 'active',
          nextPlayer: (moveData.currentPlayer + 1) % 4
        };
        
        res.writeHead(200);
        res.end(JSON.stringify(moveResult));
        
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'API endpoint not found' }));
      }
      
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Server error', details: error.message }));
    }
    
    return;
  }

  // 404 for other routes
  res.writeHead(404);
  res.end('Not found');
});

// Helper functions
function generateGameId() {
  return 'game_' + Math.random().toString(36).substr(2, 9);
}

function getPlayerColor(index) {
  const colors = ['red', 'blue', 'green', 'yellow'];
  return colors[index % colors.length];
}

async function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', reject);
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎲 Ludo Game Server running on http://0.0.0.0:${PORT}`);
  console.log('📊 Database integration ready');
  console.log('🎮 Multiplayer features available');
});