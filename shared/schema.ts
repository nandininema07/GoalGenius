import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User storage table with simple authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(), // Hashed password
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Goals table
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // work, health, leisure, social, learning
  priority: varchar("priority").default("medium"), // low, medium, high
  targetDate: date("target_date"),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Events/Schedule items
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  goalId: integer("goal_id").references(() => goals.id),
  title: text("title").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // work, health, leisure, social, learning
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Daily balance scores
export const dailyBalance = pgTable("daily_balance", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  workPercentage: integer("work_percentage").default(0),
  healthPercentage: integer("health_percentage").default(0),
  leisurePercentage: integer("leisure_percentage").default(0),
  socialPercentage: integer("social_percentage").default(0),
  learningPercentage: integer("learning_percentage").default(0),
  overallScore: integer("overall_score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User streaks
export const streaks = pgTable("streaks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActivityDate: date("last_activity_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Add this to your shared/schema.ts file

// (Removed duplicate import of pgTable and other symbols)

// Add this table to your existing schema
export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  message: text('message').notNull(),
  messageType: varchar('message_type', { length: 10 }).notNull(), // 'user' or 'ai'
  relatedMessageId: integer('related_message_id'), // For linking AI responses to user messages
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// If you want to add relations (optional)
export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
  relatedMessage: one(chatMessages, {
    fields: [chatMessages.relatedMessageId],
    references: [chatMessages.id],
  }),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  goals: many(goals),
  events: many(events),
  dailyBalance: many(dailyBalance),
  streaks: many(streaks),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, { fields: [goals.userId], references: [users.id] }),
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  user: one(users, { fields: [events.userId], references: [users.id] }),
  goal: one(goals, { fields: [events.goalId], references: [goals.id] }),
}));

export const dailyBalanceRelations = relations(dailyBalance, ({ one }) => ({
  user: one(users, { fields: [dailyBalance.userId], references: [users.id] }),
}));

export const streaksRelations = relations(streaks, ({ one }) => ({
  user: one(users, { fields: [streaks.userId], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDailyBalanceSchema = createInsertSchema(dailyBalance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});



// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type DailyBalance = typeof dailyBalance.$inferSelect;
export type InsertDailyBalance = z.infer<typeof insertDailyBalanceSchema>;
export type Streak = typeof streaks.$inferSelect;
