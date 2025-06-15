import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Target, Flame, Calendar } from "lucide-react";

export default function Analytics() {
  const [timePeriod, setTimePeriod] = useState("week");

  const { data: balanceHistory = [] } = useQuery({
    queryKey: ["/api/balance/history", timePeriod],
    queryFn: async () => {
      const days = timePeriod === "week" ? 7 : timePeriod === "month" ? 30 : 365;
      const response = await fetch(`/api/balance/history?days=${days}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch balance history");
      return response.json();
    },
  });

  const { data: streak } = useQuery({
    queryKey: ["/api/streak"],
  });

  const { data: events = [] } = useQuery({
    queryKey: ["/api/events"],
  });

  // Prepare chart data
  const balanceChartData = balanceHistory.map((day: any) => ({
    date: new Date(day.date).toLocaleDateString(),
    score: day.overallScore,
    work: day.workPercentage,
    health: day.healthPercentage,
    leisure: day.leisurePercentage,
    social: day.socialPercentage,
    learning: day.learningPercentage,
  }));

  // Calculate average percentages for pie chart
  const avgPercentages = balanceHistory.length > 0 ? {
    work: Math.round(balanceHistory.reduce((sum: number, day: any) => sum + day.workPercentage, 0) / balanceHistory.length),
    health: Math.round(balanceHistory.reduce((sum: number, day: any) => sum + day.healthPercentage, 0) / balanceHistory.length),
    leisure: Math.round(balanceHistory.reduce((sum: number, day: any) => sum + day.leisurePercentage, 0) / balanceHistory.length),
    social: Math.round(balanceHistory.reduce((sum: number, day: any) => sum + day.socialPercentage, 0) / balanceHistory.length),
    learning: Math.round(balanceHistory.reduce((sum: number, day: any) => sum + day.learningPercentage, 0) / balanceHistory.length),
  } : { work: 0, health: 0, leisure: 0, social: 0, learning: 0 };

  const pieChartData = [
    { name: "Work", value: avgPercentages.work, color: "#3b82f6" },
    { name: "Health", value: avgPercentages.health, color: "#10b981" },
    { name: "Leisure", value: avgPercentages.leisure, color: "#8b5cf6" },
    { name: "Social", value: avgPercentages.social, color: "#f59e0b" },
    { name: "Learning", value: avgPercentages.learning, color: "#6366f1" },
  ];

  // Calculate completion rate
  const completedEvents = events.filter((event: any) => event.isCompleted);
  const completionRate = events.length > 0 ? Math.round((completedEvents.length / events.length) * 100) : 0;

  const timePeriods = [
    { id: "week", label: "Week" },
    { id: "month", label: "Month" },
    { id: "year", label: "Year" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Track your progress and get insights from your data
        </p>
      </div>

      {/* Time Period Selector */}
      <div className="mb-6">
        <div className="flex items-center space-x-2">
          {timePeriods.map((period) => (
            <Button
              key={period.id}
              variant={timePeriod === period.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimePeriod(period.id)}
              className={
                timePeriod === period.id 
                  ? "bg-primary-500 text-white" 
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }
            >
              {period.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Average Balance
              </h3>
              <TrendingUp className="w-5 h-5 text-primary-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {balanceHistory.length > 0 
                ? Math.round(balanceHistory.reduce((sum: number, day: any) => sum + day.overallScore, 0) / balanceHistory.length)
                : 0}%
            </div>
            <div className="text-sm text-emerald-500 mt-1">
              {timePeriod} average
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Current Streak
              </h3>
              <Flame className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {streak?.currentStreak || 0}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Longest Streak
              </h3>
              <Target className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {streak?.longestStreak || 0}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Completion Rate
              </h3>
              <Calendar className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {completionRate}%
            </div>
            <div className="text-sm text-emerald-500 mt-1">
              {completedEvents.length}/{events.length} events
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Balance Score Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Balance Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {balanceChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={balanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis 
                      dataKey="date" 
                      className="text-gray-600 dark:text-gray-300"
                      fontSize={12}
                    />
                    <YAxis 
                      className="text-gray-600 dark:text-gray-300"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--foreground)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No data available yet
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Time Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {pieChartData.some(item => item.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--foreground)'
                      }}
                      formatter={(value: any) => [`${value}%`, 'Time']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No category data available yet
                    </p>
                  </div>
                </div>
              )}
            </div>
            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {pieChartData.map((entry, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {entry.name}: {entry.value}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Performance */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Category Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {balanceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={balanceChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="date" 
                    className="text-gray-600 dark:text-gray-300"
                    fontSize={12}
                  />
                  <YAxis 
                    className="text-gray-600 dark:text-gray-300"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--foreground)'
                    }}
                  />
                  <Bar dataKey="work" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="health" stackId="a" fill="#10b981" />
                  <Bar dataKey="leisure" stackId="a" fill="#8b5cf6" />
                  <Bar dataKey="social" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="learning" stackId="a" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Start tracking your activities to see performance data
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="bg-gradient-to-r from-primary-50 to-emerald-50 dark:from-primary-900/20 dark:to-emerald-900/20 border-primary-200 dark:border-primary-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            🤖 AI Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {balanceHistory.length > 0 ? (
              <>
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Balance Analysis
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Your {timePeriod} average balance score is {Math.round(balanceHistory.reduce((sum: number, day: any) => sum + day.overallScore, 0) / balanceHistory.length)}%. 
                      {avgPercentages.work > 50 ? " Consider reducing work time for better balance." : ""}
                      {avgPercentages.health < 20 ? " Increase health activities for optimal wellness." : ""}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Streak Performance
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {(streak?.currentStreak || 0) > 7 
                        ? "Excellent consistency! You're building strong habits."
                        : "Focus on daily consistency to build longer streaks and lasting habits."
                      }
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Optimization Opportunity
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {avgPercentages.social < 10 
                        ? "Consider adding more social activities to improve your overall well-being."
                        : avgPercentages.learning < 5 
                        ? "Dedicate time to learning new skills for personal growth."
                        : "Your schedule shows good balance across all categories!"
                      }
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Getting Started
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Start by adding events to your calendar and completing daily activities. 
                    After a few days, you'll see detailed insights and personalized recommendations here.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
