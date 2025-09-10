import { Id } from "../../convex/_generated/dataModel";

interface StudyBook {
  _id: Id<"studyBooks">;
  title: string;
  description: string;
  totalLessons: number;
  isActive: boolean;
  _creationTime: number;
}

interface StudyBookBrowserProps {
  studyBooks: StudyBook[];
  onSelectStudyBook: (bookId: Id<"studyBooks">) => void;
}

export function StudyBookBrowser({ studyBooks, onSelectStudyBook }: StudyBookBrowserProps) {
  const activeBooks = studyBooks.filter(book => book.isActive);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeBooks.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-lg border shadow-sm text-center text-gray-500">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📚</span>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Study Books Available</h4>
              <p className="text-sm">Check back later for new study books to explore.</p>
            </div>
          </div>
        ) : (
          activeBooks.map((book) => (
            <div key={book._id} className="bg-white p-4 sm:p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-semibold text-foreground line-clamp-2">{book.title}</h4>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">
                    {book.totalLessons} lessons
                  </span>
                </div>
                <p className="text-muted-foreground text-sm line-clamp-3 mb-4">{book.description}</p>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center text-xs text-gray-500">
                  <span className="mr-2">📖</span>
                  Study Book
                </div>
                <button
                  onClick={() => onSelectStudyBook(book._id)}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  Start Study
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}