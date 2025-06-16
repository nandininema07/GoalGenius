import express from "express";
import rateLimit from "express-rate-limit";
import { db } from "./db";
import { goals, events, dailyBalance, streaks, chatMessages } from "../shared/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { registerUser, loginUser, verifyToken, getUserById } from "./auth";
import { aiService } from "./services/aiService";
import { z } from "zod";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Rate limiting configurations
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per 15 minutes
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 AI requests per minute
  message: "Too many AI requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

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

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(["work", "health", "leisure", "social", "learning"], {
    errorMap: () => ({ message: "Category must be one of: work, health, leisure, social, learning" })
  }),
  startTime: z.string().datetime("Invalid start time format"),
  endTime: z.string().datetime("Invalid end time format"),
  isCompleted: z.boolean().optional(),
  goalId: z.number().optional(),
});

const goalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(["work", "health", "leisure", "social", "learning"], {
    errorMap: () => ({ message: "Category must be one of: work, health, leisure, social, learning" })
  }),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
  targetDate: z.string().datetime().optional(),
  isCompleted: z.boolean().optional(),
});

const generateScheduleSchema = z.object({
  goals: z.string().min(1, "Goals are required"),
  preferences: z.object({
    workHours: z.string().optional(),
    workoutTime: z.string().optional(),
    availableTime: z.string().optional(),
    restrictions: z.string().optional(),
  }).optional(),
});

const chatMessageSchema = z.object({
  message: z.string().min(1, "Message is required"),
  context: z.array(z.string()).optional(),
});

// Add new validation schemas
const enhancedChatMessageSchema = z.object({
  message: z.string().min(1, "Message is required"),
  context: z.array(z.string()).optional(),
  enhancePrompt: z.boolean().optional().default(false),
  responseType: z.enum(["conversational", "educational", "coaching", "technical", "creative"]).optional().default("conversational"),
  tone: z.enum(["professional", "friendly", "motivational", "casual", "expert"]).optional().default("friendly"),
  detailLevel: z.enum(["brief", "moderate", "detailed", "comprehensive"]).optional().default("moderate"),
});

// Helper function to validate date
const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

// Middleware to check authentication
// Middleware to check authentication
const isAuthenticated = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    console.log('Auth Middleware - Headers:', req.headers);
    
    // Check multiple possible token locations
    let token = req.headers.authorization?.split(" ")[1]; // Bearer token
    
    if (!token) {
      token = req.headers.authorization; // Direct token
    }
    
    if (!token) {
      token = req.headers['x-auth-token'] as string; // Custom header
    }
    
    if (!token) {
      token = req.cookies?.token; // Cookie (if you're using cookies)
    }

    if (!token) {
      console.log('Auth Middleware - No token provided in any expected location');
      return res.status(401).json({ message: "No token provided" });
    }

    console.log('Auth Middleware - Verifying token:', token.substring(0, 20) + '...');
    const decoded = verifyToken(token);
    req.user = decoded;
    console.log('Auth Middleware - Token verified, user:', decoded);
    next();
  } catch (error) {
    console.error('Auth Middleware - Error:', error);
    res.status(401).json({ message: "Invalid token" });
  }
};

// Prompt enhancement function
const enhancePrompt = (originalMessage, userContext, responseType, tone, detailLevel) => {
  const contextPrompts = {
    conversational: "You are a helpful AI assistant focused on natural conversation.",
    educational: "You are an expert tutor who explains concepts clearly with examples and breaks down complex topics.",
    coaching: "You are a personal coach who provides actionable advice, motivation, and structured guidance.",
    technical: "You are a technical expert who provides precise, accurate information with practical solutions.",
    creative: "You are a creative assistant who thinks outside the box and provides innovative ideas."
  };

  const tonePrompts = {
    professional: "Maintain a professional, business-appropriate tone.",
    friendly: "Use a warm, approachable, and friendly tone.",
    motivational: "Be encouraging, inspiring, and energetic in your response.",
    casual: "Keep it relaxed, informal, and conversational.",
    expert: "Demonstrate deep expertise and authority in your field."
  };

  const detailPrompts = {
    brief: "Keep your response concise and to the point (1-2 sentences).",
    moderate: "Provide a balanced response with key points (2-4 sentences).",
    detailed: "Give a thorough explanation with examples and context (1-2 paragraphs).",
    comprehensive: "Provide an in-depth, comprehensive response covering all aspects."
  };

  let enhancedPrompt = `${contextPrompts[responseType]}\n${tonePrompts[tone]}\n${detailPrompts[detailLevel]}\n\n`;

  // Add user context if available
  if (userContext && userContext.length > 0) {
    enhancedPrompt += `Previous conversation context:\n${userContext.join('\n')}\n\n`;
  }

  // Add specific instructions based on message content
  const messageType = detectMessageType(originalMessage);
  enhancedPrompt += getSpecificInstructions(messageType);

  enhancedPrompt += `\nUser message: "${originalMessage}"\n\nPlease respond appropriately:`;

  return enhancedPrompt;
};

// Detect message type for better context
const detectMessageType = (message) => {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('dsa') || lowerMessage.includes('algorithm') || lowerMessage.includes('leetcode') ||
      lowerMessage.includes('coding') || lowerMessage.includes('programming') || lowerMessage.includes('interview')) {
    return 'technical_career';
  }
  if (lowerMessage.includes('schedule') || lowerMessage.includes('plan') || lowerMessage.includes('time management')) {
    return 'planning';
  }
  if (lowerMessage.includes('goal') || lowerMessage.includes('achieve') || lowerMessage.includes('target')) {
    return 'goal_setting';
  }
  if (lowerMessage.includes('stress') || lowerMessage.includes('overwhelmed') || lowerMessage.includes('anxiety')) {
    return 'wellness';
  }
  if (lowerMessage.includes('learn') || lowerMessage.includes('study') || lowerMessage.includes('education')) {
    return 'learning';
  }
  return 'general';
};

// Get specific instructions based on message type
const getSpecificInstructions = (messageType) => {
  const instructions = {
    technical_career: `You are an expert career coach specializing in software engineering careers. 
    Focus on: technical interview preparation, coding practice strategies, career progression, 
    skill development, and realistic timelines. Provide actionable steps and resources.`,

    planning: `You are a productivity expert and time management coach. 
    Focus on: creating realistic schedules, prioritization techniques, time blocking, 
    and sustainable productivity habits. Provide structured plans and frameworks.`,

    goal_setting: `You are a goal-achievement specialist. 
    Focus on: SMART goals, breaking down objectives, milestone tracking, 
    motivation strategies, and overcoming obstacles. Make goals specific and measurable.`,

    wellness: `You are a wellness coach who understands work-life balance. 
    Focus on: stress management techniques, self-care strategies, mental health awareness, 
    and building resilience. Be empathetic and supportive.`,

    learning: `You are an educational expert and learning strategist. 
    Focus on: effective study methods, learning techniques, resource recommendations, 
    and skill acquisition strategies. Provide structured learning paths.`,

    general: `You are a knowledgeable assistant who adapts to the user's needs. 
    Focus on providing helpful, relevant information tailored to their specific question.`
  };

  return instructions[messageType] || instructions.general;
};

// Helper functions for recommendations
const getRecommendedSettings = (messageType) => {
  const recommendations = {
    technical_career: {
      responseType: "coaching",
      tone: "professional",
      detailLevel: "detailed"
    },
    planning: {
      responseType: "coaching",
      tone: "professional",
      detailLevel: "comprehensive"
    },
    goal_setting: {
      responseType: "coaching",
      tone: "motivational",
      detailLevel: "detailed"
    },
    wellness: {
      responseType: "coaching",
      tone: "friendly",
      detailLevel: "moderate"
    },
    learning: {
      responseType: "educational",
      tone: "expert",
      detailLevel: "comprehensive"
    },
    general: {
      responseType: "conversational",
      tone: "friendly",
      detailLevel: "moderate"
    }
  };

  return recommendations[messageType] || recommendations.general;
};

const getEnhancementOptions = (message) => {
  return {
    makeMoreSpecific: "Add specific requirements, timelines, and constraints",
    addContext: "Include your current situation, experience level, or background",
    clarifyGoals: "Specify what success looks like and your ultimate objective",
    requestStructure: "Ask for step-by-step plans, frameworks, or organized responses",
    seekResources: "Request specific tools, links, or additional learning materials"
  };
};

const getExampleEnhancements = (originalMessage, messageType) => {
  // This could be expanded with AI-generated examples
  const examples = {
    technical_career: [
      "Break this down into weekly milestones",
      "Include specific resources and practice schedules",
      "Consider my current skill level and time constraints"
    ],
    planning: [
      "Create a detailed daily schedule",
      "Account for potential obstacles and backup plans",
      "Include time for review and adjustment"
    ]
  };

  return examples[messageType] || [
    "Make this more specific to my situation",
    "Provide actionable steps I can take today",
    "Include examples or case studies"
  ];
};

export async function registerRoutes(app: express.Express) {
  // Apply general rate limiting to all routes
  app.use("/api", generalLimiter);

  // Create a router for API routes
  const apiRouter = express.Router();

  // Auth routes with stricter rate limiting
  apiRouter.post("/auth/register", authLimiter, async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await registerUser(
        validatedData.email,
        validatedData.password,
        validatedData.firstName,
        validatedData.lastName
      );
      res.json(result);
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: error.errors[0].message 
        });
      }
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.post("/auth/login", authLimiter, async (req, res) => {
    try {
      console.log('Login attempt:', req.body);
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
      const { password, ...userWithoutPassword } = user;
      const token = req.headers.authorization?.split(" ")[1];
      console.log('User found:', { id: user.id, email: user.email });
      res.json({ ...userWithoutPassword, token });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: "Error fetching user data" });
    }
  });

  apiRouter.get("/logout", async (req, res) => {
    try {
      console.log('Logout request received');
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error('Logout error:', error);  
      res.status(500).json({ message: "Error during logout" });
    }
  });

  //AI-powered Chat routes with AI rate limiting
  apiRouter.post("/chat/message", aiLimiter, isAuthenticated, async (req, res) => {
  try {
    console.log('Enhanced chat message received:', req.body);
    const validatedData = enhancedChatMessageSchema.parse(req.body);

    // Get recent chat history for context
    const recentMessages = await db.query.chatMessages.findMany({
      where: eq(chatMessages.userId, req.user.userId),
      orderBy: desc(chatMessages.createdAt),
      limit: 5,
    });

    const context = recentMessages.reverse().map(msg =>
      `${msg.messageType === 'user' ? 'User' : 'AI'}: ${msg.message}`
    );

    let finalMessage = validatedData.message;

    // Enhance prompt if requested
    if (validatedData.enhancePrompt) {
      finalMessage = enhancePrompt(
        validatedData.message,
        context,
        validatedData.responseType,
        validatedData.tone,
        validatedData.detailLevel
      );
      console.log('Enhanced prompt:', finalMessage);
    }

    // Generate AI response
    const aiResponse = await aiService.generateChatResponse(
      finalMessage,
      req.user.userId,
      context
    );

    // Store user message
    const [userMessage] = await db.insert(chatMessages).values({
      userId: req.user.userId,
      message: validatedData.message, // Store original message, not enhanced prompt
      messageType: 'user',
      createdAt: new Date(),
      metadata: JSON.stringify({
        enhancePrompt: validatedData.enhancePrompt,
        responseType: validatedData.responseType,
        tone: validatedData.tone,
        detailLevel: validatedData.detailLevel
      })
    }).returning();

    // Store AI response
    await db.insert(chatMessages).values({
      userId: req.user.userId,
      message: aiResponse,
      messageType: 'ai',
      createdAt: new Date(),
      relatedMessageId: userMessage.id,
    });

    res.json({
      id: userMessage.id,
      message: validatedData.message,
      response: aiResponse,
      messageType: 'user',
      createdAt: userMessage.createdAt.toISOString(),
      enhancementUsed: validatedData.enhancePrompt,
      settings: {
        responseType: validatedData.responseType,
        tone: validatedData.tone,
        detailLevel: validatedData.detailLevel
      }
    });
  } catch (error) {
    console.error('Enhanced chat error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: "Error processing chat message" });
  }
});

  apiRouter.get("/chat/history", isAuthenticated, async (req, res) => {
    try {
      console.log('Fetching chat history for user:', req.user.userId);
      
      // Get all messages for the user, ordered by creation time
      const allMessages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.userId, req.user.userId),
        orderBy: desc(chatMessages.createdAt),
        limit: 100,
      });

      // Group messages into conversations (user message + AI response pairs)
      const conversations = [];
      const processedIds = new Set();

      for (const message of allMessages) {
        if (processedIds.has(message.id)) continue;

        if (message.messageType === 'user') {
          // Find corresponding AI response
          const aiResponse = allMessages.find(m => 
            m.messageType === 'ai' && 
            m.relatedMessageId === message.id &&
            !processedIds.has(m.id)
          );

          conversations.push({
            id: message.id,
            message: message.message,
            response: aiResponse?.message || null,
            messageType: message.messageType,
            createdAt: message.createdAt.toISOString(),
          });

          processedIds.add(message.id);
          if (aiResponse) processedIds.add(aiResponse.id);
        }
      }

      // Sort by creation date (oldest first for chat display)
      conversations.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      res.json(conversations);
    } catch (error) {
      console.error('Chat history error:', error);
      res.status(500).json({ message: "Error fetching chat history" });
    }
  });

  // AI Schedule Generation with AI rate limiting
  apiRouter.post("/ai/generate-schedule", aiLimiter, isAuthenticated, async (req, res) => {
    try {
      console.log('Generate schedule request:', req.body);
      const validatedData = generateScheduleSchema.parse(req.body);
      
      const scheduleRequest = {
        goals: validatedData.goals,
        userId: req.user.userId,
        preferences: validatedData.preferences,
      };

      const response = await aiService.generateSchedule(scheduleRequest);
      
      const scheduleMessage = `I've generated a personalized schedule for you! Here's what I've created:

**Today's Schedule:**
${response.schedule.map(item => 
  `• ${item.startTime}-${item.endTime}: ${item.title} (${item.category})`
).join('\n')}

**Balance Analysis:**
- Work: ${response.balanceAnalysis.workPercentage}%
- Health: ${response.balanceAnalysis.healthPercentage}%
- Leisure: ${response.balanceAnalysis.leisurePercentage}%
- Social: ${response.balanceAnalysis.socialPercentage}%
- Learning: ${response.balanceAnalysis.learningPercentage}%

**My Suggestions:**
${response.suggestions.map(s => `• ${s}`).join('\n')}

The schedule has been added to your calendar. You can view and modify it anytime!`;

      await db.insert(chatMessages).values({
        userId: req.user.userId,
        message: scheduleMessage,
        messageType: 'ai',
        createdAt: new Date(),
      });
      
      res.json({
        success: true,
        data: response,
        message: "Schedule generated successfully",
      });
    } catch (error) {
      console.error('Generate schedule error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Error generating schedule" });
    }
  });

  // AI Balance Analysis with AI rate limiting
  apiRouter.get("/ai/analyze-balance", aiLimiter, isAuthenticated, async (req, res) => {
    try {
      const date = req.query.date as string;
      console.log('Analyze balance request for date:', date);
      
      if (date && !isValidDate(date)) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      const analysis = await aiService.analyzeBalance(req.user.userId, date);
      
      res.json({
        success: true,
        data: analysis,
        date: date || new Date().toISOString().split('T')[0],
      });
    } catch (error) {
      console.error('Balance analysis error:', error);
      res.status(500).json({ message: "Error analyzing balance" });
    }
  });

  // AI Suggestions with AI rate limiting
  apiRouter.get("/ai/suggestions", aiLimiter, isAuthenticated, async (req, res) => {
    try {
      console.log('AI suggestions request for user:', req.user.userId);
      
      const suggestions = await aiService.generateAISuggestions(req.user.userId);
      
      res.json({
        success: true,
        suggestions,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('AI suggestions error:', error);
      res.status(500).json({ message: "Error generating suggestions" });
    }
  });

  // Dashboard routes
  apiRouter.get("/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const [currentStreak] = await db.query.streaks.findMany({
        where: eq(streaks.userId, req.user.userId),
        orderBy: desc(streaks.currentStreak),
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
        weeklyAverage: 75, // TODO: Implement actual calculation
        todayEvents: todayEvents,
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ message: "Error fetching dashboard stats" });
    }
  });

  apiRouter.get("/balance/today", isAuthenticated, async (req, res) => {
    try {
      const [todayBalance] = await db.query.dailyBalance.findMany({
        where: eq(dailyBalance.userId, req.user.userId),
        orderBy: desc(dailyBalance.date),
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
      console.error('Balance fetch error:', error);
      res.status(500).json({ message: "Error fetching balance data" });
    }
  });

  // Events routes
  apiRouter.get("/events", isAuthenticated, async (req, res) => {
    try {
      console.log('Fetching events for user:', req.user.userId);
      
      const { date, startDate, endDate } = req.query;
      
      let whereCondition = eq(events.userId, req.user.userId);
      
      if (date) {
        const targetDate = new Date(date as string);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        whereCondition = and(
          eq(events.userId, req.user.userId),
          gte(events.startTime, startOfDay),
          lte(events.endTime, endOfDay)
        );
      } else if (startDate && endDate) {
        whereCondition = and(
          eq(events.userId, req.user.userId),
          gte(events.startTime, new Date(startDate as string)),
          lte(events.endTime, new Date(endDate as string))
        );
      }
      
      const userEvents = await db.query.events.findMany({
        where: whereCondition,
        orderBy: [events.startTime],
      });
      
      res.json(userEvents);
    } catch (error) {
      console.error('Events fetch error:', error);
      res.status(500).json({ message: "Error fetching events" });
    }
  });

  apiRouter.post("/events", isAuthenticated, async (req, res) => {
    try {
      console.log('Creating event:', req.body);
      const validatedData = eventSchema.parse(req.body);
      
      const eventData = {
        userId: req.user.userId,
        title: validatedData.title,
        description: validatedData.description || '',
        category: validatedData.category,
        startTime: new Date(validatedData.startTime),
        endTime: new Date(validatedData.endTime),
        isCompleted: validatedData.isCompleted || false,
        goalId: validatedData.goalId,
      };
      
      const [newEvent] = await db.insert(events).values(eventData).returning();
      
      res.status(201).json(newEvent);
    } catch (error) {
      console.error('Event creation error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Error creating event" });
    }
  });

  apiRouter.put("/events/:id", isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      console.log('Updating event:', eventId, req.body);
      
      const validatedData = eventSchema.partial().parse(req.body);
      
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (validatedData.title !== undefined) updateData.title = validatedData.title;
      if (validatedData.description !== undefined) updateData.description = validatedData.description;
      if (validatedData.category !== undefined) updateData.category = validatedData.category;
      if (validatedData.startTime !== undefined) updateData.startTime = new Date(validatedData.startTime);
      if (validatedData.endTime !== undefined) updateData.endTime = new Date(validatedData.endTime);
      if (validatedData.isCompleted !== undefined) updateData.isCompleted = validatedData.isCompleted;
      if (validatedData.goalId !== undefined) updateData.goalId = validatedData.goalId;
      
      const [updatedEvent] = await db
        .update(events)
        .set(updateData)
        .where(and(eq(events.id, eventId), eq(events.userId, req.user.userId)))
        .returning();
      
      if (!updatedEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json(updatedEvent);
    } catch (error) {
      console.error('Event update error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Error updating event" });
    }
  });

  apiRouter.delete("/events/:id", isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      console.log('Deleting event:', eventId);
      
      const [deletedEvent] = await db
        .delete(events)
        .where(and(eq(events.id, eventId), eq(events.userId, req.user.userId)))
        .returning();
      
      if (!deletedEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json({ message: "Event deleted successfully", event: deletedEvent });
    } catch (error) {
      console.error('Event deletion error:', error);
      res.status(500).json({ message: "Error deleting event" });
    }
  });

  // Toggle event completion
  apiRouter.patch("/events/:id/toggle-completion", isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      console.log('Toggling completion for event:', eventId);
      
      // First, get the current event to check its completion status
      const currentEvent = await db.query.events.findFirst({
        where: and(eq(events.id, eventId), eq(events.userId, req.user.userId))
      });
      
      if (!currentEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Toggle the completion status
      const [updatedEvent] = await db
        .update(events)
        .set({
          isCompleted: !currentEvent.isCompleted,
          updatedAt: new Date()
        })
        .where(and(eq(events.id, eventId), eq(events.userId, req.user.userId)))
        .returning();
      
      res.json(updatedEvent);
    } catch (error) {
      console.error('Event completion toggle error:', error);
      res.status(500).json({ message: "Error toggling event completion" });
    }
  });
  // Goals CRUD operations
  apiRouter.get("/goals", isAuthenticated, async (req, res) => {
    try {
      console.log('Fetching goals for user:', req.user.userId);
      
      const userGoals = await db.query.goals.findMany({
        where: eq(goals.userId, req.user.userId),
        orderBy: [goals.createdAt],
      });
      
      res.json(userGoals);
    } catch (error) {
      console.error('Goals fetch error:', error);
      res.status(500).json({ message: "Error fetching goals" });
    }
  });

  apiRouter.post("/goals", isAuthenticated, async (req, res) => {
    try {
      console.log('Creating goal:', req.body);
      const validatedData = goalSchema.parse(req.body);
      
      const goalData = {
        userId: req.user.userId,
        title: validatedData.title,
        description: validatedData.description || '',
        category: validatedData.category,
        priority: validatedData.priority || 'medium',
        targetDate: validatedData.targetDate ? new Date(validatedData.targetDate) : null,
        isCompleted: validatedData.isCompleted || false,
      };
      
      const [newGoal] = await db.insert(goals).values(goalData).returning();
      
      res.status(201).json(newGoal);
    } catch (error) {
      console.error('Goal creation error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Error creating goal" });
    }
  });

  apiRouter.put("/goals/:id", isAuthenticated, async (req, res) => {
    try {
      const goalId = parseInt(req.params.id);
      console.log('Updating goal:', goalId, req.body);
      
      const validatedData = goalSchema.partial().parse(req.body);
      
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (validatedData.title !== undefined) updateData.title = validatedData.title;
      if (validatedData.description !== undefined) updateData.description = validatedData.description;
      if (validatedData.category !== undefined) updateData.category = validatedData.category;
      if (validatedData.priority !== undefined) updateData.priority = validatedData.priority;
      if (validatedData.targetDate !== undefined) updateData.targetDate = validatedData.targetDate ? new Date(validatedData.targetDate) : null;
      if (validatedData.isCompleted !== undefined) updateData.isCompleted = validatedData.isCompleted;
      
      const [updatedGoal] = await db
        .update(goals)
        .set(updateData)
        .where(and(eq(goals.id, goalId), eq(goals.userId, req.user.userId)))
        .returning();
      
      if (!updatedGoal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      res.json(updatedGoal);
    } catch (error) {
      console.error('Goal update error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Error updating goal" });
    }
  });

  apiRouter.delete("/goals/:id", isAuthenticated, async (req, res) => {
    try {
      const goalId = parseInt(req.params.id);
      console.log('Deleting goal:', goalId);
      
      const [deletedGoal] = await db
        .delete(goals)
        .where(and(eq(goals.id, goalId), eq(goals.userId, req.user.userId)))
        .returning();
      
      if (!deletedGoal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      res.json({ message: "Goal deleted successfully", goal: deletedGoal });
    } catch (error) {
      console.error('Goal deletion error:', error);
      res.status(500).json({ message: "Error deleting goal" });
    }
  });

  // Balance history route
  apiRouter.get("/balance/history", isAuthenticated, async (req, res) => {
    try {
      console.log('Fetching balance history for user:', req.user.userId);
      
      const { days = 7 } = req.query;
      const daysCount = parseInt(days as string);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysCount);
      
      const balanceHistory = await db.query.dailyBalance.findMany({
        where: and(
          eq(dailyBalance.userId, req.user.userId),
          gte(dailyBalance.date, startDate),
          lte(dailyBalance.date, endDate)
        ),
        orderBy: [dailyBalance.date],
      });
      
      res.json(balanceHistory);
    } catch (error) {
      console.error('Balance history error:', error);
      res.status(500).json({ message: "Error fetching balance history" });
    }
  });

  // Streak routes
  apiRouter.get("/streak", isAuthenticated, async (req, res) => {
    try {
      console.log('Fetching streak for user:', req.user.userId);
      
      const [userStreak] = await db.query.streaks.findMany({
        where: eq(streaks.userId, req.user.userId),
        orderBy: [desc(streaks.updatedAt)],
        limit: 1,
      });
      
      if (!userStreak) {
        const [newStreak] = await db.insert(streaks).values({
          userId: req.user.userId,
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDate: new Date(),
        }).returning();
        
        return res.json(newStreak);
      }
      
      res.json(userStreak);
    } catch (error) {
      console.error('Streak fetch error:', error);
      res.status(500).json({ message: "Error fetching streak data" });
    }
  });

  apiRouter.post("/streak/update", isAuthenticated, async (req, res) => {
    try {
      console.log('Updating streak for user:', req.user.userId);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const [existingStreak] = await db.query.streaks.findMany({
        where: eq(streaks.userId, req.user.userId),
        limit: 1,
      });
      
      if (!existingStreak) {
        const [newStreak] = await db.insert(streaks).values({
          userId: req.user.userId,
          currentStreak: 1,
          longestStreak: 1,
          lastActivityDate: today,
        }).returning();
        
        return res.json(newStreak);
      }
      
      const lastActiveDate = new Date(existingStreak.lastActivityDate!);
      lastActiveDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let newCurrentStreak = existingStreak.currentStreak;
      let newLongestStreak = existingStreak.longestStreak;
      
      if (daysDiff === 0) {
        return res.json(existingStreak);
      } else if (daysDiff === 1) {
        newCurrentStreak += 1;
        newLongestStreak = Math.max(newLongestStreak, newCurrentStreak);
      } else {
        newCurrentStreak = 1;
      }
      
      const [updatedStreak] = await db
        .update(streaks)
        .set({
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
          lastActivityDate: today,
          updatedAt: new Date(),
        })
        .where(eq(streaks.id, existingStreak.id))
        .returning();
      
      res.json(updatedStreak);
    } catch (error) {
      console.error('Streak update error:', error);
      res.status(500).json({ message: "Error updating streak" });
    }
  });

// AI-powered event creation from chat
apiRouter.post("/chat/create-event", aiLimiter, isAuthenticated, async (req, res) => {
  try {
    console.log('Chat create event request:', req.body);
    
    const { message, preferences } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: "Message is required" });
    }

    // Get user's recent events for context
    const recentEvents = await db.query.events.findMany({
      where: eq(events.userId, req.user.userId),
      orderBy: desc(events.createdAt),
      limit: 10,
    });

    // Get user's goals for context
    const userGoals = await db.query.goals.findMany({
      where: eq(goals.userId, req.user.userId),
      orderBy: desc(goals.createdAt),
      limit: 5,
    });

    // Generate AI response to parse the event details from the message
    const eventParsingPrompt = `You are an AI assistant that helps users create calendar events from natural language descriptions. 

User's recent events for context:
${recentEvents.map(e => `- ${e.title} (${e.category}) on ${e.startTime.toISOString()}`).join('\n')}

User's current goals:
${userGoals.map(g => `- ${g.title} (${g.category})`).join('\n')}

User preferences: ${JSON.stringify(preferences || {})}

Parse the following message and extract event details. Return a JSON object with the following structure:
{
  "events": [
    {
      "title": "string",
      "description": "string (optional)",
      "category": "work|health|leisure|social|learning",
      "startTime": "ISO datetime string",
      "endTime": "ISO datetime string",
      "goalId": number (optional, if related to user's goals)
    }
  ],
  "suggestions": ["array of helpful suggestions"],
  "clarifications": ["array of things that need clarification"]
}

If the message is unclear about timing, suggest reasonable defaults based on the activity type.
If multiple events are mentioned, include all of them in the events array.
Current time reference: ${new Date().toISOString()}

User message: "${message}"

Respond with valid JSON only:`;

    const aiResponse = await aiService.generateChatResponse(
      eventParsingPrompt,
      req.user.userId,
      []
    );

    console.log('AI parsing response:', aiResponse);

    let parsedResponse;
    try {
      // Try to extract JSON from the AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      parsedResponse = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      
      // Fallback: Create a simple event based on the message
      const now = new Date();
      const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration
      
      parsedResponse = {
        events: [{
          title: message.slice(0, 100), // Use first 100 chars as title
          description: `Created from: "${message}"`,
          category: "work", // Default category
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        }],
        suggestions: ["I created a basic event from your message. You can edit the details as needed."],
        clarifications: ["Please specify the exact time and duration for better scheduling."]
      };
    }

    const createdEvents = [];
    const errors = [];

    // Create events from parsed response
    if (parsedResponse.events && Array.isArray(parsedResponse.events)) {
      for (const eventData of parsedResponse.events) {
        try {
          // Validate the event data
          const validatedEvent = eventSchema.parse({
            title: eventData.title,
            description: eventData.description || '',
            category: eventData.category || 'work',
            startTime: eventData.startTime,
            endTime: eventData.endTime,
            isCompleted: false,
            goalId: eventData.goalId
          });

          // Create the event
          const [newEvent] = await db.insert(events).values({
            userId: req.user.userId,
            title: validatedEvent.title,
            description: validatedEvent.description || '',
            category: validatedEvent.category,
            startTime: new Date(validatedEvent.startTime),
            endTime: new Date(validatedEvent.endTime),
            isCompleted: false,
            goalId: validatedEvent.goalId,
          }).returning();

          createdEvents.push(newEvent);
        } catch (eventError) {
          console.error('Error creating individual event:', eventError);
          errors.push(`Failed to create event "${eventData.title}": ${eventError.message}`);
        }
      }
    }

    // Store the chat interaction
    const [userMessage] = await db.insert(chatMessages).values({
      userId: req.user.userId,
      message: message,
      messageType: 'user',
      createdAt: new Date(),
    }).returning();

    const responseMessage = `I've processed your request and created ${createdEvents.length} event(s) for you:

${createdEvents.map(event => 
  `✅ **${event.title}**
  📅 ${new Date(event.startTime).toLocaleString()} - ${new Date(event.endTime).toLocaleString()}
  🏷️ Category: ${event.category}
  ${event.description ? `📝 ${event.description}` : ''}`
).join('\n\n')}

${parsedResponse.suggestions?.length ? `\n**Suggestions:**\n${parsedResponse.suggestions.map(s => `• ${s}`).join('\n')}` : ''}

${parsedResponse.clarifications?.length ? `\n**For next time:**\n${parsedResponse.clarifications.map(c => `• ${c}`).join('\n')}` : ''}

${errors.length ? `\n**Issues:**\n${errors.map(e => `⚠️ ${e}`).join('\n')}` : ''}`;

    await db.insert(chatMessages).values({
      userId: req.user.userId,
      message: responseMessage,
      messageType: 'ai',
      createdAt: new Date(),
      relatedMessageId: userMessage.id,
    });

    res.json({
      success: true,
      events: createdEvents,
      message: responseMessage,
      suggestions: parsedResponse.suggestions || [],
      clarifications: parsedResponse.clarifications || [],
      errors: errors,
      chatId: userMessage.id
    });

  } catch (error) {
    console.error('Chat create event error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: error.errors[0].message,
        success: false 
      });
    }
    res.status(500).json({ 
      message: "Error creating event from chat",
      success: false 
    });
  }
});

// Debug route to preview enhanced prompts without sending to AI
apiRouter.post("/chat/preview-enhanced-prompt", isAuthenticated, async (req, res) => {
  try {
    const validatedData = enhancedChatMessageSchema.parse(req.body);

    // Get recent chat history for context
    const recentMessages = await db.query.chatMessages.findMany({
      where: eq(chatMessages.userId, req.user.userId),
      orderBy: desc(chatMessages.createdAt),
      limit: 5,
    });

    const context = recentMessages.reverse().map(msg =>
      `${msg.messageType === 'user' ? 'User' : 'AI'}: ${msg.message}`
    );

    const messageType = detectMessageType(validatedData.message);
    const recommendedSettings = getRecommendedSettings(messageType);

    // Generate enhanced prompt
    const enhancedPrompt = enhancePrompt(
      validatedData.message,
      context,
      validatedData.responseType || recommendedSettings.responseType,
      validatedData.tone || recommendedSettings.tone,
      validatedData.detailLevel || recommendedSettings.detailLevel
    );

    res.json({
      originalMessage: validatedData.message,
      enhancedPrompt: enhancedPrompt,
      detectedMessageType: messageType,
      appliedSettings: {
        responseType: validatedData.responseType || recommendedSettings.responseType,
        tone: validatedData.tone || recommendedSettings.tone,
        detailLevel: validatedData.detailLevel || recommendedSettings.detailLevel
      },
      recommendedSettings: recommendedSettings,
      contextUsed: context.length > 0 ? context : ["No previous context available"]
    });

  } catch (error) {
    console.error('Enhanced prompt preview error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: "Error generating enhanced prompt preview" });
  }
});

// New route for prompt enhancement suggestions
apiRouter.post("/chat/analyze-prompt", isAuthenticated, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    const messageType = detectMessageType(message);
    const suggestions = {
      detectedType: messageType,
      recommendedSettings: getRecommendedSettings(messageType),
      enhancementOptions: getEnhancementOptions(message),
      examples: getExampleEnhancements(message, messageType)
    };

    res.json(suggestions);
  } catch (error) {
    console.error('Prompt analysis error:', error);
    res.status(500).json({ message: "Error analyzing prompt" });
  }
});

  // Mount the API router
  app.use("/api", apiRouter);
}