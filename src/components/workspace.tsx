import React, { useState, useEffect } from 'react';
import RGL, { WidthProvider, Layout } from 'react-grid-layout';
import Holidays from 'date-holidays';
import { Notepad } from './modules/notepad';
import { Clock } from './modules/clock';
import { Whiteboard } from './modules/whiteboard';
import { Calendar } from './modules/calendar';
import { TodoList } from './modules/todolist';
import { EventsList } from './modules/eventslist';
import type { CalendarEvent, TodoItem } from '../types';
import { StickyNote } from './modules/stickynote'; 
import { FaRegStickyNote, FaRegClock, FaPencilAlt, FaCalendarAlt, FaCheckSquare, FaBug, FaList, FaTrash, FaPalette, FaTag, FaPlus, FaExclamationTriangle } from 'react-icons/fa';

const ReactGridLayout = WidthProvider(RGL);

// --- CONSTANTS ---
const COLS = 60; 
const ROW_HEIGHT = 20; 
const TOOLBAR_HEIGHT = 80;

const MODULE_SPECS = {
    notepad:    { w: 16, h: 12, minW: 16, minH: 12 },
    clock:      { w: 8, h: 8, minW: 8, minH: 8 },
    whiteboard: { w: 16, h: 16, minW: 8, minH: 8 },
    // FIX: Removed maxW/maxH constraints for Calendar to allow resizing
    calendar:   { w: 12, h: 12, minW: 12, minH: 12 }, 
    todo:       { w: 12, h: 8, minW: 12, minH: 8 },
    stickynote: { w: 8, h: 8, minW: 8, minH: 8, maxW: 8, maxH: 8 }, 
    events:     { w: 14, h: 14, minW: 10, minH: 10 }
};

type ModuleType = 'notepad' | 'clock' | 'whiteboard' | 'calendar' | 'todo' | 'stickynote' | 'events';

interface ModuleItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: ModuleType;
  title?: string;
  content?: string; // Used for Notepad, StickyNote, and Whiteboard (base64)
  clockMode?: 'analog' | 'digital';
  linkedCategory?: string; 
}

// --- LOCAL STORAGE HELPERS ---
const loadState = <T,>(key: string, defaultVal: T): T => {
    try {
        const saved = localStorage.getItem(key);
        if (saved) return JSON.parse(saved);
    } catch (e) {
        console.error(`Error loading ${key}`, e);
    }
    return defaultVal;
};

export const Workspace = () => {
  // --- STATE ---
  const [items, setItems] = useState<ModuleItem[]>(() => loadState('ws_items', []));
  const [globalEvents, setGlobalEvents] = useState<CalendarEvent[]>(() => loadState('ws_events', []));
  const [globalTodos, setGlobalTodos] = useState<TodoItem[]>(() => loadState('ws_todos', []));
  const [todoCategories, setTodoCategories] = useState<string[]>(() => loadState('ws_categories', []));
  const [holidayEvents, setHolidayEvents] = useState<CalendarEvent[]>([]);

  // --- PERSISTENCE ---
  useEffect(() => { localStorage.setItem('ws_items', JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem('ws_events', JSON.stringify(globalEvents)); }, [globalEvents]);
  useEffect(() => { localStorage.setItem('ws_todos', JSON.stringify(globalTodos)); }, [globalTodos]);
  useEffect(() => { localStorage.setItem('ws_categories', JSON.stringify(todoCategories)); }, [todoCategories]);

  // --- HOLIDAY FETCHING ---
  useEffect(() => {
      const locale = navigator.language || 'en-US';
      const countryCode = locale.split('-')[1] || 'US';
      const hd = new Holidays(countryCode);
      const currentYear = new Date().getFullYear();
      const years = [currentYear - 1, currentYear, currentYear + 1];
      let fetched: any[] = [];
      years.forEach(y => { fetched = [...fetched, ...hd.getHolidays(y)]; });

      const formattedHolidays: CalendarEvent[] = fetched.map((h, i) => ({
          id: `holiday-${i}`,
          title: h.name,
          date: new Date(h.date).toISOString(),
          isAllDay: true,
          notify: false,
          color: '#28a745',
          category: 'Public Holiday',
          location: countryCode
      }));
      setHolidayEvents(formattedHolidays);
  }, []);

  const allEvents = [...holidayEvents, ...globalEvents];

  // UI STATE
  const [draggingType, setDraggingType] = useState<ModuleType>('notepad');
  const [isDropping, setIsDropping] = useState(false);
  const [gridHeight, setGridHeight] = useState(800);
  const [maxRows, setMaxRows] = useState(50);
  const [showDebug, setShowDebug] = useState(false);
  
  // MODALS
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<Partial<CalendarEvent>>({});
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [newCatText, setNewCatText] = useState('');
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);

  // DELETE CONFIRMATION STATE
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
        const h = window.innerHeight - TOOLBAR_HEIGHT;
        setGridHeight(h);
        setMaxRows(Math.floor(h / ROW_HEIGHT));
    };
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- ACTIONS ---
  const onDragStart = (e: React.DragEvent, type: ModuleType) => {
    e.dataTransfer.setData("text/plain", "");
    setDraggingType(type);
    setIsDropping(true);
  };

  const onDrop = (layout: Layout[], layoutItem: Layout) => {
    if (draggingType === 'clock' && items.some(i => i.type === 'clock')) {
        alert("Only one clock allowed!");
        setIsDropping(false);
        return;
    }
    const specs = MODULE_SPECS[draggingType];
    
    // FIX: Use crypto.randomUUID() to ensure truly unique IDs across reloads
    // _.uniqueId() resets on reload, causing ID collisions with loaded items
    const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newItem: ModuleItem = {
        i: uniqueId,
        x: layoutItem.x,
        y: layoutItem.y,
        w: specs.w,
        h: specs.h,
        type: draggingType,
        title: draggingType.charAt(0).toUpperCase() + draggingType.slice(1), 
        content: '',
        clockMode: 'analog'
    };
    setItems(prev => [...prev, newItem]);
    setIsDropping(false);
  };

  // --- DELETE LOGIC ---
  const requestDelete = (id: string) => {
      const item = items.find(i => i.i === id);
      if (!item) return;

      let hasContent = false;
      
      // Check content based on type
      if (item.type === 'notepad' || item.type === 'stickynote') {
          if (item.content && item.content.trim().length > 0) hasContent = true;
      }
      else if (item.type === 'whiteboard') {
          // Whiteboard content is a base64 string
          if (item.content && item.content.length > 50) hasContent = true; 
      }
      else if (item.type === 'todo') {
          // Check if there are any todos originating from this module
          const relatedTodos = globalTodos.filter(t => t.originModuleId === id);
          if (relatedTodos.length > 0) hasContent = true;
      }

      // If it has content, ask for confirmation
      if (hasContent) {
          setDeleteConfirmId(id);
      } else {
          // Delete immediately
          performDelete(id);
      }
  };

  const performDelete = (id: string) => {
      // 1. Remove the module
      setItems(prev => prev.filter(i => i.i !== id));

      // 2. Clean up associated data
      setGlobalTodos(prev => prev.filter(t => t.originModuleId !== id));
      
      // Close modal
      setDeleteConfirmId(null);
  };

  // --- EVENT & TODO ACTIONS (Unchanged) ---
  const openAddEventModal = (date?: Date) => {
    setModalData({ date: date ? date.toISOString() : new Date().toISOString(), title: '', startTime: '09:00', endTime: '10:00', location: '', color: '#007bff', notify: false, isAllDay: false });
    setShowModal(true);
  };
  const saveEvent = () => {
    if (!modalData.title || !modalData.date) return;
    const newEvent: CalendarEvent = {
        id: Date.now().toString(), title: modalData.title, date: modalData.date, startTime: modalData.startTime, endTime: modalData.endTime, location: modalData.location, color: modalData.color || '#007bff', notify: modalData.notify || false, isAllDay: modalData.isAllDay
    };
    setGlobalEvents([...globalEvents, newEvent]);
    setShowModal(false);
  };
  const toggleNotify = (id: string) => setGlobalEvents(prev => prev.map(e => e.id === id ? { ...e, notify: !e.notify } : e));
  const addTodo = (text: string, moduleId: string, category?: string) => {
      const newTodo: TodoItem = { id: Date.now().toString(), text, done: false, originModuleId: moduleId, category: category || undefined, color: '#333333' };
      setGlobalTodos([...globalTodos, newTodo]);
  };
  const updateTodo = (id: string, updates: Partial<TodoItem>) => setGlobalTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  const deleteTodo = (id: string) => setGlobalTodos(prev => prev.filter(t => t.id !== id));
  const addCategory = (cat: string) => { if (cat && !todoCategories.includes(cat)) setTodoCategories([...todoCategories, cat]); };
  const removeCategory = (cat: string) => setTodoCategories(prev => prev.filter(c => c !== cat));
  const updateContent = (id: string, data: Partial<ModuleItem>) => setItems(prev => prev.map(i => i.i === id ? { ...i, ...data } : i));
  
  const currentSpecs = MODULE_SPECS[draggingType];
  const hasClock = items.some(i => i.type === 'clock');
  const getVisibleTodos = (module: ModuleItem) => {
      const activeLinkedCategories = items.map(i => i.linkedCategory).filter(Boolean) as string[];
      if (module.linkedCategory) return globalTodos.filter(t => t.category === module.linkedCategory);
      else return globalTodos.filter(t => t.originModuleId === module.i && (!t.category || !activeLinkedCategories.includes(t.category)));
  };

  return (
    <div className="app-container" style={{ position: 'relative' }}>
      
      {/* TOOLBAR */}
      <div className="toolbar" style={{ height: TOOLBAR_HEIGHT, boxSizing: 'border-box' }}>
        {([
            { type: 'notepad', label: 'Notepad', Icon: FaRegStickyNote, color: '#007bff' },
            { type: 'stickynote', label: 'Sticky', Icon: FaRegStickyNote, color: '#fdd835' },
            { type: 'whiteboard', label: 'Whiteboard', Icon: FaPencilAlt, color: '#6610f2' },
            { type: 'todo', label: 'To-Do', Icon: FaCheckSquare, color: '#e83e8c' },
            { type: 'calendar', label: 'Calendar', Icon: FaCalendarAlt, color: '#fd7e14' },
            { type: 'events', label: 'Events', Icon: FaList, color: '#17a2b8' },
            { type: 'clock', label: 'Clock', Icon: FaRegClock, color: '#28a745', disabled: hasClock },
        ] as const).map(tool => (
             <div 
                key={tool.type}
                className="droppable-element"
                draggable={!tool.disabled}
                unselectable="on"
                onDragStart={(e) => !tool.disabled && onDragStart(e, tool.type as ModuleType)}
                style={{ 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', 
                    cursor: tool.disabled ? 'not-allowed' : 'grab', opacity: tool.disabled ? 0.3 : 1,
                    padding: '5px', border: '1px solid #ccc', borderRadius: '5px', width: '60px'
                }}
            >
                <tool.Icon size={20} color={tool.disabled ? '#999' : tool.color}/>
                <span style={{fontSize: '9px', marginTop: '4px'}}>{tool.label}</span>
            </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <button onClick={() => setShowDebug(!showDebug)} style={{ border: '1px solid #ccc', background: showDebug ? '#ffeeba' : 'white', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FaBug /> {showDebug ? 'Debug ON' : 'Debug OFF'}
            </button>
        </div>
      </div>

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmId && (
          <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '300px', textAlign: 'center' }}>
                  <FaExclamationTriangle size={40} color="#dc3545" style={{ margin: '0 auto' }} />
                  <h3>Delete Content?</h3>
                  <p style={{ fontSize: '14px', color: '#555' }}>
                      This module contains data (notes, drawings, or tasks). 
                      Closing it will <b>permanently delete</b> this content.
                  </p>
                  <div className="modal-actions" style={{ justifyContent: 'center' }}>
                      <button onClick={() => setDeleteConfirmId(null)} style={{ background: '#6c757d', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px' }}>Cancel</button>
                      <button onClick={() => performDelete(deleteConfirmId)} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px' }}>Delete</button>
                  </div>
              </div>
          </div>
      )}

      {/* OTHER MODALS (Event, Todo) - Kept same as before */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">Add Event</div>
                <div className="modal-row"><label>Event Name:</label><input type="text" value={modalData.title} onChange={e => setModalData({...modalData, title: e.target.value})} placeholder="Meeting with..." /></div>
                <div className="modal-row" style={{ flexDirection: 'row', gap: '10px' }}><div style={{flex:1}}><label>Date:</label><input type="date" value={modalData.date ? modalData.date.split('T')[0] : ''} onChange={e => setModalData({...modalData, date: new Date(e.target.value).toISOString()})} /></div><div style={{flex:1}}><label>Color:</label><input type="color" value={modalData.color} onChange={e => setModalData({...modalData, color: e.target.value})} style={{width: '100%', height:'38px'}}/></div></div>
                <div className="modal-row" style={{flexDirection: 'row', alignItems: 'center', gap: '10px'}}><input type="checkbox" checked={modalData.isAllDay} onChange={e => setModalData({...modalData, isAllDay: e.target.checked})} /><label onClick={() => setModalData({...modalData, isAllDay: !modalData.isAllDay})} style={{cursor:'pointer', marginBottom:0}}>All Day Event</label></div>
                {!modalData.isAllDay && (<div className="modal-row" style={{ flexDirection: 'row', gap: '10px' }}><div style={{flex:1}}><label>Start:</label><input type="time" value={modalData.startTime} onChange={e => setModalData({...modalData, startTime: e.target.value})} /></div><div style={{flex:1}}><label>End:</label><input type="time" value={modalData.endTime} onChange={e => setModalData({...modalData, endTime: e.target.value})} /></div></div>)}
                <div className="modal-row"><label>Location:</label><input type="text" value={modalData.location} onChange={e => setModalData({...modalData, location: e.target.value})} placeholder="Office / Online" /></div>
                <div className="modal-actions"><button onClick={() => setShowModal(false)} style={{background: '#6c757d', color: 'white', border: 'none', padding: '8px 15px'}}>Cancel</button><button onClick={saveEvent} style={{background: '#007bff', color: 'white', border: 'none', padding: '8px 15px'}}>Save</button></div>
            </div>
        </div>
      )}
      {editingTodo && (
        <div className="modal-overlay" onClick={() => setEditingTodo(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header" style={{display:'flex', justifyContent:'space-between'}}><span>Edit Item</span><button onClick={() => { deleteTodo(editingTodo.id); setEditingTodo(null); }} style={{background:'transparent', border:'none', color:'#dc3545'}}><FaTrash /></button></div>
                <div className="modal-row"><label>Task:</label><input type="text" value={editingTodo.text} onChange={(e) => { const val = e.target.value; setEditingTodo({...editingTodo, text: val}); updateTodo(editingTodo.id, { text: val }); }} /></div>
                <div className="modal-row"><label>Description:</label><textarea rows={3} value={editingTodo.description || ''} onChange={(e) => { const val = e.target.value; setEditingTodo({...editingTodo, description: val}); updateTodo(editingTodo.id, { description: val }); }} /></div>
                <div className="modal-row" style={{ flexDirection: 'row', gap: '10px' }}><div style={{flex: 1}}><label><FaPalette /> Color:</label><input type="color" value={editingTodo.color || '#333333'} onChange={(e) => { const val = e.target.value; setEditingTodo({...editingTodo, color: val}); updateTodo(editingTodo.id, { color: val }); }} /></div><div style={{flex: 1}}><label><FaTag /> Category:</label><select value={editingTodo.category || ''} onChange={(e) => { const val = e.target.value || undefined; setEditingTodo({...editingTodo, category: val}); updateTodo(editingTodo.id, { category: val }); }}><option value="">(None)</option>{todoCategories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}</select></div></div>
                <div className="modal-row" style={{borderTop: '1px solid #eee', paddingTop: '10px', marginTop: '5px'}}><label style={{fontSize:'11px'}}>Manage Categories:</label><div style={{display:'flex', gap:'5px'}}><input type="text" placeholder="New category..." value={newCatText} onChange={(e) => setNewCatText(e.target.value)} style={{flex:1}} /><button onClick={() => { if(newCatText) { addCategory(newCatText); setNewCatText(''); } }} style={{background:'#28a745', color:'white', border:'none', borderRadius:'4px', padding:'0 10px'}}><FaPlus /></button></div><div style={{display:'flex', flexWrap:'wrap', gap:'5px', marginTop:'5px'}}>{todoCategories.map(cat => (<span key={cat} className="category-tag" style={{background:'#eee', padding:'2px 5px', display:'flex', alignItems:'center', gap:'5px'}}>{cat}<button onClick={() => removeCategory(cat)} style={{border:'none', background:'transparent', color:'#999', cursor:'pointer', padding:0, fontSize:'10px'}}>✕</button></span>))}</div></div>
                <div className="modal-actions"><button onClick={() => setEditingTodo(null)} style={{background: '#007bff', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px'}}>Done</button></div>
            </div>
        </div>
      )}

      {/* DEBUG RULERS */}
      {showDebug && <div style={{ position: 'absolute', top: TOOLBAR_HEIGHT, left: 0, width: '100%', height: gridHeight, pointerEvents: 'none', zIndex: 0 }}>...</div>}

      {/* GRID */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}> 
        <ReactGridLayout
          className="layout"
          layout={items.map(i => {
             const spec = MODULE_SPECS[i.type];
             return { i: i.i, x: i.x, y: i.y, w: i.w, h: i.h, minW: spec.minW, minH: spec.minH, maxW: (spec as any).maxW, maxH: (spec as any).maxH };
          })}
          cols={COLS} rowHeight={ROW_HEIGHT} width={1200} margin={[0, 0]} style={{ height: gridHeight + 'px' }} 
          isDroppable={true} onDrop={onDrop} isBounded={true} maxRows={maxRows} compactType={null} preventCollision={true}
          onLayoutChange={(newLayout) => { if (isDropping) return; setItems(prevItems => prevItems.map(item => { const match = newLayout.find(l => l.i === item.i); return match ? { ...item, x: match.x, y: match.y, w: match.w, h: match.h } : item; })); }}
          droppingItem={{ i: 'placeholder', w: currentSpecs.w, h: currentSpecs.h }} draggableHandle=".drag-handle"
        >
          {items.map((item) => (
            <div key={item.i} className="grid-item">
              <div className="drag-handle" onDoubleClick={() => setEditingTitleId(item.i)}>
                {editingTitleId === item.i ? (
                    <input type="text" autoFocus defaultValue={item.title || item.type} onBlur={(e) => { updateContent(item.i, { title: e.target.value }); setEditingTitleId(null); }} onKeyDown={(e) => { if(e.key === 'Enter') { updateContent(item.i, { title: e.currentTarget.value }); setEditingTitleId(null); } }} style={{ height: '18px', fontSize: '11px', border: '1px solid #007bff', color: '#333', background: 'white' }} onMouseDown={(e) => e.stopPropagation()} />
                ) : ( <span className="module-title">{item.title || item.type}</span> )}
                
                {/* CLOSE BUTTON triggers requestDelete */}
                <span className="close-btn" onMouseDown={(e) => e.stopPropagation()} onClick={() => requestDelete(item.i)}>✖</span>
              </div>
              
              <div className="module-content" style={{ overflow: 'hidden', flex: 1, position: 'relative' }}>
                {item.type === 'notepad' && <Notepad content={item.content || ''} onChange={(txt) => updateContent(item.i, { content: txt })} />}
                {item.type === 'clock' && <Clock mode={item.clockMode || 'analog'} onToggleMode={() => updateContent(item.i, { clockMode: item.clockMode === 'analog' ? 'digital' : 'analog' })} />}
                
                {/* Whiteboard now receives content and saves it */}
                {item.type === 'whiteboard' && <Whiteboard content={item.content || ''} onChange={(data) => updateContent(item.i, { content: data })} />}
                
                {item.type === 'todo' && <TodoList moduleId={item.i} items={getVisibleTodos(item)} allCategories={todoCategories} linkedCategory={item.linkedCategory} onAddTodo={(text) => addTodo(text, item.i, item.linkedCategory)} onUpdateTodo={updateTodo} onDeleteTodo={deleteTodo} onSetLinkedCategory={(cat) => updateContent(item.i, { linkedCategory: cat, title: cat ? `To-Do: ${cat}` : 'To-Do' })} onEditTodo={(todo) => setEditingTodo(todo)} />}
                {item.type === 'stickynote' && <StickyNote content={item.content || ''} onChange={(txt) => updateContent(item.i, { content: txt })} />}
                {item.type === 'events' && <EventsList events={allEvents} onAddClick={() => openAddEventModal()} onToggleNotify={toggleNotify} />}
                {item.type === 'calendar' && <Calendar events={allEvents} onDayClick={(date) => openAddEventModal(date)} />}
              </div>
            </div>
          ))}
        </ReactGridLayout>
      </div>
    </div>
  );
};