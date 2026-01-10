export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO String
  startTime?: string;
  endTime?: string;
  location?: string;
  notify: boolean;
  color: string;
  isAllDay?: boolean;
  category?: string;
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  description?: string;
  color?: string; 
  category?: string; 
  originModuleId: string; 
  linkedEventId?: string;
  parentId?: string; // NEW: Supports nesting
}