import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/components/ThemeProvider";
import { 
  ChartLine, 
  Bot, 
  Scale, 
  Flame, 
  BarChart3, 
  Calendar,
  Shield,
  Moon,
  Sun
} from "lucide-react";

export default function Landing() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const features = [
    {
      icon: Bot,
      title: "AI Goal Planning",
      description: "Simply tell our AI your goals and get personalized schedules that fit your lifestyle perfectly.",
      color: "text-primary-500",
      bgColor: "bg-primary-100 dark:bg-primary-900/30"
    },
    {
      icon: Scale,
      title: "Balance Tracking",
      description: "Monitor work-life balance with our smart scoring system covering all aspects of your day.",
      color: "text-emerald-500",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30"
    },
    {
      icon: Flame,
      title: "Streak Building",
      description: "Build lasting habits with gamified streak tracking that keeps you motivated every day.",
      color: "text-amber-500",
      bgColor: "bg-amber-100 dark:bg-amber-900/30"
    },
    {
      icon: BarChart3,
      title: "Smart Analytics",
      description: "Get detailed insights and AI-powered suggestions to continuously improve your schedule.",
      color: "text-purple-500",
      bgColor: "bg-purple-100 dark:bg-purple-900/30"
    },
    {
      icon: Calendar,
      title: "Flexible Calendar",
      description: "View and manually adjust your AI-generated schedule with our intuitive calendar interface.",
      color: "text-indigo-500",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/30"
    },
    {
      icon: Shield,
      title: "Secure & Scalable",
      description: "Enterprise-grade security with multi-user support for teams and organizations.",
      color: "text-red-500",
      bgColor: "bg-red-100 dark:bg-red-900/30"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Navigation Header */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <ChartLine className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-500 to-emerald-500 bg-clip-text text-transparent">
                FlowTrack
              </span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-primary-500 transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-gray-600 dark:text-gray-300 hover:text-primary-500 transition-colors">
                Pricing
              </a>
              <a href="#about" className="text-gray-600 dark:text-gray-300 hover:text-primary-500 transition-colors">
                About
              </a>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {theme === "light" ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => window.location.href = '/api/login'}
                className="text-primary-500 hover:text-primary-600"
              >
                Log In
              </Button>
              <Button
                onClick={() => window.location.href = '/api/login'}
                className="bg-primary-500 hover:bg-primary-600"
              >
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              AI-Powered
              <span className="bg-gradient-to-r from-primary-500 to-emerald-500 bg-clip-text text-transparent">
                {" "}Progress Tracking{" "}
              </span>
              <br />for Balanced Living
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Tell our AI your goals and get personalized schedules that balance work, health, and leisure. 
              Track streaks, analyze progress, and maintain perfect life balance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => window.location.href = '/api/login'}
                className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-4 text-lg transform hover:scale-105 transition-all"
              >
                Start Your Journey
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white px-8 py-4 text-lg transition-all"
              >
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Hero Dashboard Preview */}
          <div className="mt-16 relative">
            <Card className="max-w-5xl mx-auto overflow-hidden shadow-2xl">
              <div className="bg-gray-100 dark:bg-gray-700 p-4 flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-500 ml-4">FlowTrack Dashboard</span>
              </div>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Today's Balance</h3>
                      <div className="text-2xl font-bold text-emerald-500">87%</div>
                    </div>
                    <div className="relative w-32 h-32 mx-auto">
                      <div className="w-full h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 p-2">
                        <div className="w-full h-full bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
                          <span className="text-lg font-bold text-gray-900 dark:text-white">87%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Card className="p-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                        <Flame className="w-4 h-4 mr-2 text-amber-500" />
                        Current Streak
                      </h4>
                      <div className="text-2xl font-bold text-primary-500">23 Days</div>
                    </Card>
                    <Card className="p-4 bg-primary-50 dark:bg-primary-900/20">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                        <Bot className="w-4 h-4 mr-2 text-primary-500" />
                        AI Suggestion
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Take a 15-min walk after lunch to boost afternoon productivity
                      </p>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Features for Better Living
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Everything you need to build sustainable habits and maintain perfect life balance
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="p-8 hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-4`}>
                      <Icon className={`${feature.color} w-6 h-6`} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-primary-50 to-emerald-50 dark:from-primary-900/20 dark:to-emerald-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Transform Your Life?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Join thousands of users who have achieved better work-life balance with FlowTrack
          </p>
          <Button
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-4 text-lg transform hover:scale-105 transition-all"
          >
            Get Started Today
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center space-x-2 mb-8">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <ChartLine className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white">FlowTrack</span>
          </div>
          <p className="text-center text-gray-400">
            © 2024 FlowTrack. All rights reserved. Built with AI for better living.
          </p>
        </div>
      </footer>
    </div>
  );
}
