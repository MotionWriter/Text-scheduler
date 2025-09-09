import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { StudyBookBrowser } from "./StudyBookBrowser";
import { MessageSelector } from "./MessageSelector";
import { UserProgressDashboard } from "./UserProgressDashboard";
import { DeliveryHistoryView } from "./DeliveryHistoryView";
import { KanbanBoard } from "./KanbanBoard";

export function StudyMessagesTab() {
  const [selectedStudyBook, setSelectedStudyBook] = useState<Id<"studyBooks"> | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Id<"lessons"> | null>(null);
  const [activeView, setActiveView] = useState<"books" | "lessons" | "messages" | "progress" | "delivery">("books");

  const studyBooks = useQuery(api.studyBooks.list) || [];
  const lessons = useQuery(
    api.lessons.listByStudyBook,
    selectedStudyBook ? { studyBookId: selectedStudyBook } : "skip",
  ) || [];
  const selectedStudyBookData = studyBooks.find(book => book._id === selectedStudyBook);
  const selectedLessonData = lessons.find(lesson => lesson._id === selectedLesson);

  const handleStudyBookSelect = (bookId: Id<"studyBooks">) => {
    setSelectedStudyBook(bookId);
    setSelectedLesson(null);
    setActiveView("lessons");
  };

  const handleLessonSelect = (lessonId: Id<"lessons">) => {
    setSelectedLesson(lessonId);
    setActiveView("messages");
  };

  const handleBackToBooks = () => {
    setSelectedStudyBook(null);
    setSelectedLesson(null);
    setActiveView("books");
  };

  const handleBackToLessons = () => {
    setSelectedLesson(null);
    setActiveView("lessons");
  };

  return (
    <div className="space-y-6">
      {/* Header with breadcrumb navigation */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">Study Messages</h2>
          <nav className="flex space-x-2 text-sm text-gray-600">
            <button 
              onClick={() => setActiveView("books")}
              className={`hover:text-blue-600 ${activeView === "books" ? "font-medium text-blue-600" : ""}`}
            >
              Study Books
            </button>
            {selectedStudyBook && (
              <>
                <span>/</span>
                <button 
                  onClick={() => setActiveView("lessons")}
                  className={`hover:text-blue-600 ${activeView === "lessons" ? "font-medium text-blue-600" : ""}`}
                >
                  {selectedStudyBookData?.title || "Lessons"}
                </button>
              </>
            )}
            {selectedLesson && (
              <>
                <span>/</span>
                <button 
                  onClick={() => setActiveView("messages")}
                  className={`hover:text-blue-600 ${activeView === "messages" ? "font-medium text-blue-600" : ""}`}
                >
                  {selectedLessonData?.title || "Messages"}
                </button>
              </>
            )}
          </nav>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView("progress")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeView === "progress" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            📊 My Progress
          </button>
          <button
            onClick={() => setActiveView("delivery")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeView === "delivery" 
                ? "bg-green-600 text-white" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            📨 Delivery History
          </button>
        </div>
      </div>

      {/* Content based on active view */}
      {activeView === "books" && (
        <StudyBookBrowser 
          studyBooks={studyBooks}
          onSelectStudyBook={handleStudyBookSelect}
        />
      )}

      {activeView === "lessons" && selectedStudyBook && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedStudyBookData?.title} - Lessons
              </h3>
              <p className="text-gray-600 text-sm">{selectedStudyBookData?.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBackToBooks}
                className="text-blue-600 hover:text-blue-900 text-sm font-medium"
              >
                ← Back to Study Books
              </button>
              <button
                onClick={() => setActiveView("messages")}
                className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200"
                title="Open legacy per-lesson message selector"
              >
                Legacy View
              </button>
            </div>
          </div>

          <div className="border rounded-lg p-3">
            {lessons.length === 0 ? (
              <div className="bg-white p-8 rounded-lg border shadow-sm text-center text-gray-500">
                No lessons available for this study book yet.
              </div>
            ) : (
              <KanbanBoard studyBookId={selectedStudyBook} studyBookTitle={selectedStudyBookData?.title || "Study"} />
            )}
          </div>
        </div>
      )}

      {activeView === "messages" && selectedLesson && (
        <MessageSelector 
          lessonId={selectedLesson}
          lessonTitle={selectedLessonData?.title || "Lesson"}
          onBack={handleBackToLessons}
        />
      )}

      {activeView === "progress" && (
        <UserProgressDashboard 
          onBack={() => setActiveView("books")}
        />
      )}

      {activeView === "delivery" && (
        <DeliveryHistoryView 
          onBack={() => setActiveView("books")}
        />
      )}
    </div>
  );
}