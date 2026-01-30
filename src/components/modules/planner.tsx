import React, { useMemo, useState, useEffect, useRef } from 'react';
import { FaPlus, FaTimes, FaCheck, FaCircle, FaBars, FaInfinity } from 'react-icons/fa';

type TaskType = 'one-off' | 'multiple' | 'slider';

interface TaskDef {
  id: string;
  text: string;
  type?: TaskType; // Default: 'one-off'
  targetCount?: number; // For Multiple type
  persistent?: boolean; // ∞ tasks auto-added for every day
}

interface TaskInst {
  id: string;
  defId: string;
  done: boolean;
  type?: TaskType; // Inherited from def, but stored per instance
  count?: number; // For Multiple type, default: 0
  completionPercentage?: number; // For Slider type, default: 0
}

type DayKey = string; // YYYY-MM-DD (local)

interface PlannerDataV2 {
  defs: TaskDef[];
  planByDay: Record<DayKey, TaskInst[]>;
  excludedPersistentByDay: Record<DayKey, string[]>; // dayKey -> defIds excluded for that day
  selectedDay: DayKey;
}

interface PlannerProps {
  content: string;
  onChange: (newContent: string) => void;
  bgColor: string;
  gridW?: number;
  moduleWidthPx?: number;
  onDragStartItem?: () => void;
  onDragEndItem?: () => void;
}

export const Planner: React.FC<PlannerProps> = ({ content, onChange, bgColor, gridW = 16, moduleWidthPx = 380, onDragStartItem, onDragEndItem }) => {
  const todayKey = useMemo<DayKey>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const normalizeDef = (d: TaskDef): TaskDef => ({
    ...d,
    type: d.type || 'one-off',
    persistent: !!d.persistent,
    targetCount: d.targetCount === undefined || d.targetCount === null ? undefined : d.targetCount,
  });

  const normalizeInst = (p: TaskInst, def?: TaskDef): TaskInst => {
    const taskType: TaskType = (p.type || def?.type || 'one-off') as TaskType;
    return {
      ...p,
      type: taskType,
      count: taskType === 'multiple' ? (p.count ?? 0) : undefined,
      completionPercentage: taskType === 'slider' ? (p.completionPercentage ?? 0) : undefined,
    };
  };

  const ensurePersistentForDay = (input: PlannerDataV2, dayKey: DayKey): PlannerDataV2 => {
    const excluded = new Set(input.excludedPersistentByDay[dayKey] || []);
    const existing = input.planByDay[dayKey] || [];
    const have = new Set(existing.map(i => i.defId));
    const toAdd = input.defs.filter(d => d.persistent && !excluded.has(d.id) && !have.has(d.id));
    if (toAdd.length === 0) return input;
    const next: PlannerDataV2 = {
      ...input,
      planByDay: {
        ...input.planByDay,
        [dayKey]: [
          ...existing,
          ...toAdd.map(def => {
            const taskType = def.type || 'one-off';
            return normalizeInst(
              {
                id: `${dayKey}_${def.id}`, // stable per-day instance id
                defId: def.id,
                done: false,
                type: taskType,
                count: taskType === 'multiple' ? 0 : undefined,
                completionPercentage: taskType === 'slider' ? 0 : undefined,
              },
              def
            );
          }),
        ],
      },
    };
    return next;
  };

  const migrateToV2 = (raw: any): PlannerDataV2 => {
    const defs: TaskDef[] = Array.isArray(raw?.defs) ? raw.defs.map(normalizeDef) : [];
    // V2 already?
    if (raw?.planByDay && typeof raw.planByDay === 'object') {
      const planByDay: Record<DayKey, TaskInst[]> = {};
      for (const [k, v] of Object.entries<any>(raw.planByDay)) {
        const dayKey = String(k);
        const arr: TaskInst[] = Array.isArray(v) ? v : [];
        planByDay[dayKey] = arr
          .map(inst => normalizeInst(inst, defs.find(d => d.id === inst.defId)))
          .filter(inst => !!defs.find(d => d.id === inst.defId));
      }
      const excludedPersistentByDay: Record<DayKey, string[]> =
        raw?.excludedPersistentByDay && typeof raw.excludedPersistentByDay === 'object'
          ? raw.excludedPersistentByDay
          : {};
      const selectedDay: DayKey = typeof raw?.selectedDay === 'string' ? raw.selectedDay : todayKey;
      return ensurePersistentForDay(
        {
          defs,
          planByDay,
          excludedPersistentByDay,
          selectedDay,
        },
        selectedDay
      );
    }

    // V1: { defs, plan }
    const planArr: TaskInst[] = Array.isArray(raw?.plan) ? raw.plan : [];
    const migratedPlan = planArr
      .map(inst => normalizeInst(inst, defs.find(d => d.id === inst.defId)))
      .filter(inst => !!defs.find(d => d.id === inst.defId));
    return ensurePersistentForDay(
      {
        defs,
        planByDay: { [todayKey]: migratedPlan },
        excludedPersistentByDay: {},
        selectedDay: todayKey,
      },
      todayKey
    );
  };

  const lastAppliedContentRef = useRef<string>(content || '');

  const [data, setData] = useState<PlannerDataV2>(() => {
    try {
      const parsed = content ? JSON.parse(content) : {};
      return migrateToV2(parsed);
    } catch {
      return migrateToV2({});
    }
  });

  // Persist changes
  useEffect(() => {
    const serialized = JSON.stringify(data);
    lastAppliedContentRef.current = serialized;
    onChange(serialized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // External updates (e.g., PlannerCalendar) should refresh this module state.
  useEffect(() => {
    if (!content) return;
    if (content === lastAppliedContentRef.current) return;
    try {
      const parsed = JSON.parse(content);
      lastAppliedContentRef.current = content;
      setData(migrateToV2(parsed));
    } catch {
      // ignore invalid content
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // Keep persistent tasks injected for the selected day (and keep data normalized)
  useEffect(() => {
    setData(prev => ensurePersistentForDay(prev, prev.selectedDay));
  }, [data.selectedDay]);

  const [editingDefId, setEditingDefId] = useState<string | null>(null);
  const [tempText, setTempText] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(false);
  // --- ACTIONS ---

  const addDefinition = () => {
    if (!tempText.trim()) {
      setIsAddingNew(false);
      return;
    }
    const newDef: TaskDef = { id: Date.now().toString(), text: tempText, type: 'one-off', persistent: false };
    setData(prev => ensurePersistentForDay({ ...prev, defs: [...prev.defs, normalizeDef(newDef)] }, prev.selectedDay));
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
      defs: prev.defs.map(d => (d.id === id ? normalizeDef({ ...d, text: tempText }) : d)),
    }));
    setEditingDefId(null);
    setTempText('');
  };

  const updateTargetCount = (defId: string, targetCount: number | undefined) => {
    setData(prev => ({
      ...prev,
      defs: prev.defs.map(d => 
        d.id === defId ? { ...d, targetCount: targetCount === undefined || targetCount <= 0 ? undefined : targetCount } : d
      ),
      // Update done status for existing instances if target is reached
      planByDay: Object.fromEntries(
        Object.entries(prev.planByDay).map(([dayKey, items]) => [
          dayKey,
          items.map(p => {
            if (p.defId === defId && p.type === 'multiple' && targetCount !== undefined && targetCount > 0) {
              const count = p.count || 0;
              return { ...p, done: count >= targetCount };
            }
            return p;
          }),
        ])
      ),
    }));
  };

  const removeDefinition = (id: string) => {
    setData(prev => ({
      defs: prev.defs.filter(d => d.id !== id),
      planByDay: Object.fromEntries(
        Object.entries(prev.planByDay).map(([dayKey, items]) => [dayKey, items.filter(p => p.defId !== id)])
      ),
      excludedPersistentByDay: Object.fromEntries(
        Object.entries(prev.excludedPersistentByDay).map(([dayKey, defIds]) => [dayKey, defIds.filter(defId => defId !== id)])
      ),
      selectedDay: prev.selectedDay,
    }));
  };

  const handleDropFromTodo = (todoItemText: string) => {
    const text = (todoItemText || '').trim();
    if (!text) return;
    setData(prev => {
      const existing = prev.defs.find(d => d.text === text);
      let defId: string;
      let next = prev;
      if (existing) {
        defId = existing.id;
      } else {
        const newDef: TaskDef = { id: Date.now().toString(), text, type: 'one-off', persistent: false };
        next = { ...prev, defs: [...prev.defs, normalizeDef(newDef)] };
        defId = newDef.id;
      }
      const dayKey = next.selectedDay;
      const def = next.defs.find(d => d.id === defId);
      if (!def) return next;
      const current = next.planByDay[dayKey] || [];
      if (current.some(p => p.defId === defId)) return next;
      const taskType = def.type || 'one-off';
      const newInst: TaskInst = normalizeInst(
        { id: `${dayKey}_${defId}`, defId, done: false, type: taskType, count: taskType === 'multiple' ? 0 : undefined, completionPercentage: taskType === 'slider' ? 0 : undefined },
        def
      );
      return ensurePersistentForDay(
        { ...next, planByDay: { ...next.planByDay, [dayKey]: [...current, newInst] } },
        dayKey
      );
    });
  };

  const addToPlan = (defId: string) => {
    setData(prev => {
      const dayKey = prev.selectedDay;
      const def = prev.defs.find(d => d.id === defId);
      if (!def) return prev;
      const current = prev.planByDay[dayKey] || [];
      const existing = current.find(p => p.defId === defId);
      if (existing) {
        // If persistent was excluded, un-exclude on explicit add
        if (def.persistent) {
          const excluded = prev.excludedPersistentByDay[dayKey] || [];
          if (excluded.includes(defId)) {
            return ensurePersistentForDay(
              {
                ...prev,
                excludedPersistentByDay: {
                  ...prev.excludedPersistentByDay,
                  [dayKey]: excluded.filter(x => x !== defId),
                },
              },
              dayKey
            );
          }
        }
        return prev;
      }
      const taskType = def.type || 'one-off';
      const newInst: TaskInst = normalizeInst(
        {
          id: `${dayKey}_${defId}`,
          defId,
          done: false,
          type: taskType,
          count: taskType === 'multiple' ? 0 : undefined,
          completionPercentage: taskType === 'slider' ? 0 : undefined,
        },
        def
      );
      const next: PlannerDataV2 = {
        ...prev,
        planByDay: {
          ...prev.planByDay,
          [dayKey]: [...current, newInst],
        },
      };
      // If persistent was excluded, remove exclusion
      if (def.persistent) {
        const excluded = prev.excludedPersistentByDay[dayKey] || [];
        if (excluded.includes(defId)) {
          next.excludedPersistentByDay = {
            ...prev.excludedPersistentByDay,
            [dayKey]: excluded.filter(x => x !== defId),
          };
        }
      }
      return next;
    });
  };

  const handleTypeChange = (defId: string, newType: TaskType) => {
    setData(prev => {
      const updatedDefs = prev.defs.map(d => 
        d.id === defId ? { ...d, type: newType } : d
      );
      const updatedPlanByDay: Record<DayKey, TaskInst[]> = Object.fromEntries(
        Object.entries(prev.planByDay).map(([dayKey, items]) => [
          dayKey,
          items.map(p => {
            if (p.defId === defId) {
              if (newType === 'one-off') return { ...p, type: newType, count: undefined, completionPercentage: undefined, done: false };
              if (newType === 'multiple') return { ...p, type: newType, count: 0, completionPercentage: undefined, done: false };
              return { ...p, type: newType, count: undefined, completionPercentage: 0, done: false };
            }
            return p;
          }),
        ])
      );
      return ensurePersistentForDay(
        { ...prev, defs: updatedDefs.map(normalizeDef), planByDay: updatedPlanByDay },
        prev.selectedDay
      );
    });
  };

  const handleMultipleClick = (instId: string, dayKey: DayKey) => {
    setData(prev => {
      const inst = (prev.planByDay[dayKey] || []).find(p => p.id === instId);
      if (!inst) return prev;
      const def = prev.defs.find(d => d.id === inst.defId);
      const newCount = (inst.count || 0) + 1;
      const targetCount = def?.targetCount;
      const isDone = targetCount !== undefined && newCount >= targetCount;
      return {
        ...prev,
        planByDay: {
          ...prev.planByDay,
          [dayKey]: (prev.planByDay[dayKey] || []).map(p => (p.id === instId ? { ...p, count: newCount, done: isDone } : p)),
        },
      };
    });
  };

  const handleSliderDrag = (instId: string, dayKey: DayKey, percentage: number) => {
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    const isDone = clampedPercentage >= 100;
    setData(prev => ({
      ...prev,
      planByDay: {
        ...prev.planByDay,
        [dayKey]: (prev.planByDay[dayKey] || []).map(p =>
          p.id === instId ? { ...p, completionPercentage: clampedPercentage, done: isDone } : p
        ),
      },
    }));
  };

  const toggleDone = (instId: string) => {
    const dayKey = data.selectedDay;
    const inst = (data.planByDay[dayKey] || []).find(p => p.id === instId);
    if (!inst) return;
    const taskType = inst.type || 'one-off';
    
    if (taskType === 'one-off') {
      setData(prev => ({
        ...prev,
        planByDay: {
          ...prev.planByDay,
          [dayKey]: (prev.planByDay[dayKey] || []).map(p => (p.id === instId ? { ...p, done: !p.done } : p)),
        },
      }));
    } else if (taskType === 'multiple') {
      handleMultipleClick(instId, dayKey);
    }
    // Slider type handled separately via drag
  };

  const removeFromPlan = (instId: string) => {
    setData(prev => {
      const dayKey = prev.selectedDay;
      const current = prev.planByDay[dayKey] || [];
      const inst = current.find(p => p.id === instId);
      if (!inst) return prev;
      const def = prev.defs.find(d => d.id === inst.defId);

      const next: PlannerDataV2 = {
        ...prev,
        planByDay: {
          ...prev.planByDay,
          [dayKey]: current.filter(p => p.id !== instId),
        },
      };

      // If persistent: record exclusion for this day
      if (def?.persistent) {
        const existingExcluded = prev.excludedPersistentByDay[dayKey] || [];
        if (!existingExcluded.includes(def.id)) {
          next.excludedPersistentByDay = {
            ...prev.excludedPersistentByDay,
            [dayKey]: [...existingExcluded, def.id],
          };
        }
      }

      return next;
    });
  };

  // --- DRAG & DROP ---
  // Note: Drag functionality removed - items are added via click only

  // Dynamic library width from grid units
  const libraryWidthPx = useMemo(() => {
    if (gridW < 16) return moduleWidthPx * 0.95;
    if (gridW >= 17 && gridW <= 20) return moduleWidthPx * 0.80;
    return moduleWidthPx * 0.50;
  }, [gridW, moduleWidthPx]);
  // #region agent log
  if (typeof fetch !== 'undefined' && isLibraryExpanded) fetch('http://127.0.0.1:7242/ingest/3f4e8aca-fac0-4c36-9036-51ef87c3cc25',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'planner.tsx:libraryWidth',message:'library width calc',data:{gridW,moduleWidthPx,libraryWidthPx,bracket:gridW<16?'<16':gridW<=20?'17-20':'>20'},timestamp:Date.now(),sessionId:'debug',hypothesisId:'b1'})}).catch(()=>{});
  // #endregion
  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative', overflow: 'hidden', background: bgColor }}>
      
      {/* LEFT PANEL: Planned Tasks */}
      <div 
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const text = e.dataTransfer.getData('todoItemText');
          // #region agent log
          if (typeof fetch !== 'undefined') fetch('http://127.0.0.1:7242/ingest/3f4e8aca-fac0-4c36-9036-51ef87c3cc25',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'planner.tsx:onDrop',message:'planner handleDrop',data:{todoItemText:text||'(empty)',types:Array.from(e.dataTransfer?.types||[])},timestamp:Date.now(),sessionId:'debug',hypothesisId:'b4'})}).catch(()=>{});
          // #endregion
          if (text) handleDropFromTodo(text);
        }}
        style={{ 
          flex: 1, 
          padding: '10px', 
          paddingRight: isLibraryExpanded ? `${libraryWidthPx}px` : 'calc(10% + 15px)', 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px',
          transition: 'padding-right 0.3s ease'
        }}
      >
        {/* Day selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="date"
            value={data.selectedDay}
            onChange={(e) => {
              const nextDay = e.target.value as DayKey;
              if (!nextDay) return;
              setData(prev => ensurePersistentForDay({ ...prev, selectedDay: nextDay }, nextDay));
            }}
            style={{ fontSize: '12px', padding: '2px 4px', border: '1px solid rgba(0,0,0,0.2)', borderRadius: '4px' }}
          />
          <button
            onClick={() => setData(prev => ensurePersistentForDay({ ...prev, selectedDay: todayKey }, todayKey))}
            style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.15)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
          >
            Today
          </button>
        </div>

        {(data.planByDay[data.selectedDay] || []).length === 0 && (
            <div style={{ opacity: 0.4, fontStyle: 'italic', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
                Click tasks on the right to add them here.
            </div>
        )}
        {(data.planByDay[data.selectedDay] || []).map(inst => {
          const def = data.defs.find(d => d.id === inst.defId);
          if (!def) return null;
          const taskType = inst.type || def.type || 'one-off';
          
          return (
            <div 
              key={inst.id}
              draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('plannerItemName', def.text);
          e.dataTransfer.effectAllowed = 'copyMove';
          onDragStartItem?.();
        }}
              onDragEnd={() => onDragEndItem?.()}
              style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '4px',
                background: 'rgba(255,255,255,0.5)', 
                padding: '6px 10px', 
                borderRadius: '4px',
                border: '1px solid rgba(0,0,0,0.1)',
                cursor: 'grab'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* One-off: Checkbox */}
                {taskType === 'one-off' && (
                  <div 
                    onClick={() => toggleDone(inst.id)}
                    style={{ cursor: 'pointer', color: inst.done ? '#28a745' : '#ccc', flexShrink: 0 }}
                  >
                    <FaCheck size={12} />
                  </div>
                )}
                
                {/* Multiple: Circle with count */}
                {taskType === 'multiple' && (
                  <div 
                    onClick={() => toggleDone(inst.id)}
                    style={{ 
                      cursor: 'pointer', 
                      color: inst.done ? '#28a745' : '#666',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: `2px solid ${inst.done ? '#28a745' : '#666'}`,
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}
                    title="Click to increment"
                  >
                    x{inst.count || 0}
                  </div>
                )}
                
                {/* Slider: Ruler icon */}
                {taskType === 'slider' && (
                  <div 
                    style={{ 
                      color: inst.done ? '#28a745' : '#666',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <FaBars size={12} />
                  </div>
                )}
                
                <span 
                  onClick={() => taskType !== 'slider' && toggleDone(inst.id)}
                  style={{ 
                    flex: 1, 
                    cursor: taskType === 'slider' ? 'default' : 'pointer', 
                    fontSize: '13px', 
                    textDecoration: inst.done ? 'line-through' : 'none', 
                    opacity: inst.done ? 0.6 : 1 
                  }}
                >
                  {def.text}
                </span>
                <button 
                  onClick={() => removeFromPlan(inst.id)}
                  style={{ background: 'transparent', border: 'none', color: '#dc3545', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                >
                  <FaTimes size={12} />
                </button>
              </div>
              
              {/* Slider: native range input for reliable behavior */}
              {taskType === 'slider' && (
                <div style={{ margin: '0 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(inst.completionPercentage ?? 0)}
                    onChange={(e) => handleSliderDrag(inst.id, data.selectedDay, Number(e.target.value))}
                    style={{
                      flex: 1,
                      height: '10px',
                      margin: 0,
                      accentColor: inst.done ? '#28a745' : '#007bff',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ fontSize: '9px', fontWeight: 600, color: '#333', minWidth: '28px' }}>
                    {Math.round(inst.completionPercentage ?? 0)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* RIGHT PANEL: Task Definitions */}
      <div 
        className="planner-right-panel"
        style={{ 
            width: isLibraryExpanded ? `${libraryWidthPx}px` : '10%', 
            height: '90%', 
            background: 'rgba(255, 255, 255, 0.95)', 
            borderLeft: '1px solid rgba(0,0,0,0.1)',
            display: 'flex', 
            flexDirection: 'column',
            transition: 'width 0.3s ease, opacity 0.3s ease',
            position: 'absolute', 
            right: 0, 
            top: '5%',
            zIndex: 10,
            overflow: 'hidden',
            boxShadow: isLibraryExpanded ? '-2px 0 8px rgba(0,0,0,0.1)' : 'none'
        }}
        onMouseEnter={() => setIsLibraryExpanded(true)}
        onMouseLeave={() => setIsLibraryExpanded(false)}
      >
        {/* Collapsed state: Rotated text */}
        {!isLibraryExpanded && (
          <div 
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-90deg)',
              whiteSpace: 'nowrap',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#666',
              opacity: 0.7,
              pointerEvents: 'none',
              transition: 'opacity 0.3s ease'
            }}
          >
            Task Library
          </div>
        )}
        
        {/* Expanded state: Full content */}
        <div 
          style={{ 
            flex: 1, 
            padding: '10px', 
            overflowY: 'auto', 
            minWidth: '200px',
            opacity: isLibraryExpanded ? 1 : 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: isLibraryExpanded ? 'auto' : 'none'
          }}
        >
            <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', opacity: 0.7, textTransform: 'uppercase' }}>Task Library</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {data.defs.map(def => {
                    const taskType = def.type || 'one-off';
                    return (
                        <div 
                            key={def.id}
                            draggable={editingDefId !== def.id}
                            onDragStart={(e) => {
                              if (editingDefId === def.id) return;
                              e.dataTransfer.setData('plannerItemName', def.text);
                              e.dataTransfer.effectAllowed = 'copyMove';
                              onDragStartItem?.();
                            }}
                            onDragEnd={() => onDragEndItem?.()}
                            style={{ 
                                display: 'flex', 
                                flexDirection: 'column',
                                gap: '4px',
                                background: 'white', 
                                padding: '5px', 
                                borderRadius: '4px',
                                border: '1px solid #eee', 
                                cursor: editingDefId === def.id ? 'default' : 'grab'
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span 
                                            onDoubleClick={() => { setEditingDefId(def.id); setTempText(def.text); }}
                                            onClick={() => addToPlan(def.id)}
                                            style={{ flex: 1, fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                                            title="Click to add to plan, double-click to edit"
                                        >
                                            {def.text}
                                        </span>
                                        
                                        {/* Type selector icons */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleTypeChange(def.id, 'one-off'); }}
                                            style={{ 
                                                border: 'none', 
                                                background: taskType === 'one-off' ? '#e3f2fd' : 'transparent', 
                                                color: taskType === 'one-off' ? '#1976d2' : '#666', 
                                                cursor: 'pointer',
                                                padding: '2px 4px',
                                                borderRadius: '2px',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            title="One-off (checkbox)"
                                        >
                                            <FaCheck size={10}/>
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleTypeChange(def.id, 'multiple'); }}
                                            style={{ 
                                                border: 'none', 
                                                background: taskType === 'multiple' ? '#e3f2fd' : 'transparent', 
                                                color: taskType === 'multiple' ? '#1976d2' : '#666', 
                                                cursor: 'pointer',
                                                padding: '2px 4px',
                                                borderRadius: '2px',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            title="Multiple (count)"
                                        >
                                            <FaCircle size={10}/>
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleTypeChange(def.id, 'slider'); }}
                                            style={{ 
                                                border: 'none', 
                                                background: taskType === 'slider' ? '#e3f2fd' : 'transparent', 
                                                color: taskType === 'slider' ? '#1976d2' : '#666', 
                                                cursor: 'pointer',
                                                padding: '2px 4px',
                                                borderRadius: '2px',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            title="Slider (percentage)"
                                        >
                                            <FaBars size={10}/>
                                        </button>

                                        {/* Persistent toggle (∞) */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setData(prev => {
                                                  const updatedDefs = prev.defs.map(d =>
                                                    d.id === def.id ? normalizeDef({ ...d, persistent: !d.persistent }) : d
                                                  );
                                                  const next = { ...prev, defs: updatedDefs };
                                                  // If turning on persistent, ensure it appears for selected day immediately (unless excluded)
                                                  return ensurePersistentForDay(next, next.selectedDay);
                                                });
                                            }}
                                            style={{
                                                border: 'none',
                                                background: def.persistent ? '#e8f5e9' : 'transparent',
                                                color: def.persistent ? '#2e7d32' : '#666',
                                                cursor: 'pointer',
                                                padding: '2px 4px',
                                                borderRadius: '2px',
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}
                                            title={def.persistent ? 'Persistent (∞) on' : 'Persistent (∞) off'}
                                        >
                                            <FaInfinity size={10} />
                                        </button>
                                        
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); removeDefinition(def.id); }} 
                                            style={{ border: 'none', background: 'transparent', color: '#dc3545', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                        >
                                            <FaTimes size={12}/>
                                        </button>
                                    </div>
                                    
                                    {/* Target count input for Multiple type */}
                                    {taskType === 'multiple' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                                            <label style={{ fontSize: '10px', color: '#666' }}>Target:</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={def.targetCount || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                                                    updateTargetCount(def.id, val);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{
                                                    width: '40px',
                                                    height: '16px',
                                                    fontSize: '10px',
                                                    border: '1px solid #ccc',
                                                    borderRadius: '2px',
                                                    padding: '0 4px'
                                                }}
                                                placeholder="∞"
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
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