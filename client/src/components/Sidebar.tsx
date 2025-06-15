import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { 
  ChartLine, 
  Calendar, 
  Bot, 
  BarChart3, 
  Moon, 
  Sun 
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: ChartLine, path: '/' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, path: '/calendar' },
    { id: 'ai-chat', label: 'AI Chat', icon: Bot, path: '/ai-chat' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
  ];

  const handleNavigation = (item: typeof navItems[0]) => {
    setLocation(item.path);
    onTabChange(item.id);
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.email || 'User';
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-8">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-lg flex items-center justify-center">
            <ChartLine className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary-500 to-emerald-500 bg-clip-text text-transparent">
            FlowTrack
          </span>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path || (item.path === '/' && location === '/');
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start ${
                  isActive 
                    ? "bg-primary-500 text-white hover:bg-primary-600" 
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                onClick={() => handleNavigation(item)}
              >
                <Icon className="w-4 h-4 mr-3" />
                {item.label}
              </Button>
            );
          })}
        </nav>
      </div>

      <div className="absolute bottom-6 left-6 right-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {theme === "light" ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
          </Button>
          <div className="flex items-center space-x-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="text-xs">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                {getUserDisplayName()}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.location.href = '/api/logout'}
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}
