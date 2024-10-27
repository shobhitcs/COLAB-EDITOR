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
  };

  const handleLockSection = () => {
    console.log('Attempting to lock section');
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection();
      console.log('Selected range to lock:', range);

      if (range && range.length > 0) { // Ensure a valid non-zero length range is selected
        // Check for overlap with any existing locked ranges
        const hasOverlap = lockedRanges.some(lockedRange => {
          const isOverlap = !(range.index + range.length <= lockedRange.index || range.index >= lockedRange.index + lockedRange.length);
          return isOverlap;
        });

        if (hasOverlap) {
          alert('Selected range overlaps with an already locked section. Please select a different range.');
        } else {
          // Lock the selected range if there's no overlap
          socket.emit('lockSection', { documentId, range, userId });
          console.log('Range locked:', range);
        }
      } else {
        alert('Please select a valid range of text to lock.');
      }
    }
  };

  const handleUnlockSection = () => {
    console.log('Attempting to unlock section');
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection();
      console.log('Selected range to unlock:', range);

      socket.emit('unlockSection', { documentId, range, userId });
    }
  }

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
        setLockedRanges(data.locks);
        // console.log('lock added successfully')
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

  // Highlight locked sections with a gray background
  useEffect(() => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      editor.formatText(0, editor.getLength(), 'background', false); // Reset background for entire editor

      lockedRanges.forEach(range => {
        editor.formatText(range.index, range.length, 'background', '#e0e0e0'); // Gray background for locked ranges
      });
    }
  }, [lockedRanges, editorContent]);

  // Prevent edits on locked sections
  useEffect(() => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      editor.on('text-change', (delta, oldDelta, source) => {
        if (source !== 'user') return;
        console.log('lock renages123456', lockedRanges);
        console.log('delta:', delta, 'old delta:', oldDelta, 'source:', source, socket);
        console.log('ops', delta.ops);

        let index = 0; // Start from the beginning of the document
        let changeIndices = []; // Array to store index ranges for each change (insert or delete)

        // Step 1: Calculate the index of each change operation in delta
        delta.ops.forEach((op) => {
          if (op.retain) {
            // Retain advances the index without making changes
            index += op.retain;
          } else if (op.insert) {
            // Capture the starting index and length of insert
            const insertEnd = index + (typeof op.insert === 'string' ? op.insert.length : 1);
            changeIndices.push({ start: index, end: insertEnd });
            index = insertEnd; // Update index position after insert
          } else if (op.delete) {
            // Capture the range of delete operation
            const deleteEnd = index + op.delete;
            changeIndices.push({ start: index, end: deleteEnd });
            // Note: index remains the same after delete as it removes characters
          }
        });

        console.log('Calculated change indices:', changeIndices);

        // Step 2: Check if any change overlaps with locked ranges
        let invalidChange = false;
        console.log('locked ranges:', lockedRanges);
        changeIndices.forEach(change => {
          lockedRanges.forEach(range => {
            console.log(change.end, range.index, change.start, range.index + range.length);
            const isOutsideRange = (change.end <= range.index || change.start >= range.index + range.length);
            console.log(isOutsideRange, change, range);
            // If the change falls within the locked range, mark as invalid
            if (!isOutsideRange) {
              invalidChange = true;
            }
          });
        });

        console.log('invalid change:', invalidChange)
        // If an invalid change was attempted, revert to the old delta
        if (invalidChange) {
          const originalContent = oldDelta.ops.map(op => (typeof op.insert === 'string' ? op.insert : '')).join('');
          console.log('original content:', originalContent);
          // editor.setContents(oldDelta);
          setEditorContent(originalContent);
          console.log('text should not change')
        }
        else {
          if (socket && source === 'user') {
            console.log('transmitted');
            socket.emit('documentChange', { documentId, delta });
          }
        }
      });
      // Cleanup function to remove the event listener
      return () => {
        editor.off('text-change');
      };
    }
  }, [lockedRanges]);

  return (
    <div style={{ height: '80vh', padding: '10px 50px' }}>
      <div style={{ margin: '10px 0px' }}>
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
          🔒 Lock
        </button>
        <button
          onClick={handleUnlockSection}
          style={{
            marginLeft: '10px',
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🗝️ Free
        </button>
      </div>
      <ReactQuill
        ref={quillRef}
        value={editorContent}
        onChange={handleEditorChange}
        theme="snow"
        style={{ height: 'calc(100% - 40px)', flexGrow: 1 }}
        placeholder="Start writing your document here..."
      />
    </div>
  );
};

export default DocumentEditor;
