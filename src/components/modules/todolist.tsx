import React, { useState, useEffect, useRef } from 'react';
import { FaCheck, FaStickyNote } from 'react-icons/fa';
import type { TodoItem, CalendarEvent } from '../../types';

interface TodoListProps {
  moduleId: string;
  listTitle: string;
  items: TodoItem[];
  allEvents: CalendarEvent[];
  onAddTodo: (text: string) => void;
  onUpdateTodo: (id: string, data: Partial<TodoItem>) => void;
  onEditTodo: (item: TodoItem) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateListTitle: (title: string) => void;
  onMoveTodo: (itemId: string, targetModuleId: string) => void; // New Prop
}

export const TodoList: React.FC<TodoListProps> = ({ 
    moduleId, items, listTitle,
    onAddTodo, onUpdateTodo, onEditTodo, onDeleteTodo, onUpdateListTitle, onMoveTodo
}) => {
  
  const [newItemText, setNewItemText] = useState('');
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, item: TodoItem} | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const handleClick = () => setContextMenu(null);
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
  }, []);

  const commitItem = () => {
    if (newItemText.trim() === '') return;
    onAddTodo(newItemText);
    setNewItemText('');
  };

  // --- DRAG & DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent, item: TodoItem) => {
      e.dataTransfer.setData('todoId', item.id);
      e.dataTransfer.setData('originId', moduleId);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Allow dropping
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const todoId = e.dataTransfer.getData('todoId');
      const originId = e.dataTransfer.getData('originId');
      
      if (todoId && originId !== moduleId) {
          onMoveTodo(todoId, moduleId);
      }
  };

  // --- CONTEXT MENU HANDLER ---
  const handleContextMenu = (e: React.MouseEvent, item: TodoItem) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  // Helper to tint color (Hex -> RGBA with low opacity)
  const getTintedBackground = (hex: string) => {
      // Simple hex parse
      let c = hex.substring(1).split('');
      if(c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      const r = parseInt(c.slice(0,2).join(''), 16);
      const g = parseInt(c.slice(2,4).join(''), 16);
      const b = parseInt(c.slice(4,6).join(''), 16);
      return `rgba(${r},${g},${b},0.15)`; // 15% opacity tint
  };

  return (
    <div 
        style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'white' }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        ref={listRef}
    >
      
      {/* Title Header */}
      <div style={{ padding: '5px 10px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
          <input 
            type="text" 
            value={listTitle}
            onChange={(e) => onUpdateListTitle(e.target.value)}
            placeholder="List Title..."
            onMouseDown={(e) => e.stopPropagation()}
            style={{ 
                width: '100%', border: 'none', background: 'transparent', 
                fontWeight: 'bold', fontSize: '14px', outline: 'none'
            }}
          />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', minHeight: 0 }}>
        {items.map(item => {
            const hasDesc = item.description && item.description.trim().length > 0;
            const bgColor = getTintedBackground(item.color || '#333333');
            const solidColor = item.color || '#333';

            return (
                <div 
                    key={item.id} 
                    className="todo-item-btn"
                    style={{ 
                        backgroundColor: bgColor,
                        borderColor: `${solidColor}40`, // Low opacity border
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    onClick={() => onEditTodo(item)}
                    onMouseDown={(e) => e.stopPropagation()} // Allow DnD but stop grid drag
                >
                    <div 
                        onClick={(e) => { e.stopPropagation(); onUpdateTodo(item.id, { done: !item.done }); }}
                        style={{ 
                            cursor: 'pointer', marginRight: '8px', 
                            color: item.done ? '#28a745' : solidColor,
                            display: 'flex', alignItems: 'center'
                        }}
                    >
                        <FaCheck size={12} />
                    </div>

                    <span className={`todo-text ${item.done ? 'done' : ''}`} style={{ color: '#333' }}>
                        {item.text}
                    </span>

                    {/* Description Icon (Replaces Link Button) */}
                    {hasDesc && (
                        <div title="Has description" style={{ marginLeft: 'auto', color: solidColor, opacity: 0.7 }}>
                            <FaStickyNote size={12} />
                        </div>
                    )}
                </div>
            );
        })}

        {/* Add Input */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px', opacity: 0.7 }}>
            <div style={{ width: '16px', height: '16px', border: '1px dashed #ccc', marginRight: '5px', borderRadius: '3px', flexShrink: 0 }}></div>
            <input 
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onBlur={commitItem}
                onKeyDown={(e) => e.key === 'Enter' && commitItem()}
                placeholder="Add item..."
                style={{ 
                    border: 'none', outline: 'none', background: 'transparent', 
                    fontStyle: 'italic', fontSize: '13px', width: '100%'
                }}
            />
        </div>
      </div>

      {/* Custom Context Menu */}
      {contextMenu && (
          <div style={{
              position: 'fixed', top: contextMenu.y, left: contextMenu.x,
              background: 'white', border: '1px solid #ccc', borderRadius: '4px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)', zIndex: 9999,
              display: 'flex', flexDirection: 'column', minWidth: '100px'
          }}>
              <button 
                onClick={(e) => { e.stopPropagation(); onEditTodo(contextMenu.item); setContextMenu(null); }}
                style={{ background:'transparent', border:'none', padding:'8px 12px', textAlign:'left', cursor:'pointer', fontSize:'13px', borderBottom:'1px solid #eee' }}
              >
                  Edit Item
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDeleteTodo(contextMenu.item.id); setContextMenu(null); }}
                style={{ background:'transparent', border:'none', padding:'8px 12px', textAlign:'left', cursor:'pointer', fontSize:'13px', color:'#dc3545' }}
              >
                  Remove Item
              </button>
          </div>
      )}
    </div>
  );
};