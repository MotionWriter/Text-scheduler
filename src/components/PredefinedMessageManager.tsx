import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

import { MESSAGE_TYPES } from "../../convex/_lib/messageTypes";

interface PredefinedMessageManagerProps {
  lessonId: Id<"lessons">;
  onBack: () => void;
}

export function PredefinedMessageManager({ lessonId, onBack }: PredefinedMessageManagerProps) {
  const messages = useQuery(api.predefinedMessages.listByLesson, { lessonId }) || [];
  const createMessage = useMutation(api.predefinedMessages.create);
  const updateMessage = useMutation(api.predefinedMessages.update);
  const removeMessage = useMutation(api.predefinedMessages.remove);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    content: "",
    messageType: "general" as typeof MESSAGE_TYPES[number],
  });

  // Inline editing state: track which messageId -> field is being edited
  const [editingCell, setEditingCell] = useState<{ id: string; field: "content" | "messageType" | "displayOrder" } | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, any>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const sorted = useMemo(() => {
    return [...messages].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [messages]);

  const beginEdit = (id: string, field: "content" | "messageType" | "displayOrder", initial: any) => {
    setEditingCell({ id, field });
    setDraftValues((prev) => ({ ...prev, [`${id}:${field}`]: initial }));
  };

  const cancelEdit = () => {
    setEditingCell(null);
  };

  const commitEdit = async (id: string, field: "content" | "messageType" | "displayOrder") => {
    const key = `${id}:${field}`;
    const next = draftValues[key];
    setEditingCell(null);
    try {
      if (field === "displayOrder") {
        const val = parseInt(String(next));
        if (Number.isNaN(val)) return;
        await updateMessage({ id: id as any, displayOrder: val });
      } else if (field === "messageType") {
        await updateMessage({ id: id as any, messageType: next });
      } else if (field === "content") {
        await updateMessage({ id: id as any, content: next });
      }
      toast.success("Saved");
    } catch (e) {
      toast.error("Failed to save change");
    }
  };

  const handleDelete = async (id: Id<"predefinedMessages">) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      await removeMessage({ id });
      toast.success("Message deleted successfully");
    } catch (e) {
      toast.error("Failed to delete message");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMessage({ lessonId, ...formData });
      toast.success("Message created successfully");
      setFormData({ content: "", messageType: "general" });
      setShowForm(false);
    } catch (e) {
      toast.error("Failed to create message");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <button onClick={onBack} className="text-primary hover:opacity-90 mb-2">← Back to Lessons</button>
          <h3 className="text-xl font-semibold">Predefined Messages</h3>
          <p className="text-sm text-muted-foreground">Inline edit content, type, and order.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-colors"
        >
          Add Message
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h4 className="text-lg font-semibold mb-4">Add New Message</h4>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Message Type</label>
                <select
                  value={formData.messageType}
                  onChange={(e) => setFormData({ ...formData, messageType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {MESSAGE_TYPES.map((type) => (
                    <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Message Content *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter predefined message content..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-colors">Create</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-muted text-foreground px-4 py-2 rounded-md hover:opacity-90 transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[hsl(var(--table-header))]">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">Order</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-40">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Content</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No predefined messages yet. Add your first message.</td>
                </tr>
              ) : (
                sorted.map((m: any) => {
                  const orderKey = `${m._id}:displayOrder`;
                  const typeKey = `${m._id}:messageType`;
                  const contentKey = `${m._id}:content`;
                  return (
                    <tr key={m._id} className="hover:bg-muted/30">
                      {/* Order cell */}
                      <td className="px-4 py-2 align-top">
                        {editingCell?.id === m._id && editingCell.field === "displayOrder" ? (
                          <input
                            type="number"
                            autoFocus
                            className="w-20 px-2 py-1 border rounded"
                            value={draftValues[orderKey] ?? m.displayOrder}
                            onChange={(e) => setDraftValues((p) => ({ ...p, [orderKey]: e.target.value }))}
                            onBlur={() => commitEdit(m._id, "displayOrder")}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void commitEdit(m._id, "displayOrder"); } if (e.key === 'Escape') cancelEdit(); }}
                          />
                        ) : (
                          <button
                            className="text-sm px-1 py-0.5 rounded hover:bg-muted/60"
                            onClick={() => beginEdit(m._id, "displayOrder", m.displayOrder)}
                            title="Click to edit order"
                          >
                            {m.displayOrder}
                          </button>
                        )}
                      </td>

                      {/* Type cell */}
                      <td className="px-4 py-2 align-top">
                        {editingCell?.id === m._id && editingCell.field === "messageType" ? (
                          <select
                            autoFocus
                            className="w-full px-2 py-1 border rounded"
                            value={draftValues[typeKey] ?? m.messageType}
                            onChange={(e) => setDraftValues((p) => ({ ...p, [typeKey]: e.target.value }))}
                            onBlur={() => commitEdit(m._id, "messageType")}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void commitEdit(m._id, "messageType"); } if (e.key === 'Escape') cancelEdit(); }}
                          >
                            {MESSAGE_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        ) : (
                          <button
                            className="inline-flex items-center text-sm capitalize px-2 py-0.5 rounded bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] hover:opacity-90"
                            onClick={() => beginEdit(m._id, "messageType", m.messageType)}
                            title="Click to change type"
                          >
                            {m.messageType}
                          </button>
                        )}
                      </td>

                      {/* Content cell */}
                      <td className="px-4 py-2">
                        {editingCell?.id === m._id && editingCell.field === "content" ? (
                          <textarea
                            autoFocus
                            rows={3}
                            className="w-full px-3 py-2 border rounded"
                            value={draftValues[contentKey] ?? m.content}
                            onChange={(e) => setDraftValues((p) => ({ ...p, [contentKey]: e.target.value }))}
                            onBlur={() => commitEdit(m._id, "content")}
                            onKeyDown={(e) => { if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey || e.shiftKey))) { e.preventDefault(); void commitEdit(m._id, "content"); } if (e.key === 'Escape') cancelEdit(); }}
                          />
                        ) : (
                          <div
                            className="text-sm text-foreground cursor-text hover:bg-muted/40 rounded px-2 py-1 border-b border-dashed border-transparent hover:border-muted-foreground/40"
                            onClick={() => beginEdit(m._id, "content", m.content)}
                            title="Click to edit content • Shift+Enter to save"
                          >
                            {(() => {
                              const TRUNCATE = 160;
                              const isLong = (m.content?.length || 0) > TRUNCATE;
                              const isExpanded = !!expanded[m._id as string];
                              const shown = isLong && !isExpanded ? `${m.content.substring(0, TRUNCATE)}...` : m.content;
                              return (
                                <div className="space-y-1">
                                  <div className="whitespace-pre-wrap break-words">{shown}</div>
                                  {isLong && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setExpanded((prev) => ({ ...prev, [m._id as string]: !isExpanded })); }}
                                      className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                                      aria-label={isExpanded ? "Show less" : "Show more"}
                                    >
                                      {isExpanded ? "Show less" : "Show more"}
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2 text-right align-top">
                        <button
                          onClick={() => handleDelete(m._id)}
                          className="text-[hsl(var(--destructive))] hover:opacity-90 text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
