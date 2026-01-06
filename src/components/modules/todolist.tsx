import React, { useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import type { TodoItem } from '../../types';

interface TodoListProps {
  moduleId: string;
  items: TodoItem[];
  allCategories: string[];
  linkedCategory?: string;
  onAddTodo: (text: string) => void;
  onUpdateTodo: (id: string, data: Partial<TodoItem>) => void;
  onDeleteTodo: (id: string) => void;
  onSetLinkedCategory: (cat: string | undefined) => void;
  onEditTodo: (item: TodoItem) => void; // New prop for external modal
}

export const TodoList: React.FC<TodoListProps> = ({ 
    items, allCategories, linkedCategory, 
    onAddTodo, onUpdateTodo, onSetLinkedCategory,
    onEditTodo 
}) => {
  
  const [newItemText, setNewItemText] = useState('');

  const commitItem = () => {
    if (newItemText.trim() === '') return;
    onAddTodo(newItemText);
    setNewItemText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'white' }}>
      
      {/* Category Link Header */}
      <div style={{ padding: '5px 10px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa' }}>
          <select 
            value={linkedCategory || ''} 
            onChange={(e) => onSetLinkedCategory(e.target.value || undefined)}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ fontSize: '11px', padding: '2px', border: '1px solid #ddd', borderRadius: '3px', maxWidth: '100%' }}
          >
              <option value="">General (Unlinked)</option>
              {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
              ))}
          </select>
      </div>

      {/* Scrollable List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', minHeight: 0 }}>
        {items.map(item => (
            <div 
                key={item.id} 
                className="todo-item-btn"
                onClick={() => onEditTodo(item)} // Open external modal
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

                {/* Color Dot */}
                <div className="todo-color-dot" style={{ backgroundColor: item.color || '#333' }} />

                <span className={`todo-text ${item.done ? 'done' : ''}`}>
                    {item.text}
                </span>
                
                {/* Category Tag (Small) */}
                {item.category && (
                    <span className="category-tag" style={{marginLeft: 'auto'}}>
                        {item.category}
                    </span>
                )}
            </div>
        ))}

        {/* Add Input */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px', opacity: 0.7 }}>
            <div style={{ width: '16px', height: '16px', border: '1px dashed #ccc', marginRight: '5px', borderRadius: '3px', flexShrink: 0 }}></div>
            <input 
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onBlur={commitItem}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        commitItem();
                        setTimeout(() => {
                            const inputs = document.querySelectorAll('.todo-input');
                            (inputs[inputs.length - 1] as HTMLInputElement)?.focus();
                        }, 10);
                    }
                }}
                placeholder="Add item..."
                className="todo-input"
                style={{ 
                    border: 'none', outline: 'none', background: 'transparent', 
                    fontStyle: 'italic', fontSize: '13px', width: '100%', color: '#333'
                }}
            />
        </div>
      </div>
    </div>
  );
};