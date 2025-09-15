import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddGroupDialog } from "./AddGroupDialog";

function normalizeUsDigits(value: string) {
  let d = String(value).replace(/\D/g, "");
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddContactDialog({ open, onOpenChange }: Props) {
  const groups = useQuery(api.groups.list) || [];
  const createContact = useMutation(api.contacts.create);
  const setSingleGroup = useMutation(api.groups.setContactToSingleGroup);
  const findOrCreateGroup = useMutation(api.groups.findOrCreate);

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("none");
  // Keep track of a newly created group so it's immediately selectable/displayed
  const [newlyCreatedGroup, setNewlyCreatedGroup] = useState<{ _id: string; name: string } | null>(null);
  // Track pending group selection to handle async state updates
  const [pendingGroupSelection, setPendingGroupSelection] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);

  // Add Group dialog
  const [addGroupOpen, setAddGroupOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setPhoneNumber("");
      setEmail("");
      setNotes("");
      setSelectedGroupId("none");
      setNewlyCreatedGroup(null);
      setPendingGroupSelection(null);
    }
  }, [open]);

  // Handle pending group selection after the group has been added to the options
  useEffect(() => {
    if (pendingGroupSelection && allGroups.some(g => g._id === pendingGroupSelection)) {
      setSelectedGroupId(pendingGroupSelection);
      setPendingGroupSelection(null);
    }
  }, [pendingGroupSelection, allGroups]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const digits = normalizeUsDigits(phoneNumber);
    if (!trimmedName || digits.length !== 10) {
      toast.error("Please provide a name and a valid 10-digit US phone");
      return;
    }
    try {
      setCreating(true);
      const id = await createContact({ name: trimmedName, phoneNumber: digits, email: email || undefined, notes: notes || undefined });
      if (selectedGroupId && selectedGroupId !== "none") {
        await setSingleGroup({ contactId: id as Id<"contacts">, groupId: selectedGroupId as Id<"groups"> });
      }
      toast.success("Contact created");
      onOpenChange(false);
    } catch (e) {
      toast.error("Failed to create contact");
    } finally {
      setCreating(false);
    }
  };

  // Create a combined list of all available groups including newly created ones
  const allGroups = useMemo(() => {
    const groupsMap = new Map();
    // Add server groups
    groups.forEach((g: any) => groupsMap.set(g._id, g));
    // Add newly created group if it doesn't exist in server groups yet
    if (newlyCreatedGroup && !groupsMap.has(newlyCreatedGroup._id)) {
      groupsMap.set(newlyCreatedGroup._id, newlyCreatedGroup);
    }
    return Array.from(groupsMap.values());
  }, [groups, newlyCreatedGroup]);

  const onSelectGroup = async (value: string) => {
    if (value === "__add__") {
      setAddGroupOpen(true);
      return;
    }
    setSelectedGroupId(value);
  };

  const submitAddGroup = async (name: string) => {
    try {
      const groupId = await findOrCreateGroup({ name });
      const idStr = groupId as unknown as string;
      // First add the group to the options list
      setNewlyCreatedGroup({ _id: idStr, name });
      // Then set up pending selection - useEffect will handle the actual selection
      setPendingGroupSelection(idStr);
      setAddGroupOpen(false);
      toast.success(`Created group "${name}"`);
    } catch (e) {
      toast.error("Failed to create group");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>Create a contact and optionally assign a group.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input
                  value={formatPhone(phoneNumber)}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="555-123-4567"
                  required
                  inputMode="tel"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Group</Label>
                <Select value={selectedGroupId} onValueChange={onSelectGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Render all groups including newly created ones */}
                    {allGroups.map((g: any) => (
                      <SelectItem key={g._id} value={g._id}>{g.name}</SelectItem>
                    ))}
                    <SelectItem value="none">No Group</SelectItem>
                    <SelectItem value="__add__">+ Add Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional notes" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>{creating ? "Creating…" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AddGroupDialog open={addGroupOpen} onOpenChange={setAddGroupOpen} onSubmit={submitAddGroup} />
    </>
  );
}
