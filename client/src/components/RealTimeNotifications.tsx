import { useEffect, useState } from 'react';
import { useToast } from '../hooks/use-toast';

interface Notification {
  id: string;
  type: 'goal' | 'event' | 'streak';
  message: string;
  timestamp: Date;
}

export function RealTimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();

  // For now, we'll just show a static notification
  useEffect(() => {
    const staticNotification: Notification = {
      id: '1',
      type: 'goal',
      message: 'Real-time notifications are temporarily disabled',
      timestamp: new Date(),
    };
    setNotifications([staticNotification]);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-background border rounded-lg shadow-lg p-4 mb-2 max-w-sm"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 