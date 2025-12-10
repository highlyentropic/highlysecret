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