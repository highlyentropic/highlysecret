import React, { useState } from 'react';
import { FaTrash, FaCheck } from 'react-icons/fa';

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

export const TodoList: React.FC = () => {
  const [items, setItems] = useState<TodoItem[]>([{ id: 'default', text: 'Add item', done: false, isPlaceholder: true } as any]);
  
  // We use a different approach: The list always has a "Ghost" item at the bottom.
  // But for the MVP request: "default item labeled Add item... clicking elsewhere makes it permanent"
  
  // Let's stick to the requested logic:
  // 1. We have a list of committed items.
  // 2. We have a separate input field at the bottom for the "New" item.
  const [committedItems, setCommittedItems] = useState<TodoItem[]>([]);
  const [newItemText, setNewItemText] = useState('');

  const commitItem = () => {
    if (newItemText.trim() === '') return;
    setCommittedItems([...committedItems, { id: Date.now().toString(), text: newItemText, done: false }]);
    setNewItemText('');
  };

  const toggleItem = (id: string) => {
    setCommittedItems(committedItems.map(i => i.id === id ? { ...i, done: !i.done } : i));
  };

  const deleteItem = (id: string) => {
    setCommittedItems(committedItems.filter(i => i.id !== id));
  };

  return (
    // FIX: minHeight: 0 is crucial for nested flex scrolling
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'white' }}>
      
      {/* Scrollable Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', minHeight: 0 }}>
        {committedItems.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', gap: '5px' }}>
                <button 
                    onClick={() => toggleItem(item.id)}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                        cursor: 'pointer', border: '1px solid #ccc', background: item.done ? '#28a745' : 'white',
                        color: item.done ? 'white' : 'transparent', width: '16px', height: '16px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', borderRadius: '3px',
                        flexShrink: 0
                    }}
                >
                    <FaCheck size={8}/>
                </button>
                
                <span style={{ 
                    flex: 1, fontSize: '13px', 
                    textDecoration: item.done ? 'line-through' : 'none',
                    color: item.done ? '#999' : '#333',
                    wordBreak: 'break-word' // Handle long text
                }}>
                    {item.text}
                </span>

                <button 
                    onClick={() => deleteItem(item.id)}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                        cursor: 'pointer', border: 'none', background: 'transparent',
                        color: '#dc3545', display: 'flex', alignItems: 'center', padding: '2px'
                    }}
                >
                    <FaTrash size={10} />
                </button>
            </div>
        ))}

        {/* The "Add Item" Input (Always at bottom of list) */}
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
                        // Hack to keep focus for rapid entry
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