import { Id } from "../../convex/_generated/dataModel"

export type ColumnId = 'available' | 'scheduled'

export interface KanbanCard {
  id: string
  type: ColumnId
  content: string
  lessonId: Id<'lessons'>
  messageId?: Id<'predefinedMessages'> | Id<'userCustomMessages'>
  selectionId?: Id<'userSelectedMessages'>
  scheduledAt?: number
  source?: 'predefined' | 'custom'
}

export interface KanbanColumn {
  id: ColumnId
  title: string
  cards: KanbanCard[]
}

export interface KanbanData {
  available: KanbanCard[]
  scheduled: KanbanCard[]
}

export interface ScheduleEditData {
  date: string
  time: string
}

export interface DateRange {
  min?: number
  max?: number
}