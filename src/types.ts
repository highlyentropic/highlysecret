export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO String
  startTime?: string;
  endTime?: string;
  location?: string;
  notify: boolean;
  color: string;
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  description?: string;
  color?: string; // Hex code
  category?: string;
  originModuleId: string; // To track where it was created
}