import React, { useState, useEffect, useRef } from 'react';
import { FaCheck, FaStickyNote, FaPlus } from 'react-icons/fa';
import type { TodoItem, CalendarEvent } from '../../types';

interface TodoListProps {
  moduleId: string;
  listTitle: string;
  items: TodoItem[];
  allEvents: CalendarEvent[];
  backgroundColor?: string;
  onAddTodo: (text: string, parentId?: string) => void;
  onUpdateTodo: (id: string, data: Partial<TodoItem>) => void;
  onEditTodo: (item: TodoItem) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateListTitle: (title: string) => void;
  onMoveTodo: (itemId: string, targetModuleId: string) => void; 
  onReorderTodo: (itemId: string, targetId: string | null, position: 'before' | 'after' | 'inside') => void; // New prop
}

export const TodoList: React.FC<TodoListProps> = ({ 
    moduleId, items, listTitle, backgroundColor = 'white',
    onAddTodo, onUpdateTodo, onEditTodo, onDeleteTodo, onUpdateListTitle, onMoveTodo, onReorderTodo
}) => {
  
  const [newItemText, setNewItemText] = useState('');
  
  // State for sub-items
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [addingSubItemTo, setAddingSubItemTo] = useState<string | null>(null);
  const [subItemText, setSubItemText] = useState('');

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
  
  const commitSubItem = (parentId: string) => {
      if (subItemText.trim() !== '') {
          onAddTodo(subItemText, parentId);
      }
      setSubItemText('');
      setAddingSubItemTo(null);
  }

  // --- DRAG & DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent, item: TodoItem) => {
      e.dataTransfer.setData('todoId', item.id);
      e.dataTransfer.setData('originId', moduleId);
      e.dataTransfer.setData('reorderId', item.id); // Add specific reorder flag
      e.dataTransfer.effectAllowed = 'move';
      e.stopPropagation(); 
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); 
      e.dataTransfer.dropEffect = 'move';
      e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, targetId: string | null = null, position: 'before' | 'after' | 'inside' = 'after') => {
      e.preventDefault();
      e.stopPropagation();
      const todoId = e.dataTransfer.getData('todoId');
      const originId = e.dataTransfer.getData('originId');
      
      if (!todoId) return;

      if (originId !== moduleId) {
          // Move from another module
          onMoveTodo(todoId, moduleId);
      } else {
          // Reorder within same module
          onReorderTodo(todoId, targetId, position);
      }
  };

  // --- CONTEXT MENU HANDLER ---
  const handleContextMenu = (e: React.MouseEvent, item: TodoItem) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const getTintedBackground = (hex: string) => {
      let c = hex.substring(1).split('');
      if(c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      const r = parseInt(c.slice(0,2).join(''), 16);
      const g = parseInt(c.slice(2,4).join(''), 16);
      const b = parseInt(c.slice(4,6).join(''), 16);
      return `rgba(${r},${g},${b},0.15)`;
  };

  // --- RECURSIVE ITEM RENDERER ---
  const renderTodoItem = (item: TodoItem) => {
      const children = items.filter(i => i.parentId === item.id);
      const hasDesc = item.description && item.description.trim().length > 0;
      const bgColor = getTintedBackground(item.color || '#333333');
      const solidColor = item.color || '#333';
      const isHovered = hoveredItemId === item.id;
      const isAddingSub = addingSubItemTo === item.id;

      return (
          <div 
            key={item.id} 
            style={{ display: 'flex', flexDirection: 'column' }}
            onMouseEnter={(e) => { e.stopPropagation(); setHoveredItemId(item.id); }}
            onMouseLeave={(e) => { e.stopPropagation(); if(hoveredItemId === item.id) setHoveredItemId(null); }}
            onDragOver={handleDragOver}
            onDrop={(e) => {
                // Determine if dropping inside (bottom half) or before (top half) could be complex
                // For simplicity: Drop ON item = inside (nest), Drop on edge (implement later)
                // Let's simple check if we are dropping ON the item -> reorder 'after' or 'inside'
                // For this implementation, dropping on an item makes it a child or sibling? 
                // Let's default to: Drop here = put 'after' this item.
                // To nest, maybe drag to the indent space? 
                // Simplest UX: Drop on top half = before, bottom half = after.
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const offsetY = e.clientY - rect.top;
                if (offsetY < 10) handleDrop(e, item.id, 'before');
                else handleDrop(e, item.id, 'after'); // Default to sibling reorder
            }}
          >
            <div 
                className="todo-item-btn"
                style={{ 
                    backgroundColor: bgColor,
                    borderColor: `${solidColor}40`,
                    marginLeft: '0px'
                }}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onContextMenu={(e) => handleContextMenu(e, item)}
                onClick={() => onEditTodo(item)}
                onMouseDown={(e) => e.stopPropagation()} 
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

                {hasDesc && (
                    <div title="Has description" style={{ marginLeft: 'auto', color: solidColor, opacity: 0.7 }}>
                        <FaStickyNote size={12} />
                    </div>
                )}
            </div>

            {/* Hover Action / Sub-item Input */}
            <div style={{ paddingLeft: '20px' }}>
                {(isHovered || isAddingSub) && !item.done && (
                     <div 
                        style={{ marginTop: '2px', marginBottom: '2px' }}
                     >
                         {isAddingSub ? (
                             <div style={{ display: 'flex', alignItems: 'center', opacity: 1 }}>
                                <div style={{ width: '12px', height: '12px', borderBottom: '1px solid #ccc', borderLeft: '1px solid #ccc', marginRight: '5px', flexShrink: 0 }}></div>
                                <input 
                                    autoFocus
                                    type="text"
                                    value={subItemText}
                                    onChange={(e) => setSubItemText(e.target.value)}
                                    onBlur={() => commitSubItem(item.id)}
                                    onKeyDown={(e) => e.key === 'Enter' && commitSubItem(item.id)}
                                    placeholder="Sub-item..."
                                    style={{ 
                                        border: 'none', outline: 'none', background: 'transparent', 
                                        fontStyle: 'italic', fontSize: '12px', width: '100%'
                                    }}
                                />
                             </div>
                         ) : (
                             <div 
                                onClick={(e) => { e.stopPropagation(); setAddingSubItemTo(item.id); }}
                                style={{ 
                                    cursor: 'pointer', fontSize: '10px', color: '#888', 
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    opacity: 0.8
                                }}
                             >
                                 <FaPlus size={8} /> Add item
                             </div>
                         )}
                     </div>
                )}

                {children.map(child => renderTodoItem(child))}
            </div>
          </div>
      );
  };

  const rootItems = items.filter(i => !i.parentId);

  return (
    <div 
        style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: backgroundColor }}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, null, 'after')} // Drop on empty space
        ref={listRef}
    >
      
      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', minHeight: 0 }}>
        {rootItems.map(item => renderTodoItem(item))}

        {/* Root Add Input */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px', opacity: 0.7 }}>
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