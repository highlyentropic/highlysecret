import React, { useEffect, useState, useRef } from 'react';

interface ClockProps {
  mode: 'analog' | 'digital' | 'timer';
  onToggleMode: () => void;
  onToggleTimer?: () => void;
}

export const Clock: React.FC<ClockProps> = ({ mode, onToggleMode, onToggleTimer }) => {
  const [time, setTime] = useState(new Date());
  
  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0); // Total seconds remaining
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerInput, setTimerInput] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Timer countdown effect
  useEffect(() => {
    if (isTimerRunning && timerSeconds > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
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
  }, [isTimerRunning, timerSeconds]);

  // Format seconds to HH:MM:SS
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleSetTimer = () => {
    const totalSeconds = timerInput.hours * 3600 + timerInput.minutes * 60 + timerInput.seconds;
    if (totalSeconds > 0) {
      setTimerSeconds(totalSeconds);
      setIsTimerRunning(false);
    }
  };

  const handleStartPause = () => {
    if (timerSeconds === 0) {
      // If timer is at 0, set it from input first
      const totalSeconds = timerInput.hours * 3600 + timerInput.minutes * 60 + timerInput.seconds;
      if (totalSeconds > 0) {
        setTimerSeconds(totalSeconds);
        setIsTimerRunning(true);
      }
    } else {
      setIsTimerRunning(!isTimerRunning);
    }
  };

  const handleReset = () => {
    setIsTimerRunning(false);
    const totalSeconds = timerInput.hours * 3600 + timerInput.minutes * 60 + timerInput.seconds;
    setTimerSeconds(totalSeconds || 0);
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      
      {/* Toggle Buttons (Small icons top right) */}
      <div style={{ position: 'absolute', top: 5, right: 5, zIndex: 10, display: 'flex', gap: '5px' }}>
        <button 
          onClick={onToggleMode}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ fontSize: '10px', padding: '2px 5px', cursor: 'pointer' }}
        >
          {mode === 'analog' ? '12:00' : '🕒'}
        </button>
        {onToggleTimer && (
          <button 
            onClick={onToggleTimer}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ fontSize: '10px', padding: '2px 5px', cursor: 'pointer' }}
            title="Timer"
          >
            ⏱️
          </button>
        )}
      </div>

      {/* Digital Mode */}
      {mode === 'digital' && (
        <div style={{ fontSize: '3vw', fontWeight: 'bold', color: '#333', textAlign: 'center' }}>
           {/* Requirement: Scales to window size (using vw/vh or flex) */}
          {time.toLocaleTimeString()}
        </div>
      )}

      {/* Analog Mode */}
      {mode === 'analog' && (
        <svg viewBox="0 0 100 100" style={{ width: '90%', height: '90%' }}>
          {/* Face */}
          <circle cx="50" cy="50" r="45" fill="white" stroke="#333" strokeWidth="2" />
          {/* Hour Hand */}
          <line 
            x1="50" y1="50" x2="50" y2="25" 
            stroke="#333" strokeWidth="3"
            transform={`rotate(${30 * time.getHours() + time.getMinutes() / 2} 50 50)`} 
          />
          {/* Minute Hand */}
          <line 
            x1="50" y1="50" x2="50" y2="15" 
            stroke="#666" strokeWidth="2"
            transform={`rotate(${6 * time.getMinutes()} 50 50)`} 
          />
           {/* Second Hand */}
           <line 
            x1="50" y1="50" x2="50" y2="10" 
            stroke="red" strokeWidth="1"
            transform={`rotate(${6 * time.getSeconds()} 50 50)`} 
          />
        </svg>
      )}

      {/* Timer Mode */}
      {mode === 'timer' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', width: '100%', padding: '20px' }}>
          {/* Timer Display */}
          <div style={{ fontSize: '4vw', fontWeight: 'bold', color: timerSeconds === 0 && isTimerRunning ? '#d32f2f' : '#333', textAlign: 'center', fontFamily: 'monospace' }}>
            {formatTime(timerSeconds)}
          </div>

          {/* Timer Input */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <label style={{ fontSize: '12px', color: '#666' }}>Hours</label>
              <input
                type="number"
                min="0"
                max="23"
                value={timerInput.hours}
                onChange={(e) => setTimerInput({ ...timerInput, hours: parseInt(e.target.value) || 0 })}
                disabled={isTimerRunning}
                style={{ width: '60px', padding: '5px', textAlign: 'center', fontSize: '14px' }}
              />
            </div>
            <span style={{ fontSize: '20px', marginTop: '20px' }}>:</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <label style={{ fontSize: '12px', color: '#666' }}>Minutes</label>
              <input
                type="number"
                min="0"
                max="59"
                value={timerInput.minutes}
                onChange={(e) => setTimerInput({ ...timerInput, minutes: parseInt(e.target.value) || 0 })}
                disabled={isTimerRunning}
                style={{ width: '60px', padding: '5px', textAlign: 'center', fontSize: '14px' }}
              />
            </div>
            <span style={{ fontSize: '20px', marginTop: '20px' }}>:</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <label style={{ fontSize: '12px', color: '#666' }}>Seconds</label>
              <input
                type="number"
                min="0"
                max="59"
                value={timerInput.seconds}
                onChange={(e) => setTimerInput({ ...timerInput, seconds: parseInt(e.target.value) || 0 })}
                disabled={isTimerRunning}
                style={{ width: '60px', padding: '5px', textAlign: 'center', fontSize: '14px' }}
              />
            </div>
          </div>

          {/* Timer Controls */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {!isTimerRunning && timerSeconds === 0 && (
              <button
                onClick={handleSetTimer}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}
              >
                Set Timer
              </button>
            )}
            <button
              onClick={handleStartPause}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={timerSeconds === 0 && (timerInput.hours === 0 && timerInput.minutes === 0 && timerInput.seconds === 0)}
              style={{ 
                padding: '8px 16px', 
                fontSize: '14px', 
                cursor: timerSeconds > 0 || (timerInput.hours > 0 || timerInput.minutes > 0 || timerInput.seconds > 0) ? 'pointer' : 'not-allowed',
                backgroundColor: isTimerRunning ? '#ff9800' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                opacity: (timerSeconds === 0 && (timerInput.hours === 0 && timerInput.minutes === 0 && timerInput.seconds === 0)) ? 0.5 : 1
              }}
            >
              {isTimerRunning ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={handleReset}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};