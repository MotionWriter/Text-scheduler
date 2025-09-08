import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface UserProgressDashboardProps {
  onBack: () => void;
}

export function UserProgressDashboard({ onBack }: UserProgressDashboardProps) {
  const [selectedStudyBook, setSelectedStudyBook] = useState<Id<"studyBooks"> | null>(null);

  // Queries
  const studyBooks = useQuery(api.studyBooks.list) || [];
  const progressData = useQuery(api.userDashboard.getLessonProgress, 
    selectedStudyBook ? { studyBookId: selectedStudyBook } : {}
  ) || [];
  const recentActivity = useQuery(api.userDashboard.getRecentActivity, { limit: 10 }) || [];

  const activeStudyBooks = studyBooks.filter(book => book.isActive);

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'custom_message_created': return '✏️';
      case 'message_selected': return '✅';
      case 'message_scheduled': return '📅';
      case 'custom_message_updated': return '📝';
      case 'message_unselected': return '❌';
      default: return '📝';
    }
  };

  const getActivityDescription = (activity: any) => {
    switch (activity.activityType) {
      case 'custom_message_created':
        return `Created a custom message for "${activity.lessonTitle}"`;
      case 'message_selected':
        return `Selected a message for "${activity.lessonTitle}"`;
      case 'message_scheduled':
        return `Scheduled a message for "${activity.lessonTitle}"`;
      case 'custom_message_updated':
        return `Updated a custom message for "${activity.lessonTitle}"`;
      case 'message_unselected':
        return `Removed a message from "${activity.lessonTitle}"`;
      default:
        return `Activity in "${activity.lessonTitle}"`;
    }
  };

  const calculateCompletionPercentage = (lesson: any) => {
    const totalMessages = lesson.predefinedMessageCount + lesson.maxCustomMessages;
    const selectedMessages = lesson.selectedMessageCount;
    return totalMessages > 0 ? Math.round((selectedMessages / totalMessages) * 100) : 0;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    if (percentage >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Your Study Progress</h3>
          <p className="text-gray-600 text-sm">Track your journey through study books and lessons</p>
        </div>
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
        >
          ← Back to Study Books
        </button>
      </div>

      {/* Study Book Filter */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Study Book
        </label>
        <select
          value={selectedStudyBook || ""}
          onChange={(e) => setSelectedStudyBook(e.target.value ? e.target.value as Id<"studyBooks"> : null)}
          className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Study Books</option>
          {activeStudyBooks.map((book) => (
            <option key={book._id} value={book._id}>
              {book.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Overview */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Lesson Progress</h4>
          
          {progressData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <h5 className="text-lg font-medium text-gray-900 mb-2">No Progress Data</h5>
              <p className="text-sm">Start selecting messages to see your progress here.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {progressData.map((lesson, index) => {
                const completionPercentage = calculateCompletionPercentage(lesson);
                return (
                  <div key={index} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-gray-900">
                          {lesson.studyBookTitle} - Lesson {lesson.lessonNumber}
                        </h5>
                        <p className="text-xs text-gray-600">{lesson.lessonTitle}</p>
                      </div>
                      <span className="text-xs font-medium text-gray-500">
                        {completionPercentage}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(completionPercentage)}`}
                        style={{ width: `${completionPercentage}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>
                        {lesson.selectedMessageCount} of {lesson.predefinedMessageCount + lesson.maxCustomMessages} messages selected
                      </span>
                      <div className="flex gap-3">
                        <span>📋 {lesson.predefinedMessageCount} predefined</span>
                        <span>✏️ {lesson.customMessageCount}/2 custom</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h4>
          
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📝</span>
              </div>
              <h5 className="text-lg font-medium text-gray-900 mb-2">No Recent Activity</h5>
              <p className="text-sm">Your recent actions will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <span className="text-lg">{getActivityIcon(activity.activityType)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {getActivityDescription(activity)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity._creationTime).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {progressData.length > 0 && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Study Summary</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">
                {progressData.length}
              </div>
              <div className="text-sm text-blue-700">Lessons Started</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {progressData.filter(lesson => calculateCompletionPercentage(lesson) === 100).length}
              </div>
              <div className="text-sm text-green-700">Lessons Completed</div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">
                {progressData.reduce((sum, lesson) => sum + lesson.customMessageCount, 0)}
              </div>
              <div className="text-sm text-purple-700">Custom Messages</div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600">
                {progressData.reduce((sum, lesson) => sum + lesson.selectedMessageCount, 0)}
              </div>
              <div className="text-sm text-orange-700">Total Selected</div>
            </div>
          </div>
        </div>
      )}

      {/* Tips and Encouragement */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-2xl">💡</span>
          </div>
          <div className="ml-3">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Keep Growing!</h4>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                • <strong>Create custom messages</strong> to personalize your study experience
              </p>
              <p>
                • <strong>Select predefined messages</strong> that resonate with your current spiritual journey
              </p>
              <p>
                • <strong>Schedule your messages</strong> to receive timely reminders and encouragement
              </p>
              <p>
                • <strong>Track your progress</strong> to see how far you've come in your studies
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}