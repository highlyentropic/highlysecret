import React, { useState, useEffect } from 'react';
import { FaPlus, FaPencilAlt, FaTimes, FaCheck } from 'react-icons/fa';

interface TaskDef {
  id: string;
  text: string;
}

interface TaskInst {
  id: string;
  defId: string;
  done: boolean;
}

interface PlannerData {
  defs: TaskDef[];
  plan: TaskInst[];
}

interface PlannerProps {
  content: string;
  onChange: (newContent: string) => void;
  bgColor: string;
}

export const Planner: React.FC<PlannerProps> = ({ content, onChange, bgColor }) => {
  const [data, setData] = useState<PlannerData>(() => {
    try {
      return content ? JSON.parse(content) : { defs: [], plan: [] };
    } catch {
      return { defs: [], plan: [] };
    }
  });

  // Persist changes
  useEffect(() => {
    onChange(JSON.stringify(data));
  }, [data, onChange]);

  const [editingDefId, setEditingDefId] = useState<string | null>(null);
  const [tempText, setTempText] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  // --- ACTIONS ---

  const addDefinition = () => {
    if (!tempText.trim()) {
      setIsAddingNew(false);
      return;
    }
    const newDef: TaskDef = { id: Date.now().toString(), text: tempText };
    setData(prev => ({ ...prev, defs: [...prev.defs, newDef] }));
    setTempText('');
    setIsAddingNew(false);
  };

  const updateDefinition = (id: string) => {
    if (!tempText.trim()) {
      setEditingDefId(null);
      return;
    }
    setData(prev => ({
      ...prev,
      defs: prev.defs.map(d => d.id === id ? { ...d, text: tempText } : d)
    }));
    setEditingDefId(null);
    setTempText('');
  };

  const removeDefinition = (id: string) => {
    setData(prev => ({
      defs: prev.defs.filter(d => d.id !== id),
      plan: prev.plan.filter(p => p.defId !== id) // Cascade delete instances
    }));
  };

  const addToPlan = (defId: string) => {
    const newInst: TaskInst = { id: Date.now().toString() + Math.random(), defId, done: false };
    setData(prev => ({ ...prev, plan: [...prev.plan, newInst] }));
  };

  const toggleDone = (instId: string) => {
    setData(prev => ({
      ...prev,
      plan: prev.plan.map(p => p.id === instId ? { ...p, done: !p.done } : p)
    }));
  };

  const removeFromPlan = (instId: string) => {
    setData(prev => ({ ...prev, plan: prev.plan.filter(p => p.id !== instId) }));
  };

  // --- DRAG & DROP ---

  const handleDragStart = (e: React.DragEvent, defId: string) => {
    e.dataTransfer.setData('plannerDefId', defId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDropOnLeft = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling to grid's drop handler
    const defId = e.dataTransfer.getData('plannerDefId');
    if (defId) {
      addToPlan(defId);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative', overflow: 'hidden', background: bgColor }}>
      
      {/* LEFT PANEL: Planned Tasks */}
      <div 
        style={{ flex: 1, padding: '10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={handleDropOnLeft}
      >
        {data.plan.length === 0 && (
            <div style={{ opacity: 0.4, fontStyle: 'italic', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
                Drag tasks here or click them on the right.
            </div>
        )}
        {data.plan.map(inst => {
          const def = data.defs.find(d => d.id === inst.defId);
          if (!def) return null;
          return (
            <div 
              key={inst.id}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', 
                background: 'rgba(255,255,255,0.5)', padding: '6px 10px', borderRadius: '4px',
                border: '1px solid rgba(0,0,0,0.1)'
              }}
            >
              <div 
                onClick={() => toggleDone(inst.id)}
                style={{ cursor: 'pointer', color: inst.done ? '#28a745' : '#ccc' }}
              >
                <FaCheck size={12} />
              </div>
              <span 
                onClick={() => toggleDone(inst.id)}
                style={{ 
                    flex: 1, cursor: 'pointer', fontSize: '13px', 
                    textDecoration: inst.done ? 'line-through' : 'none', 
                    opacity: inst.done ? 0.6 : 1 
                }}
              >
                {def.text}
              </span>
              <button 
                onClick={() => removeFromPlan(inst.id)}
                style={{ background: 'transparent', border: 'none', color: '#dc3545', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <FaTimes size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* RIGHT PANEL: Task Definitions */}
      <div 
        className="planner-right-panel"
        style={{ 
            width: '10%', height: '90%', 
            background: 'rgba(0,0,0,0.03)', borderLeft: '1px solid rgba(0,0,0,0.1)',
            display: 'flex', flexDirection: 'column',
            transition: 'width 0.3s ease',
            position: 'absolute', right: 0, top: '5%',
            zIndex: 10,
            overflow: 'hidden'
        }}
        onMouseEnter={(e) => e.currentTarget.style.width = '50%'}
        onMouseLeave={(e) => e.currentTarget.style.width = '10%'}
      >
        <div style={{ flex: 1, padding: '10px', overflowY: 'auto', minWidth: '200px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', opacity: 0.7, textTransform: 'uppercase' }}>Task Library</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {data.defs.map(def => (
                    <div 
                        key={def.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, def.id)}
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: '5px',
                            background: 'white', padding: '5px', borderRadius: '4px',
                            border: '1px solid #eee', cursor: 'grab'
                        }}
                    >
                        {editingDefId === def.id ? (
                            <input 
                                autoFocus
                                type="text" 
                                value={tempText} 
                                onChange={(e) => setTempText(e.target.value)}
                                onBlur={() => updateDefinition(def.id)}
                                onKeyDown={(e) => e.key === 'Enter' && updateDefinition(def.id)}
                                style={{ flex: 1, border: '1px solid #007bff', fontSize: '12px', padding: '2px' }}
                            />
                        ) : (
                            <>
                                <span 
                                    onClick={() => addToPlan(def.id)}
                                    style={{ flex: 1, fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                    title="Click to add to plan"
                                >
                                    {def.text}
                                </span>
                                <button onClick={() => { setEditingDefId(def.id); setTempText(def.text); }} style={{ border: 'none', background: 'transparent', color: '#666', cursor: 'pointer' }}><FaPencilAlt size={10}/></button>
                                <button onClick={() => removeDefinition(def.id)} style={{ border: 'none', background: 'transparent', color: '#dc3545', cursor: 'pointer' }}><FaTimes size={12}/></button>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* Add Button */}
            <div style={{ marginTop: '10px' }}>
                {isAddingNew ? (
                    <div style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '5px', borderRadius: '4px', border: '1px solid #007bff' }}>
                        <input 
                            autoFocus
                            type="text" 
                            value={tempText} 
                            onChange={(e) => setTempText(e.target.value)}
                            onBlur={addDefinition}
                            onKeyDown={(e) => e.key === 'Enter' && addDefinition()}
                            placeholder="Task name..."
                            style={{ border: 'none', outline: 'none', fontSize: '12px', width: '100%' }}
                        />
                    </div>
                ) : (
                    <button 
                        onClick={() => { setIsAddingNew(true); setTempText(''); }}
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: '5px', 
                            background: 'transparent', border: '1px dashed #ccc', 
                            width: '100%', padding: '5px', borderRadius: '4px', 
                            cursor: 'pointer', color: '#666', fontSize: '12px'
                        }}
                    >
                        <FaPlus size={10} /> Add Task
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};