import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface StickyNoteProps {
    content: string;
    onChange: (text: string) => void;
}

export const StickyNote: React.FC<StickyNoteProps> = ({ content, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Shortcut Handler (Same as Notepad)
  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!textAreaRef.current) return;
      const { selectionStart, selectionEnd, value } = textAreaRef.current;
      
      const wrapText = (wrapper: string) => {
          e.preventDefault();
          const before = value.substring(0, selectionStart);
          const selected = value.substring(selectionStart, selectionEnd);
          const after = value.substring(selectionEnd);
          const newText = `${before}${wrapper}${selected}${wrapper}${after}`;
          onChange(newText);
          setTimeout(() => {
              if (textAreaRef.current) {
                  textAreaRef.current.focus();
                  textAreaRef.current.setSelectionRange(selectionStart + wrapper.length, selectionEnd + wrapper.length);
              }
          }, 0);
      };

      if ((e.ctrlKey || e.metaKey) && e.key === 'b') wrapText('**');
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') wrapText('*');
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); setIsEditing(false); }
  };

  const containerStyle: React.CSSProperties = {
      width: '100%', height: '100%', 
      backgroundColor: '#fff740', // Classic Yellow
      color: '#333',
      fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif', // Handwritten feel
      fontSize: '14px',
      padding: '10px',
      boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05)', // Subtle inner shadow/texture
      overflowY: 'auto',
      lineHeight: '1.4'
  };

  if (isEditing) {
      return (
          <textarea
            ref={textAreaRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
                ...containerStyle,
                border: 'none', resize: 'none', outline: 'none',
                background: '#fff740' // Ensure bg stays yellow while editing
            }}
            placeholder="Write a note..."
          />
      );
  }

  return (
    <div 
        onClick={() => setIsEditing(true)}
        style={{ ...containerStyle, cursor: 'text' }}
        className="notepad-preview" // Reuse markdown styles
    >
        {content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        ) : (
            <span style={{opacity: 0.5}}>Click to add note...</span>
        )}
    </div>
  );
};