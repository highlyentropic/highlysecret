import React from 'react';
import { FaBell, FaPlus } from 'react-icons/fa';
import type { CalendarEvent } from '../../types';

interface EventsListProps {
  events: CalendarEvent[];
  onAddClick: () => void;
  onToggleNotify: (id: string) => void;
  backgroundColor?: string;
}

export const EventsList: React.FC<EventsListProps> = ({ events, onAddClick, onToggleNotify, backgroundColor }) => {
  // Sort events by date, then by time
  const sortedEvents = [...events].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      if (a.isAllDay) return -1;
      if (b.isAllDay) return 1;
      return (a.startTime || '').localeCompare(b.startTime || '');
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: backgroundColor, padding: '15px' }}>
      
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
            const isHoliday = evt.category === 'Public Holiday';

            return (
                <div key={evt.id} className="event-row">
                    <div className="event-date-box">
                        <span className="event-month" style={{color: isHoliday ? '#d9534f' : '#666'}}>{month}</span>
                        <span className="event-day" style={{color: isHoliday ? '#d9534f' : '#333'}}>{day}</span>
                    </div>
                    <div className="event-details">
                        <div className="event-time">
                            {evt.isAllDay ? (
                                <span style={{fontWeight:'bold', color: '#555', fontSize:'10px', textTransform:'uppercase'}}>All Day</span>
                            ) : (
                                <span>{evt.startTime} {evt.endTime ? `- ${evt.endTime}` : ''}</span>
                            )}
                            
                            {!isHoliday && (
                                <button 
                                    onClick={() => onToggleNotify(evt.id)}
                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', marginLeft: 'auto', color: evt.notify ? '#007bff' : '#ccc' }}
                                >
                                    <FaBell size={10} />
                                </button>
                            )}
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