import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { StudyBookManager } from "./StudyBookManager";
import { LessonManager } from "./LessonManager";
import { PredefinedMessageManager } from "./PredefinedMessageManager";

export function LessonContentTab() {
  const [selectedStudyBook, setSelectedStudyBook] = useState<Id<"studyBooks"> | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Id<"lessons"> | null>(null);
  const [activeView, setActiveView] = useState<"books" | "lessons" | "messages">("books");

  const studyBooks = useQuery(api.studyBooks.list) || [];
  const lessons = useQuery(
    api.lessons.listByStudyBook,
    selectedStudyBook ? { studyBookId: selectedStudyBook } : "skip",
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header with breadcrumb navigation */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">Lesson Content Management</h2>
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
                  Lessons
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
                  Messages
                </button>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Content based on active view */}
      {activeView === "books" && (
        <StudyBookManager 
          studyBooks={studyBooks}
          onSelectStudyBook={(id) => {
            setSelectedStudyBook(id);
            setActiveView("lessons");
          }}
        />
      )}

      {activeView === "lessons" && selectedStudyBook && (
        <LessonManager 
          studyBookId={selectedStudyBook}
          lessons={lessons}
          onSelectLesson={(id) => {
            setSelectedLesson(id);
            setActiveView("messages");
          }}
          onBack={() => setActiveView("books")}
        />
      )}

      {activeView === "messages" && selectedLesson && (
        <PredefinedMessageManager 
          lessonId={selectedLesson}
          onBack={() => setActiveView("lessons")}
        />
      )}
    </div>
  );
}