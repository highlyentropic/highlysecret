import React, { useEffect, useState } from 'react';

interface ClockProps {
  mode: 'analog' | 'digital';
  onToggleMode: () => void;
}

export const Clock: React.FC<ClockProps> = ({ mode, onToggleMode }) => {
  const [time, setTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      
      {/* Toggle Button (Small icon top right) */}
      <button 
        onClick={onToggleMode}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ position: 'absolute', top: 5, right: 5, zIndex: 10, fontSize: '10px', padding: '2px 5px', cursor: 'pointer' }}
      >
        {mode === 'analog' ? '12:00' : '🕒'}
      </button>

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
    </div>
  );
};