import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddEventModal } from "@/components/AddEventModal";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const { data: events = [] } = useQuery({
    queryKey: ["/api/events", startOfMonth.toISOString(), endOfMonth.toISOString()],
    queryFn: async () => {
      const response = await fetch(
        `/api/events?startDate=${startOfMonth.toISOString()}&endDate=${endOfMonth.toISOString()}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
  });

  const categories = [
    { id: "all", name: "All", color: "bg-gray-100" },
    { id: "work", name: "Work", color: "bg-blue-100" },
    { id: "health", name: "Health", color: "bg-emerald-100" },
    { id: "leisure", name: "Leisure", color: "bg-purple-100" },
    { id: "social", name: "Social", color: "bg-amber-100" },
    { id: "learning", name: "Learning", color: "bg-indigo-100" },
  ];

  const getCategoryColor = (category: string) => {
    const colors = {
      work: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      health: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
      leisure: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
      social: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
      learning: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
    };
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-700";
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startCalendar = new Date(firstDay);
    startCalendar.setDate(startCalendar.getDate() - firstDay.getDay());

    const days = [];
    const currentDay = new Date(startCalendar);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  };

  const getEventsForDay = (date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return events.filter((event: any) => {
      const eventDate = new Date(event.startTime);
      return eventDate >= dayStart && eventDate <= dayEnd &&
        (activeCategory === "all" || event.category === activeCategory);
    });
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsAddEventModalOpen(true);
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const days = getDaysInMonth();

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <Button
            onClick={() => setIsAddEventModalOpen(true)}
            className="bg-primary-500 hover:bg-primary-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        </div>
        <p className="text-gray-600 dark:text-gray-300">
          View and manage your AI-generated schedule
        </p>
      </div>

      {/* Calendar */}
      <Card className="mb-6">
        <CardContent className="p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" className="text-gray-700 dark:text-gray-300">
                Week
              </Button>
              <Button className="bg-primary-500 text-white">
                Month
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Week day headers */}
            {weekDays.map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {days.map((day, index) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = day.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(day)}
                  className={`
                    p-2 min-h-24 border border-gray-100 dark:border-gray-700 
                    hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer
                    ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-900 dark:text-white'}
                    ${isToday ? 'bg-primary-50 dark:bg-primary-900/20' : ''}
                  `}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary-600 dark:text-primary-400' : ''}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event: any) => (
                      <div
                        key={event.id}
                        className={`text-xs px-1 py-0.5 rounded truncate ${getCategoryColor(event.category)}`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500 px-1">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Category Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Category Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveCategory(category.id)}
                className={
                  activeCategory === category.id 
                    ? "bg-primary-500 text-white" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }
              >
                {category.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <AddEventModal
        isOpen={isAddEventModalOpen}
        onClose={() => setIsAddEventModalOpen(false)}
        defaultDate={selectedDate || undefined}
      />
    </div>
  );
}
