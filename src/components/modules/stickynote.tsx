import React from 'react';

interface StickyNoteProps {
  content: string;
  onChange: (val: string) => void;
}

export const StickyNote: React.FC<StickyNoteProps> = ({ content, onChange }) => {
  return (
    <div className="sticky-note-container">
      <textarea 
        className="sticky-input"
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Take a note..."
        onMouseDown={(e) => e.stopPropagation()}
      />
      {/* The Visual Fold */}
      <div className="sticky-note-fold" />
    </div>
  );
};