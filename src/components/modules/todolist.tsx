import React, { useState } from 'react';
import { FaTrash, FaCheck, FaPlus, FaTag, FaPalette } from 'react-icons/fa';
import type { TodoItem } from '../../types';

interface TodoListProps {
  moduleId: string;
  items: TodoItem[];
  allCategories: string[];
  linkedCategory?: string;
  onAddTodo: (text: string) => void;
  onUpdateTodo: (id: string, data: Partial<TodoItem>) => void;
  onDeleteTodo: (id: string) => void;
  onAddCategory: (cat: string) => void;
  onRemoveCategory: (cat: string) => void;
  onSetLinkedCategory: (cat: string | undefined) => void;
}

export const TodoList: React.FC<TodoListProps> = ({ 
    items, allCategories, linkedCategory, 
    onAddTodo, onUpdateTodo, onDeleteTodo, 
    onAddCategory, onRemoveCategory, onSetLinkedCategory 
}) => {
  
  const [newItemText, setNewItemText] = useState('');
  
  // Detail Modal State
  const [editingItem, setEditingItem] = useState<TodoItem | null>(null);
  const [newCatText, setNewCatText] = useState('');

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
                onClick={() => setEditingItem(item)}
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

      {/* ITEM DETAIL MODAL */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header" style={{display:'flex', justifyContent:'space-between'}}>
                    <span>Edit Item</span>
                    <button onClick={() => { onDeleteTodo(editingItem.id); setEditingItem(null); }} style={{background:'transparent', border:'none', color:'#dc3545', cursor:'pointer'}}>
                        <FaTrash />
                    </button>
                </div>

                <div className="modal-row">
                    <label>Task:</label>
                    <input 
                        type="text" 
                        value={editingItem.text} 
                        onChange={(e) => {
                            const val = e.target.value;
                            setEditingItem({...editingItem, text: val});
                            onUpdateTodo(editingItem.id, { text: val });
                        }} 
                    />
                </div>

                <div className="modal-row">
                    <label>Description:</label>
                    <textarea 
                        rows={3}
                        value={editingItem.description || ''} 
                        onChange={(e) => {
                            const val = e.target.value;
                            setEditingItem({...editingItem, description: val});
                            onUpdateTodo(editingItem.id, { description: val });
                        }}
                        placeholder="Add details..."
                    />
                </div>

                <div className="modal-row" style={{ flexDirection: 'row', gap: '10px' }}>
                    <div style={{flex: 1}}>
                        <label><FaPalette /> Color:</label>
                        <input 
                            type="color" 
                            value={editingItem.color || '#333333'} 
                            onChange={(e) => {
                                const val = e.target.value;
                                setEditingItem({...editingItem, color: val});
                                onUpdateTodo(editingItem.id, { color: val });
                            }} 
                        />
                    </div>
                    <div style={{flex: 1}}>
                        <label><FaTag /> Category:</label>
                        <select 
                            value={editingItem.category || ''} 
                            onChange={(e) => {
                                const val = e.target.value || undefined;
                                setEditingItem({...editingItem, category: val});
                                onUpdateTodo(editingItem.id, { category: val });
                            }}
                        >
                            <option value="">(None)</option>
                            {allCategories.map(cat => (
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
                                    onAddCategory(newCatText);
                                    setNewCatText('');
                                }
                            }}
                            style={{background:'#28a745', color:'white', border:'none', borderRadius:'4px', padding:'0 10px'}}
                        >
                            <FaPlus />
                        </button>
                    </div>
                    <div style={{display:'flex', flexWrap:'wrap', gap:'5px', marginTop:'5px'}}>
                        {allCategories.map(cat => (
                            <span key={cat} className="category-tag" style={{background:'#eee', padding:'2px 5px', display:'flex', alignItems:'center', gap:'5px'}}>
                                {cat}
                                <button 
                                    onClick={() => onRemoveCategory(cat)}
                                    style={{border:'none', background:'transparent', color:'#999', cursor:'pointer', padding:0, fontSize:'10px'}}
                                >
                                    ✕
                                </button>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="modal-actions">
                    <button onClick={() => setEditingItem(null)} style={{background: '#007bff', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px'}}>Done</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};