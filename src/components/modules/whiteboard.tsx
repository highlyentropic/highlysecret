import React, { useRef, useEffect, useState } from 'react';
import { FaEraser } from 'react-icons/fa';

interface WhiteboardProps {
    content?: string; // Base64 data URL
    onChange: (dataUrl: string) => void;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ content, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const isLoaded = useRef(false);

  // Load initial content
  useEffect(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx && content && !isLoaded.current) {
          const img = new Image();
          img.src = content;
          img.onload = () => {
              ctx.drawImage(img, 0, 0);
              isLoaded.current = true;
          };
      }
  }, []); // Run once on mount (or when content becomes available initially)

  // Handle Resize: Expand canvas without scaling/stretching image
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      // 1. Save current drawing
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const savedData = canvas.toDataURL(); // Save before resize

      // 2. Resize buffer to match new container size
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }

      // 3. Put drawing back
      const img = new Image();
      img.src = savedData;
      img.onload = () => {
          ctx.drawImage(img, 0, 0);
      };
      
      // Reset line styles after resize
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';
    };

    // Initial size
    resizeCanvas();

    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const startDrawing = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
        setIsDrawing(false);
        // Save state
        const canvas = canvasRef.current;
        if (canvas) {
            onChange(canvas.toDataURL());
        }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onChange(''); // Clear from storage
    }
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', background: 'white' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        style={{ display: 'block', cursor: 'crosshair' }}
      />
      {/* Eraser Button */}
      <button 
        onClick={clearCanvas}
        onMouseDown={(e) => e.stopPropagation()} 
        title="Clear Whiteboard"
        style={{
            position: 'absolute', top: 5, right: 5,
            border: '1px solid #ccc', background: 'white', 
            borderRadius: '4px', padding: '5px', cursor: 'pointer'
        }}
      >
        <FaEraser color="#d9534f" />
      </button>
    </div>
  );
};