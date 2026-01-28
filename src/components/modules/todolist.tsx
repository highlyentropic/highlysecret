import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FaCheck, FaStickyNote, FaPlus } from 'react-icons/fa';
import type { TodoItem, CalendarEvent } from '../../types';
import { getImageUrl } from '../../utils/imageUtils';

interface TodoListProps {
  moduleId: string;
  items: TodoItem[];
  allEvents: CalendarEvent[];
  backgroundColor?: string;
  onAddTodo: (text: string, parentId?: string) => void;
  onUpdateTodo: (id: string, data: Partial<TodoItem>) => void;
  onEditTodo: (item: TodoItem) => void;
  onDeleteTodo: (id: string) => void;
  onMoveTodo: (itemId: string, targetModuleId: string) => void; 
  onReorderTodo: (itemId: string, targetId: string | null, position: 'before' | 'after' | 'inside') => void; // New prop
}

export const TodoList: React.FC<TodoListProps> = ({ 
    moduleId, items, backgroundColor = 'white',
    onAddTodo, onUpdateTodo, onEditTodo, onDeleteTodo, onMoveTodo, onReorderTodo
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

  // Build a safe tree structure that prevents duplicates and cycles
  const { rootItems, itemMap, childrenMap } = useMemo(() => {
      // Create a map of all items by ID for quick lookup
      const itemMap = new Map<string, TodoItem>();
      const childrenMap = new Map<string, TodoItem[]>();
      const itemIds = new Set<string>();
      const rootItems: TodoItem[] = [];

      // First pass: validate and deduplicate items
      const validItems: TodoItem[] = [];
      for (const item of items) {
          // Skip if duplicate ID
          if (itemIds.has(item.id)) {
              console.warn(`Duplicate todo item ID detected: ${item.id}`);
              continue;
          }
          itemIds.add(item.id);
          validItems.push(item);
          itemMap.set(item.id, item);
      }

      // Second pass: build children map and detect cycles
      const visited = new Set<string>();
      const buildTree = (itemId: string, path: Set<string>): boolean => {
          if (path.has(itemId)) {
              // Cycle detected - break it by making this a root item
              console.warn(`Cycle detected in todo items for ID: ${itemId}`);
              return false;
          }
          if (visited.has(itemId)) {
              return true; // Already processed
          }

          const item = itemMap.get(itemId);
          if (!item) return false;

          visited.add(itemId);
          const newPath = new Set(path);
          newPath.add(itemId);

          // Validate parentId
          if (item.parentId) {
              const parentExists = itemMap.has(item.parentId);
              const isSelfReference = item.parentId === item.id;
              
              if (!parentExists || isSelfReference) {
                  // Invalid parent - make it a root item
                  if (isSelfReference) {
                      console.warn(`Self-reference detected for todo item: ${item.id}`);
                  }
                  return false;
              }

              // Check for cycles in parent chain
              if (!buildTree(item.parentId, newPath)) {
                  // Parent chain has issues - make this a root item
                  return false;
              }

              // Add to children map
              if (!childrenMap.has(item.parentId)) {
                  childrenMap.set(item.parentId, []);
              }
              childrenMap.get(item.parentId)!.push(item);
              return true;
          }

          return true;
      };

      // Process all items
      for (const item of validItems) {
          if (!item.parentId) {
              // Root item - no parent
              rootItems.push(item);
          } else {
              // Validate parent chain
              const path = new Set<string>();
              if (!buildTree(item.id, path)) {
                  // Invalid parent chain - make it a root item
                  rootItems.push(item);
              }
          }
      }

      // Sort children for consistent rendering
      childrenMap.forEach((children) => {
          children.sort((a, b) => a.text.localeCompare(b.text));
      });

      return { rootItems, itemMap, childrenMap };
  }, [items]);

  // --- RECURSIVE ITEM RENDERER ---
  // Create a fresh visited set for this render cycle to prevent duplicates
  const renderTodoItem = (item: TodoItem, visited: Set<string> = new Set<string>()) => {
      // Prevent rendering the same item twice (defensive check)
      if (visited.has(item.id)) {
          console.warn(`Attempted to render duplicate item: ${item.id}`);
          return null;
      }
      visited.add(item.id);

      const children = childrenMap.get(item.id) || [];
      const hasDesc = item.description && item.description.trim().length > 0;
      const bgColor = getTintedBackground(item.color || '#333333');
      const solidColor = item.color || '#333';
      const isHovered = hoveredItemId === item.id;
      const isAddingSub = addingSubItemTo === item.id;
      
      // Determine cover image logic
      const images = item.images || [];
      const coverImage = images.length === 1 
          ? images[0] 
          : images.find(img => img.isCover);
      const hasCoverImage = coverImage !== undefined;

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
                    marginLeft: '0px',
                    flexDirection: hasCoverImage ? 'column' : 'row',
                    alignItems: hasCoverImage ? 'flex-start' : 'center',
                    padding: hasCoverImage ? '8px' : '6px 8px'
                }}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onContextMenu={(e) => handleContextMenu(e, item)}
                onClick={() => onEditTodo(item)}
                onMouseDown={(e) => e.stopPropagation()} 
            >
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <div 
                        onClick={(e) => { e.stopPropagation(); onUpdateTodo(item.id, { done: !item.done }); }}
                        style={{ 
                            cursor: 'pointer', marginRight: '8px', 
                            color: item.done ? '#28a745' : solidColor,
                            display: 'flex', alignItems: 'center',
                            flexShrink: 0
                        }}
                    >
                        <FaCheck size={12} />
                    </div>

                    <span className={`todo-text ${item.done ? 'done' : ''}`} style={{ color: '#333', flex: 1 }}>
                        {item.text}
                    </span>

                    {hasDesc && (
                        <div title="Has description" style={{ marginLeft: 'auto', color: solidColor, opacity: 0.7, flexShrink: 0 }}>
                            <FaStickyNote size={12} />
                        </div>
                    )}
                </div>
                
                {/* Cover Image Preview */}
                {hasCoverImage && coverImage && (
                    <div 
                        style={{ 
                            width: '100%', 
                            marginTop: '8px',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            border: `1px solid ${solidColor}40`
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img 
                            src={getImageUrl(coverImage.path)} 
                            alt="Cover" 
                            style={{ 
                                width: '100%', 
                                maxHeight: '150px', 
                                objectFit: 'cover',
                                display: 'block'
                            }}
                            onError={(e) => {
                                console.error('Failed to load image:', coverImage.path);
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
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

                {children.map(child => renderTodoItem(child, visited))}
            </div>
          </div>
      );
  };

  return (
    <div 
        style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: backgroundColor }}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, null, 'after')} // Drop on empty space
        ref={listRef}
    >
      
      {/* List */}
      <div style={{ flex: 1, overflowY: 'visible', padding: '10px', minHeight: 0 }}>
        {(() => {
          // Create a shared visited set for this render cycle
          const visited = new Set<string>();
          return rootItems.map(item => renderTodoItem(item, visited));
        })()}

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