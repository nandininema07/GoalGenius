import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BalanceMeter } from "@/components/BalanceMeter";
import { Flame, Scale, CheckCircle, TrendingUp, Clock, Circle } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: balance } = useQuery({
    queryKey: ["/api/balance/today"],
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      work: "bg-blue-500",
      health: "bg-emerald-500",
      leisure: "bg-purple-500",
      social: "bg-amber-500",
      learning: "bg-indigo-500",
    };
    return colors[category as keyof typeof colors] || "bg-gray-500";
  };

  const getStatusIcon = (isCompleted: boolean) => {
    if (isCompleted) {
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    }
    return <Circle className="w-4 h-4 text-gray-300" />;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back!
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Here's your progress and balance overview for today
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Current Streak
              </h3>
              <Flame className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats?.currentStreak || 0} Days
            </div>
            <div className="text-sm text-emerald-500 mt-1">
              Keep it up!
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Balance Score
              </h3>
              <Scale className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {balance?.overallScore || 0}%
            </div>
            <div className="text-sm text-emerald-500 mt-1">
              {(balance?.overallScore || 0) >= 80 ? "Excellent balance" : "Room for improvement"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Tasks Completed
              </h3>
              <CheckCircle className="w-5 h-5 text-primary-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats?.tasksCompleted || 0}/{stats?.totalTasks || 0}
            </div>
            <div className="text-sm text-primary-500 mt-1">
              {stats?.totalTasks ? Math.round(((stats.tasksCompleted || 0) / stats.totalTasks) * 100) : 0}% completion
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Weekly Average
              </h3>
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats?.weeklyAverage || 0}%
            </div>
            <div className="text-sm text-emerald-500 mt-1">
              Trending up
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Balance Meter and Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Today's Life Balance</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            <BalanceMeter score={balance?.overallScore || 0} />
            
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Work</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {balance?.workPercentage || 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Health</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {balance?.healthPercentage || 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Leisure</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {balance?.leisurePercentage || 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Social</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {balance?.socialPercentage || 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Learning</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {balance?.learningPercentage || 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.todayEvents?.length > 0 ? (
                stats.todayEvents.map((event: any) => (
                  <div
                    key={event.id}
                    className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className={`w-2 h-2 ${getCategoryColor(event.category)} rounded-full`}></div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {event.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {" - "}
                        {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {getStatusIcon(event.isCompleted)}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No events scheduled for today. 
                    <br />
                    Use the AI Chat to generate a schedule!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Suggestions */}
      <Card className="bg-gradient-to-r from-primary-50 to-emerald-50 dark:from-primary-900/20 dark:to-emerald-900/20 border-primary-200 dark:border-primary-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            💡 AI Suggestions for You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Schedule Optimization
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Consider adding more health activities to improve your balance score.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Balance Improvement
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Try scheduling short breaks between work sessions to maintain focus.
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
