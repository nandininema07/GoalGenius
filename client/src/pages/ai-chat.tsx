import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../hooks/useAuth";
import { 
  Send, 
  Bot, 
  User, 
  Dumbbell, 
  BookOpen, 
  Scale, 
  Calendar,
  TrendingUp,
  Brain,
  Sparkles,
  Clock,
  Target,
  BarChart3,
  CalendarPlus,
  MessageSquare
} from "lucide-react";

interface ChatMessage {
  id: string;
  message: string;
  response?: string;
  messageType: 'user' | 'ai';
  createdAt: string;
  mode?: 'event' | 'suggestion';
}

interface ScheduleItem {
  startTime: string;
  endTime: string;
  title: string;
  category: string;
  description?: string;
}

interface BalanceAnalysis {
  workPercentage: number;
  healthPercentage: number;
  leisurePercentage: number;
  socialPercentage: number;
  learningPercentage: number;
  overallScore: number;
}

interface AISuggestion {
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

type AIMode = 'event' | 'suggestion';

export default function AIChat() {
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("chat");
  const [aiMode, setAiMode] = useState<AIMode>("suggestion");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Chat history query
  const { data: chatHistory = [], isLoading: chatLoading } = useQuery({
    queryKey: ["/api/chat/history"],
  });

  // Balance analysis query
  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ["/api/ai/analyze-balance"],
    enabled: activeTab === "insights",
  });

  // AI suggestions query
  const { data: suggestionsData, isLoading: suggestionsLoading } = useQuery({
    queryKey: ["/api/ai/suggestions"],
    enabled: activeTab === "suggestions",
  });

  // Send message mutation - Updated to handle different modes
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { message: string; mode: AIMode }) => {
      const endpoint = messageData.mode === 'event' 
        ? "/api/chat/create-event" 
        : "/api/chat/message";
      
      const response = await apiRequest("POST", endpoint, { 
        message: messageData.message,
        mode: messageData.mode,
        // Add context for event creation
        ...(messageData.mode === 'event' && {
          context: {
            userId: user?.id,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            preferences: {
              workHours: "9-5",
              workoutTime: "evening",
              availableTime: "evenings and weekends"
            }
          }
        })
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history"] });
      
      // Invalidate relevant queries based on mode
      if (variables.mode === 'event') {
        // Refresh calendar and analysis data when events are created
        queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks/daily"] });
        queryClient.invalidateQueries({ queryKey: ["/api/ai/analyze-balance"] });
        
        toast({
          title: "Event Created!",
          description: "Your event has been added to the calendar and tasks updated.",
        });
      } else {
        // Refresh suggestions when in suggestion mode
        queryClient.invalidateQueries({ queryKey: ["/api/ai/suggestions"] });
        
        toast({
          title: "Suggestion Generated",
          description: "AI has provided personalized recommendations.",
        });
      }
    },
    onError: (_, variables) => {
      const errorMessage = variables.mode === 'event' 
        ? "Failed to create event. Please try again."
        : "Failed to send message. Please try again.";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Generate schedule mutation
  const generateScheduleMutation = useMutation({
    mutationFn: async (goals: string) => {
      const response = await apiRequest("POST", "/api/ai/generate-schedule", { 
        goals,
        preferences: {
          workHours: "9-5",
          workoutTime: "evening",
          availableTime: "evenings and weekends"
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Schedule Generated!",
        description: "Your AI-generated schedule is ready. Check the chat for details.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/analyze-balance"] });
      setActiveTab("chat"); // Switch to chat to see the generated schedule
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Refresh balance analysis
  const refreshBalanceMutation = useMutation({
    mutationFn: async (date?: string) => {
      const queryParam = date ? `?date=${date}` : '';
      const response = await apiRequest("GET", `/api/ai/analyze-balance${queryParam}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/analyze-balance"] });
      toast({
        title: "Analysis Updated",
        description: "Your balance analysis has been refreshed.",
      });
    },
  });

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessageMutation.mutate({ message, mode: aiMode });
  };

  const handleQuickTemplate = (template: string) => {
    setMessage(template);
  };

  const handleGenerateSchedule = (goals: string) => {
    generateScheduleMutation.mutate(goals);
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  const quickTemplates = [
    {
      icon: Dumbbell,
      title: "🏃‍♂️ Fitness Journey",
      description: "Build a sustainable workout routine",
      template: "I want to build a sustainable fitness routine. I prefer evening workouts and have 1 hour available on weekdays and 2 hours on weekends. Help me create a balanced schedule that includes cardio, strength training, and rest days."
    },
    {
      icon: BookOpen,
      title: "📚 Learn New Skill",
      description: "Master a new language or hobby",
      template: "I want to learn Spanish and improve my programming skills. I have 30 minutes each morning before work and 1 hour in the evenings. Can you help me create a learning schedule that balances both goals?"
    },
    {
      icon: Scale,
      title: "⚖️ Work-Life Balance",
      description: "Optimize productivity and wellbeing",
      template: "I'm struggling with work-life balance. I work 9-5, want to maintain my health, spend time with family, and have some personal time. Help me create a daily schedule that balances all these priorities."
    }
  ];

  // Create a combined and sorted message list
  const sortedMessages = [...chatHistory]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .reduce((acc: ChatMessage[], current) => {
      // Add user message
      if (current.messageType === 'user') {
        acc.push({
          id: current.id + '_user',
          message: current.message,
          messageType: 'user',
          createdAt: current.createdAt,
          mode: current.mode
        });
      }
      // Add AI response if it exists
      if (current.response) {
        acc.push({
          id: current.id + '_ai',
          message: current.response,
          messageType: 'ai',
          createdAt: current.createdAt,
          mode: current.mode
        });
      }
      return acc;
    }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getModeIcon = (mode?: AIMode) => {
    return mode === 'event' ? CalendarPlus : MessageSquare;
  };

  const getModeColor = (mode?: AIMode) => {
    return mode === 'event' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Assistant</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Your personal AI for scheduling, balance analysis, and productivity insights
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Suggestions
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="h-96 flex flex-col">
                <CardContent className="flex-1 p-6 overflow-y-auto space-y-4">
                  {chatLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                    </div>
                  ) : sortedMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center">
                      <div>
                        <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">
                          Hi! I'm your AI scheduling assistant. Tell me about your goals and I'll help you create a balanced schedule.
                        </p>
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            💡 Use the dropdown below to choose between creating events or getting suggestions!
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {sortedMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex items-start space-x-3 ${
                            msg.messageType === 'user' ? 'justify-end' : ''
                          }`}
                        >
                          {msg.messageType === 'ai' ? (
                            <>
                              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <Bot className="w-4 h-4 text-white" />
                              </div>
                              <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg max-w-md">
                                {msg.mode && (
                                  <div className="mb-2">
                                    <Badge className={`text-xs ${getModeColor(msg.mode)}`}>
                                      {React.createElement(getModeIcon(msg.mode), { className: "w-3 h-3 mr-1" })}
                                      {msg.mode === 'event' ? 'Event Created' : 'Suggestion'}
                                    </Badge>
                                  </div>
                                )}
                                <pre className="text-gray-900 dark:text-white whitespace-pre-wrap font-sans text-sm">
                                  {msg.message}
                                </pre>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="bg-primary-500 text-white p-4 rounded-lg max-w-md">
                                {msg.mode && (
                                  <div className="mb-2">
                                    <Badge className="text-xs bg-white/20 text-white">
                                      {React.createElement(getModeIcon(msg.mode), { className: "w-3 h-3 mr-1" })}
                                      {msg.mode === 'event' ? 'Create Event' : 'Get Suggestion'}
                                    </Badge>
                                  </div>
                                )}
                                <p>{msg.message}</p>
                              </div>
                              <Avatar className="w-8 h-8 flex-shrink-0">
                                <AvatarFallback className="text-xs">
                                  {getUserInitials()}
                                </AvatarFallback>
                              </Avatar>
                            </>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </CardContent>

                <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
                  {/* AI Mode Selection */}
                  <div className="flex items-center space-x-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      AI Mode:
                    </label>
                    <Select value={aiMode} onValueChange={(value: AIMode) => setAiMode(value)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="suggestion">
                          <div className="flex items-center space-x-2">
                            <MessageSquare className="w-4 h-4" />
                            <span>Generate Suggestion</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="event">
                          <div className="flex items-center space-x-2">
                            <CalendarPlus className="w-4 h-4" />
                            <span>Add Event</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {aiMode === 'event' 
                        ? 'AI will create calendar events and update tasks'
                        : 'AI will provide suggestions and recommendations'
                      }
                    </div>
                  </div>
                  
                  {/* Message Input */}
                  <div className="flex space-x-3">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={aiMode === 'event' 
                        ? "Describe the event you want to create..."
                        : "Tell me your goals for suggestions..."
                      }
                      className="flex-1"
                      disabled={sendMessageMutation.isPending}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      }}
                    />
                    <Button
                      onClick={handleSubmit}
                      disabled={sendMessageMutation.isPending || !message.trim()}
                      className={`${
                        aiMode === 'event' 
                          ? 'bg-green-500 hover:bg-green-600' 
                          : 'bg-primary-500 hover:bg-primary-600'
                      }`}
                    >
                      {sendMessageMutation.isPending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : aiMode === 'event' ? (
                        <CalendarPlus className="w-4 h-4" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Quick Goal Templates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {quickTemplates.map((template, index) => {
                    const Icon = template.icon;
                    return (
                      <Button
                        key={index}
                        variant="outline"
                        className="w-full p-4 h-auto text-left justify-start hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                        onClick={() => handleQuickTemplate(template.template)}
                      >
                        <div className="flex items-start space-x-3">
                          <Icon className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                              {template.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {template.description}
                            </p>
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Schedule Generation Tab */}
        <TabsContent value="schedule" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Generate AI Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {quickTemplates.map((template, index) => {
                  const Icon = template.icon;
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full p-4 h-auto text-left justify-start hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                      onClick={() => handleGenerateSchedule(template.template)}
                      disabled={generateScheduleMutation.isPending}
                    >
                      <div className="flex items-start space-x-3">
                        <Icon className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                            {template.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </Button>
                  );
                })}
                
                {generateScheduleMutation.isPending && (
                  <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mr-2"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Generating your personalized schedule...
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>💡 Schedule Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span>AI-powered time allocation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span>Work-life balance optimization</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Personalized preferences</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span>Automatic calendar integration</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Balance Insights Tab */}
        <TabsContent value="insights" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Balance Analysis
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshBalanceMutation.mutate()}
                  disabled={refreshBalanceMutation.isPending}
                >
                  {refreshBalanceMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                  ) : (
                    "Refresh"
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                {balanceLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                  </div>
                ) : balanceData?.data ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary-500 mb-2">
                        {balanceData.data.overallScore}%
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Overall Balance Score</p>
                    </div>
                    
                    <div className="space-y-3">
                      {[
                        { label: 'Work', value: balanceData.data.workPercentage, color: 'bg-blue-500' },
                        { label: 'Health', value: balanceData.data.healthPercentage, color: 'bg-green-500' },
                        { label: 'Leisure', value: balanceData.data.leisurePercentage, color: 'bg-purple-500' },
                        { label: 'Social', value: balanceData.data.socialPercentage, color: 'bg-pink-500' },
                        { label: 'Learning', value: balanceData.data.learningPercentage, color: 'bg-amber-500' },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.label}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`${item.color} h-2 rounded-full transition-all duration-300`}
                                style={{ width: `${item.value}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-300 w-8">
                              {item.value}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No balance data available yet. Start using the scheduler to see insights!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-400 mb-1">
                      💡 Pro Tip
                    </h4>
                    <p className="text-blue-700 dark:text-blue-300">
                      Maintain a 60-20-20 balance: 60% productive activities, 20% health & wellness, 20% leisure.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h4 className="font-medium text-green-900 dark:text-green-400 mb-1">
                      🎯 Goal Focus
                    </h4>
                    <p className="text-green-700 dark:text-green-300">
                      Set specific time blocks for your most important goals to increase completion rates by 40%.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <h4 className="font-medium text-purple-900 dark:text-purple-400 mb-1">
                      ⚡ Energy Management
                    </h4>
                    <p className="text-purple-700 dark:text-purple-300">
                      Schedule demanding tasks during your peak energy hours for maximum productivity.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Suggestions Tab */}
        <TabsContent value="suggestions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Personalized AI Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {suggestionsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
              ) : suggestionsData?.suggestions?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestionsData.suggestions.map((suggestion: AISuggestion, index: number) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-500 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {suggestion.title}
                        </h4>
                        <Badge className={getPriorityColor(suggestion.priority)}>
                          {suggestion.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        {suggestion.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span className="capitalize">{suggestion.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No suggestions available yet. Start using the AI chat to get personalized recommendations!
                  </p>
                  <Button
                    onClick={() => setActiveTab("chat")}
                    className="bg-primary-500 hover:bg-primary-600"
                  >
                    Start Chatting
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}