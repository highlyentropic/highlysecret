import React, { useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import type { CalendarEvent } from './eventslist'; 

interface CalendarProps {
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
}

const POLISH_HOLIDAYS = ["1-1", "6-1", "1-5", "3-5", "15-8", "1-11", "11-11", "25-12", "26-12"];

export const Calendar: React.FC<CalendarProps> = ({ events, onDayClick }) => {
  // Navigation State
  const [viewDate, setViewDate] = useState(new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();

  // Navigation Handlers
  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  // Grid Generation
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Mon start

  const gridCells = [];

  // Empty Slots
  for (let i = 0; i < startOffset; i++) {
    gridCells.push(<div key={`empty-${i}`} style={cellStyle}></div>);
  }

  // Day Slots
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month, day);
    const dateKey = `${day}-${month + 1}`; // For holidays
    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const isHoliday = POLISH_HOLIDAYS.includes(dateKey);
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

    // Check for Events on this day
    const daysEvents = events.filter(e => {
        const eDate = new Date(e.date);
        return eDate.getDate() === day && eDate.getMonth() === month && eDate.getFullYear() === year;
    });

    let textColor = '#333';
    if (isWeekend || isHoliday) textColor = '#d9534f';

    gridCells.push(
      <div 
        key={day} 
        onClick={() => onDayClick(dateObj)}
        style={{
          ...cellStyle, 
          color: textColor,
          backgroundColor: isToday ? '#fff3cd' : 'transparent',
          fontWeight: isToday ? 'bold' : 'normal',
          border: isToday ? '1px solid #ffeeba' : '1px solid transparent',
          cursor: 'pointer',
          position: 'relative',
          flexDirection: 'column'
        }}
      >
        <span style={{ zIndex: 2 }}>{day}</span>
        
        {/* Event Indicators (Dots) */}
        <div style={{ display: 'flex', gap: '2px', marginTop: 'auto', marginBottom: '2px', zIndex: 2 }}>
            {daysEvents.slice(0, 3).map(ev => (
                <div key={ev.id} style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: ev.color }} />
            ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'white', padding: '5px' }}>
      
      {/* Navigation Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', padding: '0 5px', flexShrink: 0 }}>
        <button onClick={prevMonth} style={navBtnStyle}><FaChevronLeft size={10}/></button>
        <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#333' }}>
            {viewDate.toLocaleString('en-US', { month: 'long' })} {year}
        </span>
        <button onClick={nextMonth} style={navBtnStyle}><FaChevronRight size={10}/></button>
      </div>

      {/* Days Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '2px', flexShrink: 0 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} style={{ fontSize: '10px', fontWeight: 'bold', color: '#666', paddingBottom: '2px' }}>{d}</div>
        ))}
      </div>

      {/* Date Grid */}
      <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gridTemplateRows: 'repeat(6, 1fr)', // Force 6 rows to fill space equally
          gap: '1px', 
          flex: 1, 
          minHeight: 0 // Crucial for grid overflow handling
      }}>
        {gridCells}
      </div>
    </div>
  );
};

// Updated Cell Style: remove fixed height, add width 100% and centering
const cellStyle: React.CSSProperties = {
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center', // Centers the number vertically if no events, or generally centers content
  fontSize: '10px', 
  borderRadius: '3px',
  width: '100%',
  height: '100%' // Fill the grid cell
};
const navBtnStyle = { background: 'transparent', border: 'none', cursor: 'pointer', color: '#666' };