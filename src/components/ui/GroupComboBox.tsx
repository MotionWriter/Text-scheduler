import * as React from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useMediaQuery } from "@/components/ui/use-media-query"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Plus, X } from "lucide-react"
import { toast } from "sonner"

type Group = {
  _id: Id<"groups">
  name: string
  color?: string
}

interface GroupComboBoxProps {
  contactId: Id<"contacts">
  selectedGroups?: Group[]
  placeholder?: string
  className?: string
}

export function GroupComboBox({
  contactId,
  selectedGroups = [],
  placeholder = "Select groups...",
  className,
}: GroupComboBoxProps) {
  const [open, setOpen] = React.useState(false)
  const [newGroupName, setNewGroupName] = React.useState("")
  const isDesktop = useMediaQuery("(min-width: 768px)")
  
  const groups = useQuery(api.groups.list) || []
  const addMember = useMutation(api.groups.addMember)
  const removeMember = useMutation(api.groups.removeMember)
  const createGroup = useMutation(api.groups.create)

  const handleSelectGroup = async (group: Group) => {
    try {
      const isSelected = selectedGroups.some(g => g._id === group._id)
      
      if (isSelected) {
        // Remove from group
        await removeMember({
          groupId: group._id,
          contactId: contactId,
        })
        toast.success(`Removed from ${group.name}`)
      } else {
        // Add to group
        await addMember({
          groupId: group._id,
          contactId: contactId,
        })
        toast.success(`Added to ${group.name}`)
      }
    } catch (error) {
      toast.error("Failed to update group membership")
    }
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return
    
    try {
      const groupId = await createGroup({ name: newGroupName.trim() })
      const newGroup = { _id: groupId, name: newGroupName.trim() }
      
      // Automatically add the contact to the new group
      await addMember({
        groupId: groupId,
        contactId: contactId,
      })
      
      setNewGroupName("")
      toast.success(`Created and joined ${newGroupName}`)
      setOpen(false)
    } catch (error) {
      toast.error("Failed to create group")
    }
  }

  const GroupList = () => (
    <Command onValueChange={setNewGroupName}>
      <CommandInput placeholder="Search groups..." />
      <CommandList>
        <CommandEmpty>
          <div className="py-2">
            <p className="mb-2">No groups found.</p>
            {newGroupName && (
              <Button
                onClick={handleCreateGroup}
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create "{newGroupName}"
              </Button>
            )}
          </div>
        </CommandEmpty>
        <CommandGroup>
          {groups.map((group) => {
            const isSelected = selectedGroups.some(g => g._id === group._id)
            return (
              <CommandItem
                key={group._id}
                value={group.name}
                onSelect={() => handleSelectGroup(group)}
                className="flex items-center justify-between"
              >
                <span>{group.name}</span>
                {isSelected && <Badge variant="secondary" className="ml-2">Selected</Badge>}
              </CommandItem>
            )
          })}
        </CommandGroup>
        
        {newGroupName && !groups.find(g => g.name.toLowerCase() === newGroupName.toLowerCase()) && (
          <CommandGroup heading="Create new">
            <CommandItem
              value={`create-${newGroupName}`}
              onSelect={handleCreateGroup}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create "{newGroupName}"
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  )

  const TriggerButton = () => (
    <Button
      variant="outline"
      className="justify-start gap-2"
      onClick={(e) => {
        // Ensure nested menus don't swallow the click
        e.preventDefault()
        e.stopPropagation()
        setOpen(true)
      }}
    >
      {placeholder}
    </Button>
  )

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <TriggerButton />
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <GroupList />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <TriggerButton />
      </DrawerTrigger>
      <DrawerContent>
        <div className="mt-4 border-t">
          <GroupList />
        </div>
      </DrawerContent>
    </Drawer>
  )
}