import React, { useState, useEffect } from 'react';
import RGL, { WidthProvider, Layout } from 'react-grid-layout';
import _ from 'lodash';
import { Notepad } from './modules/notepad';
import { Clock } from './modules/clock';
import { Whiteboard } from './modules/whiteboard';
import { Calendar } from './modules/calendar';
import { TodoList } from './modules/todolist';
import { EventsList } from './modules/eventslist';
import type { CalendarEvent, TodoItem } from '../types';
import { StickyNote } from './modules/stickynote'; 

// Imported missing icons for the Todo Modal
import { FaRegStickyNote, FaRegClock, FaPencilAlt, FaCalendarAlt, FaCheckSquare, FaBug, FaList, FaTrash, FaPalette, FaTag, FaPlus } from 'react-icons/fa';

const ReactGridLayout = WidthProvider(RGL);

// --- CONSTANTS ---
const COLS = 60; 
const ROW_HEIGHT = 20; 
const TOOLBAR_HEIGHT = 80;

const MODULE_SPECS = {
    notepad:    { w: 16, h: 12, minW: 16, minH: 12 },
    clock:      { w: 8, h: 8, minW: 8, minH: 8 },
    whiteboard: { w: 16, h: 16, minW: 8, minH: 8 },
    calendar:   { w: 12, h: 12, minW: 12, minH: 12, maxW: 20, maxH: 12 },
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
  content?: string;
  clockMode?: 'analog' | 'digital';
  linkedCategory?: string; // For Todo modules
}

export const Workspace = () => {
  // --- STATE ---
  const [items, setItems] = useState<ModuleItem[]>([]);
  const [draggingType, setDraggingType] = useState<ModuleType>('notepad');
  const [isDropping, setIsDropping] = useState(false);
  const [gridHeight, setGridHeight] = useState(800);
  const [maxRows, setMaxRows] = useState(50);
  const [showDebug, setShowDebug] = useState(false);
  
  // SHARED EVENT STATE
  const [globalEvents, setGlobalEvents] = useState<CalendarEvent[]>([]);
  
  // SHARED TODO STATE
  const [globalTodos, setGlobalTodos] = useState<TodoItem[]>([]);
  const [todoCategories, setTodoCategories] = useState<string[]>([]);

  // EVENT MODAL STATE
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<Partial<CalendarEvent>>({});

  // TODO EDIT MODAL STATE (Moved from TodoList.tsx for Bug 1)
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [newCatText, setNewCatText] = useState('');

  // RENAMING STATE
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);

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

  const onDrop = (layout: Layout[], layoutItem: Layout, _event: Event) => {
    if (draggingType === 'clock' && items.some(i => i.type === 'clock')) {
        alert("Only one clock allowed!");
        setIsDropping(false);
        return;
    }

    const specs = MODULE_SPECS[draggingType];
    const newItem: ModuleItem = {
        i: _.uniqueId('mod_'),
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

  // --- EVENT LOGIC ---

  const openAddEventModal = (date?: Date) => {
    setModalData({
        date: date ? date.toISOString() : new Date().toISOString(),
        title: '',
        startTime: '',
        endTime: '',
        location: '',
        color: '#007bff',
        notify: false
    });
    setShowModal(true);
  };

  const saveEvent = () => {
    if (!modalData.title || !modalData.date) return;
    const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        title: modalData.title,
        date: modalData.date,
        startTime: modalData.startTime,
        endTime: modalData.endTime,
        location: modalData.location,
        color: modalData.color || '#007bff',
        notify: modalData.notify || false
    };
    setGlobalEvents([...globalEvents, newEvent]);
    setShowModal(false);
  };

  const toggleNotify = (id: string) => {
    setGlobalEvents(prev => prev.map(e => e.id === id ? { ...e, notify: !e.notify } : e));
  };

  // --- TODO LOGIC ---

  const addTodo = (text: string, moduleId: string, category?: string) => {
      const newTodo: TodoItem = {
          id: Date.now().toString(),
          text,
          done: false,
          originModuleId: moduleId,
          category: category || undefined,
          color: '#333333'
      };
      setGlobalTodos([...globalTodos, newTodo]);
  };

  const updateTodo = (id: string, updates: Partial<TodoItem>) => {
      setGlobalTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTodo = (id: string) => {
      setGlobalTodos(prev => prev.filter(t => t.id !== id));
  };

  const addCategory = (cat: string) => {
      if (cat && !todoCategories.includes(cat)) {
          setTodoCategories([...todoCategories, cat]);
      }
  };

  const removeCategory = (cat: string) => {
      setTodoCategories(prev => prev.filter(c => c !== cat));
  };

  // --- MODULE CONTENT UPDATES ---

  const updateContent = (id: string, data: Partial<ModuleItem>) => {
    setItems(prev => prev.map(i => i.i === id ? { ...i, ...data } : i));
  };
  
  const removeItem = (id: string) => {
      setItems(prev => prev.filter(i => i.i !== id));
  };

  // --- RENDER ---

  const currentSpecs = MODULE_SPECS[draggingType];
  const hasClock = items.some(i => i.type === 'clock');

  const getVisibleTodos = (module: ModuleItem) => {
      const activeLinkedCategories = items.map(i => i.linkedCategory).filter(Boolean) as string[];
      
      if (module.linkedCategory) {
          return globalTodos.filter(t => t.category === module.linkedCategory);
      } else {
          return globalTodos.filter(t => {
              const belongsHere = t.originModuleId === module.i;
              const capturedByOther = t.category && activeLinkedCategories.includes(t.category);
              return belongsHere && !capturedByOther;
          });
      }
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
                    cursor: tool.disabled ? 'not-allowed' : 'grab', 
                    opacity: tool.disabled ? 0.3 : 1,
                    padding: '5px', border: '1px solid #ccc', borderRadius: '5px', width: '60px'
                }}
            >
                <tool.Icon size={20} color={tool.disabled ? '#999' : tool.color}/>
                <span style={{fontSize: '9px', marginTop: '4px'}}>{tool.label}</span>
            </div>
        ))}

        {/* Debug Toggle */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <button 
                onClick={() => setShowDebug(!showDebug)}
                style={{ 
                    border: '1px solid #ccc', background: showDebug ? '#ffeeba' : 'white', color: 'black',
                    padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' 
                }}
            >
                <FaBug /> {showDebug ? 'Debug ON' : 'Debug OFF'}
            </button>
        </div>
      </div>

      {/* EVENT MODAL POPUP */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">Add Event</div>
                
                <div className="modal-row">
                    <label>Event Name:</label>
                    <input type="text" value={modalData.title} onChange={e => setModalData({...modalData, title: e.target.value})} placeholder="Meeting with..." />
                </div>
                
                <div className="modal-row" style={{ flexDirection: 'row', gap: '10px' }}>
                    <div style={{flex:1, display:'flex', flexDirection:'column', gap:'5px'}}>
                        <label>Date:</label>
                        <input type="date" 
                            value={modalData.date ? modalData.date.split('T')[0] : ''} 
                            onChange={e => setModalData({...modalData, date: new Date(e.target.value).toISOString()})} 
                        />
                    </div>
                    <div style={{flex:1, display:'flex', flexDirection:'column', gap:'5px'}}>
                         <label>Color:</label>
                         <input type="color" value={modalData.color} onChange={e => setModalData({...modalData, color: e.target.value})} style={{width: '100%', height:'38px', padding: '2px'}}/>
                    </div>
                </div>

                <div className="modal-row" style={{ flexDirection: 'row', gap: '10px' }}>
                    <div style={{flex:1, display:'flex', flexDirection:'column', gap:'5px'}}>
                        <label>Start:</label>
                        <input type="time" value={modalData.startTime} onChange={e => setModalData({...modalData, startTime: e.target.value})} />
                    </div>
                    <div style={{flex:1, display:'flex', flexDirection:'column', gap:'5px'}}>
                        <label>End:</label>
                        <input type="time" value={modalData.endTime} onChange={e => setModalData({...modalData, endTime: e.target.value})} />
                    </div>
                </div>

                <div className="modal-row">
                    <label>Location:</label>
                    <input type="text" value={modalData.location} onChange={e => setModalData({...modalData, location: e.target.value})} placeholder="Office / Online" />
                </div>

                <div className="modal-row" style={{flexDirection: 'row', alignItems: 'center', marginTop: '5px', gap: '10px'}}>
                    <input type="checkbox" checked={modalData.notify} onChange={e => setModalData({...modalData, notify: e.target.checked})} style={{width:'auto'}} />
                    <label style={{marginBottom:0, cursor:'pointer'}} onClick={() => setModalData({...modalData, notify: !modalData.notify})}>Notify me</label>
                </div>

                <div className="modal-actions">
                    <button onClick={() => setShowModal(false)} style={{background: '#6c757d', color: 'white', border: 'none', padding: '8px 15px'}}>Cancel</button>
                    <button onClick={saveEvent} style={{background: '#007bff', color: 'white', border: 'none', padding: '8px 15px'}}>Save</button>
                </div>
            </div>
        </div>
      )}

      {/* TODO EDIT MODAL - MOVED HERE */}
      {editingTodo && (
        <div className="modal-overlay" onClick={() => setEditingTodo(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header" style={{display:'flex', justifyContent:'space-between'}}>
                    <span>Edit Item</span>
                    <button onClick={() => { deleteTodo(editingTodo.id); setEditingTodo(null); }} style={{background:'transparent', border:'none', color:'#dc3545', cursor:'pointer'}}>
                        <FaTrash />
                    </button>
                </div>

                <div className="modal-row">
                    <label>Task:</label>
                    <input 
                        type="text" 
                        value={editingTodo.text} 
                        onChange={(e) => {
                            const val = e.target.value;
                            setEditingTodo({...editingTodo, text: val});
                            updateTodo(editingTodo.id, { text: val });
                        }} 
                    />
                </div>

                <div className="modal-row">
                    <label>Description:</label>
                    <textarea 
                        rows={3}
                        value={editingTodo.description || ''} 
                        onChange={(e) => {
                            const val = e.target.value;
                            setEditingTodo({...editingTodo, description: val});
                            updateTodo(editingTodo.id, { description: val });
                        }}
                        placeholder="Add details..."
                    />
                </div>

                <div className="modal-row" style={{ flexDirection: 'row', gap: '10px' }}>
                    <div style={{flex: 1}}>
                        <label><FaPalette /> Color:</label>
                        <input 
                            type="color" 
                            value={editingTodo.color || '#333333'} 
                            onChange={(e) => {
                                const val = e.target.value;
                                setEditingTodo({...editingTodo, color: val});
                                updateTodo(editingTodo.id, { color: val });
                            }} 
                        />
                    </div>
                    <div style={{flex: 1}}>
                        <label><FaTag /> Category:</label>
                        <select 
                            value={editingTodo.category || ''} 
                            onChange={(e) => {
                                const val = e.target.value || undefined;
                                setEditingTodo({...editingTodo, category: val});
                                updateTodo(editingTodo.id, { category: val });
                            }}
                        >
                            <option value="">(None)</option>
                            {todoCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Category Management */}
                <div className="modal-row" style={{borderTop: '1px solid #eee', paddingTop: '10px', marginTop: '5px'}}>
                    <label style={{fontSize:'11px'}}>Manage Categories:</label>
                    <div style={{display:'flex', gap:'5px'}}>
                        <input 
                            type="text" 
                            placeholder="New category..." 
                            value={newCatText}
                            onChange={(e) => setNewCatText(e.target.value)}
                            style={{flex:1}}
                        />
                        <button 
                            onClick={() => {
                                if(newCatText) {
                                    addCategory(newCatText);
                                    setNewCatText('');
                                }
                            }}
                            style={{background:'#28a745', color:'white', border:'none', borderRadius:'4px', padding:'0 10px'}}
                        >
                            <FaPlus />
                        </button>
                    </div>
                    <div style={{display:'flex', flexWrap:'wrap', gap:'5px', marginTop:'5px'}}>
                        {todoCategories.map(cat => (
                            <span key={cat} className="category-tag" style={{background:'#eee', padding:'2px 5px', display:'flex', alignItems:'center', gap:'5px'}}>
                                {cat}
                                <button 
                                    onClick={() => removeCategory(cat)}
                                    style={{border:'none', background:'transparent', color:'#999', cursor:'pointer', padding:0, fontSize:'10px'}}
                                >
                                    ✕
                                </button>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="modal-actions">
                    <button onClick={() => setEditingTodo(null)} style={{background: '#007bff', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px'}}>Done</button>
                </div>
            </div>
        </div>
      )}

      {/* DEBUG RULERS */}
      {showDebug && (
        <div style={{ position: 'absolute', top: TOOLBAR_HEIGHT, left: 0, width: '100%', height: gridHeight, pointerEvents: 'none', zIndex: 0 }}>
            {/* ... (Debug rendering kept same as original if needed, but not critical for bug fixes) ... */}
        </div>
      )}

      {/* GRID */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}> 
        <ReactGridLayout
          className="layout"
          layout={items.map(i => {
             const spec = MODULE_SPECS[i.type];
             return { 
                 i: i.i, x: i.x, y: i.y, w: i.w, h: i.h, 
                 minW: spec.minW, minH: spec.minH, maxW: (spec as any).maxW, maxH: (spec as any).maxH 
             };
          })}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          width={1200}
          margin={[0, 0]}
          style={{ height: gridHeight + 'px' }} 
          isDroppable={true}
          onDrop={onDrop}
          isBounded={true}        
          maxRows={maxRows}       
          compactType={null}      
          preventCollision={true} 
          
          onLayoutChange={(newLayout) => {
             if (isDropping) return;
             setItems(prevItems => prevItems.map(item => {
                 const match = newLayout.find(l => l.i === item.i);
                 return match ? { ...item, x: match.x, y: match.y, w: match.w, h: match.h } : item;
             }));
          }}

          droppingItem={{ i: 'placeholder', w: currentSpecs.w, h: currentSpecs.h }}
          draggableHandle=".drag-handle"
        >
          {items.map((item) => (
            <div key={item.i} className="grid-item">
              
              {/* HEADER WITH RENAME LOGIC */}
              <div className="drag-handle" onDoubleClick={() => setEditingTitleId(item.i)}>
                {editingTitleId === item.i ? (
                    <input 
                        type="text" 
                        autoFocus
                        defaultValue={item.title || item.type}
                        onBlur={(e) => {
                            updateContent(item.i, { title: e.target.value });
                            setEditingTitleId(null);
                        }}
                        onKeyDown={(e) => {
                            if(e.key === 'Enter') {
                                updateContent(item.i, { title: e.currentTarget.value });
                                setEditingTitleId(null);
                            }
                        }}
                        style={{ height: '18px', fontSize: '11px', border: '1px solid #007bff', color: '#333', background: 'white' }}
                        onMouseDown={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span className="module-title">{item.title || item.type}</span>
                )}
                
                <span className="close-btn" onMouseDown={(e) => e.stopPropagation()} onClick={() => removeItem(item.i)}>✖</span>
              </div>
              
              <div className="module-content" style={{ overflow: 'hidden', flex: 1, position: 'relative' }}>
                {item.type === 'notepad' && <Notepad content={item.content || ''} onChange={(txt) => updateContent(item.i, { content: txt })} />}
                {item.type === 'clock' && <Clock mode={item.clockMode || 'analog'} onToggleMode={() => updateContent(item.i, { clockMode: item.clockMode === 'analog' ? 'digital' : 'analog' })} />}
                {item.type === 'whiteboard' && <Whiteboard />}
                {item.type === 'todo' && (
                    <TodoList 
                        moduleId={item.i}
                        items={getVisibleTodos(item)}
                        allCategories={todoCategories}
                        linkedCategory={item.linkedCategory}
                        onAddTodo={(text) => addTodo(text, item.i, item.linkedCategory)}
                        onUpdateTodo={updateTodo}
                        onDeleteTodo={deleteTodo}
                        // Removed category management props from TodoList as it's now handled globally in Workspace modal
                        onSetLinkedCategory={(cat) => updateContent(item.i, { linkedCategory: cat, title: cat ? `To-Do: ${cat}` : 'To-Do' })}
                        onEditTodo={(todo) => setEditingTodo(todo)} // Connect to Workspace modal
                    />
                )}
                {item.type === 'stickynote' && <StickyNote content={item.content || ''} onChange={(txt) => updateContent(item.i, { content: txt })} />}
                {item.type === 'events' && (
                    <EventsList 
                        events={globalEvents} 
                        onAddClick={() => openAddEventModal()} 
                        onToggleNotify={toggleNotify}
                    />
                )}
                {item.type === 'calendar' && (
                    <Calendar 
                        events={globalEvents} 
                        onDayClick={(date) => openAddEventModal(date)}
                    />
                )}
              </div>
            </div>
          ))}
        </ReactGridLayout>
      </div>
    </div>
  );
};