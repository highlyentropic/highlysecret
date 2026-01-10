import React, { useState, useEffect } from 'react';
import RGL, { WidthProvider, Layout } from 'react-grid-layout';
import Holidays from 'date-holidays';
import _ from 'lodash';
import { Notepad } from './modules/notepad';
import { Clock } from './modules/clock';
import { Whiteboard } from './modules/whiteboard';
import { Calendar } from './modules/calendar';
import { TodoList } from './modules/todolist';
import { EventsList } from './modules/eventslist';
import type { CalendarEvent, TodoItem } from '../types';
import { StickyNote } from './modules/stickynote'; 
import { FaRegStickyNote, FaRegClock, FaPencilAlt, FaCalendarAlt, FaCheckSquare, FaBug, FaList, FaTrash, FaPalette, FaTag, FaPlus, FaExclamationTriangle, FaLink } from 'react-icons/fa';

const ReactGridLayout = WidthProvider(RGL);

// --- CONSTANTS ---
const COLS = 60; 
const ROW_HEIGHT = 20; 
const TOOLBAR_HEIGHT = 80;

const MODULE_SPECS = {
    notepad:    { w: 16, h: 12, minW: 16, minH: 12 },
    clock:      { w: 8, h: 8, minW: 8, minH: 8 },
    whiteboard: { w: 16, h: 16, minW: 8, minH: 8 },
    calendar:   { w: 12, h: 12, minW: 12, minH: 12 }, 
    todo:       { w: 12, h: 8, minW: 12, minH: 8 },
    stickynote: { w: 8, h: 8, minW: 8, minH: 8, maxW: 8, maxH: 8 }, 
    events:     { w: 14, h: 14, minW: 10, minH: 10 }
};

// 16 Themes (Header Color, Body Color) - Slightly transparent
const THEMES = [
    { name: 'Default', header: 'rgba(250, 250, 250, 0.95)', body: 'rgba(255, 255, 255, 0.95)' },
    { name: 'Red', header: 'rgba(255, 205, 210, 0.9)', body: 'rgba(255, 235, 238, 0.85)' },
    { name: 'Pink', header: 'rgba(248, 187, 208, 0.9)', body: 'rgba(252, 228, 236, 0.85)' },
    { name: 'Purple', header: 'rgba(225, 190, 231, 0.9)', body: 'rgba(243, 229, 245, 0.85)' },
    { name: 'Deep Purple', header: 'rgba(209, 196, 233, 0.9)', body: 'rgba(237, 231, 246, 0.85)' },
    { name: 'Indigo', header: 'rgba(197, 202, 233, 0.9)', body: 'rgba(232, 234, 246, 0.85)' },
    { name: 'Blue', header: 'rgba(187, 222, 251, 0.9)', body: 'rgba(227, 242, 253, 0.85)' },
    { name: 'Light Blue', header: 'rgba(179, 229, 252, 0.9)', body: 'rgba(225, 245, 254, 0.85)' },
    { name: 'Cyan', header: 'rgba(178, 235, 242, 0.9)', body: 'rgba(224, 247, 250, 0.85)' },
    { name: 'Teal', header: 'rgba(178, 223, 219, 0.9)', body: 'rgba(224, 242, 241, 0.85)' },
    { name: 'Green', header: 'rgba(200, 230, 201, 0.9)', body: 'rgba(232, 245, 233, 0.85)' },
    { name: 'Light Green', header: 'rgba(220, 237, 200, 0.9)', body: 'rgba(241, 248, 233, 0.85)' },
    { name: 'Lime', header: 'rgba(240, 244, 195, 0.9)', body: 'rgba(249, 251, 231, 0.85)' },
    { name: 'Yellow', header: 'rgba(255, 249, 196, 0.9)', body: 'rgba(255, 253, 231, 0.85)' },
    { name: 'Amber', header: 'rgba(255, 236, 179, 0.9)', body: 'rgba(255, 248, 225, 0.85)' },
    { name: 'Orange', header: 'rgba(255, 224, 178, 0.9)', body: 'rgba(255, 243, 224, 0.85)' },
];

type ModuleType = 'notepad' | 'clock' | 'whiteboard' | 'calendar' | 'todo' | 'stickynote' | 'events';

interface ModuleItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: ModuleType;
  title?: string;
  listTitle?: string;
  content?: string; 
  clockMode?: 'analog' | 'digital';
  linkedCategory?: string; 
  themeIndex?: number; // New prop for theme
}

const loadState = <T,>(key: string, defaultVal: T): T => {
    try {
        const saved = localStorage.getItem(key);
        if (saved) return JSON.parse(saved);
    } catch (e) { console.error(e); }
    return defaultVal;
};

export const Workspace = () => {
  const [items, setItems] = useState<ModuleItem[]>(() => loadState('ws_items', []));
  const [globalEvents, setGlobalEvents] = useState<CalendarEvent[]>(() => loadState('ws_events', []));
  const [globalTodos, setGlobalTodos] = useState<TodoItem[]>(() => loadState('ws_todos', []));
  const [todoCategories, setTodoCategories] = useState<string[]>(() => loadState('ws_categories', []));
  const [holidayEvents, setHolidayEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => { localStorage.setItem('ws_items', JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem('ws_events', JSON.stringify(globalEvents)); }, [globalEvents]);
  useEffect(() => { localStorage.setItem('ws_todos', JSON.stringify(globalTodos)); }, [globalTodos]);

  // Holiday Fetcher
  useEffect(() => {
      const locale = navigator.language || 'en-US';
      const countryCode = locale.split('-')[1] || 'US';
      const hd = new Holidays(countryCode);
      const currentYear = new Date().getFullYear();
      let fetched: any[] = [];
      [currentYear - 1, currentYear, currentYear + 1].forEach(y => { fetched = [...fetched, ...hd.getHolidays(y)]; });
      setHolidayEvents(fetched.map((h, i) => ({
          id: `holiday-${i}`, title: h.name, date: new Date(h.date).toISOString(),
          isAllDay: true, notify: false, color: '#28a745', category: 'Public Holiday', location: countryCode
      })));
  }, []);

  const allEvents = [...holidayEvents, ...globalEvents];
  
  // Future events for linking
  const upcomingEvents = allEvents.filter(e => new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)))
                                  .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                  .slice(0, 15);

  // --- AUTO-CHECK TODOs LINKED TO PAST EVENTS ---
  useEffect(() => {
      const interval = setInterval(() => {
          const now = new Date();
          let hasUpdates = false;
          const updatedTodos = globalTodos.map(todo => {
              if (todo.linkedEventId && !todo.done) {
                  const evt = allEvents.find(e => e.id === todo.linkedEventId);
                  if (evt) {
                      const evtDate = new Date(evt.date);
                      if (evt.startTime) {
                          const [h, m] = evt.startTime.split(':');
                          evtDate.setHours(Number(h), Number(m));
                      }
                      if (evtDate < now) {
                          hasUpdates = true;
                          return { ...todo, done: true };
                      }
                  }
              }
              return todo;
          });
          if (hasUpdates) setGlobalTodos(updatedTodos);
      }, 60000); 
      return () => clearInterval(interval);
  }, [globalTodos, allEvents]);

  // UI State
  const [draggingType, setDraggingType] = useState<ModuleType>('notepad');
  const [isDropping, setIsDropping] = useState(false);
  const [gridHeight, setGridHeight] = useState(800);
  const [maxRows, setMaxRows] = useState(50);
  const [showDebug, setShowDebug] = useState(false);
  
  // Modals / Popups
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<Partial<CalendarEvent>>({});
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [newCatText, setNewCatText] = useState('');
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [paletteOpenId, setPaletteOpenId] = useState<string | null>(null); // For color picker

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

  // Close palette when clicking outside
  useEffect(() => {
      const clickHandler = () => setPaletteOpenId(null);
      window.addEventListener('click', clickHandler);
      return () => window.removeEventListener('click', clickHandler);
  }, []);

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
    const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `mod_${Date.now()}`;
    
    // Default title
    let defaultTitle = draggingType.charAt(0).toUpperCase() + draggingType.slice(1);
    if (draggingType === 'todo') defaultTitle = "To-do (click to edit)";

    const newItem: ModuleItem = {
        i: uniqueId, x: layoutItem.x, y: layoutItem.y, w: specs.w, h: specs.h, type: draggingType,
        title: defaultTitle, content: '', clockMode: 'analog', listTitle: '', themeIndex: 0
    };
    setItems(prev => [...prev, newItem]);
    setIsDropping(false);
  };

  const requestDelete = (id: string) => {
      const item = items.find(i => i.i === id);
      if (!item) return;
      let hasContent = false;
      if (item.type === 'notepad' || item.type === 'stickynote') if (item.content && item.content.trim().length > 0) hasContent = true;
      else if (item.type === 'whiteboard') if (item.content && item.content.length > 50) hasContent = true; 
      else if (item.type === 'todo') if (globalTodos.some(t => t.originModuleId === id)) hasContent = true;

      if (hasContent) setDeleteConfirmId(id);
      else performDelete(id);
  };

  const performDelete = (id: string) => {
      setItems(prev => prev.filter(i => i.i !== id));
      setGlobalTodos(prev => prev.filter(t => t.originModuleId !== id));
      setDeleteConfirmId(null);
  };

  // Content Updaters
  const updateContent = (id: string, data: Partial<ModuleItem>) => setItems(prev => prev.map(i => i.i === id ? { ...i, ...data } : i));
  const openAddEventModal = (date?: Date) => { setModalData({ date: date ? date.toISOString() : new Date().toISOString(), title: '', startTime: '09:00', endTime: '10:00', location: '', color: '#007bff', notify: false, isAllDay: false }); setShowModal(true); };
  const saveEvent = () => { if (!modalData.title || !modalData.date) return; const newEvent: CalendarEvent = { id: Date.now().toString(), title: modalData.title, date: modalData.date, startTime: modalData.startTime, endTime: modalData.endTime, location: modalData.location, color: modalData.color || '#007bff', notify: modalData.notify || false, isAllDay: modalData.isAllDay }; setGlobalEvents([...globalEvents, newEvent]); setShowModal(false); };
  
  // --- TODO HELPERS ---
  const addTodo = (text: string, moduleId: string, parentId?: string) => {
      const parent = parentId ? globalTodos.find(t => t.id === parentId) : null;
      setGlobalTodos(prev => [...prev, { 
          id: Date.now().toString(), 
          text, 
          done: false, 
          originModuleId: moduleId, 
          parentId,
          color: parent?.color || '#333333',
          category: parent?.category,
      }]);
  };

  const updateTodo = (id: string, updates: Partial<TodoItem>) => {
      if ('done' in updates) {
          const newStatus = updates.done!;
          setGlobalTodos(prev => {
              let nextTodos = [...prev];
              const updateItem = (itemId: string, patch: Partial<TodoItem>) => {
                  const idx = nextTodos.findIndex(t => t.id === itemId);
                  if (idx !== -1) nextTodos[idx] = { ...nextTodos[idx], ...patch };
              };
              const markChildren = (pId: string) => {
                  const children = nextTodos.filter(t => t.parentId === pId);
                  children.forEach(c => {
                      updateItem(c.id, { done: newStatus });
                      markChildren(c.id);
                  });
              };
              updateItem(id, { done: newStatus });
              markChildren(id);

              if (!newStatus) {
                  let curr = nextTodos.find(t => t.id === id);
                  while (curr && curr.parentId) {
                      updateItem(curr.parentId, { done: false });
                      curr = nextTodos.find(t => t.id === curr.parentId);
                  }
              } else {
                  let curr = nextTodos.find(t => t.id === id);
                  while (curr && curr.parentId) {
                      const siblings = nextTodos.filter(t => t.parentId === curr.parentId);
                      if (siblings.every(s => s.done)) {
                          updateItem(curr.parentId, { done: true });
                          curr = nextTodos.find(t => t.id === curr.parentId);
                      } else { break; }
                  }
              }
              return nextTodos;
          });
      } else {
          setGlobalTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      }
  };

  const deleteTodo = (id: string) => {
      const getDescendants = (rootId: string, allItems: TodoItem[]): string[] => {
          const children = allItems.filter(i => i.parentId === rootId);
          return [...children.map(c => c.id), ...children.flatMap(c => getDescendants(c.id, allItems))];
      };
      setGlobalTodos(prev => {
          const toDelete = [id, ...getDescendants(id, prev)];
          return prev.filter(t => !toDelete.includes(t.id));
      });
  };

  const addCategory = (cat: string) => { if (cat && !todoCategories.includes(cat)) setTodoCategories([...todoCategories, cat]); };
  const removeCategory = (cat: string) => setTodoCategories(prev => prev.filter(c => c !== cat));
  
  const moveTodo = (itemId: string, targetModuleId: string) => {
      const getDescendants = (rootId: string, allItems: TodoItem[]): string[] => {
          const children = allItems.filter(i => i.parentId === rootId);
          return [...children.map(c => c.id), ...children.flatMap(c => getDescendants(c.id, allItems))];
      };
      setGlobalTodos(prev => {
          const idsToMove = [itemId, ...getDescendants(itemId, prev)];
          return prev.map(t => idsToMove.includes(t.id) ? { ...t, originModuleId: targetModuleId } : t);
      });
  };
  
  const getVisibleTodos = (module: ModuleItem) => globalTodos.filter(t => t.originModuleId === module.i);
  const currentSpecs = MODULE_SPECS[draggingType];
  const hasClock = items.some(i => i.type === 'clock');

  return (
    <div className="app-container" style={{ position: 'relative' }}>
      
      {/* TOOLBAR */}
      <div className="toolbar" style={{ height: TOOLBAR_HEIGHT }}>
        {([
            { type: 'notepad', label: 'Notepad', Icon: FaRegStickyNote, color: '#007bff' },
            { type: 'stickynote', label: 'Sticky', Icon: FaRegStickyNote, color: '#fdd835' },
            { type: 'whiteboard', label: 'Whiteboard', Icon: FaPencilAlt, color: '#6610f2' },
            { type: 'todo', label: 'To-Do', Icon: FaCheckSquare, color: '#e83e8c' },
            { type: 'calendar', label: 'Calendar', Icon: FaCalendarAlt, color: '#fd7e14' },
            { type: 'events', label: 'Events', Icon: FaList, color: '#17a2b8' },
            { type: 'clock', label: 'Clock', Icon: FaRegClock, color: '#28a745', disabled: hasClock },
        ] as const).map(tool => (
             <div key={tool.type} className="droppable-element" draggable={!tool.disabled} unselectable="on" onDragStart={(e) => !tool.disabled && onDragStart(e, tool.type as ModuleType)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: tool.disabled ? 'not-allowed' : 'grab', opacity: tool.disabled ? 0.3 : 1, padding: '5px', border: '1px solid #ccc', borderRadius: '5px', width: '60px' }}>
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
                  <p>Permanently delete this module and its content?</p>
                  <div className="modal-actions" style={{ justifyContent: 'center' }}>
                      <button onClick={() => setDeleteConfirmId(null)} style={{ background: '#6c757d', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px' }}>Cancel</button>
                      <button onClick={() => performDelete(deleteConfirmId)} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px' }}>Delete</button>
                  </div>
              </div>
          </div>
      )}

      {/* EVENT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {/* ... (Event Modal Content) ... */}
                <div className="modal-header">Add Event</div>
                <div className="modal-row"><label>Title:</label><input type="text" value={modalData.title} onChange={e => setModalData({...modalData, title: e.target.value})} /></div>
                <div className="modal-row" style={{ flexDirection: 'row', gap: '10px' }}><div style={{flex:1}}><label>Date:</label><input type="date" value={modalData.date ? modalData.date.split('T')[0] : ''} onChange={e => setModalData({...modalData, date: new Date(e.target.value).toISOString()})} /></div><div style={{flex:1}}><label>Color:</label><input type="color" value={modalData.color} onChange={e => setModalData({...modalData, color: e.target.value})} style={{width:'100%', height:'38px'}} /></div></div>
                <div className="modal-row" style={{flexDirection: 'row', alignItems: 'center', gap: '10px'}}><input type="checkbox" checked={modalData.isAllDay} onChange={e => setModalData({...modalData, isAllDay: e.target.checked})} /><label onClick={() => setModalData({...modalData, isAllDay: !modalData.isAllDay})}>All Day</label></div>
                {!modalData.isAllDay && (<div className="modal-row" style={{ flexDirection: 'row', gap: '10px' }}><div style={{flex:1}}><label>Start:</label><input type="time" value={modalData.startTime} onChange={e => setModalData({...modalData, startTime: e.target.value})} /></div><div style={{flex:1}}><label>End:</label><input type="time" value={modalData.endTime} onChange={e => setModalData({...modalData, endTime: e.target.value})} /></div></div>)}
                <div className="modal-actions"><button onClick={() => setShowModal(false)} style={{background: '#6c757d', color: 'white', border: 'none', padding: '8px 15px'}}>Cancel</button><button onClick={saveEvent} style={{background: '#007bff', color: 'white', border: 'none', padding: '8px 15px'}}>Save</button></div>
            </div>
        </div>
      )}

      {/* TODO EDIT MODAL */}
      {editingTodo && (
        <div className="modal-overlay" onClick={() => setEditingTodo(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header" style={{display:'flex', justifyContent:'space-between'}}><span>Edit Item</span><button onClick={() => { deleteTodo(editingTodo.id); setEditingTodo(null); }} style={{background:'transparent', border:'none', color:'#dc3545'}}><FaTrash /></button></div>
                <div className="modal-row"><label>Task:</label><input type="text" value={editingTodo.text} onChange={(e) => { const val = e.target.value; setEditingTodo({...editingTodo, text: val}); updateTodo(editingTodo.id, { text: val }); }} /></div>
                
                <div className="modal-row"><label>Description (Markdown):</label><textarea rows={5} value={editingTodo.description || ''} onChange={(e) => { const val = e.target.value; setEditingTodo({...editingTodo, description: val}); updateTodo(editingTodo.id, { description: val }); }} placeholder="Type... (Supports Markdown)" /></div>
                
                <div className="modal-row" style={{ flexDirection: 'row', gap: '10px' }}>
                    <div style={{flex: 1}}><label><FaPalette /> Color:</label><input type="color" value={editingTodo.color || '#333333'} onChange={(e) => { const val = e.target.value; setEditingTodo({...editingTodo, color: val}); updateTodo(editingTodo.id, { color: val }); }} /></div>
                    <div style={{flex: 1}}><label><FaTag /> Category:</label><select value={editingTodo.category || ''} onChange={(e) => { const val = e.target.value || undefined; setEditingTodo({...editingTodo, category: val}); updateTodo(editingTodo.id, { category: val }); }}><option value="">(None)</option>{todoCategories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}</select></div>
                </div>

                <div className="modal-row" style={{borderTop: '1px solid #eee', paddingTop: '10px'}}>
                    <label><FaLink /> Link to Event:</label>
                    <select 
                        value={editingTodo.linkedEventId || ''} 
                        onChange={(e) => {
                            const val = e.target.value || undefined;
                            setEditingTodo({...editingTodo, linkedEventId: val});
                            updateTodo(editingTodo.id, { linkedEventId: val });
                        }}
                    >
                        <option value="">(No Link)</option>
                        {upcomingEvents.map(e => (
                            <option key={e.id} value={e.id}>
                                {new Date(e.date).toLocaleDateString()} - {e.title}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="modal-row" style={{borderTop: '1px solid #eee', paddingTop: '10px', marginTop: '5px'}}><label style={{fontSize:'11px'}}>Manage Categories:</label><div style={{display:'flex', gap:'5px'}}><input type="text" placeholder="New category..." value={newCatText} onChange={(e) => setNewCatText(e.target.value)} style={{flex:1}} /><button onClick={() => { if(newCatText) { addCategory(newCatText); setNewCatText(''); } }} style={{background:'#28a745', color:'white', border:'none', borderRadius:'4px', padding:'0 10px'}}><FaPlus /></button></div><div style={{display:'flex', flexWrap:'wrap', gap:'5px', marginTop:'5px'}}>{todoCategories.map(cat => (<span key={cat} className="category-tag" style={{background:'#eee', padding:'2px 5px', display:'flex', alignItems:'center', gap:'5px'}}>{cat}<button onClick={() => removeCategory(cat)} style={{border:'none', background:'transparent', color:'#999', cursor:'pointer', padding:0, fontSize:'10px'}}>✕</button></span>))}</div></div>
                <div className="modal-actions"><button onClick={() => setEditingTodo(null)} style={{background: '#007bff', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px'}}>Done</button></div>
            </div>
        </div>
      )}

      {/* GRID */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}> 
        <ReactGridLayout className="layout" layout={items.map(i => { const spec = MODULE_SPECS[i.type]; return { i: i.i, x: i.x, y: i.y, w: i.w, h: i.h, minW: spec.minW, minH: spec.minH }; })} cols={COLS} rowHeight={ROW_HEIGHT} width={1200} margin={[0, 0]} style={{ height: gridHeight + 'px' }} isDroppable={true} onDrop={onDrop} isBounded={true} maxRows={maxRows} compactType={null} preventCollision={true} onLayoutChange={(newLayout) => { if (isDropping) return; setItems(prevItems => prevItems.map(item => { const match = newLayout.find(l => l.i === item.i); return match ? { ...item, x: match.x, y: match.y, w: match.w, h: match.h } : item; })); }} droppingItem={{ i: 'placeholder', w: currentSpecs.w, h: currentSpecs.h }} draggableHandle=".drag-handle">
          {items.map((item) => {
             const theme = THEMES[item.themeIndex || 0] || THEMES[0];
             return (
            <div key={item.i} className="grid-item">
              <div 
                className="drag-handle" 
                style={{ background: theme.header }} // Apply Theme Header
              >
                {editingTitleId === item.i ? (
                    <input 
                        type="text" 
                        autoFocus 
                        defaultValue={item.title || item.type} 
                        onBlur={(e) => { updateContent(item.i, { title: e.target.value }); setEditingTitleId(null); }} 
                        onKeyDown={(e) => { if(e.key === 'Enter') { updateContent(item.i, { title: e.currentTarget.value }); setEditingTitleId(null); } }} 
                        style={{ height: '18px', fontSize: '11px', border: '1px solid #007bff', color: '#333', background: 'white' }} 
                        onMouseDown={(e) => e.stopPropagation()} 
                    />
                ) : ( 
                    <span 
                        className="module-title" 
                        onClick={(e) => { e.stopPropagation(); setEditingTitleId(item.i); }} // CHANGED: Single click editing
                        style={{ cursor: 'text' }}
                    >
                        {item.title || item.type}
                    </span> 
                )}
                
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '5px' }}>
                    {/* Theme Picker Button */}
                    {item.type === 'todo' && (
                        <div style={{ position: 'relative' }} onMouseDown={(e) => e.stopPropagation()}>
                            <span className="close-btn" style={{ fontSize: '12px' }} onClick={(e) => { e.stopPropagation(); setPaletteOpenId(paletteOpenId === item.i ? null : item.i); }}>
                                <FaPalette />
                            </span>
                            {paletteOpenId === item.i && (
                                <div style={{ 
                                    position: 'absolute', top: '20px', right: 0, 
                                    background: 'white', border: '1px solid #ccc', padding: '5px', 
                                    zIndex: 9999, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)', width: '100px'
                                }}>
                                    {THEMES.map((t, idx) => (
                                        <div 
                                            key={t.name}
                                            onClick={() => updateContent(item.i, { themeIndex: idx })}
                                            title={t.name}
                                            style={{
                                                width: '20px', height: '20px', borderRadius: '3px',
                                                background: t.header, border: '1px solid #ddd', cursor: 'pointer'
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <span className="close-btn" onMouseDown={(e) => e.stopPropagation()} onClick={() => requestDelete(item.i)}>✖</span>
                </div>
              </div>
              
              <div className="module-content" style={{ overflow: 'hidden', flex: 1, position: 'relative' }}>
                {item.type === 'notepad' && <Notepad content={item.content || ''} onChange={(txt) => updateContent(item.i, { content: txt })} />}
                {item.type === 'clock' && <Clock mode={item.clockMode || 'analog'} onToggleMode={() => updateContent(item.i, { clockMode: item.clockMode === 'analog' ? 'digital' : 'analog' })} />}
                {item.type === 'whiteboard' && <Whiteboard content={item.content || ''} onChange={(data) => updateContent(item.i, { content: data })} />}
                
                {item.type === 'todo' && (
                    <TodoList 
                        moduleId={item.i} 
                        listTitle={item.listTitle || ''}
                        items={getVisibleTodos(item)} 
                        allEvents={allEvents} 
                        backgroundColor={theme.body} // Pass theme body color
                        onAddTodo={(text, parentId) => addTodo(text, item.i, parentId)} 
                        onUpdateTodo={updateTodo} 
                        onEditTodo={(todo) => setEditingTodo(todo)}
                        onDeleteTodo={deleteTodo} 
                        onUpdateListTitle={(t) => updateContent(item.i, { listTitle: t, title: t || 'To-Do' })}
                        onMoveTodo={moveTodo} 
                    />
                )}
                
                {item.type === 'stickynote' && <StickyNote content={item.content || ''} onChange={(txt) => updateContent(item.i, { content: txt })} />}
                {item.type === 'events' && <EventsList events={allEvents} onAddClick={() => openAddEventModal()} onToggleNotify={(id) => setGlobalEvents(prev => prev.map(e => e.id === id ? { ...e, notify: !e.notify } : e))} />}
                {item.type === 'calendar' && <Calendar events={allEvents} onDayClick={(date) => openAddEventModal(date)} />}
              </div>
            </div>
          );
        })}
        </ReactGridLayout>
      </div>
    </div>
  );
};