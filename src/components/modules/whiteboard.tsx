import React, { useRef, useEffect, useState } from 'react';
import { FaEraser } from 'react-icons/fa';

export const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Handle Resize: Expand canvas without scaling/stretching image
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      // 1. Save current drawing
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // If canvas has 0 width (initial load), just resize
      if (canvas.width === 0 || canvas.height === 0) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        return;
      }

      const existingImage = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // 2. Resize buffer to match new container size
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      // 3. Put drawing back (at 0,0) - this achieves "Expand without scaling"
      ctx.putImageData(existingImage, 0, 0);
      
      // Reset line styles after resize (context reset)
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';
    };

    // Initial size
    resizeCanvas();

    // Observe size changes
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
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
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
        onMouseDown={(e) => e.stopPropagation()} // Prevent drag start
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