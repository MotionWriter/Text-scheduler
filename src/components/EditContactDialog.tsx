import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
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
  contact: null | {
    _id: Id<"contacts">;
    name: string;
    phoneNumber: string;
    email?: string;
    notes?: string;
  };
}

export function EditContactDialog({ open, onOpenChange, contact }: Props) {
  const updateContact = useMutation(api.contacts.update);

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && contact) {
      setName(contact.name || "");
      setPhoneNumber(contact.phoneNumber || "");
      setEmail(contact.email || "");
      setNotes(contact.notes || "");
    }
    if (!open) {
      setName("");
      setPhoneNumber("");
      setEmail("");
      setNotes("");
    }
  }, [open, contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact) return;
    const trimmed = name.trim();
    const digits = normalizeUsDigits(phoneNumber);
    if (!trimmed || digits.length !== 10) {
      toast.error("Please provide a name and a valid 10-digit US phone");
      return;
    }
    try {
      setSaving(true);
      await updateContact({
        id: contact._id,
        name: trimmed,
        phoneNumber: digits,
        email: email || undefined,
        notes: notes || undefined,
      });
      toast.success("Contact updated");
      onOpenChange(false);
    } catch (e) {
      toast.error("Failed to update contact");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>Update the contact's details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input value={formatPhone(phoneNumber)} onChange={(e) => setPhoneNumber(e.target.value)} inputMode="tel" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
