import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "./ui/button";
import { MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function formatPhone(value: string | undefined | null) {
  if (!value) return "";
  const digits = String(value).replace(/\D/g, "").slice(0, 10);
  const len = digits.length;
  if (len <= 3) return digits;
  if (len <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function GroupsTab() {
  const groups = useQuery(api.groups.list) || [];
  const contacts = useQuery(api.contacts.list) || [];
  const createGroup = useMutation(api.groups.create);
  const updateGroup = useMutation(api.groups.update);
  const removeGroup = useMutation(api.groups.remove);
  const addMember = useMutation(api.groups.addMember);
  const removeMember = useMutation(api.groups.removeMember);

  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Id<"groups"> | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Id<"groups"> | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
  });

  const groupWithMembers = useQuery(
    api.groups.getWithMembers,
    selectedGroup ? { groupId: selectedGroup } : "skip"
  );

  const colors = [
    { name: "Primary", value: "#4F4F51" },
    { name: "Secondary", value: "#A1A094" },
    { name: "Sea Salt", value: "#A8B8C0" },
    { name: "Sea Glass", value: "#B9D2D2" },
    { name: "Driftwood", value: "#D8C6B5" },
    { name: "Slate", value: "#6B7280" },
    { name: "Olive", value: "#7C8A55" },
    { name: "Maroon", value: "#8B4F4F" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGroup) {
        await updateGroup({
          id: editingGroup,
          ...formData,
          description: formData.description || undefined,
        });
        toast.success("Group updated successfully");
      } else {
        await createGroup({
          ...formData,
          description: formData.description || undefined,
        });
        toast.success("Group created successfully");
      }
      resetForm();
    } catch (error) {
      toast.error("Failed to save group");
    }
  };

  const handleEdit = (group: any) => {
    setEditingGroup(group._id);
    setFormData({
      name: group.name,
      description: group.description || "",
      color: group.color || "#3B82F6",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: Id<"groups">) => {
    if (confirm("Are you sure you want to delete this group? This will also remove all group memberships.")) {
      try {
        await removeGroup({ id });
        toast.success("Group deleted successfully");
        if (selectedGroup === id) {
          setSelectedGroup(null);
        }
      } catch (error) {
        toast.error("Failed to delete group");
      }
    }
  };

  const handleAddMember = async (contactId: Id<"contacts">) => {
    if (!selectedGroup) return;
    
    try {
      await addMember({ groupId: selectedGroup, contactId });
      toast.success("Contact added to group");
    } catch (error) {
      toast.error("Failed to add contact to group");
    }
  };

  const handleRemoveMember = async (contactId: Id<"contacts">) => {
    if (!selectedGroup) return;
    
    try {
      await removeMember({ groupId: selectedGroup, contactId });
      toast.success("Contact removed from group");
    } catch (error) {
      toast.error("Failed to remove contact from group");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", color: "#3B82F6" });
    setEditingGroup(null);
    setShowForm(false);
  };

  const availableContacts = contacts.filter(contact => 
    !groupWithMembers?.members.some(member => member?._id === contact._id)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Groups</h2>
        <Button onClick={() => setShowForm(true)}>Create Group</Button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">
            {editingGroup ? "Edit Group" : "Create New Group"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Family, Work Team, Friends"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color.value ? "border-gray-800" : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional description for this group..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingGroup ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Groups List */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Your Groups</h3>
          </div>
          <div className="p-4">
            {groups.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No groups yet. Create your first group to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => (
                  <div
                    key={group._id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedGroup === group._id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedGroup(group._id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: group.color || "#3B82F6" }}
                        />
                        <div>
                          <h4 className="font-medium text-gray-900">{group.name}</h4>
                          <p className="text-sm text-gray-500">
                            {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="hidden md:flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(group);
                          }}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(group._id);
                          }}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="md:hidden">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-10 w-10 min-h-[44px]">
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(group); }}>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(group._id); }}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {group.description && (
                      <p className="text-sm text-gray-600 mt-2">{group.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Group Members */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">
              {selectedGroup ? "Group Members" : "Select a Group"}
            </h3>
          </div>
          <div className="p-4">
            {!selectedGroup ? (
              <div className="text-center text-gray-500 py-8">
                Select a group from the left to view and manage its members.
              </div>
            ) : !groupWithMembers ? (
              <div className="text-center text-gray-500 py-8">
                Loading group members...
              </div>
            ) : (
              <div className="space-y-4">
                {/* Current Members */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    Current Members ({groupWithMembers.members.length})
                  </h4>
                  {groupWithMembers.members.length === 0 ? (
                    <p className="text-gray-500 text-sm">No members in this group yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {groupWithMembers.members.map((member) => (
                        <div
                          key={member?._id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{member?.name}</p>
                            <p className="text-sm text-gray-500">{formatPhone(member?.phoneNumber)}</p>
                          </div>
                          <div className="hidden md:block">
                            <button
                              onClick={() => handleRemoveMember(member!._id)}
                              className="text-red-600 hover:text-red-900 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="md:hidden">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-10 w-10 min-h-[44px]">
                                  <MoreHorizontal className="h-5 w-5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem className="text-destructive" onClick={() => handleRemoveMember(member!._id)}>Remove</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Members */}
                {availableContacts.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">
                      Add Members
                    </h4>
                    <div className="space-y-2">
                      {availableContacts.map((contact) => (
                        <div
                          key={contact._id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{contact.name}</p>
                            <p className="text-sm text-gray-500">{formatPhone(contact.phoneNumber)}</p>
                          </div>
                          <div className="hidden md:block">
                            <button
                              onClick={() => handleAddMember(contact._id)}
                              className="text-blue-600 hover:text-blue-900 text-sm"
                            >
                              Add
                            </button>
                          </div>
                          <div className="md:hidden">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-10 w-10 min-h-[44px]">
                                  <MoreHorizontal className="h-5 w-5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem onClick={() => handleAddMember(contact._id)}>Add</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
