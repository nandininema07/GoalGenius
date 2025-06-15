import { HfInference } from '@huggingface/inference';

const HF_API_KEY = process.env.HUGGING_FACE_API_KEY || process.env.HF_TOKEN || process.env.HF_API_KEY || "hf_default";

const hf = new HfInference(HF_API_KEY);

export interface AIScheduleRequest {
  goals: string;
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
  async generateSchedule(request: AIScheduleRequest): Promise<AIScheduleResponse> {
    try {
      const prompt = this.buildSchedulePrompt(request);
      
      const response = await hf.textGeneration({
        model: 'microsoft/DialoGPT-medium',
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          return_full_text: false,
        },
      });

      return this.parseScheduleResponse(response.generated_text);
    } catch (error) {
      console.error('AI Service Error:', error);
      // Fallback to rule-based schedule generation
      return this.generateFallbackSchedule(request);
    }
  }

  async generateChatResponse(message: string, context?: string[]): Promise<string> {
    try {
      const prompt = this.buildChatPrompt(message, context);
      
      const response = await hf.textGeneration({
        model: 'microsoft/DialoGPT-medium',
        inputs: prompt,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.8,
          return_full_text: false,
        },
      });

      return response.generated_text.trim();
    } catch (error) {
      console.error('AI Chat Error:', error);
      return this.generateFallbackChatResponse(message);
    }
  }

  async analyzeBalance(events: Array<{ category: string; duration: number }>): Promise<{
    score: number;
    suggestions: string[];
    categoryBreakdown: Record<string, number>;
  }> {
    const totalTime = events.reduce((sum, event) => sum + event.duration, 0);
    
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

    // Convert to percentages
    Object.keys(categoryBreakdown).forEach(key => {
      categoryBreakdown[key as keyof typeof categoryBreakdown] = 
        Math.round((categoryBreakdown[key as keyof typeof categoryBreakdown] / totalTime) * 100);
    });

    // Calculate balance score (optimal: work 40%, health 25%, leisure 20%, social 10%, learning 5%)
    const optimal = { work: 40, health: 25, leisure: 20, social: 10, learning: 5 };
    let score = 100;
    
    Object.keys(optimal).forEach(key => {
      const deviation = Math.abs(categoryBreakdown[key as keyof typeof categoryBreakdown] - optimal[key as keyof typeof optimal]);
      score -= deviation * 0.5;
    });

    score = Math.max(0, Math.min(100, score));

    const suggestions = this.generateBalanceSuggestions(categoryBreakdown, optimal);

    return {
      score: Math.round(score),
      suggestions,
      categoryBreakdown,
    };
  }

  private buildSchedulePrompt(request: AIScheduleRequest): string {
    return `You are a personal productivity and life balance assistant. Based on the following goals and preferences, create a balanced daily schedule.

Goals: ${request.goals}

Preferences:
- Work hours: ${request.preferences?.workHours || 'Standard 9-5'}
- Workout time: ${request.preferences?.workoutTime || 'Flexible'}
- Available time: ${request.preferences?.availableTime || 'Evenings and weekends'}
- Restrictions: ${request.preferences?.restrictions || 'None'}

Please provide a JSON response with the following structure:
{
  "schedule": [
    {
      "title": "Morning workout",
      "category": "health",
      "startTime": "07:00",
      "endTime": "08:00",
      "description": "30 min cardio + 15 min stretching"
    }
  ],
  "balanceAnalysis": {
    "workPercentage": 35,
    "healthPercentage": 25,
    "leisurePercentage": 20,
    "socialPercentage": 15,
    "learningPercentage": 5
  },
  "suggestions": ["Take regular breaks", "Schedule social activities"]
}

Focus on creating a balanced schedule that promotes work-life balance and addresses the stated goals.`;
  }

  private buildChatPrompt(message: string, context?: string[]): string {
    const contextStr = context ? context.join('\n') : '';
    return `You are FlowTrack AI, a personal productivity and life balance assistant. Help the user with their scheduling and balance questions.

Previous context:
${contextStr}

User message: ${message}

Provide a helpful, encouraging response focused on productivity and life balance:`;
  }

  private parseScheduleResponse(response: string): AIScheduleResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
    }

    // Fallback response
    return this.generateFallbackSchedule({ goals: 'General productivity improvement' });
  }

  private generateFallbackSchedule(request: AIScheduleRequest): AIScheduleResponse {
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
          title: 'Focus Work Block',
          category: 'work',
          startTime: '09:30',
          endTime: '11:30',
          description: 'Deep work on most important tasks',
        },
        {
          title: 'Exercise Break',
          category: 'health',
          startTime: '12:00',
          endTime: '12:30',
          description: 'Quick workout or walk',
        },
        {
          title: 'Learning Time',
          category: 'learning',
          startTime: '18:00',
          endTime: '19:00',
          description: 'Skill development or reading',
        },
        {
          title: 'Relaxation',
          category: 'leisure',
          startTime: '20:00',
          endTime: '21:00',
          description: 'Unwind and enjoy personal time',
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
        'Try to maintain consistent sleep schedule',
        'Take regular breaks during work blocks',
        'Schedule social activities on weekends',
      ],
    };
  }

  private generateFallbackChatResponse(message: string): string {
    const responses = [
      "I'm here to help you build better habits and maintain work-life balance. Could you tell me more about your specific goals?",
      "Great question! For optimal balance, I recommend focusing on these key areas: work productivity, physical health, social connections, and personal growth.",
      "Building sustainable habits takes time. Start small and gradually increase the complexity of your schedule.",
      "Work-life balance is about finding what works for you. What aspects of your current routine would you like to improve?",
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateBalanceSuggestions(current: Record<string, number>, optimal: Record<string, number>): string[] {
    const suggestions: string[] = [];

    Object.keys(optimal).forEach(category => {
      const currentVal = current[category];
      const optimalVal = optimal[category];
      const diff = currentVal - optimalVal;

      if (Math.abs(diff) > 10) {
        if (diff > 0) {
          suggestions.push(`Consider reducing ${category} time by ${Math.abs(diff)}% to improve balance`);
        } else {
          suggestions.push(`Try to increase ${category} activities by ${Math.abs(diff)}% for better wellness`);
        }
      }
    });

    if (suggestions.length === 0) {
      suggestions.push('Your schedule shows excellent balance! Keep up the great work.');
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }
}

export const aiService = new AIService();
