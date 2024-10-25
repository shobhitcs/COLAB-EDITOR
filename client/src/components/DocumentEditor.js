import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill's CSS
import { io } from 'socket.io-client';

const DocumentEditor = () => {
  const [editorContent, setEditorContent] = useState('');
  const [socket, setSocket] = useState(null);
  const quillRef = useRef(null);  // Create a ref for ReactQuill

  // Fullscreen editor container styling
  const editorContainerStyle = {
    height: '80vh',  // Full screen height
    display: 'flex',
    flexDirection: 'column',
    padding: '10px 50px',  // Adds 50px space on left and right
  };

  // Set the height of the ReactQuill editor
  const editorStyle = {
    height: '100%',  // Take up all available height of the container
    flexGrow: 1,     // Allow the editor to grow and fill the space
  };

  // Handle changes in the document editor
  const handleEditorChange = (content, delta, source) => {
    setEditorContent(content);
    if (socket && source === 'user') {
      // Emit the document change to the server only if it comes from user actions
      socket.emit('documentChange', { delta });
    }
  };

  useEffect(() => {
    // Create a new socket connection when the component mounts
    const s = io('http://localhost:9000');  // Connect to the Socket.IO server on port 9000
    setSocket(s);

    // Listen for document updates from the server
    s.on('documentUpdated', (data) => {
      if (quillRef.current) {
        // Access the Quill instance using the ref
        const editor = quillRef.current.getEditor();

        // Apply the incoming delta to the editor
        editor.updateContents(data.delta);
      }
    });

    // Cleanup function to disconnect the socket when the component unmounts
    return () => {
      s.disconnect(); // Prevents multiple connection issues
    };
  }, []);

  return (
    <div style={editorContainerStyle}>
      <ReactQuill
        ref={quillRef}  // Attach the ref to the ReactQuill component
        value={editorContent}
        onChange={handleEditorChange}
        theme="snow"
        style={editorStyle}  // Set the editor height
        placeholder="Start writing your document here..."
      />
    </div>
  );
};

export default DocumentEditor;
