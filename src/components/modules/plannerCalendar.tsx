import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaCalendarAlt } from 'react-icons/fa';

type TaskType = 'one-off' | 'multiple' | 'slider';
type DayKey = string; // YYYY-MM-DD

interface TaskDef {
  id: string;
  text: string;
  type?: TaskType;
  targetCount?: number;
  persistent?: boolean;
}

interface TaskInst {
  id: string;
  defId: string;
  done: boolean;
  type?: TaskType;
  count?: number;
  completionPercentage?: number;
}

interface PlannerDataV2 {
  defs: TaskDef[];
  planByDay: Record<DayKey, TaskInst[]>;
  excludedPersistentByDay: Record<DayKey, string[]>;
  selectedDay: DayKey;
}

interface PlannerCalendarState {
  selectedDefId?: string;
}

interface PlannerSummary {
  id: string;
  title?: string;
  content?: string;
}

interface PlannerCalendarProps {
  content: string;
  onChange: (newContent: string) => void;
  bgColor: string;
  planners: PlannerSummary[];
  updatePlannerContent: (plannerId: string, newContent: string) => void;
}

const toDayKey = (d: Date): DayKey => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export const PlannerCalendar: React.FC<PlannerCalendarProps> = ({
  content,
  onChange,
  bgColor,
  planners,
  updatePlannerContent,
}) => {
  const todayKey = useMemo(() => toDayKey(new Date()), []);

  const [state, setState] = useState<PlannerCalendarState>(() => {
    try {
      const parsed = content ? JSON.parse(content) : {};
      return {
        selectedDefId: parsed?.selectedDefId,
      };
    } catch {
      return {};
    }
  });

  useEffect(() => {
    onChange(JSON.stringify(state));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const linkedPlanner = useMemo(() => {
    if (!planners || planners.length === 0) return undefined;
    return planners[0];
  }, [planners]);

  const migratePlannerToV2 = (raw: any): PlannerDataV2 => {
    const defs: TaskDef[] = Array.isArray(raw?.defs)
      ? raw.defs.map((d: any) => ({
          ...d,
          type: d.type || 'one-off',
          persistent: !!d.persistent,
          targetCount: d.targetCount === undefined || d.targetCount === null ? undefined : d.targetCount,
        }))
      : [];

    const normalizeInst = (p: any): TaskInst => {
      const def = defs.find(d => d.id === p.defId);
      const type: TaskType = (p.type || def?.type || 'one-off') as TaskType;
      return {
        ...p,
        type,
        count: type === 'multiple' ? (p.count ?? 0) : undefined,
        completionPercentage: type === 'slider' ? (p.completionPercentage ?? 0) : undefined,
      };
    };

    const selectedDay: DayKey = typeof raw?.selectedDay === 'string' ? raw.selectedDay : todayKey;

    if (raw?.planByDay && typeof raw.planByDay === 'object') {
      const planByDay: Record<DayKey, TaskInst[]> = {};
      for (const [k, v] of Object.entries<any>(raw.planByDay)) {
        const dayKey = String(k);
        const arr: any[] = Array.isArray(v) ? v : [];
        planByDay[dayKey] = arr
          .map(normalizeInst)
          .filter(inst => !!defs.find(d => d.id === inst.defId));
      }
      return {
        defs,
        planByDay,
        excludedPersistentByDay:
          raw?.excludedPersistentByDay && typeof raw.excludedPersistentByDay === 'object' ? raw.excludedPersistentByDay : {},
        selectedDay,
      };
    }

    const planArr: any[] = Array.isArray(raw?.plan) ? raw.plan : [];
    return {
      defs,
      planByDay: { [todayKey]: planArr.map(normalizeInst).filter(inst => !!defs.find(d => d.id === inst.defId)) },
      excludedPersistentByDay: {},
      selectedDay,
    };
  };

  const plannerData = useMemo<PlannerDataV2 | null>(() => {
    if (!linkedPlanner?.content) return null;
    try {
      return migratePlannerToV2(JSON.parse(linkedPlanner.content));
    } catch {
      return migratePlannerToV2({});
    }
  }, [linkedPlanner?.content]);

  const taskOptions = useMemo(() => {
    if (!plannerData) return [];
    const used = new Set<string>();
    for (const items of Object.values(plannerData.planByDay)) {
      for (const inst of items) used.add(inst.defId);
    }
    // include persistent defs (auto across days)
    for (const d of plannerData.defs) if (d.persistent) used.add(d.id);
    const options = Array.from(used)
      .map(defId => plannerData.defs.find(d => d.id === defId))
      .filter(Boolean) as TaskDef[];
    return options;
  }, [plannerData]);

  // Ensure selected def is valid
  useEffect(() => {
    if (!plannerData) return;
    if (taskOptions.length === 0) return;
    if (!state.selectedDefId || !taskOptions.find(d => d.id === state.selectedDefId)) {
      setState(prev => ({ ...prev, selectedDefId: taskOptions[0].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plannerData, taskOptions.length]);

  const viewDate = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, []);

  const monthGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const jsDow = first.getDay(); // 0 Sun..6 Sat
    const monBased = (jsDow + 6) % 7; // 0 Mon..6 Sun
    const cells: Array<DayKey | null> = Array.from({ length: monBased }, () => null);
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(toDayKey(new Date(year, month, day)));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewDate]);

  const dragging = useRef<{ dayKey: DayKey; defId: string } | null>(null);

  const updateLinkedPlanner = (updater: (d: PlannerDataV2) => PlannerDataV2) => {
    if (!linkedPlanner) return;
    const base = plannerData || migratePlannerToV2({});
    const next = updater(base);
    updatePlannerContent(linkedPlanner.id, JSON.stringify(next));
  };

  const ensureInstance = (d: PlannerDataV2, dayKey: DayKey, def: TaskDef): PlannerDataV2 => {
    const items = d.planByDay[dayKey] || [];
    if (items.some(i => i.defId === def.id)) return d;

    const excluded = d.excludedPersistentByDay[dayKey] || [];
    const excludedNext =
      def.persistent && excluded.includes(def.id)
        ? { ...d.excludedPersistentByDay, [dayKey]: excluded.filter(x => x !== def.id) }
        : d.excludedPersistentByDay;

    const type: TaskType = (def.type || 'one-off') as TaskType;
    const inst: TaskInst = {
      id: `${dayKey}_${def.id}`,
      defId: def.id,
      done: false,
      type,
      count: type === 'multiple' ? 0 : undefined,
      completionPercentage: type === 'slider' ? 0 : undefined,
    };
    return {
      ...d,
      selectedDay: dayKey,
      excludedPersistentByDay: excludedNext,
      planByDay: { ...d.planByDay, [dayKey]: [...items, inst] },
    };
  };

  const handleCellClick = (dayKey: DayKey) => {
    if (!plannerData) return;
    const defId = state.selectedDefId;
    if (!defId) return;
    const def = plannerData.defs.find(d => d.id === defId);
    if (!def) return;

    updateLinkedPlanner(d0 => {
      let d = ensureInstance(d0, dayKey, def);
      const items = d.planByDay[dayKey] || [];
      const inst = items.find(i => i.defId === def.id);
      if (!inst) return d;
      const type: TaskType = (inst.type || def.type || 'one-off') as TaskType;

      if (type === 'one-off') {
        d = {
          ...d,
          selectedDay: dayKey,
          planByDay: {
            ...d.planByDay,
            [dayKey]: items.map(i => (i.id === inst.id ? { ...i, done: !i.done } : i)),
          },
        };
      } else if (type === 'multiple') {
        const nextCount = (inst.count || 0) + 1;
        const target = def.targetCount;
        const done = target !== undefined && nextCount >= target;
        d = {
          ...d,
          selectedDay: dayKey,
          planByDay: {
            ...d.planByDay,
            [dayKey]: items.map(i => (i.id === inst.id ? { ...i, count: nextCount, done } : i)),
          },
        };
      }
      // slider handled by drag
      return d;
    });
  };

  const setSliderPercentFromPointer = (dayKey: DayKey, defId: string, clientY: number, rect: DOMRect) => {
    if (!plannerData) return;
    const def = plannerData.defs.find(d => d.id === defId);
    if (!def) return;
    const y = clamp(clientY - rect.top, 0, rect.height);
    const pct = clamp(((rect.height - y) / rect.height) * 100, 0, 100); // bottom->top

    updateLinkedPlanner(d0 => {
      let d = ensureInstance(d0, dayKey, def);
      const items = d.planByDay[dayKey] || [];
      const inst = items.find(i => i.defId === def.id);
      if (!inst) return d;
      const done = pct >= 100;
      return {
        ...d,
        selectedDay: dayKey,
        planByDay: {
          ...d.planByDay,
          [dayKey]: items.map(i => (i.id === inst.id ? { ...i, completionPercentage: pct, done } : i)),
        },
      };
    });
  };

  const attachWindowDragHandlers = () => {
    const onMove = (e: MouseEvent) => {
      const current = dragging.current;
      if (!current) return;
      const el = document.querySelector(`[data-planner-cal-cell="${current.dayKey}"]`) as HTMLElement | null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setSliderPercentFromPointer(current.dayKey, current.defId, e.clientY, rect);
    };
    const onUp = () => {
      dragging.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  if (!planners || planners.length === 0) {
    return (
      <div
        style={{
          height: '100%',
          width: '100%',
          background: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          opacity: 0.65,
        }}
      >
        No planner found.
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%', background: bgColor, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FaCalendarAlt size={12} style={{ opacity: 0.7 }} />

        <select
          value={state.selectedDefId || ''}
          onChange={(e) => setState(prev => ({ ...prev, selectedDefId: e.target.value }))}
          style={{ fontSize: '12px', padding: '2px 4px', flex: 1, minWidth: 0 }}
        >
          {taskOptions.length === 0 ? (
            <option value="" disabled>
              No planner items
            </option>
          ) : (
            taskOptions.map(d => (
              <option key={d.id} value={d.id}>
                {d.text}
              </option>
            ))
          )}
        </select>
      </div>

      <div style={{ flex: 1, padding: '8px 10px', overflow: 'auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '6px',
            userSelect: 'none',
          }}
        >
          {monthGrid.map((dayKey, idx) => {
            if (!dayKey) {
              return <div key={`empty_${idx}`} style={{ aspectRatio: '1 / 1' }} />;
            }

            const defId = state.selectedDefId;
            const def = plannerData?.defs.find(d => d.id === defId);
            const items = plannerData?.planByDay?.[dayKey] || [];
            const inst = def ? items.find(i => i.defId === def.id) : undefined;
            const type: TaskType = (inst?.type || def?.type || 'one-off') as TaskType;

            // Determine visual fill
            let fillPct = 0;
            let text: string | null = null;
            let solid = false;

            if (def && inst) {
              if (type === 'one-off') {
                solid = !!inst.done;
              } else if (type === 'multiple') {
                text = `x${inst.count || 0}`;
                if (def.targetCount && def.targetCount > 0) {
                  fillPct = clamp(((inst.count || 0) / def.targetCount) * 100, 0, 100);
                }
              } else if (type === 'slider') {
                fillPct = clamp(inst.completionPercentage || 0, 0, 100);
              }
            }

            const isToday = dayKey === todayKey;

            return (
              <div
                key={dayKey}
                data-planner-cal-cell={dayKey}
                onClick={() => handleCellClick(dayKey)}
                onMouseDown={(e) => {
                  if (!plannerData) return;
                  const defId2 = state.selectedDefId;
                  if (!defId2) return;
                  const def2 = plannerData.defs.find(d => d.id === defId2);
                  if (!def2) return;
                  const currentType: TaskType = (def2.type || 'one-off') as TaskType;
                  if (currentType !== 'slider') return;
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  dragging.current = { dayKey, defId: def2.id };
                  setSliderPercentFromPointer(dayKey, def2.id, e.clientY, rect);
                  attachWindowDragHandlers();
                }}
                style={{
                  position: 'relative',
                  aspectRatio: '1 / 1',
                  border: isToday ? '2px solid #1976d2' : '1px solid rgba(0,0,0,0.15)',
                  borderRadius: '3px',
                  background: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                }}
                title={dayKey}
              >
                {/* bottom-to-top fill */}
                {(fillPct > 0 || solid) && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: solid ? '100%' : `${fillPct}%`,
                      background: solid ? '#007bff' : 'rgba(0, 123, 255, 0.6)',
                    }}
                  />
                )}

                {text && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#1f1f1f',
                      mixBlendMode: 'multiply',
                    }}
                  >
                    {text}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

