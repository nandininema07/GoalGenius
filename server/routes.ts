import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { aiService } from "./services/aiService";
import { insertGoalSchema, insertEventSchema, insertChatHistorySchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Goals routes
  app.get('/api/goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const goals = await storage.getUserGoals(userId);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.post('/api/goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const goalData = insertGoalSchema.parse({ ...req.body, userId });
      const goal = await storage.createGoal(goalData);
      res.json(goal);
    } catch (error) {
      console.error("Error creating goal:", error);
      res.status(400).json({ message: "Failed to create goal" });
    }
  });

  app.put('/api/goals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const updates = insertGoalSchema.partial().parse(req.body);
      const goal = await storage.updateGoal(goalId, updates);
      res.json(goal);
    } catch (error) {
      console.error("Error updating goal:", error);
      res.status(400).json({ message: "Failed to update goal" });
    }
  });

  app.delete('/api/goals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const goalId = parseInt(req.params.id);
      await storage.deleteGoal(goalId);
      res.json({ message: "Goal deleted successfully" });
    } catch (error) {
      console.error("Error deleting goal:", error);
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });

  // Events routes
  app.get('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const events = await storage.getUserEvents(userId, start, end);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventData = insertEventSchema.parse({ ...req.body, userId });
      const event = await storage.createEvent(eventData);
      res.json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(400).json({ message: "Failed to create event" });
    }
  });

  app.put('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const updates = insertEventSchema.partial().parse(req.body);
      const event = await storage.updateEvent(eventId, updates);
      res.json(event);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(400).json({ message: "Failed to update event" });
    }
  });

  app.delete('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      await storage.deleteEvent(eventId);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Balance routes
  app.get('/api/balance/today', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const today = new Date().toISOString().split('T')[0];
      const balance = await storage.getUserDailyBalance(userId, today);
      res.json(balance);
    } catch (error) {
      console.error("Error fetching today's balance:", error);
      res.status(500).json({ message: "Failed to fetch balance" });
    }
  });

  app.get('/api/balance/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const days = parseInt(req.query.days as string) || 30;
      const history = await storage.getUserBalanceHistory(userId, days);
      res.json(history);
    } catch (error) {
      console.error("Error fetching balance history:", error);
      res.status(500).json({ message: "Failed to fetch balance history" });
    }
  });

  app.post('/api/balance/calculate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { date } = req.body;
      
      // Get events for the specified date
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      
      const events = await storage.getUserEvents(userId, startDate, endDate);
      
      // Calculate balance
      const eventsWithDuration = events.map(event => ({
        category: event.category,
        duration: (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60), // minutes
      }));
      
      const analysis = await aiService.analyzeBalance(eventsWithDuration);
      
      // Save balance to database
      const balanceData = {
        userId,
        date,
        workPercentage: analysis.categoryBreakdown.work,
        healthPercentage: analysis.categoryBreakdown.health,
        leisurePercentage: analysis.categoryBreakdown.leisure,
        socialPercentage: analysis.categoryBreakdown.social,
        learningPercentage: analysis.categoryBreakdown.learning,
        overallScore: analysis.score,
      };
      
      const balance = await storage.createDailyBalance(balanceData);
      res.json({ balance, analysis });
    } catch (error) {
      console.error("Error calculating balance:", error);
      res.status(500).json({ message: "Failed to calculate balance" });
    }
  });

  // Streak routes
  app.get('/api/streak', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const streak = await storage.getUserStreak(userId);
      res.json(streak || { currentStreak: 0, longestStreak: 0 });
    } catch (error) {
      console.error("Error fetching streak:", error);
      res.status(500).json({ message: "Failed to fetch streak" });
    }
  });

  app.post('/api/streak/update', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { completed } = req.body;
      
      const currentStreak = await storage.getUserStreak(userId);
      const currentStreakCount = currentStreak?.currentStreak || 0;
      const longestStreak = currentStreak?.longestStreak || 0;
      
      let newCurrentStreak = completed ? currentStreakCount + 1 : 0;
      let newLongestStreak = Math.max(longestStreak, newCurrentStreak);
      
      const streak = await storage.updateStreak(userId, newCurrentStreak, newLongestStreak);
      res.json(streak);
    } catch (error) {
      console.error("Error updating streak:", error);
      res.status(500).json({ message: "Failed to update streak" });
    }
  });

  // AI Chat routes
  app.get('/api/chat/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await storage.getUserChatHistory(userId, limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  app.post('/api/chat/message', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }
      
      // Get recent chat history for context
      const recentHistory = await storage.getUserChatHistory(userId, 5);
      const context = recentHistory.map(chat => `${chat.messageType}: ${chat.message}`);
      
      // Generate AI response
      const aiResponse = await aiService.generateChatResponse(message, context);
      
      // Save user message
      await storage.createChatHistory({
        userId,
        message,
        response: aiResponse,
        messageType: 'user',
      });
      
      // Save AI response
      await storage.createChatHistory({
        userId,
        message: aiResponse,
        response: '',
        messageType: 'ai',
      });
      
      res.json({ response: aiResponse });
    } catch (error) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  // AI Schedule Generation
  app.post('/api/ai/generate-schedule', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { goals, preferences } = req.body;
      
      if (!goals || typeof goals !== 'string') {
        return res.status(400).json({ message: "Goals are required" });
      }
      
      // Get current events for context
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const currentEvents = await storage.getUserEvents(userId, today, tomorrow);
      const currentSchedule = currentEvents.map(event => ({
        title: event.title,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        category: event.category,
      }));
      
      const scheduleResponse = await aiService.generateSchedule({
        goals,
        preferences,
        currentSchedule,
      });
      
      res.json(scheduleResponse);
    } catch (error) {
      console.error("Error generating schedule:", error);
      res.status(500).json({ message: "Failed to generate schedule" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's events
      const startDate = new Date(today);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 1);
      
      const todayEvents = await storage.getUserEvents(userId, startDate, endDate);
      const completedEvents = todayEvents.filter(event => event.isCompleted);
      
      // Get streak
      const streak = await storage.getUserStreak(userId);
      
      // Get balance
      const balance = await storage.getUserDailyBalance(userId, today);
      
      // Get weekly average
      const weeklyHistory = await storage.getUserBalanceHistory(userId, 7);
      const weeklyAverage = weeklyHistory.length > 0 
        ? Math.round(weeklyHistory.reduce((sum, day) => sum + day.overallScore, 0) / weeklyHistory.length)
        : 0;
      
      res.json({
        currentStreak: streak?.currentStreak || 0,
        balanceScore: balance?.overallScore || 0,
        tasksCompleted: completedEvents.length,
        totalTasks: todayEvents.length,
        weeklyAverage,
        todayEvents: todayEvents.slice(0, 4), // Limit to 4 for dashboard
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
