export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO String for the day
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
  location?: string;
  notify: boolean;
  color: string;
  isAllDay?: boolean; // NEW: Supports full-day events
  category?: string;  // NEW: To identify 'Public Holiday'
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  description?: string;
  color?: string; 
  category?: string;
  originModuleId: string; 
}