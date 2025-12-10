import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FaBold, FaItalic, FaListUl, FaEye, FaPen } from 'react-icons/fa';

interface NotepadProps {
  content: string;
  onChange: (newContent: string) => void;
}

export const Notepad: React.FC<NotepadProps> = ({ content, onChange }) => {
  const [isPreview, setIsPreview] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = (before: string, after: string = '') => {
    const textarea = textAreaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const previousText = textarea.value;
    const newText = previousText.substring(0, start) + before + previousText.substring(start, end) + after + previousText.substring(end);
    onChange(newText);
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + before.length, end + before.length);
    }, 10);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ 
          padding: '5px', borderBottom: '1px solid #ccc', background: '#f0f0f0', 
          display: 'flex', gap: '5px', justifyContent: 'space-between', color: '#000' 
      }}>
        <div style={{ display: 'flex', gap: '5px' }}>
            {!isPreview && (
                <>
                    <button title="Bold" onClick={() => insertText('**', '**')} style={btnStyle}><FaBold size={10} color="#333"/></button>
                    <button title="Italic" onClick={() => insertText('*', '*')} style={btnStyle}><FaItalic size={10} color="#333"/></button>
                    <button title="List" onClick={() => insertText('- ')} style={btnStyle}><FaListUl size={10} color="#333"/></button>
                </>
            )}
        </div>
        <button 
            onClick={() => setIsPreview(!isPreview)} 
            style={{...btnStyle, width: 'auto', padding: '2px 8px', color: '#333'}}
            onMouseDown={(e) => e.stopPropagation()} 
        >
            {isPreview ? <><FaPen size={10}/> Edit</> : <><FaEye size={10}/> Preview</>}
        </button>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: 'white' }}>
        {isPreview ? (
            <div className="markdown-body" style={{ padding: '10px', height: '100%', overflowY: 'auto', fontSize: '14px', lineHeight: '1.5', color: '#000' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content || '*No content*'}
                </ReactMarkdown>
            </div>
        ) : (
            <textarea
                ref={textAreaRef}
                className="notepad-input"
                placeholder="Type Markdown here..."
                value={content}
                onChange={(e) => onChange(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()} 
                style={{
                    width: '100%', 
                    height: '100%', 
                    padding: '10px',
                    resize: 'none', 
                    border: 'none', 
                    outline: 'none', 
                    fontFamily: 'monospace', 
                    fontSize: '13px', 
                    color: '#333', 
                    background: 'white',
                    overflowX: 'hidden', 
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap', 
                    wordWrap: 'break-word' 
                }}
            />
        )}
      </div>
    </div>
  );
};

const btnStyle = {
    border: '1px solid #999', background: '#fff', borderRadius: '3px', 
    cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '24px'
};