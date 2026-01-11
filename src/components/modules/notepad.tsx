import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer, Extension, mergeAttributes } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Image } from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extension-placeholder';
import { 
    FaBold, FaItalic, FaStrikethrough, FaListUl, FaListOl, FaTasks, 
    FaTable, FaImage, FaUndo, FaRedo, FaLink, FaCalendarAlt, FaCheckSquare 
} from 'react-icons/fa';
import type { TodoItem, CalendarEvent } from '../../types';

// --- CUSTOM NODES & EXTENSIONS ---

// 1. Resizable Image Component
const ResizableImageComponent = ({ node, updateAttributes }: any) => {
    return (
        <NodeViewWrapper className="image-node-view" style={{ display: 'inline-block', position: 'relative', lineHeight: 0 }}>
            <img 
                src={node.attrs.src} 
                alt={node.attrs.alt} 
                style={{ width: node.attrs.width, height: 'auto', maxWidth: '100%' }} 
            />
            <div 
                className="resize-handle"
                onMouseDown={(e) => {
                    e.preventDefault();
                    const startX = e.clientX;
                    const startWidth = parseInt(node.attrs.width || '200');
                    
                    const onMouseMove = (moveEvent: MouseEvent) => {
                        const newWidth = Math.max(50, startWidth + (moveEvent.clientX - startX));
                        updateAttributes({ width: `${newWidth}px` });
                    };
                    const onMouseUp = () => {
                        window.removeEventListener('mousemove', onMouseMove);
                        window.removeEventListener('mouseup', onMouseUp);
                    };
                    window.addEventListener('mousemove', onMouseMove);
                    window.addEventListener('mouseup', onMouseUp);
                }}
                style={{
                    position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px',
                    background: '#007bff', cursor: 'nwse-resize', borderTopLeftRadius: '3px'
                }}
            />
        </NodeViewWrapper>
    );
};

// 2. Reference Link Component
const ReferenceNodeComponent = ({ node }: any) => {
    const { id, type, label, color } = node.attrs;
    const isEvent = type === 'event';
    
    const handleClick = () => {
        const event = new CustomEvent('open-ref-editor', { detail: { id, type } });
        window.dispatchEvent(event);
    };

    return (
        <NodeViewWrapper as="span" style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 2px' }}>
            <span 
                onClick={handleClick}
                contentEditable={false}
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: '#f0f0f0', borderRadius: '12px', padding: '2px 8px',
                    fontSize: '11px', cursor: 'pointer', border: `1px solid ${color}40`,
                    color: '#333', userSelect: 'none'
                }}
            >
                {isEvent ? <FaCalendarAlt color={color} size={10} /> : <FaCheckSquare color={color} size={10} />}
                <span style={{ fontWeight: 500 }}>{label}</span>
            </span>
        </NodeViewWrapper>
    );
};

// Define Extensions
const ResizableImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            width: { default: '200px' },
        };
    },
    addNodeView() {
        return ReactNodeViewRenderer(ResizableImageComponent);
    },
});

const ReferenceNode = Extension.create({
    name: 'referenceNode',
    group: 'inline',
    inline: true,
    selectable: false, // Make strictly non-selectable to behave like a button
    atom: true, 

    addAttributes() {
        return {
            id: { default: null },
            type: { default: 'todo' }, 
            label: { default: 'Reference' },
            color: { default: '#333' }
        }
    },

    parseHTML() {
        return [{ tag: 'span[data-type="reference-node"]' }]
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'reference-node' })]
    },

    addNodeView() {
        return ReactNodeViewRenderer(ReferenceNodeComponent)
    }
});

interface NotepadProps {
    content: string;
    onChange: (text: string) => void;
    allTodos: TodoItem[];
    allEvents: CalendarEvent[];
    onEditTodo: (item: TodoItem) => void;
    onEditEvent: (event: CalendarEvent) => void;
}

export const Notepad: React.FC<NotepadProps> = ({ 
    content, onChange, allTodos, allEvents, onEditTodo, onEditEvent 
}) => {
  
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const handler = (e: any) => {
          const { id, type } = e.detail;
          if (type === 'todo') {
              const item = allTodos.find(t => t.id === id);
              if (item) onEditTodo(item);
          } else {
              const evt = allEvents.find(ev => ev.id === id);
              if (evt) onEditEvent(evt);
          }
      };
      window.addEventListener('open-ref-editor', handler);
      return () => window.removeEventListener('open-ref-editor', handler);
  }, [allTodos, allEvents]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
          bulletList: { keepMarks: true },
          orderedList: { keepMarks: true },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      ResizableImage,
      ReferenceNode,
      Placeholder.configure({ placeholder: 'Write something...' })
    ],
    content: content || '', 
    onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
    },
    editorProps: {
        attributes: {
            class: 'notepad-editor', 
        },
        handleDOMEvents: {
            contextmenu: (view, event) => {
                const target = event.target as HTMLElement;
                if (target.closest('td') || target.closest('th')) {
                    event.preventDefault();
                    const menu = document.createElement('div');
                    menu.style.position = 'fixed';
                    menu.style.left = `${event.clientX}px`;
                    menu.style.top = `${event.clientY}px`;
                    menu.style.background = 'white';
                    menu.style.border = '1px solid #ccc';
                    menu.style.padding = '5px';
                    menu.style.zIndex = '10000';
                    menu.style.cursor = 'pointer';
                    menu.style.fontSize = '12px';
                    menu.innerHTML = `<div style="padding:4px 8px; color:red;">Delete Table</div>`;
                    
                    const close = () => { document.body.removeChild(menu); window.removeEventListener('click', close); };
                    
                    menu.onclick = () => {
                        editor?.chain().focus().deleteTable().run();
                        close();
                    };
                    
                    document.body.appendChild(menu);
                    window.addEventListener('click', close);
                    return true;
                }
                return false;
            }
        }
    }
  });

  const insertTable = (rows: number, cols: number) => {
      editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
      setShowTablePicker(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              if(ev.target?.result) {
                  editor?.chain().focus().setImage({ src: ev.target.result as string }).run();
              }
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const insertReference = (id: string, type: 'todo' | 'event') => {
      let label = 'Ref';
      let color = '#333';
      
      if (type === 'todo') {
          const t = allTodos.find(x => x.id === id);
          if (t) { label = t.text; color = t.color || '#333'; }
      } else {
          const e = allEvents.find(x => x.id === id);
          if (e) { label = e.title; color = e.color || '#007bff'; }
      }

      editor?.chain().focus().insertContent({
          type: 'referenceNode',
          attrs: { id, type, label, color }
      }).insertContent(' ').run(); 
      setShowLinkPicker(false);
  };

  if (!editor) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* TOOLBAR */}
      <div className="notepad-toolbar" style={{ 
          padding: '5px', borderBottom: '1px solid #eee', background: '#fafafa', 
          display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center'
      }}>
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'active' : ''}><FaBold/></button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'active' : ''}><FaItalic/></button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'active' : ''}><FaStrikethrough/></button>
        <div style={{width:'1px', height:'15px', background:'#ccc', margin:'0 2px'}}/>
        
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'active' : ''}><FaListUl/></button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'active' : ''}><FaListOl/></button>
        <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={editor.isActive('taskList') ? 'active' : ''}><FaTasks/></button>
        <div style={{width:'1px', height:'15px', background:'#ccc', margin:'0 2px'}}/>

        {/* Table */}
        <div style={{position:'relative'}}>
            <button onClick={() => setShowTablePicker(!showTablePicker)}><FaTable/></button>
            {showTablePicker && (
                <div style={{
                    position:'absolute', top:'100%', left:0, zIndex:10, background:'white', border:'1px solid #ccc',
                    display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:'2px', padding:'5px', boxShadow:'0 2px 10px rgba(0,0,0,0.1)'
                }}>
                    {Array.from({length:25}).map((_, i) => {
                        const r = Math.floor(i / 5) + 1;
                        const c = (i % 5) + 1;
                        return (
                            <div 
                                key={i} 
                                onMouseDown={(e) => { e.preventDefault(); insertTable(r, c); }}
                                style={{width:'15px', height:'15px', border:'1px solid #ddd', background:'#f8f9fa', cursor:'pointer'}}
                                title={`${r}x${c}`}
                            />
                        );
                    })}
                </div>
            )}
        </div>

        {/* Image */}
        <button onClick={() => fileInputRef.current?.click()}><FaImage/></button>
        <input type="file" ref={fileInputRef} onChange={handleImageUpload} style={{display:'none'}} accept="image/*" />
        
        {/* Link Picker */}
        <div style={{position:'relative'}}>
            <button onClick={() => setShowLinkPicker(!showLinkPicker)}><FaLink/></button>
            {showLinkPicker && (
                <div style={{
                    position:'absolute', top:'100%', left:0, zIndex:20, background:'white', border:'1px solid #ccc',
                    width:'200px', maxHeight:'200px', overflowY:'auto', boxShadow:'0 2px 10px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{padding:'5px', background:'#eee', fontSize:'10px', fontWeight:'bold'}}>EVENTS</div>
                    {allEvents.map(e => (
                        <div key={e.id} onClick={() => insertReference(e.id, 'event')} className="picker-item">
                            {e.title}
                        </div>
                    ))}
                    <div style={{padding:'5px', background:'#eee', fontSize:'10px', fontWeight:'bold'}}>TODOS</div>
                    {allTodos.map(t => (
                        <div key={t.id} onClick={() => insertReference(t.id, 'todo')} className="picker-item">
                            {t.text}
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>

      <EditorContent 
        editor={editor} 
        style={{ flex: 1, overflowY: 'auto', background: 'white', cursor: 'text', padding: '10px' }} 
      />

      <style>{`
        .notepad-editor { outline: none; height: 100%; }
        .notepad-editor p { margin: 0.5em 0; font-family: sans-serif; font-size: 14px; }
        
        /* Lists */
        .notepad-editor ul[data-type="taskList"] { list-style: none; padding: 0; }
        .notepad-editor ul[data-type="taskList"] li { display: flex; align-items: flex-start; margin-bottom: 5px; }
        .notepad-editor ul[data-type="taskList"] li > label { margin-right: 10px; user-select: none; }
        .notepad-editor ul[data-type="taskList"] li > div { flex: 1; }
        .notepad-editor ul[data-type="taskList"] li[data-checked="true"] > div { text-decoration: line-through; opacity: 0.6; }

        /* Tables */
        .notepad-editor table { border-collapse: collapse; width: 100%; margin: 10px 0; table-layout: fixed; }
        .notepad-editor td, .notepad-editor th { border: 1px solid #ced4da; min-width: 1em; padding: 3px 5px; position: relative; vertical-align: top; }
        .notepad-editor th { background-color: #f1f3f5; font-weight: bold; }
        .notepad-editor .selectedCell:after { z-index: 2; position: absolute; content: ""; left: 0; right: 0; top: 0; bottom: 0; background: rgba(200, 200, 255, 0.4); pointer-events: none; }

        /* Toolbar Buttons */
        .notepad-toolbar button { 
            background-color: transparent; 
            border: none; 
            cursor: pointer; 
            padding: 4px; 
            border-radius: 3px; 
            color: #555;
            font-size: 11px;
            transition: background-color 0.2s ease, opacity 0.2s ease;
        }
        
        .notepad-toolbar button svg {
            width: 1.2em; 
            height: 1.2em;
        }

        .notepad-toolbar button:hover { background-color: transparent; }
        .notepad-toolbar button.active { background-color: transparent; color: #007bff; }
        
        .notepad-toolbar:hover button:hover { background-color: #eee; }
        .notepad-toolbar:hover button.active { background-color: #e2e6ea; }
        
        /* Picker */
        .picker-item { padding: 5px 10px; cursor: pointer; font-size: 12px; border-bottom: 1px solid #f0f0f0; }
        .picker-item:hover { background: #f8f9fa; color: #007bff; }
      `}</style>
    </div>
  );
};