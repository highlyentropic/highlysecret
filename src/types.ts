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
  originModuleId: string; 
  parentId?: string;
  images?: Array<{ id: string; path: string; isCover?: boolean }>;
}