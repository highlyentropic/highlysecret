import React, { useState, useRef } from 'react';
import { FaChevronLeft, FaChevronRight, FaCalendarDay, FaCalendarWeek, FaCalendarAlt, FaCaretDown, FaSearchPlus, FaSearchMinus } from 'react-icons/fa';
import { format, startOfWeek, eachDayOfInterval, addDays, addMonths, subMonths, isSameDay, setYear, setMonth, getDay, isToday } from 'date-fns';
import type { CalendarEvent } from '../../types';

interface CalendarProps {
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  onDropItemOnDay?: (date: Date, itemName: string) => void;
  backgroundColor?: string;
}

type ViewType = 'month' | 'week' | 'day';

export const Calendar: React.FC<CalendarProps> = ({ events, onDayClick, onDropItemOnDay, backgroundColor = 'white' }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('month');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // ZOOM STATE (Row Height in px)
  const [hourHeight, setHourHeight] = useState(50); 

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

  const zoomIn = () => setHourHeight(prev => Math.min(100, prev + 10));
  const zoomOut = () => setHourHeight(prev => Math.max(20, prev - 10));

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: backgroundColor, position: 'relative' }}>
      
      {/* HEADER TOOLBAR - Scaled Compactly */}
      <div className="calendar-header">
        
        {/* Left: Date Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', position: 'relative', flex: 1, minWidth: 0 }}>
             <button onClick={prev} style={navBtnStyle}><FaChevronLeft size={9}/></button>
             
             <button 
                onClick={() => setShowDatePicker(!showDatePicker)}
                style={{ 
                    background: 'transparent', border: 'none', fontWeight: 'bold', fontSize: '11px', 
                    color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}
             >
                {format(viewDate, viewType === 'day' ? 'MMM d, yy' : 'MMM yyyy')} <FaCaretDown size={9} />
             </button>

             <button onClick={next} style={navBtnStyle}><FaChevronRight size={9}/></button>

             {/* DATE PICKER POPUP */}
             {showDatePicker && (
                 <DatePickerPopup 
                    currentDate={viewDate} 
                    onSelect={(m, y) => { setViewDate(setMonth(setYear(viewDate, y), m)); setShowDatePicker(false); }} 
                    onClose={() => setShowDatePicker(false)} 
                 />
             )}
        </div>

        {/* Right: Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            {/* Zoom Controls (Visible only in Day/Week) */}
            {viewType !== 'month' && (
                <div style={{ display: 'flex', alignItems: 'center', background: '#eee', borderRadius: '3px', padding: '0 2px' }}>
                    <button onClick={zoomOut} style={navBtnStyle} title="Zoom Out"><FaSearchMinus size={8}/></button>
                    <button onClick={zoomIn} style={navBtnStyle} title="Zoom In"><FaSearchPlus size={8}/></button>
                </div>
            )}

            {/* View Switcher */}
            <div style={{ display: 'flex', gap: '1px', background: '#eee', borderRadius: '3px', padding: '1px' }}>
                <ViewBtn active={viewType === 'day'} onClick={() => setViewType('day')} icon={<FaCalendarDay size={10} />} />
                <ViewBtn active={viewType === 'week'} onClick={() => setViewType('week')} icon={<FaCalendarWeek size={10} />} />
                <ViewBtn active={viewType === 'month'} onClick={() => setViewType('month')} icon={<FaCalendarAlt size={10} />} />
            </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {viewType === 'month' && <MonthView currentDate={viewDate} events={events} onDayClick={onDayClick} onDropItemOnDay={onDropItemOnDay} />}
          {viewType === 'week' && <TimeGridView currentDate={viewDate} events={events} onDayClick={onDayClick} days={7} hourHeight={hourHeight} />}
          {viewType === 'day' && <TimeGridView currentDate={viewDate} events={events} onDayClick={onDayClick} days={1} hourHeight={hourHeight} />}
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

interface MonthViewProps {
    currentDate: Date;
    events: CalendarEvent[];
    onDayClick: (date: Date) => void;
    onDropItemOnDay?: (date: Date, itemName: string) => void;
}

const MonthView: React.FC<MonthViewProps> = ({ currentDate, events, onDayClick, onDropItemOnDay }) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayIndex = getDay(setMonth(currentDate, currentDate.getMonth()).setDate(1)) || 7; 
    const offset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; 
    const gap = 1;
    const cols = 7;
    const rows = 6;

    const handleGridDrop = (e: React.DragEvent) => {
        if (!onDropItemOnDay) return;
        const itemName = e.dataTransfer.getData('todoItemText') || e.dataTransfer.getData('plannerItemName');
        if (!itemName || !gridRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = gridRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cellW = (rect.width - (cols - 1) * gap) / cols;
        const cellH = (rect.height - (rows - 1) * gap) / rows;
        const col = Math.min(cols - 1, Math.max(0, Math.floor(x / (cellW + gap))));
        const row = Math.min(rows - 1, Math.max(0, Math.floor(y / (cellH + gap))));
        const cellIndex = row * cols + col;
        if (cellIndex < offset || cellIndex >= offset + daysInMonth) return;
        const day = cellIndex - offset + 1;
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        onDropItemOnDay(date, itemName);
    };

    const handleGridDragOver = (e: React.DragEvent) => {
        if (onDropItemOnDay && (e.dataTransfer.types.includes('todoItemText') || e.dataTransfer.types.includes('plannerItemName'))) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
        }
    };

    const gridCells = [];
    for (let i = 0; i < offset; i++) gridCells.push(<div key={`empty-${i}`} style={cellStyle} />);

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dayEvents = events.filter((e: CalendarEvent) => isSameDay(new Date(e.date), date));
        const isTodayDate = isSameDay(date, new Date());
        
        gridCells.push(
            <div 
                key={day} 
                onClick={() => onDayClick(date)}
                style={{
                    ...cellStyle,
                    backgroundColor: isTodayDate ? '#fff3cd' : 'transparent',
                    fontWeight: isTodayDate ? 'bold' : 'normal',
                    flexDirection: 'column', cursor: 'pointer',
                    border: isTodayDate ? '1px solid #ffeeba' : '1px solid transparent'
                }}
            >
                <span style={{zIndex: 2, fontSize: '9px'}}>{day}</span>
                <div style={{ display: 'flex', gap: '1px', marginTop: 'auto', marginBottom: '1px', flexWrap: 'wrap', justifyContent:'center', width:'100%' }}>
                    {dayEvents.slice(0, 5).map((ev: CalendarEvent) => (
                        <div key={ev.id} style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: ev.color }} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '2px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '1px' }}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                    <div key={i} style={{ fontSize: '9px', fontWeight: 'bold', color: '#666' }}>{d}</div>
                ))}
            </div>
            <div
                ref={gridRef}
                onDragOver={handleGridDragOver}
                onDrop={handleGridDrop}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', gap: '1px', flex: 1, minHeight: 0 }}
            >
                {gridCells}
            </div>
        </div>
    );
};

interface TimeGridViewProps {
    currentDate: Date;
    events: CalendarEvent[];
    days: number;
    onDayClick: (date: Date) => void;
    hourHeight: number;
}

const TimeGridView: React.FC<TimeGridViewProps> = ({ currentDate, events, days, onDayClick, hourHeight }) => {
    const start = days === 1 ? currentDate : startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start, end: addDays(start, days - 1) });
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Sticky Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid #eee', paddingLeft: '30px', flexShrink: 0 }}>
                {weekDays.map((d: Date, i: number) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', padding: '2px', fontSize: '10px', color: isToday(d) ? '#007bff' : '#333' }}>
                         <div>{format(d, 'EEE')}</div>
                         <div style={{ fontWeight: 'bold' }}>{format(d, 'd')}</div>
                    </div>
                ))}
            </div>

            {/* Scrollable Area */}
            <div style={{ flex: 1, overflowY: 'auto', position: 'relative', display: 'flex' }}>
                {/* Time Scale */}
                <div style={{ width: '30px', flexShrink: 0, borderRight: '1px solid #eee', background: '#fafafa' }}>
                    {hours.map(h => (
                        <div key={h} style={{ height: `${hourHeight}px`, fontSize: '9px', color: '#999', textAlign: 'right', paddingRight: '3px' }}>
                            {h}:00
                        </div>
                    ))}
                </div>

                {/* Grid */}
                <div style={{ flex: 1, position: 'relative' }}>
                    {hours.map(h => (
                        <div key={h} style={{ height: `${hourHeight}px`, borderBottom: '1px solid #f9f9f9', width: '100%' }} />
                    ))}
                    
                    {/* Events Layer */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex' }}>
                         {weekDays.map((d: Date, i: number) => {
                             const dayEvents = events.filter((e: CalendarEvent) => isSameDay(new Date(e.date), d) && !e.isAllDay);
                             return (
                                 <div key={i} style={{ flex: 1, position: 'relative', borderRight: '1px solid #f0f0f0', height: `${hourHeight * 24}px` }} onClick={() => onDayClick(d)}>
                                     {dayEvents.map((ev: CalendarEvent) => {
                                         const [startH, startM] = (ev.startTime || '00:00').split(':').map(Number);
                                         const [endH, endM] = (ev.endTime || '01:00').split(':').map(Number);
                                         const top = (startH + startM / 60) * hourHeight;
                                         const duration = ((endH + endM / 60) - (startH + startM / 60));
                                         const height = Math.max(15, duration * hourHeight);

                                         return (
                                             <div key={ev.id} 
                                                  style={{ 
                                                      position: 'absolute', top: `${top}px`, height: `${height}px`, 
                                                      left: '1px', right: '1px', 
                                                      backgroundColor: ev.color, opacity: 0.85, 
                                                      borderRadius: '2px', padding: '1px 2px', color: 'white', 
                                                      fontSize: '9px', overflow: 'hidden', cursor: 'pointer', zIndex: 10
                                                  }}
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

interface DatePickerPopupProps {
    currentDate: Date;
    onSelect: (month: number, year: number) => void;
    onClose: () => void;
}

const DatePickerPopup: React.FC<DatePickerPopupProps> = ({ currentDate, onSelect, onClose }) => {
    const months = Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('default', { month: 'short' }));
    const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

    return (
        <div style={{ position: 'absolute', top: '25px', left: '0', zIndex: 100, background: 'white', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', padding: '5px', display: 'flex', gap: '5px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>{months.map((m, i) => <div key={m} onClick={() => onSelect(i, currentDate.getFullYear())} style={{cursor:'pointer', fontSize:'10px', padding:'1px 4px'}}>{m}</div>)}</div>
            <div style={{ width: '1px', background: '#eee' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>{years.map(y => <div key={y} onClick={() => onSelect(currentDate.getMonth(), y)} style={{cursor:'pointer', fontSize:'10px', padding:'1px 4px'}}>{y}</div>)}</div>
            <div style={{position:'fixed', top:0, left:0, width:'100vw', height:'100vh', zIndex:-1}} onClick={onClose}/>
        </div>
    );
};

interface ViewBtnProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
}

const ViewBtn: React.FC<ViewBtnProps> = ({ active, onClick, icon }) => (
    <button onClick={onClick} style={{ background: active ? 'white' : 'transparent', border: 'none', borderRadius: '2px', padding: '2px 4px', cursor: 'pointer', color: active ? '#007bff' : '#666' }}>{icon}</button>
);

const cellStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', borderRadius: '2px' };
const navBtnStyle = { background: 'transparent', border: 'none', cursor: 'pointer', color: '#666', padding: '2px' };