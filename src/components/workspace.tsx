import React, { useState, useEffect, useRef } from 'react';
import RGL, { WidthProvider, Layout } from 'react-grid-layout';
import Holidays from 'date-holidays';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Notepad } from './modules/notepad';
import { Clock } from './modules/clock';
import { Whiteboard } from './modules/whiteboard';
import { Calendar } from './modules/calendar';
import { TodoList } from './modules/todolist';
import { EventsList } from './modules/eventslist';
import { Planner } from './modules/planner';
import type { CalendarEvent, TodoItem } from '../types';
import { copyImage, removeImage, openImageFileDialog, getImageUrl } from '../utils/imageUtils';

// For path.basename in modal
declare const require: any;
const path = require('path');
import { StickyNote } from './modules/stickynote'; 
import { FaRegStickyNote, FaRegClock, FaPencilAlt, FaCalendarAlt, FaCheckSquare, FaList, FaTrash, FaPalette, FaExclamationTriangle, FaMinus, FaTasks, FaTh, FaExpand, FaImage, FaTimes, FaStar } from 'react-icons/fa';

const ReactGridLayout = WidthProvider(RGL);

// --- CONSTANTS ---
const COLS = 60; 
const ROW_HEIGHT = 20; 
const TOOLBAR_HEIGHT = 80;
const FOOTER_HEIGHT = 50; // New footer for minimized apps

const MODULE_SPECS = {
    notepad:    { w: 16, h: 12, minW: 16, minH: 12 },
    clock:      { w: 8, h: 8, minW: 8, minH: 8 },
    whiteboard: { w: 16, h: 16, minW: 8, minH: 8 },
    calendar:   { w: 12, h: 12, minW: 12, minH: 12 }, 
    todo:       { w: 12, h: 8, minW: 12, minH: 8 },
    stickynote: { w: 8, h: 8, minW: 8, minH: 8, maxW: 8, maxH: 8 }, 
    events:     { w: 14, h: 14, minW: 10, minH: 10 },
    planner:    { w: 16, h: 12, minW: 12, minH: 10 }
};

// 16 Themes (Header Color, Body Color)
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

type ModuleType = 'notepad' | 'clock' | 'whiteboard' | 'calendar' | 'todo' | 'stickynote' | 'events' | 'planner';

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
  themeIndex?: number;
  // Minimization support
  prevPos?: { x: number, y: number, w: number, h: number };
  // Structured mode ordering
  orderIndex?: number;
}

const loadState = <T,>(key: string, defaultVal: T): T => {
    try {
        const saved = localStorage.getItem(key);
        if (saved) return JSON.parse(saved);
    } catch (e) { console.error(e); }
    return defaultVal;
};

// Helper for icons map
const MODULE_ICONS = {
    notepad: FaRegStickyNote,
    clock: FaRegClock,
    whiteboard: FaPencilAlt,
    calendar: FaCalendarAlt,
    todo: FaCheckSquare,
    stickynote: FaRegStickyNote,
    events: FaList,
    planner: FaTasks
};

// Module width constants for structured mode
const STRUCTURED_MODULE_WIDTHS: Record<ModuleType, number> = {
  notepad: 320,
  clock: 200,
  whiteboard: 400,
  calendar: 300,
  todo: 300,
  stickynote: 200,
  events: 350,
  planner: 380
};

// SortableModule component for structured mode
interface SortableModuleProps {
  item: ModuleItem;
  theme: typeof THEMES[0];
  editingTitleId: string | null;
  setEditingTitleId: (id: string | null) => void;
  updateContent: (id: string, data: Partial<ModuleItem>) => void;
  paletteOpenId: string | null;
  setPaletteOpenId: (id: string | null) => void;
  minimizeModule: (id: string) => void;
  requestDelete: (id: string) => void;
  getVisibleTodos: (module: ModuleItem) => TodoItem[];
  allEvents: CalendarEvent[];
  globalTodos: TodoItem[];
  addTodo: (text: string, moduleId: string, parentId?: string) => void;
  updateTodo: (id: string, updates: Partial<TodoItem>) => void;
  setEditingTodo: (todo: TodoItem | null) => void;
  deleteTodo: (id: string) => Promise<void>;
  moveTodo: (itemId: string, targetModuleId: string) => void;
  reorderTodo: (draggedId: string, targetId: string | null, position: 'before' | 'after' | 'inside', moduleId: string) => void;
  handleEditEvent: (event: CalendarEvent) => void;
  openAddEventModal: (date?: Date) => void;
  setGlobalEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  maxRows: number;
  rowHeight: number;
  viewMode: 'free' | 'structured';
  todoModuleRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  onHeightChange?: (moduleId: string, height: number) => void;
}

const SortableModule: React.FC<SortableModuleProps & { id: string }> = ({ id, ...props }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const { item, theme, maxRows, rowHeight, viewMode, todoModuleRefs, onHeightChange } = props;
  
  // State to track measured height for todo modules
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  
  // Calculate module height
  const moduleHeight = item.type === 'todo' && viewMode === 'structured' && measuredHeight !== null
    ? Math.min(measuredHeight, maxRows * rowHeight)
    : item.type === 'todo' && viewMode === 'structured'
    ? 'auto' // Use auto initially until measured
    : (item.h * rowHeight);
  
  // Calculate module width
  const moduleWidth = STRUCTURED_MODULE_WIDTHS[item.type] || 300;

  // Effect to measure todo module height
  useEffect(() => {
    if (item.type === 'todo' && viewMode === 'structured') {
      const ref = todoModuleRefs.current.get(item.i);
      if (ref && onHeightChange) {
        // Initial measurement
        const measure = () => {
          // Use requestAnimationFrame to ensure content is rendered
          requestAnimationFrame(() => {
            const height = ref.scrollHeight;
            const maxHeight = maxRows * rowHeight;
            const finalHeight = Math.min(height, maxHeight);
            setMeasuredHeight(finalHeight);
            onHeightChange(item.i, finalHeight);
          });
        };
        
        // Measure after a short delay to ensure content is rendered
        const timeoutId = setTimeout(measure, 0);
        
        // Set up ResizeObserver for changes
        const resizeObserver = new ResizeObserver(() => {
          measure();
        });
        resizeObserver.observe(ref);
        return () => {
          clearTimeout(timeoutId);
          resizeObserver.disconnect();
        };
      }
    } else {
      setMeasuredHeight(null);
    }
  }, [item.type, item.i, viewMode, maxRows, rowHeight, onHeightChange, props.globalTodos.length]);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        width: `${moduleWidth}px`,
        height: typeof moduleHeight === 'string' ? moduleHeight : `${moduleHeight}px`,
        flexShrink: 0,
        marginRight: '16px',
      }}
    >
      <div
        className="grid-item"
        style={{
          width: '100%',
          height: item.type === 'todo' && viewMode === 'structured' ? 'auto' : '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px',
          overflow: item.type === 'todo' && viewMode === 'structured' ? 'visible' : 'hidden',
        }}
        ref={(el) => {
          if (item.type === 'todo' && el) {
            todoModuleRefs.current.set(item.i, el);
          }
        }}
      >
        <div 
          className="drag-handle" 
          style={{ 
            background: theme.header,
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            cursor: 'grab',
            userSelect: 'none',
            minHeight: '24px'
          }}
          {...attributes}
          {...listeners}
        >
          {props.editingTitleId === item.i ? (
            <input 
              type="text" 
              autoFocus 
              defaultValue={item.title || item.type} 
              onBlur={(e) => { props.updateContent(item.i, { title: e.target.value }); props.setEditingTitleId(null); }} 
              onKeyDown={(e) => { if(e.key === 'Enter') { props.updateContent(item.i, { title: e.currentTarget.value }); props.setEditingTitleId(null); } }} 
              style={{ height: '18px', fontSize: '11px', border: '1px solid #007bff', color: '#333', background: 'white', flex: 1 }} 
              onMouseDown={(e) => e.stopPropagation()} 
            />
          ) : ( 
            <span 
              className="module-title" 
              onClick={(e) => { e.stopPropagation(); props.setEditingTitleId(item.i); }}
              style={{ cursor: 'text', flex: 1 }}
            >
              {item.title || item.type}
            </span> 
          )}
          
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '5px' }}>
            {(item.type === 'todo' || item.type === 'notepad' || item.type === 'planner' || item.type === 'calendar' || item.type === 'events') && (
              <div style={{ position: 'relative' }} onMouseDown={(e) => e.stopPropagation()}>
                <span className="close-btn" style={{ fontSize: '12px' }} onClick={(e) => { e.stopPropagation(); props.setPaletteOpenId(props.paletteOpenId === item.i ? null : item.i); }}>
                  <FaPalette />
                </span>
                {props.paletteOpenId === item.i && (
                  <div style={{ 
                    position: 'absolute', top: '20px', right: 0, 
                    background: 'white', border: '1px solid #ccc', padding: '5px', 
                    zIndex: 9999, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)', width: '100px'
                  }}>
                    {THEMES.map((t, idx) => (
                      <div 
                        key={t.name}
                        onClick={() => props.updateContent(item.i, { themeIndex: idx })}
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
            <span 
              className="close-btn" 
              onMouseDown={(e) => e.stopPropagation()} 
              onClick={() => props.minimizeModule(item.i)}
              title="Minimize"
            >
              <FaMinus size={10} />
            </span>
            <span className="close-btn" onMouseDown={(e) => e.stopPropagation()} onClick={() => props.requestDelete(item.i)}>✖</span>
          </div>
        </div>
        
        <div className="module-content" style={{ 
          overflow: item.type === 'todo' && viewMode === 'structured' ? 'visible' : 'auto', 
          flex: item.type === 'todo' && viewMode === 'structured' ? '0 1 auto' : 1, 
          position: 'relative', 
          height: item.type === 'todo' && viewMode === 'structured' ? 'auto' : '100%',
          minHeight: item.type === 'todo' && viewMode === 'structured' ? 'auto' : 0
        }}>
          {item.type === 'notepad' && (
            <Notepad 
              content={item.content || ''} 
              onChange={(txt) => props.updateContent(item.i, { content: txt })}
              allEvents={props.allEvents}
              onEditEvent={props.handleEditEvent}
              backgroundColor={theme.body}
            />
          )}
          {item.type === 'clock' && <Clock mode={item.clockMode || 'analog'} onToggleMode={() => props.updateContent(item.i, { clockMode: item.clockMode === 'analog' ? 'digital' : 'analog' })} />}
          {item.type === 'whiteboard' && <Whiteboard content={item.content || ''} onChange={(data) => props.updateContent(item.i, { content: data })} />}
          
          {item.type === 'todo' && (
            <TodoList 
              moduleId={item.i} 
              items={props.getVisibleTodos(item)} 
              allEvents={props.allEvents} 
              backgroundColor={theme.body}
              onAddTodo={(text, parentId) => props.addTodo(text, item.i, parentId)} 
              onUpdateTodo={props.updateTodo} 
              onEditTodo={(todo) => props.setEditingTodo(todo)}
              onDeleteTodo={props.deleteTodo} 
              onMoveTodo={props.moveTodo} 
              onReorderTodo={(dragId, targetId, pos) => props.reorderTodo(dragId, targetId, pos, item.i)}
            />
          )}
          
          {item.type === 'stickynote' && <StickyNote content={item.content || ''} onChange={(txt) => props.updateContent(item.i, { content: txt })} />}
          {item.type === 'events' && <EventsList events={props.allEvents} onAddClick={() => props.openAddEventModal()} onToggleNotify={(id) => props.setGlobalEvents(prev => prev.map(e => e.id === id ? { ...e, notify: !e.notify } : e))} backgroundColor={theme.body} />}
          {item.type === 'calendar' && <Calendar events={props.allEvents} onDayClick={(date) => props.openAddEventModal(date)} backgroundColor={theme.body} />}
          {item.type === 'planner' && <Planner content={item.content || ''} onChange={(data) => props.updateContent(item.i, { content: data })} bgColor={theme.body} />}
        </div>
      </div>
    </div>
  );
};

export const Workspace = () => {
  // View mode state
  const initialViewMode = loadState<'free' | 'structured'>('ws_viewMode', 'free');
  const [viewMode, setViewMode] = useState<'free' | 'structured'>(initialViewMode);
  
  // View-specific state loading
  const [items, setItems] = useState<ModuleItem[]>(() => {
    const saved = loadState<ModuleItem[]>(`ws_items_${initialViewMode}`, []);
    // Fallback to old format for migration
    if (saved.length === 0) {
      const oldItems = loadState<ModuleItem[]>('ws_items', []);
      if (oldItems.length > 0) return oldItems;
    }
    return saved;
  });
  const [minimizedItems, setMinimizedItems] = useState<ModuleItem[]>(() => {
    const saved = loadState<ModuleItem[]>(`ws_minimized_${initialViewMode}`, []);
    // Fallback to old format for migration
    if (saved.length === 0) {
      const oldMinimized = loadState<ModuleItem[]>('ws_minimized', []);
      if (oldMinimized.length > 0) return oldMinimized;
    }
    return saved;
  });
  const [globalEvents, setGlobalEvents] = useState<CalendarEvent[]>(() => loadState('ws_events', []));
  const [globalTodos, setGlobalTodos] = useState<TodoItem[]>(() => loadState('ws_todos', []));
  const [holidayEvents, setHolidayEvents] = useState<CalendarEvent[]>([]);

  // Save view mode
  useEffect(() => { localStorage.setItem('ws_viewMode', JSON.stringify(viewMode)); }, [viewMode]);
  
  // Save view-specific items and minimized items
  useEffect(() => { localStorage.setItem(`ws_items_${viewMode}`, JSON.stringify(items)); }, [items, viewMode]);
  useEffect(() => { localStorage.setItem(`ws_minimized_${viewMode}`, JSON.stringify(minimizedItems)); }, [minimizedItems, viewMode]);
  useEffect(() => { localStorage.setItem('ws_events', JSON.stringify(globalEvents)); }, [globalEvents]);
  useEffect(() => { localStorage.setItem('ws_todos', JSON.stringify(globalTodos)); }, [globalTodos]);

  // Holiday Fetcher
  useEffect(() => {
      const locale = navigator.language || 'en-US';
      const countryCode = locale.split('-')[1] || 'US';
      const hd = new Holidays(countryCode);
      const currentYear = new Date().getFullYear();
      type Holiday = {
        name: string;
        date: string;
      }
      let fetched: Holiday[] = [];
      [currentYear - 1, currentYear, currentYear + 1].forEach(y => { fetched = [...fetched, ...hd.getHolidays(y)]; });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHolidayEvents(fetched.map((h, i) => ({
          id: `holiday-${i}`, title: h.name, date: new Date(h.date).toISOString(),
          isAllDay: true, notify: false, color: '#28a745', category: 'Public Holiday', location: countryCode
      })));
  }, []);

  const allEvents = [...holidayEvents, ...globalEvents];

  // UI State
  const [draggingType, setDraggingType] = useState<ModuleType>('notepad');
  const [isDropping, setIsDropping] = useState(false);
  const [gridHeight, setGridHeight] = useState(800);
  const [maxRows, setMaxRows] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  
  // @dnd-kit state for structured mode
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Refs for measuring todo module heights
  const todoModuleRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<Partial<CalendarEvent>>({});
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [paletteOpenId, setPaletteOpenId] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
        const h = window.innerHeight - TOOLBAR_HEIGHT - FOOTER_HEIGHT;
        setGridHeight(h);
        const newMaxRows = Math.floor(h / ROW_HEIGHT);
        setMaxRows(newMaxRows);
    };
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
      const clickHandler = () => setPaletteOpenId(null);
      window.addEventListener('click', clickHandler);
      return () => window.removeEventListener('click', clickHandler);
  }, []);

  // Sync editingTodo with globalTodos when it changes (only for image updates)
  useEffect(() => {
      if (editingTodo) {
          const updatedTodo = globalTodos.find(t => t.id === editingTodo.id);
          if (updatedTodo) {
              // Only update if images have changed to avoid unnecessary re-renders
              const imagesChanged = JSON.stringify(updatedTodo.images || []) !== JSON.stringify(editingTodo.images || []);
              if (imagesChanged) {
                  setEditingTodo(updatedTodo);
              }
          }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalTodos]);

  // Recalculate todo module heights when todos change (for structured mode)
  useEffect(() => {
    if (viewMode === 'structured') {
      // Trigger height recalculation by accessing refs
      // The ResizeObserver in SortableModule will handle the actual measurement
      todoModuleRefs.current.forEach((ref, moduleId) => {
        if (ref) {
          // Force a re-measurement by accessing scrollHeight
          const height = ref.scrollHeight;
          const maxHeight = maxRows * ROW_HEIGHT;
          const finalHeight = Math.min(height, maxHeight);
          if (finalHeight > 0) {
            handleTodoHeightChange(moduleId, finalHeight);
          }
        }
      });
    }
  }, [globalTodos, viewMode, maxRows]);


  // Calculate structured layout: group by type and assign orderIndex
  const calculateStructuredLayout = (modules: ModuleItem[]): ModuleItem[] => {
    if (modules.length === 0) return [];
    
    // If modules already have orderIndex, preserve their order
    const hasOrderIndex = modules.some(m => m.orderIndex !== undefined);
    if (hasOrderIndex) {
      // Sort by orderIndex, then assign new indices
      const sorted = [...modules].sort((a, b) => {
        const aOrder = a.orderIndex ?? 999999;
        const bOrder = b.orderIndex ?? 999999;
        return aOrder - bOrder;
      });
      return sorted.map((mod, index) => ({
        ...mod,
        orderIndex: index
      }));
    }
    
    // Group by type for initial layout
    const grouped = modules.reduce((acc, mod) => {
      if (!acc[mod.type]) acc[mod.type] = [];
      acc[mod.type].push(mod);
      return acc;
    }, {} as Record<ModuleType, ModuleItem[]>);
    
    // Sort groups by type order (matching toolbar order)
    const typeOrder: ModuleType[] = ['notepad', 'stickynote', 'whiteboard', 'todo', 'planner', 'calendar', 'events', 'clock'];
    const sortedTypes = typeOrder.filter(t => grouped[t]);
    
    // Assign orderIndex based on grouped order
    let orderIndex = 0;
    const result: ModuleItem[] = [];
    
    sortedTypes.forEach(type => {
      grouped[type].forEach(mod => {
        result.push({
          ...mod,
          orderIndex: orderIndex++
        });
      });
    });
    
    return result;
  };
  
  // Get sorted items by orderIndex for structured mode
  const getSortedItems = (): ModuleItem[] => {
    // Filter out duplicates by ID, keeping the first occurrence
    const uniqueItems = items.filter((item, index, self) => 
      index === self.findIndex(i => i.i === item.i)
    );
    return uniqueItems.sort((a, b) => {
      const aOrder = a.orderIndex ?? 999999;
      const bOrder = b.orderIndex ?? 999999;
      return aOrder - bOrder;
    });
  };

  // Toggle view mode
  const toggleViewMode = () => {
    const newMode: 'free' | 'structured' = viewMode === 'free' ? 'structured' : 'free';
    
    // Save current state
    localStorage.setItem(`ws_items_${viewMode}`, JSON.stringify(items));
    localStorage.setItem(`ws_minimized_${viewMode}`, JSON.stringify(minimizedItems));
    
    // Load new view state
    let newItems = loadState<ModuleItem[]>(`ws_items_${newMode}`, []);
    const newMinimizedItems = loadState<ModuleItem[]>(`ws_minimized_${newMode}`, []);
    
    // Merge modules: combine items from both views, prioritizing current view's properties
    // This ensures modules added in one view appear in the other, and properties like themes are synced
    const currentItemIds = new Set(items.map(i => i.i));
    const newItemIds = new Set(newItems.map(i => i.i));
    
    // Create a map of current items for easy lookup
    const currentItemsMap = new Map(items.map(i => [i.i, i]));
    
    // Merge: for items that exist in both views, use current view's properties (theme, content, etc.)
    // but preserve the new view's position/size
    const mergedItems = newItems.map(newItem => {
      const currentItem = currentItemsMap.get(newItem.i);
      if (currentItem) {
        // Item exists in both views - merge properties, prioritizing current view's non-positional data
        return {
          ...newItem, // Start with new view's position/size
          ...currentItem, // Override with current view's properties (theme, content, etc.)
          x: newItem.x, // But keep new view's position
          y: newItem.y,
          w: newItem.w,
          h: newItem.h
        };
      }
      return newItem;
    });
    
    // Add items from current view that don't exist in new view
    const itemsToAdd = items.filter(item => !newItemIds.has(item.i));
    
    // If switching to structured, calculate layout
    if (newMode === 'structured') {
      const allItems = [...mergedItems, ...itemsToAdd];
      const structuredItems = calculateStructuredLayout(allItems);
      setItems(structuredItems);
    } else {
      // For free view, add new items at default positions
      const itemsWithDefaults = [...mergedItems, ...itemsToAdd.map((item, index) => {
        const spec = MODULE_SPECS[item.type];
        return {
          ...item,
          x: ((mergedItems.length + index) % 10) * 16,
          y: Math.floor((mergedItems.length + index) / 10) * 12,
          w: spec.w,
          h: spec.h
        };
      })];
      setItems(itemsWithDefaults);
    }
    
    setMinimizedItems(newMinimizedItems);
    setViewMode(newMode);
  };

  const onDragStart = (e: React.DragEvent, type: ModuleType) => {
    e.dataTransfer.setData("text/plain", "");
    e.dataTransfer.setData("moduleType", type); // Mark as module drag
    setDraggingType(type);
    setIsDropping(true);
  };

  const onDrop = (layout: Layout[], layoutItem: Layout, event: Event) => {
    // FIX 1: If dragging a Todo Item, CANCEL module creation
    const dragEvent = event as unknown as React.DragEvent;
    if (dragEvent.dataTransfer && (
        dragEvent.dataTransfer.types.includes('todoId') || 
        dragEvent.dataTransfer.types.includes('reorderId') ||
        dragEvent.dataTransfer.types.includes('plannerDefId') // Planner DnD check
    )) {
         setIsDropping(false);
         return; // Do NOT create a module
    }

    // Handle Restore from Minimized Drag
    const restoreId = dragEvent.dataTransfer?.getData('restoreId');
    if (restoreId) {
        const itemToRestore = minimizedItems.find(i => i.i === restoreId);
        if (itemToRestore) {
            if (viewMode === 'structured') {
              // In structured view, add to end with orderIndex (check for duplicates first)
              if (!items.some(i => i.i === restoreId)) {
                const maxOrderIndex = items.length > 0 
                  ? Math.max(...items.map(i => i.orderIndex ?? 0))
                  : -1;
                const restored = {
                  ...itemToRestore,
                  orderIndex: maxOrderIndex + 1
                };
                setItems([...items, restored]);
              }
            } else {
              // Free view: restore to dropped position
              const restored = { 
                ...itemToRestore, 
                x: layoutItem.x, 
                y: layoutItem.y,
                w: itemToRestore.prevPos?.w || itemToRestore.w,
                h: itemToRestore.prevPos?.h || itemToRestore.h
              };
              setItems(prev => [...prev, restored]);
            }
            setMinimizedItems(prev => prev.filter(i => i.i !== restoreId));
            
            // Also restore in the other view's storage
            const otherMode: 'free' | 'structured' = viewMode === 'free' ? 'structured' : 'free';
            const otherMinimized = loadState<ModuleItem[]>(`ws_minimized_${otherMode}`, []);
            const otherItemToRestore = otherMinimized.find(i => i.i === restoreId);
            if (otherItemToRestore) {
              const otherItems = loadState<ModuleItem[]>(`ws_items_${otherMode}`, []);
              const otherRestored: ModuleItem = otherMode === 'structured' 
                ? {
                    ...otherItemToRestore,
                    orderIndex: otherItems.length > 0 
                      ? Math.max(...otherItems.map(i => i.orderIndex ?? 0)) + 1
                      : 0
                  }
                : {
                    ...otherItemToRestore,
                    x: otherItemToRestore.prevPos?.x || 0,
                    y: otherItemToRestore.prevPos?.y || 0,
                    w: otherItemToRestore.prevPos?.w || otherItemToRestore.w,
                    h: otherItemToRestore.prevPos?.h || otherItemToRestore.h
                  };
              
              const updatedOtherItems = otherMode === 'structured'
                ? [...otherItems, otherRestored]
                : [...otherItems, otherRestored];
              
              localStorage.setItem(`ws_items_${otherMode}`, JSON.stringify(updatedOtherItems));
              localStorage.setItem(`ws_minimized_${otherMode}`, JSON.stringify(otherMinimized.filter(i => i.i !== restoreId)));
            }
        }
        setIsDropping(false);
        return;
    }

    if (draggingType === 'clock' && items.some(i => i.type === 'clock')) {
        alert("Only one clock allowed!");
        setIsDropping(false);
        return;
    }
    const specs = MODULE_SPECS[draggingType];
    const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `mod_${Date.now()}`;
    
    let defaultTitle = draggingType.charAt(0).toUpperCase() + draggingType.slice(1);
    if (draggingType === 'todo') defaultTitle = "To-do (click to edit)";
    if (draggingType === 'planner') defaultTitle = "Planner";

    const newItem: ModuleItem = {
        i: uniqueId, 
        x: viewMode === 'structured' ? 0 : layoutItem.x, 
        y: viewMode === 'structured' ? 0 : layoutItem.y, 
        w: viewMode === 'structured' ? 16 : specs.w, 
        h: viewMode === 'structured' ? specs.h : specs.h, 
        type: draggingType,
        title: defaultTitle, content: '', clockMode: 'analog', listTitle: '', themeIndex: 0,
        orderIndex: viewMode === 'structured' ? (items.length > 0 ? Math.max(...items.map(i => i.orderIndex ?? 0)) + 1 : 0) : undefined
    };
    
    // Add to current view
    if (viewMode === 'structured') {
      // In structured view, add to end (check for duplicates first)
      if (!items.some(i => i.i === uniqueId)) {
        setItems([...items, newItem]);
      }
    } else {
      setItems(prev => {
        if (prev.some(i => i.i === uniqueId)) return prev;
        return [...prev, newItem];
      });
    }
    
    // Also add to the other view's storage (with appropriate positioning)
    const otherMode: 'free' | 'structured' = viewMode === 'free' ? 'structured' : 'free';
    const otherItems = loadState<ModuleItem[]>(`ws_items_${otherMode}`, []);
    
    // Check if module already exists in other view (shouldn't, but be safe)
    if (!otherItems.some(i => i.i === uniqueId)) {
      const otherViewItem: ModuleItem = {
        ...newItem,
        x: otherMode === 'structured' ? 0 : (otherItems.length % 10) * 16,
        y: otherMode === 'structured' ? 0 : Math.floor(otherItems.length / 10) * 12,
        w: otherMode === 'structured' ? 16 : specs.w,
        h: otherMode === 'structured' ? specs.h : specs.h,
        orderIndex: otherMode === 'structured' 
          ? (otherItems.length > 0 ? Math.max(...otherItems.map(i => i.orderIndex ?? 0)) + 1 : 0)
          : undefined
      };
      const updatedOtherItems = otherMode === 'structured' 
        ? [...otherItems, otherViewItem]
        : [...otherItems, otherViewItem];
      localStorage.setItem(`ws_items_${otherMode}`, JSON.stringify(updatedOtherItems));
    }
    
    setIsDropping(false);
  };

  // --- MINIMIZATION LOGIC ---
  const minimizeModule = (id: string) => {
      const item = items.find(i => i.i === id);
      if (!item) return;
      
      // Save position for restore
      const itemWithPos = { ...item, prevPos: { x: item.x, y: item.y, w: item.w, h: item.h } };
      
      setMinimizedItems(prev => [...prev, itemWithPos]);
      setItems(prev => prev.filter(i => i.i !== id));
  };

  const restoreModule = (id: string, dropX?: number, dropY?: number) => {
      const item = minimizedItems.find(i => i.i === id);
      if (!item) return;

      let restoredItem: ModuleItem;
      
      if (viewMode === 'structured') {
        // In structured view, add to end with orderIndex (check for duplicates first)
        if (!items.some(i => i.i === id)) {
          const maxOrderIndex = items.length > 0 
            ? Math.max(...items.map(i => i.orderIndex ?? 0))
            : -1;
          restoredItem = {
            ...item,
            orderIndex: maxOrderIndex + 1
          };
          setItems([...items, restoredItem]);
        } else {
          return; // Item already exists, don't restore
        }
      } else {
        // Free view: use saved position or provided drop position
        const newX = dropX !== undefined ? dropX : (item.prevPos?.x || 0);
        const newY = dropY !== undefined ? dropY : (item.prevPos?.y || 0);
        restoredItem = { 
          ...item, 
          x: newX, 
          y: newY, 
          w: item.prevPos?.w || item.w, 
          h: item.prevPos?.h || item.h 
        };
        setItems(prev => [...prev, restoredItem]);
      }
      
      setMinimizedItems(prev => prev.filter(i => i.i !== id));
      
      // Also restore in the other view's storage
      const otherMode: 'free' | 'structured' = viewMode === 'free' ? 'structured' : 'free';
      const otherMinimized = loadState<ModuleItem[]>(`ws_minimized_${otherMode}`, []);
      const otherItem = otherMinimized.find(i => i.i === id);
      if (otherItem) {
        const otherItems = loadState<ModuleItem[]>(`ws_items_${otherMode}`, []);
        const otherRestored: ModuleItem = otherMode === 'structured' 
          ? {
              ...otherItem,
              orderIndex: otherItems.length > 0 
                ? Math.max(...otherItems.map(i => i.orderIndex ?? 0)) + 1
                : 0
            }
          : {
              ...otherItem,
              x: otherItem.prevPos?.x || 0,
              y: otherItem.prevPos?.y || 0,
              w: otherItem.prevPos?.w || otherItem.w,
              h: otherItem.prevPos?.h || otherItem.h
            };
        
        const updatedOtherItems = otherMode === 'structured'
          ? [...otherItems.length > 0 ? otherItems : [], otherRestored]
          : [...otherItems, otherRestored];
        
        localStorage.setItem(`ws_items_${otherMode}`, JSON.stringify(updatedOtherItems));
        localStorage.setItem(`ws_minimized_${otherMode}`, JSON.stringify(otherMinimized.filter(i => i.i !== id)));
      }
  };

  const requestDelete = (id: string) => {
      const item = items.find(i => i.i === id);
      if (!item) return;
      let hasContent = false;
      if (item.type === 'notepad' || item.type === 'stickynote') if (item.content && item.content.trim().length > 0) hasContent = true;
      else if (item.type === 'whiteboard') if (item.content && item.content.length > 50) hasContent = true; 
      else if (item.type === 'todo') if (globalTodos.some(t => t.originModuleId === id)) hasContent = true;
      else if (item.type === 'planner') if (item.content && item.content.length > 50) hasContent = true;

      if (hasContent) setDeleteConfirmId(id);
      else performDelete(id);
  };

  const performDelete = (id: string) => {
      setItems(prev => prev.filter(i => i.i !== id));
      setGlobalTodos(prev => prev.filter(t => t.originModuleId !== id));
      
      // Also remove from the other view's storage
      const otherMode: 'free' | 'structured' = viewMode === 'free' ? 'structured' : 'free';
      const otherItems = loadState<ModuleItem[]>(`ws_items_${otherMode}`, []);
      const updatedOtherItems = otherItems.filter(i => i.i !== id);
      localStorage.setItem(`ws_items_${otherMode}`, JSON.stringify(updatedOtherItems));
      
      // Also remove from minimized items in both views
      const otherMinimized = loadState<ModuleItem[]>(`ws_minimized_${otherMode}`, []);
      const updatedOtherMinimized = otherMinimized.filter(i => i.i !== id);
      localStorage.setItem(`ws_minimized_${otherMode}`, JSON.stringify(updatedOtherMinimized));
      
      setDeleteConfirmId(null);
  };

  const updateContent = (id: string, data: Partial<ModuleItem>) => {
    setItems(prev => prev.map(i => i.i === id ? { ...i, ...data } : i));
    
    // Sync theme changes (and other properties) to the other view
    const otherMode: 'free' | 'structured' = viewMode === 'free' ? 'structured' : 'free';
    const otherItems = loadState<ModuleItem[]>(`ws_items_${otherMode}`, []);
    const updatedOtherItems = otherItems.map(i => i.i === id ? { ...i, ...data } : i);
    localStorage.setItem(`ws_items_${otherMode}`, JSON.stringify(updatedOtherItems));
    
    // Also update minimized items in both views if needed
    const currentMinimized = minimizedItems.find(i => i.i === id);
    if (currentMinimized) {
      setMinimizedItems(prev => prev.map(i => i.i === id ? { ...i, ...data } : i));
    }
    const otherMinimized = loadState<ModuleItem[]>(`ws_minimized_${otherMode}`, []);
    const updatedOtherMinimized = otherMinimized.map(i => i.i === id ? { ...i, ...data } : i);
    localStorage.setItem(`ws_minimized_${otherMode}`, JSON.stringify(updatedOtherMinimized));
  };
  
  // --- EVENT HANDLING ---
  const openAddEventModal = (date?: Date) => { 
      setModalData({ date: date ? date.toISOString() : new Date().toISOString(), title: '', startTime: '09:00', endTime: '10:00', location: '', color: '#007bff', notify: false, isAllDay: false }); 
      setShowModal(true); 
  };
  
  const handleEditEvent = (event: CalendarEvent) => {
      setModalData({ ...event });
      setShowModal(true);
  };

  const saveEvent = () => { 
      if (!modalData.title || !modalData.date) return; 
      
      const evtId = modalData.id || Date.now().toString();
      const newEvent: CalendarEvent = { 
          id: evtId, 
          title: modalData.title, 
          date: modalData.date, 
          startTime: modalData.startTime, 
          endTime: modalData.endTime, 
          location: modalData.location, 
          color: modalData.color || '#007bff', 
          notify: modalData.notify || false, 
          isAllDay: modalData.isAllDay,
          category: modalData.category // Preserve category
      }; 

      setGlobalEvents(prev => {
          const exists = prev.some(e => e.id === evtId);
          if (exists) return prev.map(e => e.id === evtId ? newEvent : e);
          return [...prev, newEvent];
      }); 
      setShowModal(false); 
  };
  
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
      }]);
  };

  const updateTodo = (id: string, updates: Partial<TodoItem>) => {
      if ('done' in updates) {
          const newStatus = updates.done!;
          setGlobalTodos(prev => {
              const nextTodos = [...prev];
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

  const deleteTodo = async (id: string) => {
      const getDescendants = (rootId: string, allItems: TodoItem[]): string[] => {
          const children = allItems.filter(i => i.parentId === rootId);
          return [...children.map(c => c.id), ...children.flatMap(c => getDescendants(c.id, allItems))];
      };
      
      // Clean up images for deleted todos
      const todoToDelete = globalTodos.find(t => t.id === id);
      if (todoToDelete && todoToDelete.images) {
          for (const img of todoToDelete.images) {
              try {
                  await removeImage(img.path);
              } catch (error) {
                  console.error(`Error removing image ${img.path}:`, error);
              }
          }
      }
      
      // Also clean up images for descendants
      const descendants = getDescendants(id, globalTodos);
      for (const descId of descendants) {
          const descTodo = globalTodos.find(t => t.id === descId);
          if (descTodo && descTodo.images) {
              for (const img of descTodo.images) {
                  try {
                      await removeImage(img.path);
                  } catch (error) {
                      console.error(`Error removing image ${img.path}:`, error);
                  }
              }
          }
      }
      
      setGlobalTodos(prev => {
          const toDelete = [id, ...getDescendants(id, prev)];
          return prev.filter(t => !toDelete.includes(t.id));
      });
  };
  
  const moveTodo = (itemId: string, targetModuleId: string) => {
      // Recursive move
      const getDescendants = (rootId: string, allItems: TodoItem[]): string[] => {
          const children = allItems.filter(i => i.parentId === rootId);
          return [...children.map(c => c.id), ...children.flatMap(c => getDescendants(c.id, allItems))];
      };

      setGlobalTodos(prev => {
          const descendants = getDescendants(itemId, prev);
          const idsToMove = [itemId, ...descendants];
          
          return prev.map(t => {
              if (idsToMove.includes(t.id)) {
                  let newParentId = t.parentId;
                  if (t.id === itemId && t.originModuleId !== targetModuleId) {
                      newParentId = undefined; 
                  }
                  
                  return { ...t, originModuleId: targetModuleId, parentId: newParentId };
              }
              return t;
          });
      });
  };

  const reorderTodo = (draggedId: string, targetId: string | null, position: 'before' | 'after' | 'inside', moduleId: string) => {
      setGlobalTodos(prev => {
          const draggedItem = prev.find(t => t.id === draggedId);
          if (!draggedItem) return prev;

          const newTodos = prev.filter(t => t.id !== draggedId); // Remove temporarily
          const targetIndex = newTodos.findIndex(t => t.id === targetId);

          const updatedItem = { ...draggedItem, originModuleId: moduleId };
          
          if (targetId && targetIndex !== -1) {
              const targetItem = prev.find(t => t.id === targetId)!;
              
              if (position === 'inside') {
                  updatedItem.parentId = targetId;
              } else {
                  updatedItem.parentId = targetItem.parentId; 
              }
              
              const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex;
              newTodos.splice(insertIndex, 0, updatedItem);
          } else {
              updatedItem.parentId = undefined;
              newTodos.push(updatedItem);
          }

          return newTodos;
      });
  };

  // Image management handlers
  const handleAddImage = async (todoId: string) => {
      try {
          console.log('Opening image file dialog...');
          const filePath = await openImageFileDialog();
          console.log('File path received:', filePath);
          
          if (!filePath) {
              console.log('No file selected');
              return;
          }
          
          console.log('Copying image from:', filePath);
          const imagePath = await copyImage(filePath, todoId);
          console.log('Image copied to:', imagePath);
          
          // Verify the file exists
          const fs = require('fs');
          if (!fs.existsSync(imagePath)) {
            throw new Error(`Image file was not created at: ${imagePath}`);
          }
          console.log('Image file verified to exist');
          
          const imageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          setGlobalTodos(prev => {
              const todo = prev.find(t => t.id === todoId);
              if (!todo) {
                  console.error('Todo not found:', todoId);
                  return prev;
              }
              
              const images = todo.images || [];
              
              const newImage = {
                  id: imageId,
                  path: imagePath,
                  isCover: images.length === 0 // First image is cover by default
              };
              
              console.log('Adding image to todo:', newImage);
              return prev.map(t => 
                  t.id === todoId 
                      ? { ...t, images: [...images, newImage] }
                      : t
              );
          });
      } catch (error) {
          console.error('Error adding image:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          alert('Failed to add image: ' + errorMessage);
      }
  };

  const handleRemoveImage = async (todoId: string, imageId: string, imagePath: string) => {
      try {
          await removeImage(imagePath);
          
          setGlobalTodos(prev => {
              const todo = prev.find(t => t.id === todoId);
              if (!todo) return prev;
              
              const images = (todo.images || []).filter(img => img.id !== imageId);
              // If we removed the cover image and there are other images, set the first one as cover
              const removedWasCover = todo.images?.find(img => img.id === imageId)?.isCover;
              if (removedWasCover && images.length > 0) {
                  images[0].isCover = true;
              }
              
              return prev.map(t => 
                  t.id === todoId 
                      ? { ...t, images }
                      : t
              );
          });
      } catch (error) {
          console.error('Error removing image:', error);
          alert('Failed to remove image: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
  };

  const handleSetCoverImage = (todoId: string, imageId: string) => {
      setGlobalTodos(prev => {
          const todo = prev.find(t => t.id === todoId);
          if (!todo) return prev;
          
          const images = (todo.images || []).map(img => ({
              ...img,
              isCover: img.id === imageId
          }));
          
          return prev.map(t => 
              t.id === todoId 
                  ? { ...t, images }
                  : t
          );
      });
  };
  
  // Handle layout changes - different behavior for structured vs free view
  const handleLayoutChange = (newLayout: Layout[]) => {
    if (isDropping) return;
    
    if (viewMode === 'structured') {
      // If dragging, don't update here - let handleDrag handle it
      if (draggedItemId) {
        return;
      }
      
      // No drag in progress, just snap to positions
      const sortedLayout = [...newLayout].sort((a, b) => a.x - b.x);
      const reorderedItems: ModuleItem[] = [];
      
      sortedLayout.forEach((layoutItem, index) => {
        const item = items.find(i => i.i === layoutItem.i);
        if (item) {
          reorderedItems.push({
            ...item,
            x: index * 16,
            y: 0,
            w: 16,
            h: maxRows
          });
        }
      });
      
      setItems(reorderedItems);
      return;

    } else {
      // Free view: normal behavior
      setItems(prevItems => prevItems.map(item => {
        const match = newLayout.find(l => l.i === item.i);
        return match ? { ...item, x: match.x, y: match.y, w: match.w, h: match.h } : item;
      }));
    }
  };

  // Drag handlers for zoom effect in structured view
  const handleDragStart = (layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, e: MouseEvent, element: HTMLElement) => {
    if (viewMode === 'structured') {
      setIsDragging(true);
      setDraggedItemId(newItem.i);
    }
  };

  const handleDrag = (layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, e: MouseEvent, element: HTMLElement) => {
    if (viewMode === 'structured' && draggedItemId && newItem.i === draggedItemId) {
      // Force y to 0 - prevent any vertical movement
      if (newItem.y !== 0) {
        // This shouldn't happen, but ensure it's always 0
        return;
      }
      
      // Calculate insertion point based on dragged item's x position
      // Use the current items array to get the order, not the layout
      const currentOrder = items
        .filter(item => item.i !== draggedItemId)
        .sort((a, b) => a.x - b.x);
      
      // Calculate which position the dragged item should be inserted at
      // Based on x position: each module is 16 units wide
      const draggedX = newItem.x;
      const insertionIndex = Math.max(0, Math.min(Math.round(draggedX / 16), currentOrder.length));
      
      // Build reordered items array with strict ordering
      const reorderedItems: ModuleItem[] = [];
      
      // Add items before insertion point
      for (let i = 0; i < insertionIndex; i++) {
        const item = currentOrder[i];
        reorderedItems.push({
          ...item,
          x: i * 16,
          y: 0,
          w: 16,
          h: maxRows
        });
      }
      
      // Add dragged item at insertion point (keep its current drag x position for visual feedback)
      const draggedItem = items.find(i => i.i === draggedItemId);
      if (draggedItem) {
        reorderedItems.push({
          ...draggedItem,
          x: draggedX, // Keep actual drag position during drag for visual feedback
          y: 0,
          w: 16,
          h: maxRows
        });
      }
      
      // Add items after insertion point
      for (let i = insertionIndex; i < currentOrder.length; i++) {
        const item = currentOrder[i];
        reorderedItems.push({
          ...item,
          x: (i + 1) * 16,
          y: 0,
          w: 16,
          h: maxRows
        });
      }
      
      setItems(reorderedItems);
    }
  };

  const handleDragStop = (layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, e: MouseEvent, element: HTMLElement) => {
    if (viewMode === 'structured' && draggedItemId) {
      // Finalize order - snap all items to strict positions
      const currentOrder = items
        .filter(item => item.i !== draggedItemId)
        .sort((a, b) => a.x - b.x);
      
      // Calculate final insertion index based on dragged item's final x position
      const draggedX = newItem.x;
      const insertionIndex = Math.max(0, Math.min(Math.round(draggedX / 16), currentOrder.length));
      
      // Build final reordered items with strict positions
      const reorderedItems: ModuleItem[] = [];
      
      // Add items before insertion point
      for (let i = 0; i < insertionIndex; i++) {
        const item = currentOrder[i];
        reorderedItems.push({
          ...item,
          x: i * 16,
          y: 0,
          w: 16,
          h: maxRows
        });
      }
      
      // Add dragged item at insertion point
      const draggedItem = items.find(i => i.i === draggedItemId);
      if (draggedItem) {
        reorderedItems.push({
          ...draggedItem,
          x: insertionIndex * 16,
          y: 0,
          w: 16,
          h: maxRows
        });
      }
      
      // Add items after insertion point
      for (let i = insertionIndex; i < currentOrder.length; i++) {
        const item = currentOrder[i];
        reorderedItems.push({
          ...item,
          x: (i + 1) * 16,
          y: 0,
          w: 16,
          h: maxRows
        });
      }
      
      setItems(reorderedItems);
      setIsDragging(false);
      setDraggedItemId(null);
    }
  };

  // @dnd-kit handlers for structured mode
  const handleDragStartStructured = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setIsDragging(true);
  };

  const handleDragEndStructured = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const sortedItems = getSortedItems();
      const oldIndex = sortedItems.findIndex(item => item.i === active.id);
      const newIndex = sortedItems.findIndex(item => item.i === over.id);
      
      const reordered = arrayMove(sortedItems, oldIndex, newIndex);
      const updated = reordered.map((item, index) => ({
        ...item,
        orderIndex: index
      }));
      
      setItems(updated);
    }
    
    setActiveId(null);
    setIsDragging(false);
  };

  // Handler for todo module height changes
  const handleTodoHeightChange = (moduleId: string, height: number) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.i === moduleId && item.type === 'todo') {
        const gridHeight = Math.ceil(height / ROW_HEIGHT);
        return { ...item, h: gridHeight };
      }
      return item;
    }));
  };

  const getVisibleTodos = (module: ModuleItem) => globalTodos.filter(t => t.originModuleId === module.i);
  const currentSpecs = MODULE_SPECS[draggingType];
  const hasClock = items.some(i => i.type === 'clock');
  
  // Get active dragged item for overlay
  const activeItem = activeId ? items.find(item => item.i === activeId) : null;

  return (
    <div className="app-container" style={{ position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* TOOLBAR */}
      <div className="toolbar" style={{ height: TOOLBAR_HEIGHT, flexShrink: 0 }}>
        {([
            { type: 'notepad', label: 'Notepad', Icon: FaRegStickyNote, color: '#007bff', disabled: false },
            { type: 'stickynote', label: 'Sticky', Icon: FaRegStickyNote, color: '#fdd835', disabled: false },
            { type: 'whiteboard', label: 'Whiteboard', Icon: FaPencilAlt, color: '#6610f2', disabled: false },
            { type: 'todo', label: 'To-Do', Icon: FaCheckSquare, color: '#e83e8c', disabled: false },
            { type: 'planner', label: 'Planner', Icon: FaTasks, color: '#20c997', disabled: false },
            { type: 'calendar', label: 'Calendar', Icon: FaCalendarAlt, color: '#fd7e14', disabled: false },
            { type: 'events', label: 'Events', Icon: FaList, color: '#17a2b8', disabled: false },
            { type: 'clock', label: 'Clock', Icon: FaRegClock, color: '#28a745', disabled: hasClock },
        ] as const).map(tool => (
             <div key={tool.type} className="droppable-element" draggable={!tool.disabled} unselectable="on" onDragStart={(e) => !tool.disabled && onDragStart(e, tool.type as ModuleType)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: tool.disabled ? 'not-allowed' : 'grab', opacity: tool.disabled ? 0.3 : 1, padding: '5px', border: '1px solid #ccc', borderRadius: '5px', width: '60px' }}>
                <tool.Icon size={20} color={tool.disabled ? '#999' : tool.color}/>
                <span style={{fontSize: '9px', marginTop: '4px'}}>{tool.label}</span>
            </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={toggleViewMode}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              border: '1px solid #ccc',
              borderRadius: '5px',
              background: viewMode === 'structured' ? '#007bff' : 'white',
              color: viewMode === 'structured' ? 'white' : '#333',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
            title={`Switch to ${viewMode === 'free' ? 'Structured' : 'Free'} view`}
          >
            {viewMode === 'free' ? <FaTh size={16} /> : <FaExpand size={16} />}
            <span>{viewMode === 'free' ? 'Structured' : 'Free'}</span>
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
                <div className="modal-header">{modalData.id ? 'Edit Event' : 'Add Event'}</div>
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
                </div>

                {/* Image Management Section */}
                <div className="modal-row">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                        <label style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                            <FaImage /> Images 
                            {editingTodo.images && editingTodo.images.length > 0 && (
                                <span style={{fontSize: '11px', color: '#666', fontWeight: 'normal'}}>
                                    ({editingTodo.images.length})
                                </span>
                            )}
                        </label>
                        <button 
                            onClick={async () => {
                                try {
                                    await handleAddImage(editingTodo.id);
                                } catch (error) {
                                    console.error('Error in handleAddImage:', error);
                                }
                            }}
                            style={{
                                background: '#007bff', 
                                color: 'white', 
                                border: 'none', 
                                padding: '6px 12px', 
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: '500'
                            }}
                        >
                            <FaImage size={12} /> Add Image
                        </button>
                    </div>
                    {editingTodo.images && editingTodo.images.length > 0 ? (
                        <div style={{
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
                            gap: '10px', 
                            maxHeight: '300px', 
                            overflowY: 'auto',
                            padding: '8px',
                            background: '#f8f9fa',
                            borderRadius: '4px',
                            border: '1px solid #e9ecef'
                        }}>
                            {editingTodo.images.map((img) => (
                                <div 
                                    key={img.id} 
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        padding: '8px',
                                        border: `2px solid ${img.isCover ? '#ffc107' : '#ddd'}`,
                                        borderRadius: '6px',
                                        background: img.isCover ? '#fffbf0' : 'white',
                                        position: 'relative',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {/* Image Preview */}
                                    <div style={{position: 'relative', width: '100%', paddingTop: '75%', marginBottom: '8px'}}>
                                        <img 
                                            src={getImageUrl(img.path)} 
                                            alt="Todo image" 
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                borderRadius: '4px',
                                                border: '1px solid #ddd'
                                            }}
                                            onError={(e) => {
                                                console.error('Failed to load image:', img.path);
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                const parent = target.parentElement;
                                                if (parent) {
                                                    parent.innerHTML = '<div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f0f0f0;color:#999;font-size:11px;border-radius:4px;">Image not found</div>';
                                                }
                                            }}
                                        />
                                        {/* Cover Badge */}
                                        {img.isCover && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '4px',
                                                left: '4px',
                                                background: '#ffc107',
                                                color: '#333',
                                                padding: '2px 6px',
                                                borderRadius: '3px',
                                                fontSize: '9px',
                                                fontWeight: 'bold',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px'
                                            }}>
                                                <FaStar size={8} /> Cover
                                            </div>
                                        )}
                                        {/* Remove Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Remove this image?')) {
                                                    handleRemoveImage(editingTodo.id, img.id, img.path);
                                                }
                                            }}
                                            title="Remove image"
                                            style={{
                                                position: 'absolute',
                                                top: '4px',
                                                right: '4px',
                                                background: 'rgba(220, 53, 69, 0.9)',
                                                border: 'none',
                                                color: 'white',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                borderRadius: '3px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '24px',
                                                height: '24px'
                                            }}
                                        >
                                            <FaTimes size={10} />
                                        </button>
                                    </div>
                                    
                                    {/* Image Info and Actions */}
                                    <div style={{fontSize: '10px', color: '#666', marginBottom: '6px', wordBreak: 'break-all'}}>
                                        {path.basename(img.path)}
                                    </div>
                                    
                                    {/* Cover Toggle Button */}
                                    {editingTodo.images && editingTodo.images.length > 1 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSetCoverImage(editingTodo.id, img.id);
                                            }}
                                            title={img.isCover ? "Currently cover image" : "Set as cover image"}
                                            style={{
                                                width: '100%',
                                                background: img.isCover ? '#ffc107' : '#e9ecef',
                                                border: `1px solid ${img.isCover ? '#ffc107' : '#ddd'}`,
                                                borderRadius: '4px',
                                                padding: '4px 8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '4px',
                                                fontSize: '10px',
                                                fontWeight: img.isCover ? 'bold' : 'normal',
                                                color: img.isCover ? '#333' : '#666',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <FaStar size={9} /> {img.isCover ? 'Cover' : 'Set Cover'}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{
                            padding: '20px',
                            textAlign: 'center',
                            color: '#999',
                            fontSize: '12px',
                            background: '#f8f9fa',
                            borderRadius: '4px',
                            border: '1px dashed #ddd'
                        }}>
                            No images added. Click "Add Image" to attach photos to this todo item.
                        </div>
                    )}
                </div>

                <div className="modal-actions"><button onClick={() => setEditingTodo(null)} style={{background: '#007bff', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px'}}>Done</button></div>
            </div>
        </div>
      )}

      {/* GRID / STRUCTURED MODE */}
      {viewMode === 'free' ? (
        // Free mode: Use ReactGridLayout
        <div 
          style={{ 
            flex: 1, 
            overflowX: 'auto',
            overflowY: 'auto',
            position: 'relative', 
            zIndex: 1
          }}
        >
          <ReactGridLayout 
            className="layout" 
            layout={items.map(i => { 
              const spec = MODULE_SPECS[i.type]; 
              return { 
                i: i.i, 
                x: i.x, 
                y: i.y, 
                w: i.w, 
                h: i.h, 
                minW: spec.minW, 
                minH: spec.minH,
                static: false
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
            isResizable={true} 
            isDraggable={true}
            onLayoutChange={handleLayoutChange}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragStop={handleDragStop}
            droppingItem={{ i: 'placeholder', w: currentSpecs.w, h: currentSpecs.h }} 
            draggableHandle=".drag-handle"
            verticalCompact={false}
          >
            {items.map((item) => {
               const theme = THEMES[item.themeIndex || 0] || THEMES[0];
               return (
              <div key={item.i} className="grid-item">
                <div 
                  className="drag-handle" 
                  style={{ background: theme.header }}
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
                          onClick={(e) => { e.stopPropagation(); setEditingTitleId(item.i); }}
                          style={{ cursor: 'text' }}
                      >
                          {item.title || item.type}
                      </span> 
                  )}
                  
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '5px' }}>
                      {(item.type === 'todo' || item.type === 'notepad' || item.type === 'planner' || item.type === 'calendar' || item.type === 'events') && (
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
                      {/* Minimize Button */}
                      <span 
                          className="close-btn" 
                          onMouseDown={(e) => e.stopPropagation()} 
                          onClick={() => minimizeModule(item.i)}
                          title="Minimize"
                      >
                          <FaMinus size={10} />
                      </span>

                      <span className="close-btn" onMouseDown={(e) => e.stopPropagation()} onClick={() => requestDelete(item.i)}>✖</span>
                  </div>
                </div>
                
                <div className="module-content" style={{ overflow: 'hidden', flex: 1, position: 'relative' }}>
                  {item.type === 'notepad' && (
                      <Notepad 
                          content={item.content || ''} 
                          onChange={(txt) => updateContent(item.i, { content: txt })}
                          allEvents={allEvents}
                          onEditEvent={handleEditEvent}
                          backgroundColor={theme.body}
                      />
                  )}
                  {item.type === 'clock' && <Clock mode={item.clockMode || 'analog'} onToggleMode={() => updateContent(item.i, { clockMode: item.clockMode === 'analog' ? 'digital' : 'analog' })} />}
                  {item.type === 'whiteboard' && <Whiteboard content={item.content || ''} onChange={(data) => updateContent(item.i, { content: data })} />}
                  
                  {item.type === 'todo' && (
                      <TodoList 
                          moduleId={item.i} 
                          items={getVisibleTodos(item)} 
                          allEvents={allEvents} 
                          backgroundColor={theme.body}
                          onAddTodo={(text, parentId) => addTodo(text, item.i, parentId)} 
                          onUpdateTodo={updateTodo} 
                          onEditTodo={(todo) => setEditingTodo(todo)}
                          onDeleteTodo={deleteTodo} 
                          onMoveTodo={moveTodo} 
                          onReorderTodo={(dragId, targetId, pos) => reorderTodo(dragId, targetId, pos, item.i)}
                      />
                  )}
                  
                  {item.type === 'stickynote' && <StickyNote content={item.content || ''} onChange={(txt) => updateContent(item.i, { content: txt })} />}
                  {item.type === 'events' && <EventsList events={allEvents} onAddClick={() => openAddEventModal()} onToggleNotify={(id) => setGlobalEvents(prev => prev.map(e => e.id === id ? { ...e, notify: !e.notify } : e))} backgroundColor={theme.body} />}
                  {item.type === 'calendar' && <Calendar events={allEvents} onDayClick={(date) => openAddEventModal(date)} backgroundColor={theme.body} />}
                  {item.type === 'planner' && <Planner content={item.content || ''} onChange={(data) => updateContent(item.i, { content: data })} bgColor={theme.body} />}
                </div>
              </div>
            );
            })}
          </ReactGridLayout>
        </div>
      ) : (
        // Structured mode: Use flexbox with @dnd-kit
        <div 
          style={{ 
            flex: 1, 
            overflowX: 'auto',
            overflowY: 'hidden',
            position: 'relative', 
            zIndex: 1
          }}
        >
          <div
            style={{
              transform: isDragging ? 'scale(0.75)' : 'scale(1)',
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.2s ease-out',
              height: '100%',
              padding: '16px'
            }}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStartStructured}
              onDragEnd={handleDragEndStructured}
            >
              <SortableContext
                items={getSortedItems().map(item => item.i)}
                strategy={horizontalListSortingStrategy}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: '16px',
                    height: '100%'
                  }}
                >
                  {getSortedItems().map((item) => {
                    const theme = THEMES[item.themeIndex || 0] || THEMES[0];
                    return (
                      <SortableModule
                        key={item.i}
                        id={item.i}
                        item={item}
                        theme={theme}
                        editingTitleId={editingTitleId}
                        setEditingTitleId={setEditingTitleId}
                        updateContent={updateContent}
                        paletteOpenId={paletteOpenId}
                        setPaletteOpenId={setPaletteOpenId}
                        minimizeModule={minimizeModule}
                        requestDelete={requestDelete}
                        getVisibleTodos={getVisibleTodos}
                        allEvents={allEvents}
                        globalTodos={globalTodos}
                        addTodo={addTodo}
                        updateTodo={updateTodo}
                        setEditingTodo={setEditingTodo}
                        deleteTodo={deleteTodo}
                        moveTodo={moveTodo}
                        reorderTodo={reorderTodo}
                        handleEditEvent={handleEditEvent}
                        openAddEventModal={openAddEventModal}
                        setGlobalEvents={setGlobalEvents}
                        maxRows={maxRows}
                        rowHeight={ROW_HEIGHT}
                        viewMode={viewMode}
                        todoModuleRefs={todoModuleRefs}
                        onHeightChange={handleTodoHeightChange}
                      />
                    );
                  })}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeItem ? (
                  <div
                    style={{
                      width: `${STRUCTURED_MODULE_WIDTHS[activeItem.type] || 300}px`,
                      height: `${activeItem.type === 'todo' ? Math.min((activeItem.h * ROW_HEIGHT), (maxRows * ROW_HEIGHT)) : (activeItem.h * ROW_HEIGHT)}px`,
                      opacity: 0.8,
                      background: 'white',
                      border: '2px solid #007bff',
                      borderRadius: '4px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      color: '#666'
                    }}
                  >
                    {activeItem.title || activeItem.type}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      )}

      {/* MINIMIZED BAR */}
      <div style={{ height: FOOTER_HEIGHT, background: '#f8f9fa', borderTop: '1px solid #ccc', display: 'flex', alignItems: 'center', padding: '0 10px', gap: '10px', overflowX: 'auto', zIndex: 100 }}>
          {minimizedItems.map(item => {
              const Icon = MODULE_ICONS[item.type];
              const theme = THEMES[item.themeIndex || 0] || THEMES[0];
              return (
                  <div 
                    key={item.i}
                    draggable
                    onDragStart={(e) => {
                        e.dataTransfer.setData('restoreId', item.i);
                        setIsDropping(true);
                    }}
                    onClick={() => restoreModule(item.i)}
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '5px 10px', borderRadius: '4px',
                        background: theme.header,
                        border: '1px solid #ddd', cursor: 'pointer',
                        userSelect: 'none',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        minWidth: '120px', maxWidth: '200px'
                    }}
                  >
                      <Icon size={14} />
                      <span style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.title || item.type}
                      </span>
                  </div>
              )
          })}
      </div>
    </div>
  );
};