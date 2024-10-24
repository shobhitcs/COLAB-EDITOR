import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill's CSS
import { io } from 'socket.io-client';

// const socket = io('http://localhost:5000'); // Adjust URL as needed

const DocumentEditor = () => {
  const [editorContent, setEditorContent] = useState('');

  // Fullscreen editor container styling
  const editorContainerStyle = {
    height: '80vh',  // Full screen height
    display: 'flex',
    flexDirection: 'column',
    padding: '10px 50px',  // Adds 50px space on left and right
  };

  const quillStyle = {
    flex: 1,  // Makes the editor take up remaining space
    display: 'flex',
    flexDirection: 'column',
  };

  const handleEditorChange = (content) => {
    setEditorContent(content);
    // Emit the change to the server
    // socket.emit('documentChange', { content });
  };

  useEffect(() => {
    // Listen for document updates from the server
    // socket.on('documentUpdated', (data) => {
    //   setEditorContent(data.content); // Update editor content with the received data
    // });

    // // Cleanup the socket listener on component unmount
    // return () => {
    //   socket.off('documentUpdated');
    // };
  }, []);

  return (
    <div style={editorContainerStyle}>
      <ReactQuill
        value={editorContent}
        onChange={handleEditorChange}
        style={quillStyle}
        theme="snow"  // You can also use 'bubble' theme
        placeholder="Start writing your document here..."
      />
    </div>
  );
};

export default DocumentEditor;
