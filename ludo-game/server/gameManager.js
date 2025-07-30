// Game state management with database integration
class GameManager {
  constructor() {
    this.activeGames = new Map();
    this.players = new Map();
  }

  // Create a new multiplayer game
  async createGame(playerCount, creatorUsername) {
    const gameId = this.generateGameId();
    const gameData = {
      id: gameId,
      playerCount,
      players: [],
      currentPlayerIndex: 0,
      gameState: 'waiting',
      board: this.initializeBoard(),
      tokens: this.initializeTokens(playerCount),
      moveHistory: [],
      createdAt: new Date(),
      lastActivity: new Date()
    };

    // Add creator as first player
    const creator = {
      id: this.generatePlayerId(),
      username: creatorUsername,
      playerIndex: 0,
      color: this.getPlayerColor(0),
      tokens: gameData.tokens.filter(token => token.playerId === 0),
      joinedAt: new Date()
    };

    gameData.players.push(creator);
    this.activeGames.set(gameId, gameData);
    this.players.set(creator.id, { ...creator, gameId });

    return { gameId, playerId: creator.id, gameData };
  }

  // Join an existing game
  async joinGame(gameId, username) {
    const game = this.activeGames.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.players.length >= game.playerCount) {
      throw new Error('Game is full');
    }

    if (game.gameState !== 'waiting') {
      throw new Error('Game already started');
    }

    const playerIndex = game.players.length;
    const player = {
      id: this.generatePlayerId(),
      username,
      playerIndex,
      color: this.getPlayerColor(playerIndex),
      tokens: game.tokens.filter(token => token.playerId === playerIndex),
      joinedAt: new Date()
    };

    game.players.push(player);
    this.players.set(player.id, { ...player, gameId });

    // Start game if full
    if (game.players.length === game.playerCount) {
      game.gameState = 'active';
    }

    return { playerId: player.id, gameData: game };
  }

  // Handle dice roll and token movement
  async makeMove(gameId, playerId, diceValue, tokenIndex) {
    const game = this.activeGames.get(gameId);
    const player = this.players.get(playerId);

    if (!game || !player) {
      throw new Error('Invalid game or player');
    }

    if (game.gameState !== 'active') {
      throw new Error('Game not active');
    }

    if (player.playerIndex !== game.currentPlayerIndex) {
      throw new Error('Not your turn');
    }

    // Validate and execute move
    const moveResult = this.executeMove(game, player, diceValue, tokenIndex);
    
    // Record move in history
    const move = {
      playerId,
      playerIndex: player.playerIndex,
      diceValue,
      tokenIndex,
      timestamp: new Date(),
      moveNumber: game.moveHistory.length + 1,
      ...moveResult
    };

    game.moveHistory.push(move);
    game.lastActivity = new Date();

    // Check for winner
    const winner = this.checkWinCondition(game, player);
    if (winner) {
      game.gameState = 'finished';
      game.winner = winner;
    } else {
      // Next player's turn (unless rolled 6)
      if (diceValue !== 6) {
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.playerCount;
      }
    }

    return { moveResult, gameState: game };
  }

  // Execute token movement logic
  executeMove(game, player, diceValue, tokenIndex) {
    const token = player.tokens[tokenIndex];
    if (!token) {
      throw new Error('Invalid token');
    }

    let moveResult = {
      success: false,
      message: 'Invalid move',
      tokenKilled: null,
      newPosition: null
    };

    // Token in home - need 6 to start
    if (token.inHome) {
      if (diceValue === 6) {
        token.inHome = false;
        token.position = this.getStartPosition(player.playerIndex);
        moveResult = {
          success: true,
          message: 'Token entered the board',
          newPosition: token.position
        };
      }
      return moveResult;
    }

    // Calculate new position
    const newPosition = this.calculateNewPosition(token.position, diceValue, player.playerIndex);
    
    // Check if position is valid
    if (newPosition === -1) {
      return moveResult; // Invalid move
    }

    // Check for token killing
    const killedToken = this.checkForKill(game, newPosition, player.playerIndex);
    if (killedToken) {
      killedToken.inHome = true;
      killedToken.position = null;
      moveResult.tokenKilled = killedToken;
    }

    // Update token position
    token.position = newPosition;
    
    // Check if token reached home
    if (this.isHomePosition(newPosition, player.playerIndex)) {
      token.finished = true;
      token.position = null;
    }

    moveResult = {
      success: true,
      message: killedToken ? 'Token moved and killed opponent' : 'Token moved',
      newPosition,
      tokenKilled: killedToken
    };

    return moveResult;
  }

  // Game utility methods
  initializeBoard() {
    // 15x15 grid representing the Ludo board
    return Array(15).fill().map(() => Array(15).fill(null));
  }

  initializeTokens(playerCount) {
    const tokens = [];
    for (let playerId = 0; playerId < playerCount; playerId++) {
      for (let tokenIndex = 0; tokenIndex < 4; tokenIndex++) {
        tokens.push({
          id: `${playerId}_${tokenIndex}`,
          playerId,
          tokenIndex,
          position: null,
          inHome: true,
          finished: false
        });
      }
    }
    return tokens;
  }

  getPlayerColor(index) {
    const colors = ['red', 'blue', 'green', 'yellow'];
    return colors[index % colors.length];
  }

  getStartPosition(playerIndex) {
    const startPositions = [0, 13, 52, 39]; // Start positions for each player
    return startPositions[playerIndex];
  }

  calculateNewPosition(currentPosition, diceValue, playerIndex) {
    // Simplified path calculation - in real implementation, use proper board path
    const newPos = currentPosition + diceValue;
    return newPos <= 57 ? newPos : -1; // 58 total positions on path
  }

  isHomePosition(position, playerIndex) {
    // Check if position is in home stretch for the player
    const homeRanges = [
      [51, 57], // Red home stretch
      [12, 18], // Blue home stretch  
      [25, 31], // Green home stretch
      [38, 44]  // Yellow home stretch
    ];
    const range = homeRanges[playerIndex];
    return position >= range[0] && position <= range[1];
  }

  checkForKill(game, position, currentPlayer) {
    // Find if any opponent token is at this position
    for (const player of game.players) {
      if (player.playerIndex === currentPlayer) continue;
      
      for (const token of player.tokens) {
        if (token.position === position && !token.inHome && !token.finished) {
          return token;
        }
      }
    }
    return null;
  }

  checkWinCondition(game, player) {
    // Check if all tokens are finished
    const allFinished = player.tokens.every(token => token.finished);
    return allFinished ? player : null;
  }

  generateGameId() {
    return 'game_' + Math.random().toString(36).substr(2, 9);
  }

  generatePlayerId() {
    return 'player_' + Math.random().toString(36).substr(2, 9);
  }

  // Get game state for client
  getGameState(gameId) {
    return this.activeGames.get(gameId);
  }

  // Get active games list
  getActiveGames() {
    return Array.from(this.activeGames.values()).map(game => ({
      id: game.id,
      playerCount: game.playerCount,
      currentPlayers: game.players.length,
      gameState: game.gameState,
      createdAt: game.createdAt
    }));
  }

  // Clean up inactive games
  cleanupInactiveGames() {
    const now = new Date();
    const timeout = 30 * 60 * 1000; // 30 minutes

    for (const [gameId, game] of this.activeGames) {
      if (now - game.lastActivity > timeout) {
        this.activeGames.delete(gameId);
        // Remove associated players
        for (const player of game.players) {
          this.players.delete(player.id);
        }
      }
    }
  }
}

module.exports = GameManager;