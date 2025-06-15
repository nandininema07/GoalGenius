import {
  users,
  goals,
  events,
  dailyBalance,
  streaks,
  chatHistory,
  type User,
  type UpsertUser,
  type Goal,
  type InsertGoal,
  type Event,
  type InsertEvent,
  type DailyBalance,
  type InsertDailyBalance,
  type Streak,
  type ChatHistory,
  type InsertChatHistory,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Goals operations
  createGoal(goal: InsertGoal): Promise<Goal>;
  getUserGoals(userId: string): Promise<Goal[]>;
  updateGoal(id: number, updates: Partial<InsertGoal>): Promise<Goal>;
  deleteGoal(id: number): Promise<void>;
  
  // Events operations
  createEvent(event: InsertEvent): Promise<Event>;
  getUserEvents(userId: string, startDate?: Date, endDate?: Date): Promise<Event[]>;
  updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: number): Promise<void>;
  
  // Balance operations
  createDailyBalance(balance: InsertDailyBalance): Promise<DailyBalance>;
  getUserDailyBalance(userId: string, date: string): Promise<DailyBalance | undefined>;
  getUserBalanceHistory(userId: string, days: number): Promise<DailyBalance[]>;
  
  // Streak operations
  getUserStreak(userId: string): Promise<Streak | undefined>;
  updateStreak(userId: string, currentStreak: number, longestStreak: number): Promise<Streak>;
  
  // Chat operations
  createChatHistory(chat: InsertChatHistory): Promise<ChatHistory>;
  getUserChatHistory(userId: string, limit?: number): Promise<ChatHistory[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Goals operations
  async createGoal(goal: InsertGoal): Promise<Goal> {
    const [newGoal] = await db.insert(goals).values(goal).returning();
    return newGoal;
  }

  async getUserGoals(userId: string): Promise<Goal[]> {
    return await db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(desc(goals.createdAt));
  }

  async updateGoal(id: number, updates: Partial<InsertGoal>): Promise<Goal> {
    const [updatedGoal] = await db
      .update(goals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(goals.id, id))
      .returning();
    return updatedGoal;
  }

  async deleteGoal(id: number): Promise<void> {
    await db.delete(goals).where(eq(goals.id, id));
  }

  // Events operations
  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent;
  }

  async getUserEvents(userId: string, startDate?: Date, endDate?: Date): Promise<Event[]> {
    let query = db.select().from(events).where(eq(events.userId, userId));
    
    if (startDate && endDate) {
      query = query.where(
        and(
          gte(events.startTime, startDate),
          lte(events.startTime, endDate)
        )
      );
    }
    
    return await query.orderBy(asc(events.startTime));
  }

  async updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event> {
    const [updatedEvent] = await db
      .update(events)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  // Balance operations
  async createDailyBalance(balance: InsertDailyBalance): Promise<DailyBalance> {
    const [newBalance] = await db
      .insert(dailyBalance)
      .values(balance)
      .onConflictDoUpdate({
        target: [dailyBalance.userId, dailyBalance.date],
        set: { ...balance, updatedAt: new Date() },
      })
      .returning();
    return newBalance;
  }

  async getUserDailyBalance(userId: string, date: string): Promise<DailyBalance | undefined> {
    const [balance] = await db
      .select()
      .from(dailyBalance)
      .where(and(eq(dailyBalance.userId, userId), eq(dailyBalance.date, date)));
    return balance;
  }

  async getUserBalanceHistory(userId: string, days: number): Promise<DailyBalance[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await db
      .select()
      .from(dailyBalance)
      .where(
        and(
          eq(dailyBalance.userId, userId),
          gte(dailyBalance.date, startDate.toISOString().split('T')[0])
        )
      )
      .orderBy(asc(dailyBalance.date));
  }

  // Streak operations
  async getUserStreak(userId: string): Promise<Streak | undefined> {
    const [streak] = await db.select().from(streaks).where(eq(streaks.userId, userId));
    return streak;
  }

  async updateStreak(userId: string, currentStreak: number, longestStreak: number): Promise<Streak> {
    const [streak] = await db
      .insert(streaks)
      .values({
        userId,
        currentStreak,
        longestStreak,
        lastActivityDate: new Date().toISOString().split('T')[0],
      })
      .onConflictDoUpdate({
        target: streaks.userId,
        set: {
          currentStreak,
          longestStreak,
          lastActivityDate: new Date().toISOString().split('T')[0],
          updatedAt: new Date(),
        },
      })
      .returning();
    return streak;
  }

  // Chat operations
  async createChatHistory(chat: InsertChatHistory): Promise<ChatHistory> {
    const [newChat] = await db.insert(chatHistory).values(chat).returning();
    return newChat;
  }

  async getUserChatHistory(userId: string, limit: number = 50): Promise<ChatHistory[]> {
    return await db
      .select()
      .from(chatHistory)
      .where(eq(chatHistory.userId, userId))
      .orderBy(desc(chatHistory.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
