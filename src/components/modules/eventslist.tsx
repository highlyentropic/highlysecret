import React from 'react';
import { FaBell, FaBellSlash, FaPlus } from 'react-icons/fa';

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

interface EventsListProps {
  events: CalendarEvent[];
  onAddClick: () => void;
  onToggleNotify: (id: string) => void;
}

export const EventsList: React.FC<EventsListProps> = ({ events, onAddClick, onToggleNotify }) => {
  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white', padding: '15px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>Upcoming Events</span>
        <button 
            onClick={onAddClick}
            style={{ 
                background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', 
                padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' 
            }}
        >
            <FaPlus size={10}/> Add Event
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sortedEvents.length === 0 && <div style={{color: '#999', fontSize: '12px', textAlign: 'center', marginTop: '20px'}}>No upcoming events</div>}
        
        {sortedEvents.map(evt => {
            const dateObj = new Date(evt.date);
            const month = dateObj.toLocaleString('default', { month: 'short' });
            const day = dateObj.getDate();

            return (
                <div key={evt.id} className="event-row">
                    <div className="event-date-box">
                        <span className="event-month">{month}</span>
                        <span className="event-day">{day}</span>
                    </div>
                    <div className="event-details">
                        <div className="event-time">
                            {evt.startTime ? `${evt.startTime} - ${evt.endTime || '...'}` : 'All Day'}
                            <button 
                                onClick={() => onToggleNotify(evt.id)}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', marginLeft: 'auto', color: evt.notify ? '#007bff' : '#ccc' }}
                            >
                                <FaBell size={10} />
                            </button>
                        </div>
                        <div className="event-title" style={{ borderLeft: `3px solid ${evt.color}`, paddingLeft: '5px' }}>
                            {evt.title}
                        </div>
                        {evt.location && <div className="event-loc">{evt.location}</div>}
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};