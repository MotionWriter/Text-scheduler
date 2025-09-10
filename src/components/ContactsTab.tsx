import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "./ui/button";
import { MoreHorizontal, Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
// import { GroupComboBox } from "./ui/GroupComboBox";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddGroupDialog } from "./AddGroupDialog";
import { AddContactDialog } from "./AddContactDialog";

function normalizeUsDigits(value: string) {
  let d = value.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d;
}

function formatPhone(value: string | undefined | null) {
  if (!value) return "";
  let digits = normalizeUsDigits(String(value));
  digits = digits.slice(0, 10);
  const len = digits.length;
  if (len <= 3) return digits;
  if (len <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function ContactsTab() {
  const contacts = useQuery(api.contacts.listWithGroups) || [];
  const createContact = useMutation(api.contacts.create);
  const setSingleGroup = useMutation(api.groups.setContactToSingleGroup);
  const clearGroups = useMutation(api.groups.clearContactGroups);
  const findOrCreateGroup = useMutation(api.groups.findOrCreate);
  const groups = useQuery(api.groups.list) || [];
  const createWithGroups = useMutation(api.contacts.createWithGroups);
  const updateContact = useMutation(api.contacts.update);
  const removeContact = useMutation(api.contacts.remove);

  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Id<"contacts"> | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    notes: "",
  });
  // Add Contact modal
  const [addContactOpen, setAddContactOpen] = useState(false);

  // Bulk upload state
  const [showBulk, setShowBulk] = useState(false);
  const [bulkParsing, setBulkParsing] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [bulkFileName, setBulkFileName] = useState("");
  type ContactInput = { name: string; phoneNumber: string; email?: string; notes?: string; groups?: string[] };
  const [bulkValid, setBulkValid] = useState<ContactInput[]>([]);
  const [bulkInvalid, setBulkInvalid] = useState<{ row: number; reason: string }[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await updateContact({
          id: editingContact,
          ...formData,
          email: formData.email || undefined,
          notes: formData.notes || undefined,
        });
        toast.success("Contact updated successfully");
      } else {
        await createContact({
          ...formData,
          email: formData.email || undefined,
          notes: formData.notes || undefined,
        });
        toast.success("Contact created successfully");
      }
      resetForm();
    } catch (error) {
      toast.error("Failed to save contact");
    }
  };

  const handleEdit = (contact: any) => {
    setEditingContact(contact._id);
    setFormData({
      name: contact.name,
      phoneNumber: contact.phoneNumber,
      email: contact.email || "",
      notes: contact.notes || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: Id<"contacts">) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      try {
        await removeContact({ id });
        toast.success("Contact deleted successfully");
      } catch (error) {
        toast.error("Failed to delete contact");
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: "", phoneNumber: "", email: "", notes: "" });
    setEditingContact(null);
    setShowForm(false);
  };

  // --- CSV parsing helpers (no external dependency) ---
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
          // Lookahead for escaped quote
          if (i + 1 < text.length && text[i + 1] === '"') {
            cur += '"';
            i += 2;
            continue;
          } else {
            inQuotes = false;
            i++;
            continue;
          }
        } else {
          cur += ch;
          i++;
          continue;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
          i++;
          continue;
        }
        if (ch === ",") {
          row.push(cur);
          cur = "";
          i++;
          continue;
        }
        if (ch === "\n") {
          row.push(cur);
          rows.push(row);
          row = [];
          cur = "";
          i++;
          continue;
        }
        if (ch === "\r") {
          // Normalize CRLF -> handle on next char
          i++;
          continue;
        }
        cur += ch;
        i++;
      }
    }
    // Push last value
    row.push(cur);
    // Only push row if not empty
    if (row.some((c) => c !== "")) rows.push(row);
    return rows;
  };

  const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");

  const handleCSVFile = async (file: File) => {
    setBulkParsing(true);
    setBulkFileName(file.name);
    setBulkValid([]);
    setBulkInvalid([]);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setBulkInvalid([{ row: 0, reason: "Empty file" }]);
        return;
      }
      const headers = rows[0].map(normalizeHeader);
      const nameIdx = headers.findIndex((h) => ["name", "fullname"].includes(h));
      const phoneIdx = headers.findIndex((h) => ["phonenumber", "phone", "mobile", "cell"].includes(h));
      const emailIdx = headers.findIndex((h) => ["email", "emailaddress"].includes(h));
      const notesIdx = headers.findIndex((h) => ["notes", "note"].includes(h));
      const groupIdx = headers.findIndex((h) => ["group", "groups"].includes(h));

      if (nameIdx === -1 || phoneIdx === -1) {
        setBulkInvalid([
          {
            row: 0,
            reason: "Missing required headers: name and phoneNumber (accepted headers: name, phone/phoneNumber).",
          },
        ]);
        return;
      }

      const valids: ContactInput[] = [];
      const invalids: { row: number; reason: string }[] = [];

      for (let r = 1; r < rows.length; r++) {
        const cols = rows[r];
        if (cols.length === 1 && cols[0].trim() === "") continue; // skip blank lines
        const name = (cols[nameIdx] || "").trim();
        const phoneNumber = (cols[phoneIdx] || "").trim();
        const email = emailIdx !== -1 ? (cols[emailIdx] || "").trim() : "";
        const notes = notesIdx !== -1 ? (cols[notesIdx] || "").trim() : "";
        const groupsText = groupIdx !== -1 ? (cols[groupIdx] || "").trim() : "";
        const groups = groupsText ? groupsText.split(/[,;|]/).map(g => g.trim()).filter(g => g) : [];

        if (!name) {
          invalids.push({ row: r + 1, reason: "Missing name" });
          continue;
        }
        if (!phoneNumber) {
          invalids.push({ row: r + 1, reason: "Missing phoneNumber" });
          continue;
        }
        // Optional light phone normalization: strip spaces
        const cleaned = normalizeUsDigits(phoneNumber);
        if (cleaned.length !== 10) {
          invalids.push({ row: r + 1, reason: "Invalid US phone (expect 10 digits, accepts +1 prefix)" });
          continue;
        }
        const cleanedPhone = cleaned;
        valids.push({
          name,
          phoneNumber: cleanedPhone,
          email: email || undefined,
          notes: notes || undefined,
          groups: groups.length > 0 ? groups : undefined,
        });
      }

      setBulkValid(valids);
      setBulkInvalid(invalids);
    } catch (e) {
      setBulkInvalid([{ row: 0, reason: "Failed to read or parse CSV" }]);
    } finally {
      setBulkParsing(false);
    }
  };

  const resetBulk = () => {
    setShowBulk(false);
    setBulkParsing(false);
    setBulkUploading(false);
    setBulkProgress({ done: 0, total: 0 });
    setBulkFileName("");
    setBulkValid([]);
    setBulkInvalid([]);
  };

  const downloadCsvTemplate = () => {
    const headers = ["name","phoneNumber","email","notes","groups"]; // groups supports comma/semicolon/pipe separated values
    const sampleRows = [
      ["John Doe","555-123-4567","john@example.com","Leader","Small Group Leaders"],
      ["Jane Smith","555-765-4321","","","Youth Group"],
    ];
    const csv = [headers.join(","), ...sampleRows.map(r => r.map((c) => {
      // Escape fields with quotes or commas
      const needsQuotes = /[",\n\r]/.test(c);
      const escaped = String(c).replace(/"/g, '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    }).join(","))].join("\n");

    const blob = new Blob([csv + "\n"], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const uploadBulk = async () => {
    if (bulkValid.length === 0) return;
    setBulkUploading(true);
    setBulkProgress({ done: 0, total: bulkValid.length });
    let success = 0;
    let failed = 0;
    const newInvalids: { row: number; reason: string }[] = [...bulkInvalid];

    for (let i = 0; i < bulkValid.length; i++) {
      const c = bulkValid[i];
      try {
        if (c.groups && c.groups.length > 0) {
          await createWithGroups({
            name: c.name,
            phoneNumber: c.phoneNumber,
            email: c.email || undefined,
            notes: c.notes || undefined,
            groupNames: c.groups,
          });
        } else {
          await createContact({
            name: c.name,
            phoneNumber: c.phoneNumber,
            email: c.email || undefined,
            notes: c.notes || undefined,
          });
        }
        success++;
      } catch (err) {
        failed++;
        newInvalids.push({ row: i + 2, reason: "Backend error creating contact" });
      }
      setBulkProgress({ done: i + 1, total: bulkValid.length });
    }

    if (failed === 0) {
      toast.success(`Uploaded ${success} contacts successfully`);
      resetBulk();
    } else {
      setBulkInvalid(newInvalids);
      toast.error(`Uploaded ${success} contacts, ${failed} failed`);
      setBulkUploading(false);
    }
  };

  // Add Group modal state
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [addGroupForContact, setAddGroupForContact] = useState<Id<"contacts"> | null>(null);
  const [addingGroup, setAddingGroup] = useState(false);

  const openAddGroupDialog = (contactId: Id<"contacts">) => {
    setAddGroupForContact(contactId);
    setAddGroupOpen(true);
  };

  const submitAddGroup = async (name: string) => {
    if (!addGroupForContact) return;
    try {
      setAddingGroup(true);
      const groupId = await findOrCreateGroup({ name });
      await setSingleGroup({ contactId: addGroupForContact, groupId });
      toast.success(`Created group "${name}" and assigned contact`);
      setAddGroupOpen(false);
      setAddGroupForContact(null);
    } catch (e) {
      toast.error("Failed to create group");
    } finally {
      setAddingGroup(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Contacts</h2>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Button
            variant="secondary"
            onClick={() => setShowBulk(true)}
            className="w-full sm:w-auto"
          >
            Bulk Upload
          </Button>
          <Button onClick={() => setAddContactOpen(true)} className="w-full sm:w-auto">Add Contact</Button>
        </div>
      </div>

      {/* Add Contact Dialog */}
      <AddContactDialog open={addContactOpen} onOpenChange={setAddContactOpen} />

      {/* Bulk Upload Modal */}
      {showBulk && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Add Contacts In Bulk</h3>
              <p className="text-sm text-gray-600">Upload a CSV with columns: name, phoneNumber, [email], [notes], [groups]. Download the template below for exact formatting.</p>
            </div>
            <button
              onClick={resetBulk}
              className="text-gray-600 hover:text-gray-900"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCSVFile(f);
                  }}
                />
                {bulkFileName && (
                  <p className="text-sm text-gray-500 mt-1">Selected: {bulkFileName}</p>
                )}
              </div>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadCsvTemplate}
                  className="flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
              </div>
            </div>

            {bulkParsing && (
              <div className="text-sm text-gray-600">Parsing CSV…</div>
            )}

            {!bulkParsing && (bulkValid.length > 0 || bulkInvalid.length > 0) && (
              <div className="space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-700">Valid: <strong>{bulkValid.length}</strong></span>
                  <span className="text-gray-700">Invalid: <strong>{bulkInvalid.length}</strong></span>
                </div>
                {bulkInvalid.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700 max-h-40 overflow-auto">
                    <p className="font-medium mb-1">Issues found:</p>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {bulkInvalid.slice(0, 20).map((e, idx) => (
                        <li key={idx}>Row {e.row}: {e.reason}</li>
                      ))}
                      {bulkInvalid.length > 20 && (
                        <li>+ {bulkInvalid.length - 20} more…</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={uploadBulk}
                disabled={bulkValid.length === 0 || bulkUploading}
                className={`px-4 py-2 rounded-md text-white ${
                  bulkValid.length === 0 || bulkUploading ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {bulkUploading ? `Uploading ${bulkProgress.done}/${bulkProgress.total}…` : `Upload ${bulkValid.length} contacts`}
              </button>
              <button
                onClick={resetBulk}
                className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Mobile card list */}
      <div className="block md:hidden">
        {contacts.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No contacts yet. Add your first contact to get started.</div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {contacts.map((contact) => (
              <div key={contact._id} className="mobile-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate text-foreground">{contact.name}</div>
                    <div className="text-sm text-muted-foreground truncate mt-0.5">{formatPhone(contact.phoneNumber)}</div>
                    {(contact.email || contact.notes) && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {contact.email || contact.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9">
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleEdit(contact)}>Edit Contact</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(contact._id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Group</label>
                  <Select
                    value={contact.groups && contact.groups[0]?._id ? contact.groups[0]._id : "none"}
                    onValueChange={(value) => {
                      if (value === "__add__") {
                        openAddGroupDialog(contact._id as Id<"contacts">);
                        return;
                      }
                      if (value === "none") {
                        clearGroups({ contactId: contact._id as Id<"contacts"> })
                      } else {
                        setSingleGroup({ contactId: contact._id as Id<"contacts">, groupId: value as any })
                      }
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select a group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g: any) => (
                        <SelectItem key={g._id} value={g._id}>
                          {g.name} ({g.memberCount} members)
                        </SelectItem>
                      ))}
                      <SelectItem value="none">No Group</SelectItem>
                      <SelectItem value="__add__">+ Add Group</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-lg border shadow-sm overflow-hidden">
        {contacts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No contacts yet. Add your first contact to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[hsl(var(--table-header))]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Groups
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contacts.map((contact) => (
                  <tr key={contact._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {contact.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatPhone(contact.phoneNumber)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contact.email || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {contact.notes || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="max-w-xs">
                        <Select
                          value={contact.groups && contact.groups[0]?._id ? contact.groups[0]._id : "none"}
                          onValueChange={(value) => {
                            if (value === "__add__") {
                              openAddGroupDialog(contact._id as Id<"contacts">);
                              return;
                            }
                            if (value === "none") {
                              clearGroups({ contactId: contact._id as Id<"contacts"> })
                            } else {
                              setSingleGroup({ contactId: contact._id as Id<"contacts">, groupId: value as any })
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a group" />
                          </SelectTrigger>
                          <SelectContent>
                            {groups.map((g: any) => (
                              <SelectItem key={g._id} value={g._id}>
                                {g.name} ({g.memberCount} members)
                              </SelectItem>
                            ))}
                            <SelectItem value="none">No Group</SelectItem>
                            <SelectItem value="__add__">+ Add Group</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="ghost" onClick={() => handleEdit(contact)} className="mr-2">Edit</Button>
                      <Button variant="danger" onClick={() => handleDelete(contact._id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <AddGroupDialog
        open={addGroupOpen}
        onOpenChange={(o) => { setAddGroupOpen(o); if (!o) setAddGroupForContact(null); }}
        onSubmit={submitAddGroup}
        isSubmitting={addingGroup}
      />
    </div>
  );
}
