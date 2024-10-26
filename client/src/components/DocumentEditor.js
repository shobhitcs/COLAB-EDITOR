import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

const DocumentEditor = () => {
  const [editorContent, setEditorContent] = useState('');
  const [lockedRanges, setLockedRanges] = useState([]); // Track locked sections
  const [socket, setSocket] = useState(null);
  const quillRef = useRef(null);

  const userId = useSelector(state => state.auth.user?._id);
  const { id: documentId } = useParams();

  const handleEditorChange = (content, delta, source) => {
    setEditorContent(content);
    if (socket && source === 'user') {
      socket.emit('documentChange', { documentId, delta });
    }
  };

  const handleLockSection = () => {
    console.log('lock section');
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection();
      console.log('lock range',range);
      if (range) {
        // Lock the selected range
        socket.emit('lockSection', { documentId, range, userId });
      }
    }
  };

  useEffect(() => {
    const s = io('http://localhost:9000');
    setSocket(s);

    s.emit('joinDocument', { documentId, userId });

    s.on('documentUpdated', (data) => {
      if (quillRef.current) {
        const editor = quillRef.current.getEditor();
        editor.updateContents(data.delta);
      }
    });

    s.on('documentContent', (data) => {
      if (quillRef.current) {
        const editor = quillRef.current.getEditor();
        editor.setContents(data.content);
        setEditorContent(data.content);
      }
    });

    // Handle locked sections from other users
    s.on('lockUpdate', (data) => {
      setLockedRanges(data.lockedRanges);
      console.log('locked ranges', data.lockedRanges);
    });

    return () => {
      s.disconnect();
    };
  }, [documentId]);

  useEffect(() => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      lockedRanges.forEach(range => {
        editor.formatText(range.index, range.length, 'background', '#e0e0e0'); // gray background
        editor.disable(); // Disable editing on locked sections
      });
    }
  }, [lockedRanges]);

  return (
    <div style={{ height: '80vh', padding: '10px 50px' }}>
      <div style={{  margin: '10px 0px' }}>
        <button
          onClick={handleLockSection}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔒
        </button>
      </div>
      <ReactQuill
        ref={quillRef}
        value={editorContent}
        onChange={handleEditorChange}
        theme="snow"
        style={{ height: 'calc(100% - 40px)', flexGrow: 1 }} // Leave space for the button
        placeholder="Start writing your document here..."
      />
    </div>
  );
};

export default DocumentEditor;
