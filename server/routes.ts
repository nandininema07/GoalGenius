import express from "express";
import { db } from "./db";
import { goals, events, dailyBalance, streaks } from "../shared/schema";
import { eq, desc } from "drizzle-orm";
import { registerUser, loginUser, verifyToken, getUserById } from "./auth";
import { z } from "zod";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Validation schemas
const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Middleware to check authentication
const isAuthenticated = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    console.log('Auth Middleware - Headers:', req.headers);
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      console.log('Auth Middleware - No token provided');
      return res.status(401).json({ message: "No token provided" });
    }

    console.log('Auth Middleware - Verifying token:', token);
    const decoded = verifyToken(token);
    req.user = decoded;
    console.log('Auth Middleware - Token verified, user:', decoded);
    next();
  } catch (error) {
    console.error('Auth Middleware - Error:', error);
    res.status(401).json({ message: "Invalid token" });
  }
};

export async function registerRoutes(app: express.Express) {
  // Create a router for API routes
  const apiRouter = express.Router();

  // Auth routes
  apiRouter.post("/auth/register", async (req, res) => {
    try {
      // Validate request body
      const validatedData = registerSchema.parse(req.body);
      const result = await registerUser(
        validatedData.email,
        validatedData.password,
        validatedData.firstName,
        validatedData.lastName
      );
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: error.errors[0].message 
        });
      }
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.post("/auth/login", async (req, res) => {
    try {
      console.log('Login attempt:', req.body);
      // Validate request body
      const validatedData = loginSchema.parse(req.body);
      const result = await loginUser(validatedData.email, validatedData.password);
      console.log('Login successful:', { userId: result.user.id, email: result.user.email });
      res.json(result);
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: error.errors[0].message 
        });
      }
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.get("/auth/user", isAuthenticated, async (req, res) => {
    try {
      console.log('Get user request - User ID:', req.user.userId);
      const user = await getUserById(req.user.userId);
      if (!user) {
        console.log('User not found:', req.user.userId);
        return res.status(404).json({ message: "User not found" });
      }
      // Don't send the password
      const { password, ...userWithoutPassword } = user;
      // Get token from Authorization header
      const token = req.headers.authorization?.split(" ")[1];
      console.log('User found:', { id: user.id, email: user.email });
      res.json({ ...userWithoutPassword, token });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: "Error fetching user data" });
    }
  });

  // Logout endpoint - no authentication required
  apiRouter.get("/logout", async (req, res) => {
    try {
      console.log('Logout request received');
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: "Error during logout" });
    }
  });

  // Chat routes
  apiRouter.post("/chat/message", isAuthenticated, async (req, res) => {
    try {
      console.log('Chat message received:', req.body);
      // For now, return a simple response
      res.json({
        message: "I'm your AI assistant. How can I help you today?",
        type: "assistant"
      });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ message: "Error processing chat message" });
    }
  });

  apiRouter.get("/chat/history", isAuthenticated, async (req, res) => {
    try {
      console.log('Fetching chat history for user:', req.user.userId);
      // For now, return an empty array
      res.json([]);
    } catch (error) {
      console.error('Chat history error:', error);
      res.status(500).json({ message: "Error fetching chat history" });
    }
  });

  // Dashboard routes
  apiRouter.get("/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const [currentStreak] = await db.query.streaks.findMany({
        where: eq(streaks.userId, req.user.userId),
        orderBy: (streaks, { desc }) => [desc(streaks.currentStreak)],
        limit: 1,
      });

      const todayEvents = await db.query.events.findMany({
        where: eq(events.userId, req.user.userId),
      });

      const completedTasks = todayEvents.filter(event => event.isCompleted).length;
      const totalTasks = todayEvents.length;

      res.json({
        currentStreak: currentStreak?.currentStreak || 0,
        tasksCompleted: completedTasks,
        totalTasks: totalTasks,
        weeklyAverage: 75, // Placeholder - implement actual calculation
        todayEvents: todayEvents,
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching dashboard stats" });
    }
  });

  apiRouter.get("/balance/today", isAuthenticated, async (req, res) => {
    try {
      const [todayBalance] = await db.query.dailyBalance.findMany({
        where: eq(dailyBalance.userId, req.user.userId),
        orderBy: (dailyBalance, { desc }) => [desc(dailyBalance.date)],
        limit: 1,
      });

      res.json({
        overallScore: todayBalance?.overallScore || 0,
        workPercentage: todayBalance?.workPercentage || 0,
        healthPercentage: todayBalance?.healthPercentage || 0,
        leisurePercentage: todayBalance?.leisurePercentage || 0,
        socialPercentage: todayBalance?.socialPercentage || 0,
        learningPercentage: todayBalance?.learningPercentage || 0,
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching balance data" });
    }
  });

  // Goals routes
  apiRouter.get("/goals", isAuthenticated, async (req, res) => {
    try {
      const userGoals = await db.query.goals.findMany({
        where: eq(goals.userId, req.user.userId),
      });
      res.json(userGoals);
    } catch (error) {
      res.status(500).json({ message: "Error fetching goals" });
    }
  });

  // Mount the API router
  app.use("/api", apiRouter);
}
