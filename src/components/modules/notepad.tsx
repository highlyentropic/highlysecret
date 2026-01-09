import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface NotepadProps {
    content: string;
    onChange: (text: string) => void;
}

export const Notepad: React.FC<NotepadProps> = ({ content, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Shortcut Handler
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
          // Restore cursor/selection? Ideally yes, but tricky in React controlled inputs without layout effect
          // Simple refocus logic:
          setTimeout(() => {
              if (textAreaRef.current) {
                  textAreaRef.current.focus();
                  textAreaRef.current.setSelectionRange(selectionStart + wrapper.length, selectionEnd + wrapper.length);
              }
          }, 0);
      };

      if ((e.ctrlKey || e.metaKey) && e.key === 'b') wrapText('**');
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') wrapText('*');
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); setIsEditing(false); } // Save/Exit
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
                width: '100%', height: '100%', border: 'none', resize: 'none', outline: 'none',
                padding: '10px', fontSize: '14px', fontFamily: 'monospace', color: '#333', background: 'white'
            }}
            placeholder="Type here... (Ctrl+B bold, Ctrl+I italic)"
          />
      );
  }

  return (
    <div 
        className="notepad-preview"
        onClick={() => setIsEditing(true)}
        style={{ cursor: 'text', height: '100%', background: 'white', color: '#333' }}
    >
        {content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        ) : (
            <span style={{color: '#999', fontStyle: 'italic'}}>Click to edit...</span>
        )}
    </div>
  );
};