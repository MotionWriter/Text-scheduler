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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div className="space-y-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground break-words">
            Lesson Content Management
          </h2>
          <nav className="flex flex-wrap items-center gap-1 text-xs sm:text-sm">
            <button
              onClick={() => setActiveView("books")}
              className={`${activeView === "books" ? "font-medium text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
              Study Books
            </button>
            {selectedStudyBook && (
              <>
                <span className="text-muted-foreground">/</span>
                <button
                  onClick={() => setActiveView("lessons")}
                  className={`${activeView === "lessons" ? "font-medium text-primary" : "text-muted-foreground hover:text-primary"}`}
                >
                  Lessons
                </button>
              </>
            )}
            {selectedLesson && (
              <>
                <span className="text-muted-foreground">/</span>
                <button
                  onClick={() => setActiveView("messages")}
                  className={`${activeView === "messages" ? "font-medium text-primary" : "text-muted-foreground hover:text-primary"}`}
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
