import React, { useState } from 'react';
import { FaCheck, FaLink, FaUnlink } from 'react-icons/fa';
import type { TodoItem, CalendarEvent } from '../../types';

interface TodoListProps {
  moduleId: string;
  listTitle: string;
  items: TodoItem[];
  allEvents: CalendarEvent[]; // Passed for linking
  onAddTodo: (text: string) => void;
  onUpdateTodo: (id: string, data: Partial<TodoItem>) => void;
  onEditTodo: (item: TodoItem) => void;
  onUpdateListTitle: (title: string) => void;
}

export const TodoList: React.FC<TodoListProps> = ({ 
    items, allEvents, listTitle,
    onAddTodo, onUpdateTodo, onEditTodo, onUpdateListTitle
}) => {
  
  const [newItemText, setNewItemText] = useState('');
  const [linkSelectorId, setLinkSelectorId] = useState<string | null>(null);

  const commitItem = () => {
    if (newItemText.trim() === '') return;
    onAddTodo(newItemText);
    setNewItemText('');
  };

  // Filter for future events to link
  const upcomingEvents = allEvents.filter(e => new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)))
                                  .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                  .slice(0, 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'white' }}>
      
      {/* Title Header (Replaces Category Selector) */}
      <div style={{ padding: '5px 10px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
          <input 
            type="text" 
            value={listTitle}
            onChange={(e) => onUpdateListTitle(e.target.value)}
            placeholder="List Title (e.g., Groceries)"
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
            const linkedEvent = allEvents.find(e => e.id === item.linkedEventId);
            return (
                <div key={item.id} style={{marginBottom: '5px'}}>
                    <div 
                        className="todo-item-btn"
                        onClick={() => onEditTodo(item)}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div 
                            onClick={(e) => { e.stopPropagation(); onUpdateTodo(item.id, { done: !item.done }); }}
                            style={{ 
                                cursor: 'pointer', marginRight: '8px', 
                                color: item.done ? '#28a745' : '#ccc',
                                display: 'flex', alignItems: 'center'
                            }}
                        >
                            <FaCheck size={12} />
                        </div>

                        <span className={`todo-text ${item.done ? 'done' : ''}`}>
                            {item.text}
                        </span>

                        {/* Link Button */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); setLinkSelectorId(linkSelectorId === item.id ? null : item.id); }}
                            style={{ background: 'transparent', border: 'none', color: linkedEvent ? '#007bff' : '#ccc', cursor: 'pointer', marginLeft: 'auto' }}
                            title={linkedEvent ? `Linked to: ${linkedEvent.title}` : "Link to Event"}
                        >
                            {linkedEvent ? <FaLink size={10}/> : <FaUnlink size={10}/>}
                        </button>
                    </div>

                    {/* Link Selector Popup */}
                    {linkSelectorId === item.id && (
                        <div style={{ background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', padding: '5px', marginBottom: '5px', fontSize: '11px' }}>
                            <div style={{fontWeight:'bold', marginBottom:'3px'}}>Link to Event:</div>
                            <select 
                                onChange={(e) => {
                                    onUpdateTodo(item.id, { linkedEventId: e.target.value });
                                    setLinkSelectorId(null);
                                }}
                                value={item.linkedEventId || ''}
                                style={{width: '100%', padding: '2px'}}
                            >
                                <option value="">(No Link)</option>
                                {upcomingEvents.map(e => (
                                    <option key={e.id} value={e.id}>
                                        {new Date(e.date).toLocaleDateString()} - {e.title}
                                    </option>
                                ))}
                            </select>
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
    </div>
  );
};