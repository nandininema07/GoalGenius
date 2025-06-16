import { HfInference } from '@huggingface/inference';
import { db } from '../db';
import { events, dailyBalance, goals } from '../../shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

const HF_API_KEY = process.env.HUGGING_FACE_API_KEY || process.env.HF_TOKEN || process.env.HF_API_KEY;

if (!HF_API_KEY || HF_API_KEY === "hf_default") {
  console.warn('Warning: Hugging Face API key not properly set. AI features may not work.');
}

const hf = new HfInference(HF_API_KEY);

export interface AIScheduleRequest {
  goals: string;
  userId: number;
  preferences?: {
    workHours?: string;
    workoutTime?: string;
    availableTime?: string;
    restrictions?: string;
  };
  currentSchedule?: Array<{
    title: string;
    startTime: string;
    endTime: string;
    category: string;
  }>;
}

export interface AIGoalPlanRequest {
  goalDescription: string;
  userId: number;
  timeframe: string; // e.g., "1 month", "3 weeks", "2 months"
  preferences?: {
    studyHours?: string;
    availableTimeSlots?: string[];
    difficultyPreference?: 'beginner' | 'intermediate' | 'advanced';
    resources?: string[]; // e.g., ["Striver's Sheet", "LeetCode", "Books"]
    existingKnowledge?: string;
  };
}

export interface AIGoalPlanResponse {
  goalTitle: string;
  description: string;
  timeframe: string;
  milestones: Array<{
    title: string;
    description: string;
    week: number;
    dueDate: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  dailyTasks: Array<{
    title: string;
    description: string;
    category: 'learning' | 'practice' | 'review' | 'project';
    estimatedTime: number; // in minutes
    difficulty: 'easy' | 'medium' | 'hard';
    resources: string[];
    dayOfWeek?: string; // optional for specific day recommendations
  }>;
  schedule: Array<{
    title: string;
    category: 'learning' | 'practice' | 'review' | 'project' | 'assessment';
    startTime: string;
    endTime: string;
    description: string;
    date: string; // specific date for the event
    priority: 'high' | 'medium' | 'low';
    resources: string[];
  }>;
  analysis: {
    feasibilityScore: number; // 1-100
    estimatedSuccessRate: number; // 1-100
    keySuccessFactors: string[];
    potentialChallenges: string[];
    recommendedAdjustments: string[];
  };
  trackingMetrics: Array<{
    name: string;
    target: number;
    unit: string;
    frequency: 'daily' | 'weekly' | 'monthly';
  }>;
}

export interface AIScheduleResponse {
  schedule: Array<{
    title: string;
    category: 'work' | 'health' | 'leisure' | 'social' | 'learning';
    startTime: string;
    endTime: string;
    description?: string;
  }>;
  balanceAnalysis: {
    workPercentage: number;
    healthPercentage: number;
    leisurePercentage: number;
    socialPercentage: number;
    learningPercentage: number;
  };
  suggestions: string[];
}

export class AIService {
  private maxRetries = 3;
  private baseDelay = 1000;

  // Enhanced method for creating comprehensive goal-based plans
  async createGoalBasedPlan(request: AIGoalPlanRequest): Promise<AIGoalPlanResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const enhancedPrompt = this.enhanceGoalPrompt(request);
        console.log('Enhanced Prompt:', enhancedPrompt);
        
        const response = await hf.textGeneration({
          model: 'mistralai/Mistral-7B-Instruct-v0.1',
          inputs: enhancedPrompt,
          parameters: {
            max_new_tokens: 1200,
            temperature: 0.3, // Lower temperature for more structured output
            return_full_text: false,
            do_sample: true,
          },
        });

        const result = this.parseGoalPlanResponse(response.generated_text, request);
        
        // Save the comprehensive plan to database
        await this.saveGoalPlanToDatabase(result, request.userId);
        
        return result;
        
      } catch (error) {
        console.error(`AI Goal Planning Error (attempt ${attempt + 1}):`, error);
        lastError = error as Error;
        
        if (attempt < this.maxRetries - 1) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.warn('AI goal planning failed after all retries, using fallback');
    return this.generateFallbackGoalPlan(request);
  }

  // Enhanced prompt creation for goal-based planning
  private enhanceGoalPrompt(request: AIGoalPlanRequest): string {
    const timeframeInDays = this.parseTimeframeToDays(request.timeframe);
    const studyHoursPerDay = request.preferences?.studyHours ? 
      this.parseStudyHours(request.preferences.studyHours) : 2;
    
    return `You are an expert learning strategist. Create a comprehensive study plan for this goal.

GOAL: ${request.goalDescription}
TIMEFRAME: ${request.timeframe} (${timeframeInDays} days)
DAILY STUDY TIME: ${studyHoursPerDay} hours
RESOURCES: ${request.preferences?.resources?.join(', ') || 'General study materials'}
EXISTING KNOWLEDGE: ${request.preferences?.existingKnowledge || 'Beginner level'}
DIFFICULTY PREFERENCE: ${request.preferences?.difficultyPreference || 'intermediate'}

Create a detailed plan that includes:
1. Weekly milestones with specific deliverables
2. Daily task breakdown with time estimates
3. Progressive difficulty curve
4. Regular assessment points
5. Feasibility analysis

Return ONLY a valid JSON object with this exact structure:
{
  "goalTitle": "Clear, specific goal title",
  "description": "Detailed description of what will be achieved",
  "timeframe": "${request.timeframe}",
  "milestones": [
    {
      "title": "Week 1: Foundation Building",
      "description": "Specific deliverables and learning outcomes",
      "week": 1,
      "dueDate": "YYYY-MM-DD",
      "priority": "high"
    }
  ],
  "dailyTasks": [
    {
      "title": "Array Fundamentals Practice",
      "description": "Solve 5 easy array problems on LeetCode",
      "category": "practice",
      "estimatedTime": 90,
      "difficulty": "easy",
      "resources": ["LeetCode", "Striver's Sheet"],
      "dayOfWeek": "Monday"
    }
  ],
  "schedule": [
    {
      "title": "DSA Study Session - Arrays",
      "category": "learning",
      "startTime": "09:00",
      "endTime": "10:30",
      "description": "Study array concepts and solve practice problems",
      "date": "YYYY-MM-DD",
      "priority": "high",
      "resources": ["Striver's Sheet", "LeetCode"]
    }
  ],
  "analysis": {
    "feasibilityScore": 85,
    "estimatedSuccessRate": 75,
    "keySuccessFactors": ["Consistent daily practice", "Progressive difficulty"],
    "potentialChallenges": ["Time management", "Complex algorithms"],
    "recommendedAdjustments": ["Start with easier problems", "Include breaks"]
  },
  "trackingMetrics": [
    {
      "name": "Problems Solved",
      "target": 150,
      "unit": "problems",
      "frequency": "daily"
    }
  ]
}

Focus on creating a realistic, progressive plan that builds skills systematically. Include specific dates starting from today.`;
  }

  private parseTimeframeToDays(timeframe: string): number {
    const timeframeLower = timeframe.toLowerCase();
    if (timeframeLower.includes('week')) {
      const weeks = parseInt(timeframeLower.match(/\d+/)?.[0] || '4');
      return weeks * 7;
    } else if (timeframeLower.includes('month')) {
      const months = parseInt(timeframeLower.match(/\d+/)?.[0] || '1');
      return months * 30;
    } else if (timeframeLower.includes('day')) {
      return parseInt(timeframeLower.match(/\d+/)?.[0] || '30');
    }
    return 30; // default to 30 days
  }

  private parseStudyHours(studyHours: string): number {
    const hours = parseInt(studyHours.match(/\d+/)?.[0] || '2');
    return Math.min(Math.max(hours, 1), 8); // Limit between 1-8 hours
  }

  private parseGoalPlanResponse(response: string, request: AIGoalPlanRequest): AIGoalPlanResponse {
    try {
      // Clean response and try to extract JSON
      let cleaned = response.trim();
      
      // Look for JSON object in the response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate and enhance the structure
        if (parsed.goalTitle && parsed.milestones && parsed.dailyTasks) {
          // Add actual dates to milestones and schedule
          const startDate = new Date();
          
          // Add dates to milestones
          parsed.milestones = parsed.milestones.map((milestone: any, index: number) => ({
            ...milestone,
            dueDate: this.addDays(startDate, (milestone.week || index + 1) * 7).toISOString().split('T')[0]
          }));

          // Add dates to schedule items
          parsed.schedule = parsed.schedule.map((item: any, index: number) => ({
            ...item,
            date: item.date === 'YYYY-MM-DD' ? 
              this.addDays(startDate, index).toISOString().split('T')[0] : 
              item.date
          }));

          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to parse AI goal plan response:', error);
    }

    return this.generateFallbackGoalPlan(request);
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private async saveGoalPlanToDatabase(plan: AIGoalPlanResponse, userId: number): Promise<void> {
    try {
      // 1. Save the main goal
      const [savedGoal] = await db.insert(goals).values({
        userId,
        title: plan.goalTitle,
        description: plan.description,
        category: 'learning',
        targetDate: new Date(Date.now() + this.parseTimeframeToDays(plan.timeframe) * 24 * 60 * 60 * 1000),
        isCompleted: false,
        priority: 'high',
      }).returning();

      // 2. Save milestones as sub-goals
      if (plan.milestones.length > 0) {
        const milestoneGoals = plan.milestones.map(milestone => ({
          userId,
          title: milestone.title,
          description: milestone.description,
          category: 'learning' as const,
          targetDate: new Date(milestone.dueDate),
          isCompleted: false,
          priority: milestone.priority as 'high' | 'medium' | 'low',
        }));
        await db.insert(goals).values(milestoneGoals);
      }

      // 3. Save scheduled events
      if (plan.schedule.length > 0) {
        const scheduleEvents = plan.schedule.map(item => ({
          userId,
          title: item.title,
          description: `${item.description}\n\nResources: ${item.resources.join(', ')}`,
          category: item.category,
          startTime: new Date(`${item.date} ${item.startTime}`),
          endTime: new Date(`${item.date} ${item.endTime}`),
          isCompleted: false,
        }));
        await db.insert(events).values(scheduleEvents);
      }

      console.log('Goal plan saved successfully to database');
    } catch (error) {
      console.error('Error saving goal plan to database:', error);
    }
  }

  private generateFallbackGoalPlan(request: AIGoalPlanRequest): AIGoalPlanResponse {
    const startDate = new Date();
    const timeframeDays = this.parseTimeframeToDays(request.timeframe);
    
    return {
      goalTitle: `Master ${this.extractSkillFromGoal(request.goalDescription)}`,
      description: `Comprehensive ${request.timeframe} plan to achieve: ${request.goalDescription}`,
      timeframe: request.timeframe,
      milestones: [
        {
          title: "Week 1: Foundation Building",
          description: "Master basic concepts and solve easy problems",
          week: 1,
          dueDate: this.addDays(startDate, 7).toISOString().split('T')[0],
          priority: 'high'
        },
        {
          title: "Week 2: Intermediate Concepts",
          description: "Tackle medium difficulty problems and learn advanced concepts",
          week: 2,
          dueDate: this.addDays(startDate, 14).toISOString().split('T')[0],
          priority: 'high'
        },
        {
          title: "Week 3: Advanced Practice",
          description: "Solve hard problems and focus on optimization",
          week: 3,
          dueDate: this.addDays(startDate, 21).toISOString().split('T')[0],
          priority: 'medium'
        },
        {
          title: "Week 4: Mock Interviews & Review",
          description: "Practice interviews and review weak areas",
          week: 4,
          dueDate: this.addDays(startDate, 28).toISOString().split('T')[0],
          priority: 'high'
        }
      ],
      dailyTasks: [
        {
          title: "Daily Problem Solving",
          description: "Solve 3-5 problems based on current week's focus",
          category: 'practice',
          estimatedTime: 120,
          difficulty: 'medium',
          resources: request.preferences?.resources || ['LeetCode', 'Practice Platform']
        },
        {
          title: "Concept Review",
          description: "Review and reinforce theoretical concepts",
          category: 'learning',
          estimatedTime: 60,
          difficulty: 'easy',
          resources: ['Study Materials', 'Documentation']
        },
        {
          title: "Progress Tracking",
          description: "Document solved problems and learning progress",
          category: 'review',
          estimatedTime: 15,
          difficulty: 'easy',
          resources: ['Progress Sheet']
        }
      ],
      schedule: this.generateFallbackSchedule(startDate, timeframeDays, request),
      analysis: {
        feasibilityScore: 75,
        estimatedSuccessRate: 70,
        keySuccessFactors: [
          'Consistent daily practice',
          'Progressive difficulty increase',
          'Regular review and reinforcement'
        ],
        potentialChallenges: [
          'Time management',
          'Maintaining motivation',
          'Understanding complex algorithms'
        ],
        recommendedAdjustments: [
          'Start with easier problems if struggling',
          'Include regular breaks to avoid burnout',
          'Join study groups for motivation'
        ]
      },
      trackingMetrics: [
        {
          name: 'Problems Solved',
          target: Math.floor(timeframeDays * 3), // 3 problems per day
          unit: 'problems',
          frequency: 'daily'
        },
        {
          name: 'Study Hours',
          target: timeframeDays * 2, // 2 hours per day
          unit: 'hours',
          frequency: 'daily'
        },
        {
          name: 'Concepts Mastered',
          target: Math.floor(timeframeDays / 7) * 3, // 3 concepts per week
          unit: 'concepts',
          frequency: 'weekly'
        }
      ]
    };
  }

  private extractSkillFromGoal(goalDescription: string): string {
    const skillKeywords = {
      'dsa': 'Data Structures & Algorithms',
      'data structures': 'Data Structures & Algorithms',
      'algorithms': 'Data Structures & Algorithms',
      'javascript': 'JavaScript',
      'python': 'Python',
      'react': 'React',
      'machine learning': 'Machine Learning',
      'web development': 'Web Development',
    };

    const lowerGoal = goalDescription.toLowerCase();
    for (const [keyword, skill] of Object.entries(skillKeywords)) {
      if (lowerGoal.includes(keyword)) {
        return skill;
      }
    }
    
    return 'Technical Skills';
  }

  private generateFallbackSchedule(startDate: Date, timeframeDays: number, request: AIGoalPlanRequest): any[] {
    const schedule = [];
    const studyHours = request.preferences?.studyHours ? 
      this.parseStudyHours(request.preferences.studyHours) : 2;
    
    for (let day = 0; day < Math.min(timeframeDays, 14); day++) { // Generate first 2 weeks
      const currentDate = this.addDays(startDate, day);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Morning study session
      schedule.push({
        title: `Study Session - Day ${day + 1}`,
        category: 'learning',
        startTime: '09:00',
        endTime: this.addMinutesToTime('09:00', studyHours * 30), // First half of study time
        description: 'Focused learning and concept review',
        date: dateStr,
        priority: 'high',
        resources: request.preferences?.resources || ['Study Materials']
      });

      // Practice session
      schedule.push({
        title: `Practice Session - Day ${day + 1}`,
        category: 'practice',
        startTime: this.addMinutesToTime('09:00', studyHours * 30 + 30), // After break
        endTime: this.addMinutesToTime('09:00', studyHours * 60 + 30),
        description: 'Hands-on problem solving and implementation',
        date: dateStr,
        priority: 'high',
        resources: request.preferences?.resources || ['Practice Platform']
      });
    }
    
    return schedule;
  }

  private addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }

  // Add this method for testing Hugging Face connection
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Hugging Face connection...');
      console.log('API Key present:', !!HF_API_KEY);
      console.log('API Key starts with hf_:', HF_API_KEY?.startsWith('hf_'));

      const response = await hf.textGeneration({
        model: 'mistralai/Mistral-7B-Instruct-v0.1',
        inputs: 'Hello, this is a test.',
        parameters: {
          max_new_tokens: 50,
          temperature: 0.7,
          return_full_text: false,
        },
      });

      console.log('HF Test successful:', response);
      return true;
    } catch (error: any) {
      console.error('HF Test failed:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        body: error.body
      });
      return false;
    }
  }

  async generateSchedule(request: AIScheduleRequest): Promise<AIScheduleResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const prompt = this.buildSchedulePrompt(request);
        
        const response = await hf.textGeneration({
          model: 'mistralai/Mistral-7B-Instruct-v0.1',
          inputs: prompt,
          parameters: {
            max_new_tokens: 800,
            temperature: 0.4,
            return_full_text: false,
            do_sample: true,
          },
        });

        const result = this.parseScheduleResponse(response.generated_text);
        
        if (result.schedule.length > 0) {
          await this.saveScheduleToDatabase(result.schedule, request.userId);
        }
        
        return result;
        
      } catch (error) {
        console.error(`AI Service Error (attempt ${attempt + 1}):`, error);
        lastError = error as Error;
        
        if (attempt < this.maxRetries - 1) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.warn('AI service failed after all retries, using fallback');
    return this.generateFallbackSchedule(request);
  }

  async generateChatResponse(message: string, userId: number, context?: string[]): Promise<string> {
    try {
      const userGoals = await db.query.goals.findMany({
        where: eq(goals.userId, userId),
        limit: 3,
      });
      
      const prompt = this.buildChatPrompt(message, context, userGoals);
      
      const response = await hf.textGeneration({
        model: 'mistralai/Mistral-7B-Instruct-v0.1',
        inputs: prompt,
        parameters: {
          max_new_tokens: 300,
          temperature: 0.7,
          return_full_text: false,
        },
      });

      return this.cleanChatResponse(response.generated_text);
      
    } catch (error) {
      console.error('AI Chat Error:', error);
      return this.generateFallbackChatResponse(message);
    }
  }

  async analyzeBalance(userId: number, date?: string): Promise<{
    score: number;
    suggestions: string[];
    categoryBreakdown: Record<string, number>;
  }> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const startOfDay = new Date(targetDate + 'T00:00:00');
      const endOfDay = new Date(targetDate + 'T23:59:59');

      const dayEvents = await db.query.events.findMany({
        where: and(
          eq(events.userId, userId),
          gte(events.startTime, startOfDay),
          lte(events.endTime, endOfDay)
        ),
      });

      const analysisData = dayEvents.map(event => ({
        category: event.category,
        duration: this.calculateDuration(event.startTime, event.endTime),
      }));

      const result = this.calculateBalanceScore(analysisData);
      
      await this.saveDailyBalance(userId, targetDate, result);
      
      return result;
      
    } catch (error) {
      console.error('Balance analysis error:', error);
      return this.getFallbackBalance();
    }
  }

  async generateAISuggestions(userId: number): Promise<string[]> {
    try {
      const recentBalance = await db.query.dailyBalance.findMany({
        where: eq(dailyBalance.userId, userId),
        limit: 7,
      });

      const incompleteGoals = await db.query.goals.findMany({
        where: and(
          eq(goals.userId, userId),
          eq(goals.isCompleted, false)
        ),
        limit: 5,
      });

      const prompt = this.buildSuggestionsPrompt(recentBalance, incompleteGoals);
      
      const response = await hf.textGeneration({
        model: 'google/flan-t5-base',
        inputs: prompt,
        parameters: {
          max_new_tokens: 400,
          temperature: 0.6,
          return_full_text: false,
        },
      });

      return this.parseSuggestions(response.generated_text);
      
    } catch (error) {
      console.error('AI Suggestions Error:', error);
      return this.getFallbackSuggestions();
    }
  }

  private buildSchedulePrompt(request: AIScheduleRequest): string {
    return `Create a balanced daily schedule based on these goals. Return only a valid JSON object with no additional text.

Goals: ${request.goals}

Work Hours: ${request.preferences?.workHours || '9 AM - 5 PM'}
Workout Preference: ${request.preferences?.workoutTime || 'Morning'}
Available Time: ${request.preferences?.availableTime || 'Evenings'}
Restrictions: ${request.preferences?.restrictions || 'None'}

Return this exact JSON structure:
{
  "schedule": [
    {
      "title": "Task name",
      "category": "work",
      "startTime": "09:00",
      "endTime": "10:00",
      "description": "Brief description"
    }
  ],
  "balanceAnalysis": {
    "workPercentage": 40,
    "healthPercentage": 25,
    "leisurePercentage": 20,
    "socialPercentage": 10,
    "learningPercentage": 5
  },
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}

Categories must be: work, health, leisure, social, or learning
Times in HH:MM format
Create 5-8 balanced activities`;
  }

  private buildChatPrompt(message: string, context?: string[], userGoals?: any[]): string {
    const goalContext = userGoals && userGoals.length > 0 
      ? `User's current goals: ${userGoals.map(g => g.title).join(', ')}` 
      : '';
    
    const conversationContext = context && context.length > 0 
      ? `Previous conversation:\n${context.slice(-3).join('\n')}` 
      : '';

    return `You are FlowTrack AI, a helpful productivity and life balance assistant. Be encouraging, practical, and focus on actionable advice.

${goalContext}
${conversationContext}

User: ${message}

FlowTrack AI:`;
  }

  private cleanChatResponse(response: string): string {
    let cleaned = response.trim();
    
    const prefixesToRemove = ['FlowTrack AI:', 'AI:', 'Assistant:', 'Bot:'];
    for (const prefix of prefixesToRemove) {
      if (cleaned.startsWith(prefix)) {
        cleaned = cleaned.substring(prefix.length).trim();
      }
    }
    
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    return cleaned || this.generateFallbackChatResponse('');
  }

  private parseScheduleResponse(response: string): AIScheduleResponse {
    try {
      let cleaned = response.trim();
      
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        if (parsed.schedule && Array.isArray(parsed.schedule)) {
          return {
            schedule: parsed.schedule.filter(item => 
              item.title && item.category && item.startTime && item.endTime
            ),
            balanceAnalysis: parsed.balanceAnalysis || {
              workPercentage: 40,
              healthPercentage: 25,
              leisurePercentage: 20,
              socialPercentage: 10,
              learningPercentage: 5,
            },
            suggestions: parsed.suggestions || [],
          };
        }
      }
    } catch (error) {
      console.error('Failed to parse AI schedule response:', error);
    }

    return this.generateFallbackScheduleResponse({ goals: 'General productivity', userId: 0 });
  }

  private calculateDuration(startTime: Date, endTime: Date): number {
    return Math.max(0, (endTime.getTime() - startTime.getTime()) / (1000 * 60));
  }

  private calculateBalanceScore(events: Array<{ category: string; duration: number }>): {
    score: number;
    suggestions: string[];
    categoryBreakdown: Record<string, number>;
  } {
    const totalTime = events.reduce((sum, event) => sum + event.duration, 0);
    
    if (totalTime === 0) {
      return this.getFallbackBalance();
    }
    
    const categoryBreakdown = {
      work: 0,
      health: 0,
      leisure: 0,
      social: 0,
      learning: 0,
    };

    events.forEach(event => {
      if (categoryBreakdown.hasOwnProperty(event.category)) {
        categoryBreakdown[event.category as keyof typeof categoryBreakdown] += event.duration;
      }
    });

    Object.keys(categoryBreakdown).forEach(key => {
      categoryBreakdown[key as keyof typeof categoryBreakdown] = 
        Math.round((categoryBreakdown[key as keyof typeof categoryBreakdown] / totalTime) * 100);
    });

    const optimal = { work: 40, health: 25, leisure: 20, social: 10, learning: 5 };
    const weights = { work: 1.0, health: 1.2, leisure: 0.8, social: 0.6, learning: 0.7 };
    
    let score = 100;
    Object.keys(optimal).forEach(key => {
      const deviation = Math.abs(
        categoryBreakdown[key as keyof typeof categoryBreakdown] - 
        optimal[key as keyof typeof optimal]
      );
      const weight = weights[key as keyof typeof weights];
      score -= deviation * weight * 0.4;
    });

    score = Math.max(0, Math.min(100, Math.round(score)));
    const suggestions = this.generateBalanceSuggestions(categoryBreakdown, optimal);

    return { score, suggestions, categoryBreakdown };
  }

  private async saveScheduleToDatabase(schedule: any[], userId: number): Promise<void> {
    try {
      const today = new Date();
      const eventsToInsert = schedule.map(item => ({
        userId,
        title: item.title,
        description: item.description || '',
        category: item.category,
        startTime: new Date(`${today.toDateString()} ${item.startTime}`),
        endTime: new Date(`${today.toDateString()} ${item.endTime}`),
        isCompleted: false,
      }));

      await db.insert(events).values(eventsToInsert);
    } catch (error) {
      console.error('Error saving schedule to database:', error);
    }
  }

  private async saveDailyBalance(userId: number, date: string, balance: any): Promise<void> {
    try {
      await db.insert(dailyBalance).values({
        userId,
        date: new Date(date),
        workPercentage: balance.categoryBreakdown.work,
        healthPercentage: balance.categoryBreakdown.health,
        leisurePercentage: balance.categoryBreakdown.leisure,
        socialPercentage: balance.categoryBreakdown.social,
        learningPercentage: balance.categoryBreakdown.learning,
        overallScore: balance.score,
      }).onConflictDoUpdate({
        target: [dailyBalance.userId, dailyBalance.date],
        set: {
          workPercentage: balance.categoryBreakdown.work,
          healthPercentage: balance.categoryBreakdown.health,
          leisurePercentage: balance.categoryBreakdown.leisure,
          socialPercentage: balance.categoryBreakdown.social,
          learningPercentage: balance.categoryBreakdown.learning,
          overallScore: balance.score,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error saving daily balance:', error);
    }
  }

  private buildSuggestionsPrompt(recentBalance: any[], incompleteGoals: any[]): string {
    const avgScore = recentBalance.length > 0 
      ? recentBalance.reduce((sum, b) => sum + (b.overallScore || 0), 0) / recentBalance.length
      : 50;

    return `Based on user data, provide 3-5 specific improvement suggestions. Return as numbered list.

Average Balance Score: ${Math.round(avgScore)}/100
Incomplete Goals: ${incompleteGoals.map(g => g.title).join(', ') || 'None'}

Focus on actionable advice for better work-life balance and goal achievement.
Format: 1. Suggestion text 2. Another suggestion...`;
  }

  private parseSuggestions(response: string): string[] {
    const suggestions: string[] = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(.+)$/);
      if (match) {
        suggestions.push(match[1].trim());
      }
    }
    
    return suggestions.length > 0 ? suggestions : this.getFallbackSuggestions();
  }

  private generateFallbackScheduleResponse(request: AIScheduleRequest): AIScheduleResponse {
    return {
      schedule: [
        {
          title: 'Morning Planning',
          category: 'work',
          startTime: '09:00',
          endTime: '09:30',
          description: 'Review daily goals and priorities',
        },
        {
          title: 'Focus Work Session',
          category: 'work',
          startTime: '09:30',
          endTime: '11:30',
          description: 'Deep work on most important tasks',
        },
        {
          title: 'Health Break',
          category: 'health',
          startTime: '12:00',
          endTime: '12:30',
          description: 'Exercise or mindful walk',
        },
        {
          title: 'Learning Time',
          category: 'learning',
          startTime: '18:00',
          endTime: '19:00',
          description: 'Skill development or reading',
        },
        {
          title: 'Personal Time',
          category: 'leisure',
          startTime: '20:00',
          endTime: '21:00',
          description: 'Relaxation and personal activities',
        },
      ],
      balanceAnalysis: {
        workPercentage: 40,
        healthPercentage: 25,
        leisurePercentage: 20,
        socialPercentage: 10,
        learningPercentage: 5,
      },
      suggestions: [
        'Maintain consistent daily routines for better productivity',
        'Take regular breaks to avoid burnout',
        'Schedule social activities to maintain relationships',
      ],
    };
  }

  private generateFallbackChatResponse(message: string): string {
    const responses = [
      "I'm here to help you achieve better work-life balance. What specific area would you like to focus on?",
      "Let's work together to optimize your schedule. What are your main goals right now?",
      "Building sustainable habits is key to long-term success. What would you like to improve first?",
      "I can help you create a balanced schedule that works for your lifestyle. What's your biggest challenge?",
      "Great question! Focus on small, consistent improvements rather than dramatic changes.",
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  private getFallbackBalance() {
    return {
      score: 60,
      suggestions: [
        'Try to add more physical activity to your day',
        'Consider scheduling dedicated time for relaxation',
        'Balance work tasks with personal development',
      ],
      categoryBreakdown: {
        work: 45,
        health: 20,
        leisure: 20,
        social: 10,
        learning: 5,
      },
    };
  }

  private getFallbackSuggestions(): string[] {
    return [
      'Start your day with a 10-minute planning session',
      'Schedule regular breaks every 2 hours during work',
      'Add at least 30 minutes of physical activity daily',
      'Set boundaries between work and personal time',
      'Practice gratitude or mindfulness for 5 minutes daily',
    ];
  }

  private generateBalanceSuggestions(current: Record<string, number>, optimal: Record<string, number>): string[] {
    const suggestions: string[] = [];

    Object.keys(optimal).forEach(category => {
      const currentVal = current[category];
      const optimalVal = optimal[category];
      const diff = currentVal - optimalVal;

      if (Math.abs(diff) > 15) {
        if (diff > 0) {
          suggestions.push(`Consider reducing ${category} time by ${Math.abs(diff)}% for better balance`);
        } else {
          suggestions.push(`Try to increase ${category} activities by ${Math.abs(diff)}% for better wellness`);
        }
      }
    });

    if (suggestions.length === 0) {
      suggestions.push('Your schedule shows good balance! Keep maintaining this routine.');
    }

    return suggestions.slice(0, 3);
  }
}

export const aiService = new AIService();