import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Send, Bot, User, Dumbbell, BookOpen, Scale } from "lucide-react";

interface ChatMessage {
  id: string;
  message: string;
  messageType: 'user' | 'ai';
  createdAt: string;
}

export default function AIChat() {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: chatHistory = [], isLoading } = useQuery({
    queryKey: ["/api/chat/history"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat/message", { message });
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

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
        description: "Your AI-generated schedule is ready. Check your calendar.",
      });
      // You could automatically add these events to the calendar here
      console.log("Generated schedule:", data);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessageMutation.mutate(message);
  };

  const handleQuickTemplate = (template: string) => {
    setMessage(template);
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
          createdAt: current.createdAt
        });
      }
      // Add AI response if it exists
      if (current.response) {
        acc.push({
          id: current.id + '_ai',
          message: current.response,
          messageType: 'ai',
          createdAt: current.createdAt
        });
      }
      return acc;
    }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Chat</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Tell me your goals and I'll create a balanced schedule for you
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="h-96 flex flex-col">
            <CardContent className="flex-1 p-6 overflow-y-auto space-y-4">
              {isLoading ? (
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
                  </div>
                </div>
              ) : (
                <>
                  {/* Welcome message */}
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg max-w-md">
                      <p className="text-gray-900 dark:text-white">
                        Hi! I'm your AI scheduling assistant. Tell me about your goals and I'll help you create a balanced schedule. What would you like to achieve?
                      </p>
                    </div>
                  </div>

                  {/* Chat messages */}
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
                            <p className="text-gray-900 dark:text-white">{msg.message}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bg-primary-500 text-white p-4 rounded-lg max-w-md">
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

            {/* Chat Input */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <form onSubmit={handleSubmit} className="flex space-x-3">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell me your goals..."
                  className="flex-1"
                  disabled={sendMessageMutation.isPending}
                />
                <Button
                  type="submit"
                  disabled={sendMessageMutation.isPending || !message.trim()}
                  className="bg-primary-500 hover:bg-primary-600"
                >
                  {sendMessageMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* Quick Goal Templates */}
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

          {/* AI Features Info */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>💡 AI Capabilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                <span>Personalized schedule generation</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>Work-life balance optimization</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Habit building suggestions</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span>Progress tracking insights</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
