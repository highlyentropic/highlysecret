import React, { useState, useEffect, useRef } from 'react';

interface CounterProps {
  name?: string;
  type?: 'time' | 'count';
  goal?: number; // For count: goal number, For time: goal in seconds
  currentValue?: number; // For count: current count, For time: current seconds
  isTimeSet?: boolean; // Whether time has been permanently set
  onUpdate: (data: { name?: string; type?: 'time' | 'count'; goal?: number; currentValue?: number; isTimeSet?: boolean }) => void;
}

export const Counter: React.FC<CounterProps> = ({ 
  name, type, goal, currentValue, isTimeSet, onUpdate 
}) => {
  const [isInitializing, setIsInitializing] = useState(!name || !type);
  const [initName, setInitName] = useState(name || '');
  const [initType, setInitType] = useState<'time' | 'count' | ''>(type || '');
  const [initGoal, setInitGoal] = useState<number | null>(goal !== undefined ? goal : null);
  const [goalTimeInput, setGoalTimeInput] = useState({ hours: 0, minutes: 0, seconds: 0 });
  
  // Time-specific state
  const [timeSeconds, setTimeSeconds] = useState(currentValue || 0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeInput, setTimeInput] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isTimePermanent, setIsTimePermanent] = useState(isTimeSet || false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Count-specific state
  const [count, setCount] = useState(currentValue || 0);

  // Timer countdown effect (counts up)
  useEffect(() => {
    if (isTimerRunning && type === 'time' && !isTimePermanent) {
      timerIntervalRef.current = setInterval(() => {
        setTimeSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isTimerRunning, type, isTimePermanent]);

  // Update parent when values change
  useEffect(() => {
    if (type === 'time') {
      onUpdate({ currentValue: timeSeconds, isTimeSet: isTimePermanent });
    } else if (type === 'count') {
      onUpdate({ currentValue: count });
    }
  }, [timeSeconds, count, isTimePermanent, type, onUpdate]);

  // Format seconds to HH:MM:SS
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Parse HH:MM:SS to seconds
  const parseTimeToSeconds = (hours: number, minutes: number, seconds: number): number => {
    return hours * 3600 + minutes * 60 + seconds;
  };

  const handleInitialize = () => {
    if (!initName.trim() || !initType) return;
    
    let finalGoal = initGoal;
    if (initType === 'time' && initGoal === null) {
      finalGoal = parseTimeToSeconds(goalTimeInput.hours, goalTimeInput.minutes, goalTimeInput.seconds);
    }
    
    onUpdate({ 
      name: initName.trim(), 
      type: initType as 'time' | 'count',
      goal: finalGoal !== null ? finalGoal : undefined
    });
    setIsInitializing(false);
  };

  const handleSetTime = () => {
    const totalSeconds = parseTimeToSeconds(timeInput.hours, timeInput.minutes, timeInput.seconds);
    setTimeSeconds(totalSeconds);
    setIsTimerRunning(false);
    setIsTimePermanent(true);
    onUpdate({ currentValue: totalSeconds, isTimeSet: true });
  };

  const handleStartPause = () => {
    if (isTimePermanent) return; // Can't start if time is permanently set
    setIsTimerRunning(!isTimerRunning);
  };

  const handleReset = () => {
    if (type === 'time') {
      setTimeSeconds(0);
      setIsTimerRunning(false);
      setIsTimePermanent(false);
      setTimeInput({ hours: 0, minutes: 0, seconds: 0 });
      onUpdate({ currentValue: 0, isTimeSet: false });
    } else if (type === 'count') {
      setCount(0);
      onUpdate({ currentValue: 0 });
    }
  };

  const adjustCount = (delta: number) => {
    const newCount = Math.max(0, count + delta);
    setCount(newCount);
    onUpdate({ currentValue: newCount });
  };

  // Check if goal is reached
  const isGoalReached = () => {
    if (goal === undefined || goal === null) return false;
    if (type === 'time') {
      return timeSeconds >= goal;
    } else if (type === 'count') {
      return count >= goal;
    }
    return false;
  };

  // Initialization UI
  if (isInitializing) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '20px',
        gap: '15px'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>Setup Counter</h3>
        
        <div style={{ width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#666' }}>Name:</label>
            <input
              type="text"
              value={initName}
              onChange={(e) => setInitName(e.target.value)}
              placeholder="Counter name"
              style={{ width: '100%', padding: '8px', fontSize: '14px', border: '1px solid #ccc', borderRadius: '4px' }}
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#666' }}>Type:</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setInitType('time')}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '14px',
                  border: '2px solid',
                  borderColor: initType === 'time' ? '#007bff' : '#ccc',
                  borderRadius: '4px',
                  background: initType === 'time' ? '#e7f3ff' : 'white',
                  cursor: 'pointer'
                }}
              >
                Time
              </button>
              <button
                onClick={() => setInitType('count')}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '14px',
                  border: '2px solid',
                  borderColor: initType === 'count' ? '#007bff' : '#ccc',
                  borderRadius: '4px',
                  background: initType === 'count' ? '#e7f3ff' : 'white',
                  cursor: 'pointer'
                }}
              >
                Count
              </button>
            </div>
          </div>

          {initType && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#666' }}>Goal:</label>
              {initType === 'time' ? (
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={goalTimeInput.hours}
                    onChange={(e) => setGoalTimeInput({ ...goalTimeInput, hours: parseInt(e.target.value) || 0 })}
                    placeholder="H"
                    style={{ width: '60px', padding: '5px', textAlign: 'center', fontSize: '14px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                  <span>:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={goalTimeInput.minutes}
                    onChange={(e) => setGoalTimeInput({ ...goalTimeInput, minutes: parseInt(e.target.value) || 0 })}
                    placeholder="M"
                    style={{ width: '60px', padding: '5px', textAlign: 'center', fontSize: '14px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                  <span>:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={goalTimeInput.seconds}
                    onChange={(e) => setGoalTimeInput({ ...goalTimeInput, seconds: parseInt(e.target.value) || 0 })}
                    placeholder="S"
                    style={{ width: '60px', padding: '5px', textAlign: 'center', fontSize: '14px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>
              ) : (
                <input
                  type="number"
                  min="0"
                  value={initGoal !== null ? initGoal : ''}
                  onChange={(e) => setInitGoal(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Goal count"
                  style={{ width: '100%', padding: '8px', fontSize: '14px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              )}
            </div>
          )}

          <button
            onClick={handleInitialize}
            disabled={!initName.trim() || !initType}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              backgroundColor: (!initName.trim() || !initType) ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (!initName.trim() || !initType) ? 'not-allowed' : 'pointer',
              marginTop: '10px'
            }}
          >
            Create Counter
          </button>
        </div>
      </div>
    );
  }

  // Main Counter UI - Time Type
  if (type === 'time') {
    const goalReached = isGoalReached();
    
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '20px',
        gap: '20px'
      }}>
        {/* Display Name */}
        {name && (
          <div style={{ fontSize: '14px', color: '#666', fontWeight: 'bold' }}>{name}</div>
        )}

        {/* Time Display */}
        <div style={{ 
          fontSize: '4vw', 
          fontWeight: 'bold', 
          color: goalReached ? '#28a745' : '#333', 
          textAlign: 'center', 
          fontFamily: 'monospace',
          minHeight: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {formatTime(timeSeconds)}
        </div>

        {/* Goal Display */}
        {goal !== undefined && goal !== null && (
          <div style={{ fontSize: '12px', color: '#666' }}>
            Goal: {formatTime(goal)}
          </div>
        )}

        {/* Time Input (when not permanently set) */}
        {!isTimePermanent && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <label style={{ fontSize: '12px', color: '#666' }}>Hours</label>
              <input
                type="number"
                min="0"
                max="23"
                value={timeInput.hours}
                onChange={(e) => setTimeInput({ ...timeInput, hours: parseInt(e.target.value) || 0 })}
                disabled={isTimerRunning}
                style={{ width: '60px', padding: '5px', textAlign: 'center', fontSize: '14px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>
            <span style={{ fontSize: '20px', marginTop: '20px' }}>:</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <label style={{ fontSize: '12px', color: '#666' }}>Minutes</label>
              <input
                type="number"
                min="0"
                max="59"
                value={timeInput.minutes}
                onChange={(e) => setTimeInput({ ...timeInput, minutes: parseInt(e.target.value) || 0 })}
                disabled={isTimerRunning}
                style={{ width: '60px', padding: '5px', textAlign: 'center', fontSize: '14px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>
            <span style={{ fontSize: '20px', marginTop: '20px' }}>:</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <label style={{ fontSize: '12px', color: '#666' }}>Seconds</label>
              <input
                type="number"
                min="0"
                max="59"
                value={timeInput.seconds}
                onChange={(e) => setTimeInput({ ...timeInput, seconds: parseInt(e.target.value) || 0 })}
                disabled={isTimerRunning}
                style={{ width: '60px', padding: '5px', textAlign: 'center', fontSize: '14px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {!isTimePermanent && (
            <>
              {!isTimerRunning && (
                <button
                  onClick={handleSetTime}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{ 
                    padding: '8px 16px', 
                    fontSize: '14px', 
                    cursor: 'pointer', 
                    backgroundColor: '#4CAF50', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px' 
                  }}
                >
                  Set Time
                </button>
              )}
              <button
                onClick={handleStartPause}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={isTimePermanent}
                style={{ 
                  padding: '8px 16px', 
                  fontSize: '14px', 
                  cursor: isTimePermanent ? 'not-allowed' : 'pointer',
                  backgroundColor: isTimerRunning ? '#ff9800' : '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  opacity: isTimePermanent ? 0.5 : 1
                }}
              >
                {isTimerRunning ? 'Pause' : 'Start'}
              </button>
            </>
          )}
          <button
            onClick={handleReset}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ 
              padding: '8px 16px', 
              fontSize: '14px', 
              cursor: 'pointer', 
              backgroundColor: '#f44336', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px' 
            }}
          >
            Reset
          </button>
        </div>
      </div>
    );
  }

  // Main Counter UI - Count Type
  if (type === 'count') {
    const goalReached = isGoalReached();
    
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '20px',
        gap: '20px'
      }}>
        {/* Display Name */}
        {name && (
          <div style={{ fontSize: '14px', color: '#666', fontWeight: 'bold' }}>{name}</div>
        )}

        {/* Count Display */}
        <div style={{ 
          fontSize: '5vw', 
          fontWeight: 'bold', 
          color: goalReached ? '#28a745' : '#333', 
          textAlign: 'center',
          minHeight: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {count}
        </div>

        {/* Goal Display */}
        {goal !== undefined && goal !== null && (
          <div style={{ fontSize: '12px', color: '#666' }}>
            Goal: {goal}
          </div>
        )}

        {/* Control Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => adjustCount(-10)}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ 
              padding: '10px 20px', 
              fontSize: '16px', 
              cursor: 'pointer', 
              backgroundColor: '#f44336', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              fontWeight: 'bold'
            }}
          >
            -10
          </button>
          <button
            onClick={() => adjustCount(-1)}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ 
              padding: '10px 20px', 
              fontSize: '16px', 
              cursor: 'pointer', 
              backgroundColor: '#ff9800', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              fontWeight: 'bold'
            }}
          >
            -1
          </button>
          <button
            onClick={() => adjustCount(1)}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ 
              padding: '10px 20px', 
              fontSize: '16px', 
              cursor: 'pointer', 
              backgroundColor: '#4CAF50', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              fontWeight: 'bold'
            }}
          >
            +1
          </button>
          <button
            onClick={() => adjustCount(10)}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ 
              padding: '10px 20px', 
              fontSize: '16px', 
              cursor: 'pointer', 
              backgroundColor: '#2196F3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              fontWeight: 'bold'
            }}
          >
            +10
          </button>
        </div>

        {/* Reset Button */}
        <button
          onClick={handleReset}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ 
            padding: '8px 16px', 
            fontSize: '14px', 
            cursor: 'pointer', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px' 
          }}
        >
          Reset
        </button>
      </div>
    );
  }

  return null;
};
