import { pgTable, text, integer, boolean, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table for player identification
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Games table to track game sessions
export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerCount: integer("player_count").notNull(),
  currentPlayerIndex: integer("current_player_index").default(0).notNull(),
  gameState: text("game_state").default("waiting").notNull(), // waiting, active, finished
  winner: integer("winner"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Game players - junction table for games and users
export const gamePlayers = pgTable("game_players", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  gameId: uuid("game_id").references(() => games.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  playerIndex: integer("player_index").notNull(), // 0, 1, 2, 3
  color: text("color").notNull(), // red, blue, green, yellow
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Game tokens to track piece positions
export const gameTokens = pgTable("game_tokens", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  gameId: uuid("game_id").references(() => games.id).notNull(),
  playerId: integer("player_id").references(() => gamePlayers.id).notNull(),
  tokenIndex: integer("token_index").notNull(), // 0, 1, 2, 3 (each player has 4 tokens)
  position: integer("position"), // null for home, number for board position
  inHome: boolean("in_home").default(true).notNull(),
  finished: boolean("finished").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Game moves for history and replay
export const gameMoves = pgTable("game_moves", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  gameId: uuid("game_id").references(() => games.id).notNull(),
  playerId: integer("player_id").references(() => gamePlayers.id).notNull(),
  diceValue: integer("dice_value").notNull(),
  tokenMoved: integer("token_moved"), // token index that was moved
  fromPosition: integer("from_position"),
  toPosition: integer("to_position"),
  killedToken: integer("killed_token"), // reference to killed token id if any
  moveNumber: integer("move_number").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  gamePlayers: many(gamePlayers),
}));

export const gamesRelations = relations(games, ({ many }) => ({
  players: many(gamePlayers),
  tokens: many(gameTokens),
  moves: many(gameMoves),
}));

export const gamePlayersRelations = relations(gamePlayers, ({ one, many }) => ({
  game: one(games, {
    fields: [gamePlayers.gameId],
    references: [games.id],
  }),
  user: one(users, {
    fields: [gamePlayers.userId],
    references: [users.id],
  }),
  tokens: many(gameTokens),
  moves: many(gameMoves),
}));

export const gameTokensRelations = relations(gameTokens, ({ one }) => ({
  game: one(games, {
    fields: [gameTokens.gameId],
    references: [games.id],
  }),
  player: one(gamePlayers, {
    fields: [gameTokens.playerId],
    references: [gamePlayers.id],
  }),
}));

export const gameMovesRelations = relations(gameMoves, ({ one }) => ({
  game: one(games, {
    fields: [gameMoves.gameId],
    references: [games.id],
  }),
  player: one(gamePlayers, {
    fields: [gameMoves.playerId],
    references: [gamePlayers.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Game = typeof games.$inferSelect;
export type InsertGame = typeof games.$inferInsert;
export type GamePlayer = typeof gamePlayers.$inferSelect;
export type InsertGamePlayer = typeof gamePlayers.$inferInsert;
export type GameToken = typeof gameTokens.$inferSelect;
export type InsertGameToken = typeof gameTokens.$inferInsert;
export type GameMove = typeof gameMoves.$inferSelect;
export type InsertGameMove = typeof gameMoves.$inferInsert;