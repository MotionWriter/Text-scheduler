import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { StudyBookBrowser } from "./StudyBookBrowser";
import { MessageSelector } from "./MessageSelector";
import { ListView } from "./ListView";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function StudyMessagesTab() {
  const [selectedStudyBook, setSelectedStudyBook] = useState<Id<"studyBooks"> | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Id<"lessons"> | null>(null);
  const [activeView, setActiveView] = useState<"books" | "lessons" | "messages">("books");
  const [editingGroup, setEditingGroup] = useState(false);

  const studyBooks = useQuery(api.studyBooks.list) || [];
  const lessons = useQuery(
    api.lessons.listByStudyBook,
    selectedStudyBook ? { studyBookId: selectedStudyBook } : "skip",
  ) || [];
  const selectedStudyBookData = studyBooks.find(book => book._id === selectedStudyBook);
  const selectedLessonData = lessons.find(lesson => lesson._id === selectedLesson);
  const groups = useQuery(api.groups.list) || [];
  const studyGroupPref = useQuery(
    api.studyGroupPrefs.getForStudy,
    selectedStudyBook ? { studyBookId: selectedStudyBook } : "skip"
  );

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

  const setStudyGroup = useMutation(api.studyGroupPrefs.setForStudy);

  // If there's exactly one group and no preference set yet for this study, default it
  React.useEffect(() => {
    try {
      if (selectedStudyBook && groups.length === 1 && !(studyGroupPref as any)?.groupId) {
        void setStudyGroup({ studyBookId: selectedStudyBook as any, groupId: groups[0]._id });
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedStudyBook, groups, studyGroupPref, setStudyGroup]);

  // If groups list shrinks to one, ensure we don't show edit mode
  React.useEffect(() => {
    if (groups.length <= 1 && editingGroup) setEditingGroup(false);
  }, [groups, editingGroup]);

  const handleBackToLessons = () => {
    setSelectedLesson(null);
    setActiveView("lessons");
  };

  return (
    <div className="space-y-6">
      {/* Header with breadcrumb navigation */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Study Messages</h2>
          <nav className="flex space-x-2 text-sm sm:text-base text-muted-foreground">
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
        {activeView === "lessons" && selectedStudyBook && (
          <div className="sm:hidden">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  aria-label="How to use"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full border-2 border-gray-600 bg-slate-200 text-gray-800 text-sm font-semibold shadow-sm hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-ring"
                  title="How to use"
                >
                  i
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="max-w-md text-sm">
                <div className="text-foreground">
                  <p>
                    <strong>How to use:</strong> {!(studyGroupPref as any)?.groupId && <strong className="text-red-700">First select a group above, then</strong>} expand lessons to see messages.
                  </p>
                  <p className="mt-2">
                    Click <strong className="text-green-700">Schedule</strong> to schedule a message at the lesson's default time, or <strong className="text-red-700">Unschedule</strong> to remove it. Click <strong className="font-semibold">Edit</strong> next to the scheduled time to change the date (time remains at lesson default).
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
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
          <div className="relative border rounded-lg p-3">

            {/* Compact header inside table */}
            <div className="gap-2 mb-3 flex flex-col sm:grid sm:grid-cols-3 sm:items-center">
              {/* Left: group selection */}
              <div className="order-2 sm:order-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Group:</span>
                  {(() => {
                    const selectedGroupId = (studyGroupPref as any)?.groupId as string | undefined;
                    const selectedGroup = groups.find((g: any) => g._id === selectedGroupId);
                    if (!editingGroup) {
                      return (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {selectedGroup ? selectedGroup.name : "None selected"}
                          </span>
                          {groups.length > 1 && (
                            <button
                              onClick={() => setEditingGroup(true)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedGroupId || ""}
                          onChange={async (e) => {
                            const gid = e.target.value as any;
                            if (!gid) return;
                            try {
                              await setStudyGroup({ studyBookId: selectedStudyBook as any, groupId: gid });
                              setEditingGroup(false);
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="border border-border rounded-xl px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">Select a group…</option>
                          {groups.map((g: any) => (
                            <option key={g._id} value={g._id}>{g.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setEditingGroup(false)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Center: study title/description */}
              <div className="order-1 sm:order-2 text-center justify-self-center">
                <h3 className="text-lg font-semibold text-foreground">
                  {selectedStudyBookData?.title} - Lessons
                </h3>
                {selectedStudyBookData?.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedStudyBookData?.description}
                  </p>
                )}
              </div>

              {/* Right: info button (desktop/tablet only) */}
              <div className="order-3 hidden sm:flex justify-end">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      aria-label="How to use"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-gray-600 bg-slate-200 text-gray-800 text-sm font-semibold shadow-sm hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-ring"
                      title="How to use"
                    >
                      i
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="max-w-md text-sm">
                    <div className="text-foreground">
                      <p>
                        <strong>How to use:</strong> {!(studyGroupPref as any)?.groupId && <strong className="text-red-700">First select a group above, then</strong>} expand lessons to see messages.
                      </p>
                      <p className="mt-2">
                        Click <strong className="text-green-700">Schedule</strong> to schedule a message at the lesson's default time, or <strong className="text-red-700">Unschedule</strong> to remove it. Click <strong className="font-semibold">Edit</strong> next to the scheduled time to change the date (time remains at lesson default).
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Content area */}
            {lessons.length === 0 ? (
              <div className="bg-white p-8 rounded-lg border shadow-sm text-center text-gray-500">
                No lessons available for this study book yet.
              </div>
            ) : (
              <ListView 
                studyBookId={selectedStudyBook} 
                studyBookTitle={selectedStudyBookData?.title || "Study"} 
                hasGroupSelected={!!(studyGroupPref as any)?.groupId}
              />
            )}

            <div className="mt-3">
              <button
                onClick={handleBackToBooks}
                className="text-blue-600 hover:text-blue-900 text-sm font-medium"
              >
                ← Back to Study Books
              </button>
            </div>
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

    </div>
  );
}