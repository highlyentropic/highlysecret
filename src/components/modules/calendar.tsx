import React, { useState, useRef, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight, FaCalendarDay, FaCalendarWeek, FaCalendarAlt, FaCaretDown } from 'react-icons/fa';
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, eachDayOfInterval, addDays, addMonths, subMonths, isSameMonth, isSameDay, setYear, setMonth, getDay, isToday } from 'date-fns';
import type { CalendarEvent } from '../../types';

interface CalendarProps {
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
}

type ViewType = 'month' | 'week' | 'day';

export const Calendar: React.FC<CalendarProps> = ({ events, onDayClick }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('month');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // --- NAVIGATION ---
  const next = () => {
      if (viewType === 'month') setViewDate(addMonths(viewDate, 1));
      else if (viewType === 'week') setViewDate(addDays(viewDate, 7));
      else setViewDate(addDays(viewDate, 1));
  };

  const prev = () => {
      if (viewType === 'month') setViewDate(subMonths(viewDate, 1));
      else if (viewType === 'week') setViewDate(addDays(viewDate, -7));
      else setViewDate(addDays(viewDate, -1));
  };

  const jumpToDate = (m: number, y: number) => {
      let d = setMonth(setYear(viewDate, y), m);
      setViewDate(d);
      setShowDatePicker(false);
  };

  // --- RENDERERS ---

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'white', position: 'relative' }}>
      
      {/* HEADER TOOLBAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid #eee', background: '#fafafa' }}>
        
        {/* Date Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', position: 'relative' }}>
             <button onClick={prev} style={navBtnStyle}><FaChevronLeft size={10}/></button>
             
             <button 
                onClick={() => setShowDatePicker(!showDatePicker)}
                style={{ background: 'transparent', border: 'none', fontWeight: 'bold', fontSize: '13px', color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
             >
                {format(viewDate, viewType === 'day' ? 'MMMM do, yyyy' : 'MMMM yyyy')} <FaCaretDown size={10} />
             </button>

             <button onClick={next} style={navBtnStyle}><FaChevronRight size={10}/></button>

             {/* DATE PICKER POPUP */}
             {showDatePicker && (
                 <DatePickerPopup 
                    currentDate={viewDate} 
                    onSelect={jumpToDate} 
                    onClose={() => setShowDatePicker(false)} 
                 />
             )}
        </div>

        {/* View Switcher */}
        <div style={{ display: 'flex', gap: '2px', background: '#eee', borderRadius: '4px', padding: '2px' }}>
            <ViewBtn active={viewType === 'day'} onClick={() => setViewType('day')} icon={<FaCalendarDay />} title="Day" />
            <ViewBtn active={viewType === 'week'} onClick={() => setViewType('week')} icon={<FaCalendarWeek />} title="Week" />
            <ViewBtn active={viewType === 'month'} onClick={() => setViewType('month')} icon={<FaCalendarAlt />} title="Month" />
        </div>
      </div>

      {/* VIEW CONTENT */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {viewType === 'month' && <MonthView currentDate={viewDate} events={events} onDayClick={onDayClick} />}
          {viewType === 'week' && <TimeGridView currentDate={viewDate} events={events} onDayClick={onDayClick} days={7} />}
          {viewType === 'day' && <TimeGridView currentDate={viewDate} events={events} onDayClick={onDayClick} days={1} />}
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const MonthView = ({ currentDate, events, onDayClick }: { currentDate: Date, events: CalendarEvent[], onDayClick: (d: Date) => void }) => {
    const monthStart = startOfDay(setMonth(setYear(new Date(), currentDate.getFullYear()), currentDate.getMonth()));
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayIndex = getDay(setMonth(currentDate, currentDate.getMonth()).setDate(1)) || 7; // 1 (Mon) - 7 (Sun)
    const offset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Adjust for Mon start

    const gridCells = [];
    
    // Empty slots
    for (let i = 0; i < offset; i++) gridCells.push(<div key={`empty-${i}`} style={cellStyle} />);

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const isTodayDate = isSameDay(date, new Date());
        
        const dayEvents = events.filter(e => isSameDay(new Date(e.date), date));
        const hasHoliday = dayEvents.some(e => e.category === 'Public Holiday');
        const isWeekend = getDay(date) === 0 || getDay(date) === 6;

        gridCells.push(
            <div 
                key={day} 
                onClick={() => onDayClick(date)}
                style={{
                    ...cellStyle,
                    backgroundColor: isTodayDate ? '#fff3cd' : 'transparent',
                    color: (isWeekend || hasHoliday) ? '#d9534f' : '#333',
                    fontWeight: isTodayDate ? 'bold' : 'normal',
                    cursor: 'pointer',
                    border: isTodayDate ? '1px solid #ffeeba' : '1px solid transparent',
                    flexDirection: 'column'
                }}
            >
                <span style={{zIndex: 2}}>{day}</span>
                <div style={{ display: 'flex', gap: '2px', marginTop: 'auto', marginBottom: '2px', zIndex: 2 }}>
                    {dayEvents.slice(0, 4).map(ev => (
                        <div key={ev.id} style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: ev.color }} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '5px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '2px' }}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                    <div key={i} style={{ fontSize: '10px', fontWeight: 'bold', color: '#666' }}>{d}</div>
                ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', gap: '1px', flex: 1, minHeight: 0 }}>
                {gridCells}
            </div>
        </div>
    );
};

const TimeGridView = ({ currentDate, events, days, onDayClick }: { currentDate: Date, events: CalendarEvent[], days: number, onDayClick: (d: Date) => void }) => {
    const start = days === 1 ? currentDate : startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start, end: addDays(start, days - 1) });
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header Row */}
            <div style={{ display: 'flex', borderBottom: '1px solid #eee', paddingLeft: '40px' }}>
                {weekDays.map((d, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', padding: '5px', fontSize: '11px', fontWeight: isToday(d) ? 'bold' : 'normal', color: isToday(d) ? '#007bff' : '#333' }}>
                         <div>{format(d, 'EEE')}</div>
                         <div style={{ fontSize: '14px' }}>{format(d, 'd')}</div>
                    </div>
                ))}
            </div>

            {/* All Day Row (Sticky-ish) */}
            <div style={{ display: 'flex', borderBottom: '2px solid #eee', paddingLeft: '40px', minHeight: '25px' }}>
                 {weekDays.map((d, i) => {
                     const allDayEvents = events.filter(e => isSameDay(new Date(e.date), d) && (e.isAllDay || e.category === 'Public Holiday'));
                     return (
                         <div key={i} style={{ flex: 1, padding: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                             {allDayEvents.map(e => (
                                 <div key={e.id} style={{ fontSize: '9px', background: e.color, color: 'white', padding: '2px 4px', borderRadius: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                     {e.title}
                                 </div>
                             ))}
                         </div>
                     );
                 })}
            </div>

            {/* Scrollable Grid */}
            <div style={{ flex: 1, overflowY: 'auto', position: 'relative', display: 'flex' }}>
                {/* Time Sidebar */}
                <div style={{ width: '40px', flexShrink: 0, borderRight: '1px solid #eee' }}>
                    {hours.map(h => (
                        <div key={h} style={{ height: '50px', fontSize: '10px', color: '#999', textAlign: 'right', paddingRight: '5px', paddingTop: '0px' }}>
                            {h}:00
                        </div>
                    ))}
                </div>

                {/* Grid Content */}
                <div style={{ flex: 1, position: 'relative' }}>
                    {/* Horizontal Lines */}
                    {hours.map(h => (
                        <div key={h} style={{ height: '50px', borderBottom: '1px solid #f9f9f9', width: '100%', boxSizing: 'border-box' }} />
                    ))}

                    {/* Columns & Events */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex' }}>
                         {weekDays.map((d, i) => {
                             const dayEvents = events.filter(e => isSameDay(new Date(e.date), d) && !e.isAllDay && e.category !== 'Public Holiday');
                             return (
                                 <div key={i} style={{ flex: 1, position: 'relative', borderRight: '1px solid #f0f0f0', height: '1200px' }} onClick={() => onDayClick(d)}>
                                     {dayEvents.map(ev => {
                                         // Calculate Position
                                         const [startH, startM] = (ev.startTime || '00:00').split(':').map(Number);
                                         const [endH, endM] = (ev.endTime || '01:00').split(':').map(Number); // Default 1 hour duration
                                         const top = (startH + startM / 60) * 50;
                                         const height = Math.max(20, ((endH + endM / 60) - (startH + startM / 60)) * 50);

                                         return (
                                             <div key={ev.id} 
                                                  style={{ 
                                                      position: 'absolute', top: `${top}px`, height: `${height}px`, 
                                                      left: '2px', right: '2px', 
                                                      backgroundColor: ev.color, opacity: 0.8, 
                                                      borderRadius: '3px', padding: '2px', color: 'white', 
                                                      fontSize: '9px', overflow: 'hidden', cursor: 'pointer', zIndex: 10
                                                  }}
                                                  title={`${ev.title} (${ev.startTime}-${ev.endTime})`}
                                             >
                                                 {ev.title}
                                             </div>
                                         );
                                     })}
                                 </div>
                             );
                         })}
                    </div>
                </div>
            </div>
        </div>
    );
};

const DatePickerPopup = ({ currentDate, onSelect, onClose }: { currentDate: Date, onSelect: (m: number, y: number) => void, onClose: () => void }) => {
    const months = Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('default', { month: 'long' }));
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);

    return (
        <div style={{ 
            position: 'absolute', top: '30px', left: '0', zIndex: 100, 
            background: 'white', border: '1px solid #ccc', borderRadius: '4px', 
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)', padding: '10px',
            display: 'flex', gap: '10px'
        }}>
            <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {months.map((m, i) => (
                    <div key={m} onClick={() => onSelect(i, currentDate.getFullYear())} 
                         style={{ padding: '2px 8px', cursor: 'pointer', fontSize: '12px', background: i === currentDate.getMonth() ? '#eef' : 'transparent' }}>
                        {m}
                    </div>
                ))}
            </div>
            <div style={{ width: '1px', background: '#eee' }} />
            <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {years.map(y => (
                    <div key={y} onClick={() => onSelect(currentDate.getMonth(), y)} 
                         style={{ padding: '2px 8px', cursor: 'pointer', fontSize: '12px', background: y === currentDate.getFullYear() ? '#eef' : 'transparent' }}>
                        {y}
                    </div>
                ))}
            </div>
            {/* Close Overlay */}
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }} onClick={onClose} />
        </div>
    );
};

const ViewBtn = ({ active, onClick, icon, title }: any) => (
    <button 
        onClick={onClick} 
        title={title}
        style={{ 
            background: active ? 'white' : 'transparent', 
            border: 'none', 
            boxShadow: active ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
            borderRadius: '3px', 
            padding: '4px 6px', 
            cursor: 'pointer', 
            color: active ? '#007bff' : '#666',
            display: 'flex', alignItems: 'center'
        }}
    >
        {icon}
    </button>
);

const cellStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', 
  width: '100%', height: '100%', borderRadius: '3px'
};
const navBtnStyle = { background: 'transparent', border: 'none', cursor: 'pointer', color: '#666' };