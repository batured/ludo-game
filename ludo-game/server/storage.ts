import { users, games, gamePlayers, gameTokens, gameMoves, type User, type InsertUser, type Game, type InsertGame, type GamePlayer, type InsertGamePlayer, type GameToken, type InsertGameToken, type GameMove, type InsertGameMove } from "../shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  
  // Game management
  createGame(playerCount: number): Promise<Game>;
  getGame(gameId: string): Promise<Game | undefined>;
  getGameWithPlayers(gameId: string): Promise<Game & { players: (GamePlayer & { user: User })[] } | undefined>;
  updateGameState(gameId: string, state: string, currentPlayerIndex?: number, winner?: number): Promise<void>;
  
  // Player management
  joinGame(gameId: string, userId: number, playerIndex: number, color: string): Promise<GamePlayer>;
  getGamePlayers(gameId: string): Promise<(GamePlayer & { user: User })[]>;
  
  // Token management
  initializeGameTokens(gameId: string, players: GamePlayer[]): Promise<void>;
  getGameTokens(gameId: string): Promise<GameToken[]>;
  updateTokenPosition(tokenId: number, position: number | null, inHome: boolean, finished: boolean): Promise<void>;
  
  // Move history
  recordMove(gameId: string, playerId: number, diceValue: number, tokenMoved?: number, fromPosition?: number, toPosition?: number, killedToken?: number, moveNumber?: number): Promise<GameMove>;
  getGameMoves(gameId: string): Promise<GameMove[]>;
  
  // Active games
  getActiveGames(): Promise<Game[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private games: Map<string, Game> = new Map();
  private gamePlayers: Map<string, GamePlayer[]> = new Map();
  private gameTokens: Map<string, GameToken[]> = new Map();
  private gameMoves: Map<string, GameMove[]> = new Map();
  private nextUserId = 1;
  private nextGamePlayerId = 1;
  private nextTokenId = 1;
  private nextMoveId = 1;

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.nextUserId++,
      username: insertUser.username,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async createGame(playerCount: number): Promise<Game> {
    const gameId = crypto.randomUUID();
    const game: Game = {
      id: gameId,
      playerCount,
      currentPlayerIndex: 0,
      gameState: "waiting",
      winner: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.games.set(gameId, game);
    this.gamePlayers.set(gameId, []);
    this.gameTokens.set(gameId, []);
    this.gameMoves.set(gameId, []);
    return game;
  }

  async getGame(gameId: string): Promise<Game | undefined> {
    return this.games.get(gameId);
  }

  async getGameWithPlayers(gameId: string): Promise<Game & { players: (GamePlayer & { user: User })[] } | undefined> {
    const game = this.games.get(gameId);
    if (!game) return undefined;
    
    const players = this.gamePlayers.get(gameId) || [];
    const playersWithUsers = players.map(player => {
      const user = this.users.get(player.userId);
      return { ...player, user: user! };
    });
    
    return { ...game, players: playersWithUsers };
  }

  async updateGameState(gameId: string, state: string, currentPlayerIndex?: number, winner?: number): Promise<void> {
    const game = this.games.get(gameId);
    if (game) {
      game.gameState = state;
      if (currentPlayerIndex !== undefined) game.currentPlayerIndex = currentPlayerIndex;
      if (winner !== undefined) game.winner = winner;
      game.updatedAt = new Date();
    }
  }

  async joinGame(gameId: string, userId: number, playerIndex: number, color: string): Promise<GamePlayer> {
    const gamePlayer: GamePlayer = {
      id: this.nextGamePlayerId++,
      gameId,
      userId,
      playerIndex,
      color,
      joinedAt: new Date(),
    };
    
    const players = this.gamePlayers.get(gameId) || [];
    players.push(gamePlayer);
    this.gamePlayers.set(gameId, players);
    
    return gamePlayer;
  }

  async getGamePlayers(gameId: string): Promise<(GamePlayer & { user: User })[]> {
    const players = this.gamePlayers.get(gameId) || [];
    return players.map(player => {
      const user = this.users.get(player.userId);
      return { ...player, user: user! };
    });
  }

  async initializeGameTokens(gameId: string, players: GamePlayer[]): Promise<void> {
    const tokens: GameToken[] = [];
    
    for (const player of players) {
      for (let tokenIndex = 0; tokenIndex < 4; tokenIndex++) {
        tokens.push({
          id: this.nextTokenId++,
          gameId,
          playerId: player.id,
          tokenIndex,
          position: null,
          inHome: true,
          finished: false,
          updatedAt: new Date(),
        });
      }
    }
    
    this.gameTokens.set(gameId, tokens);
  }

  async getGameTokens(gameId: string): Promise<GameToken[]> {
    return this.gameTokens.get(gameId) || [];
  }

  async updateTokenPosition(tokenId: number, position: number | null, inHome: boolean, finished: boolean): Promise<void> {
    for (const tokens of this.gameTokens.values()) {
      const token = tokens.find(t => t.id === tokenId);
      if (token) {
        token.position = position;
        token.inHome = inHome;
        token.finished = finished;
        token.updatedAt = new Date();
        return;
      }
    }
  }

  async recordMove(gameId: string, playerId: number, diceValue: number, tokenMoved?: number, fromPosition?: number, toPosition?: number, killedToken?: number, moveNumber?: number): Promise<GameMove> {
    const move: GameMove = {
      id: this.nextMoveId++,
      gameId,
      playerId,
      diceValue,
      tokenMoved: tokenMoved || null,
      fromPosition: fromPosition || null,
      toPosition: toPosition || null,
      killedToken: killedToken || null,
      moveNumber: moveNumber || 1,
      createdAt: new Date(),
    };
    
    const moves = this.gameMoves.get(gameId) || [];
    moves.push(move);
    this.gameMoves.set(gameId, moves);
    
    return move;
  }

  async getGameMoves(gameId: string): Promise<GameMove[]> {
    return this.gameMoves.get(gameId) || [];
  }

  async getActiveGames(): Promise<Game[]> {
    return Array.from(this.games.values()).filter(game => 
      game.gameState === "waiting" || game.gameState === "active"
    );
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createGame(playerCount: number): Promise<Game> {
    const [game] = await db
      .insert(games)
      .values({ playerCount })
      .returning();
    return game;
  }

  async getGame(gameId: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, gameId));
    return game || undefined;
  }

  async getGameWithPlayers(gameId: string): Promise<Game & { players: (GamePlayer & { user: User })[] } | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, gameId));
    if (!game) return undefined;

    const playersWithUsers = await db
      .select()
      .from(gamePlayers)
      .innerJoin(users, eq(gamePlayers.userId, users.id))
      .where(eq(gamePlayers.gameId, gameId));

    const players = playersWithUsers.map(({ game_players, users: user }) => ({
      ...game_players,
      user,
    }));

    return { ...game, players };
  }

  async updateGameState(gameId: string, state: string, currentPlayerIndex?: number, winner?: number): Promise<void> {
    const updateData: any = { 
      gameState: state, 
      updatedAt: new Date() 
    };
    
    if (currentPlayerIndex !== undefined) updateData.currentPlayerIndex = currentPlayerIndex;
    if (winner !== undefined) updateData.winner = winner;

    await db
      .update(games)
      .set(updateData)
      .where(eq(games.id, gameId));
  }

  async joinGame(gameId: string, userId: number, playerIndex: number, color: string): Promise<GamePlayer> {
    const [gamePlayer] = await db
      .insert(gamePlayers)
      .values({ gameId, userId, playerIndex, color })
      .returning();
    return gamePlayer;
  }

  async getGamePlayers(gameId: string): Promise<(GamePlayer & { user: User })[]> {
    const playersWithUsers = await db
      .select()
      .from(gamePlayers)
      .innerJoin(users, eq(gamePlayers.userId, users.id))
      .where(eq(gamePlayers.gameId, gameId));

    return playersWithUsers.map(({ game_players, users: user }) => ({
      ...game_players,
      user,
    }));
  }

  async initializeGameTokens(gameId: string, players: GamePlayer[]): Promise<void> {
    const tokenData: InsertGameToken[] = [];
    
    for (const player of players) {
      for (let tokenIndex = 0; tokenIndex < 4; tokenIndex++) {
        tokenData.push({
          gameId,
          playerId: player.id,
          tokenIndex,
          position: null,
          inHome: true,
          finished: false,
        });
      }
    }
    
    await db.insert(gameTokens).values(tokenData);
  }

  async getGameTokens(gameId: string): Promise<GameToken[]> {
    return await db.select().from(gameTokens).where(eq(gameTokens.gameId, gameId));
  }

  async updateTokenPosition(tokenId: number, position: number | null, inHome: boolean, finished: boolean): Promise<void> {
    await db
      .update(gameTokens)
      .set({ 
        position, 
        inHome, 
        finished, 
        updatedAt: new Date() 
      })
      .where(eq(gameTokens.id, tokenId));
  }

  async recordMove(gameId: string, playerId: number, diceValue: number, tokenMoved?: number, fromPosition?: number, toPosition?: number, killedToken?: number, moveNumber?: number): Promise<GameMove> {
    const [move] = await db
      .insert(gameMoves)
      .values({
        gameId,
        playerId,
        diceValue,
        tokenMoved,
        fromPosition,
        toPosition,
        killedToken,
        moveNumber: moveNumber || 1,
      })
      .returning();
    return move;
  }

  async getGameMoves(gameId: string): Promise<GameMove[]> {
    return await db
      .select()
      .from(gameMoves)
      .where(eq(gameMoves.gameId, gameId))
      .orderBy(desc(gameMoves.createdAt));
  }

  async getActiveGames(): Promise<Game[]> {
    return await db
      .select()
      .from(games)
      .where(eq(games.gameState, "waiting"))
      .orderBy(desc(games.createdAt));
  }
}

export const storage = new DatabaseStorage();