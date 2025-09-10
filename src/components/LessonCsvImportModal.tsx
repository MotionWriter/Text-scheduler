import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { MESSAGE_TYPES } from "../../convex/_lib/messageTypes";

interface Props {
  studyBookId: Id<"studyBooks">;
}

export function LessonCsvImportButton({ studyBookId }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-white border px-3 py-2 rounded-lg text-sm hover:bg-muted/50"
      >
        Import Lesson Content (CSV)
      </button>
      {open && (
        <LessonCsvImportModal studyBookId={studyBookId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

interface ModalProps {
  studyBookId: Id<"studyBooks">;
  onClose: () => void;
}

export function LessonCsvImportModal({ studyBookId, onClose }: ModalProps) {
  const importCsv = useMutation(api.lessonCsvImport.importLessonContent);

  // Local CSV parsing (same approach as ContactsTab)
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState("");
  const [validRows, setValidRows] = useState<any[]>([]);
  const [invalidRows, setInvalidRows] = useState<{ row: number; reason: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let cur = "";
    let inQuotes = false;
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < text.length && text[i + 1] === '"') {
            cur += '"';
            i += 2; continue;
          } else {
            inQuotes = false; i++; continue;
          }
        } else { cur += ch; i++; continue; }
      } else {
        if (ch === '"') { inQuotes = true; i++; continue; }
        if (ch === ",") { row.push(cur); cur = ""; i++; continue; }
        if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; i++; continue; }
        if (ch === "\r") { i++; continue; }
        cur += ch; i++;
      }
    }
    row.push(cur);
    if (row.some((c) => c !== "")) rows.push(row);
    return rows;
  };

  const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");

  const REQUIRED = {
    lessonNumber: ["lessonnumber", "lesson", "lessonno", "number"],
    messageType: ["messagetype", "type"],
    content: ["content", "message", "text"],
  } as const;
  const OPTIONAL = {
    lessonTitle: ["lessontitle", "title"],
    lessonDescription: ["lessondescription", "description", "desc"],
    displayOrder: ["displayorder", "order", "idx", "position"],
  } as const;

  const handleFile = async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    setValidRows([]);
    setInvalidRows([]);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setInvalidRows([{ row: 0, reason: "Empty file" }]);
        return;
      }
      const headers = rows[0].map(normalizeHeader);
      const findIdx = (cands: string[]) => headers.findIndex((h) => cands.includes(h));

      const idx = {
        lessonNumber: findIdx(REQUIRED.lessonNumber),
        messageType: findIdx(REQUIRED.messageType),
        content: findIdx(REQUIRED.content),
        lessonTitle: findIdx(OPTIONAL.lessonTitle),
        lessonDescription: findIdx(OPTIONAL.lessonDescription),
        displayOrder: findIdx(OPTIONAL.displayOrder),
      };
      if (idx.lessonNumber === -1 || idx.messageType === -1 || idx.content === -1) {
        setInvalidRows([{ row: 0, reason: "Missing required headers: lessonNumber, messageType, content" }]);
        return;
      }

      const valids: any[] = [];
      const invalids: { row: number; reason: string }[] = [];

      for (let r = 1; r < rows.length; r++) {
        const cols = rows[r];
        if (cols.length === 1 && cols[0].trim() === "") continue;
        const lnRaw = (cols[idx.lessonNumber] || "").trim();
        const mt = (cols[idx.messageType] || "").trim().toLowerCase();
        const content = (cols[idx.content] || "").trim();
        const lessonTitle = idx.lessonTitle !== -1 ? (cols[idx.lessonTitle] || "").trim() : undefined;
        const lessonDescription = idx.lessonDescription !== -1 ? (cols[idx.lessonDescription] || "").trim() : undefined;
        const displayOrderRaw = idx.displayOrder !== -1 ? (cols[idx.displayOrder] || "").trim() : undefined;

        const lessonNumber = parseInt(lnRaw, 10);
        if (!Number.isFinite(lessonNumber)) { invalids.push({ row: r + 1, reason: "Invalid lessonNumber" }); continue; }
        if (!content) { invalids.push({ row: r + 1, reason: "Missing content" }); continue; }
        if (!MESSAGE_TYPES.includes(mt as any)) { invalids.push({ row: r + 1, reason: `Invalid messageType: ${mt}` }); continue; }
        const displayOrder = displayOrderRaw && !Number.isNaN(parseInt(displayOrderRaw, 10)) ? parseInt(displayOrderRaw, 10) : undefined;

        valids.push({ lessonNumber, messageType: mt, content, lessonTitle, lessonDescription, displayOrder });
      }

      setValidRows(valids);
      setInvalidRows(invalids);
    } catch (e) {
      setInvalidRows([{ row: 0, reason: "Failed to read or parse CSV" }]);
    } finally {
      setParsing(false);
    }
  };

  const handleUpload = async () => {
    if (validRows.length === 0) return;
    setUploading(true);
    try {
      const res = await importCsv({ studyBookId, rows: validRows });
      toast.success(`Imported ${res.createdLessons} lessons, ${res.createdMessages} messages`);
      onClose();
    } catch (e) {
      toast.error("Import failed");
      setUploading(false);
    }
  };

  const lessonsAffected = useMemo(() => new Set(validRows.map((r) => r.lessonNumber)).size, [validRows]);

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border shadow-lg max-w-2xl w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Import Lesson Content from CSV</h3>
            <p className="text-sm text-muted-foreground">CSV columns: lessonNumber, messageType, content, [lessonTitle], [lessonDescription], [displayOrder]</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <input type="file" accept=".csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }} />
            {fileName && <p className="text-xs text-muted-foreground mt-1">Selected: {fileName}</p>}
          </div>

          {parsing && <div className="text-sm text-muted-foreground">Parsing CSV…</div>}

          {!parsing && (validRows.length > 0 || invalidRows.length > 0) && (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-foreground">Valid rows: <strong>{validRows.length}</strong></span>
                <span className="text-foreground">Invalid rows: <strong>{invalidRows.length}</strong></span>
                <span className="text-foreground">Lessons affected: <strong>{lessonsAffected}</strong></span>
              </div>
              {invalidRows.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700 max-h-40 overflow-auto">
                  <p className="font-medium mb-1">Issues found:</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {invalidRows.slice(0, 20).map((e, idx) => (
                      <li key={idx}>Row {e.row}: {e.reason}</li>
                    ))}
                    {invalidRows.length > 20 && (
                      <li>+ {invalidRows.length - 20} more…</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Sample CSV:
                <pre className="bg-gray-50 border rounded p-2 mt-1 overflow-auto">{"lessonNumber,lessonTitle,lessonDescription,messageType,content,displayOrder\n1,The Heart of a Man,Intro to study,reminder,\"Don't forget tonight at 7pm!\",1\n1,, ,scripture,\"Genesis 2:15\",2\n2,The Wound,,discussion,\"What does strength look like?\",1"}</pre>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleUpload}
              disabled={validRows.length === 0 || uploading}
              className={`px-4 py-2 rounded-md text-white ${validRows.length === 0 || uploading ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {uploading ? "Importing…" : `Import ${validRows.length} rows`}
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
