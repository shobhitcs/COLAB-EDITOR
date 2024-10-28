import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { Delta } from 'quill/core';

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
    // console.log('Attempting to lock section');
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection();
      // console.log('Selected range to lock:', range);

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
          // console.log('Range locked:', range);
        }
      } else {
        alert('Please select a valid range of text to lock.');
      }
    }
  };

  const handleUnlockSection = () => {
    // console.log('Attempting to unlock section');
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
        // console.log('hello',data.content, 'data content received from backend server');
        // wrote for debugging purposes
        const newdel = new Delta([{ insert: data.content }])
        editor.setContents(newdel);
        setEditorContent(data.content);
        setLockedRanges(data.locks);
        // console.log('lock added successfully')
      }
    });

    // Handle locked sections from other users
    s.on('lockUpdate', (data) => {
      setLockedRanges(data.lockedRanges);
      // console.log('locked ranges', data.lockedRanges);
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
        // Check if the locked range belongs to the current user or others
        const backgroundColor = range.userId === userId ? '#48CFCB' : '#FEEC37';
        editor.formatText(range.index, range.length, 'background', backgroundColor);
      });
    }
  }, [lockedRanges, editorContent]);


  const areArraysEqual = (arr1, arr2) => {
    // Check if both are arrays
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;

    // Check length
    if (arr1.length !== arr2.length) return false;

    // Check each element
    for (let i = 0; i < arr1.length; i++) {
      if (JSON.stringify(arr1[i]) !== JSON.stringify(arr2[i])) {
        return false; // Objects differ
      }
    }

    return true; // All checks passed, arrays are equal
  };

  // Prevent edits on locked sections
  useEffect(() => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      editor.on('text-change', (delta, oldDelta, source) => {
        if (source !== 'user') return;
        // console.log('lock renages123456', lockedRanges);
        // console.log('delta:', delta, 'old delta:', oldDelta, 'source:', source, socket);
        // console.log('ops', delta.ops);

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
            changeIndices.push({ start: index, end: insertEnd, type: 'insert' });
            index = insertEnd; // Update index position after insert
          } else if (op.delete) {
            // Capture the range of delete operation
            const deleteEnd = index + op.delete;
            changeIndices.push({ start: index, end: deleteEnd, type: 'delete' });
            // Note: index remains the same after delete as it removes characters
          }
        });

        // console.log('Calculated change indices:', changeIndices);

        // Step 2: Check if any change overlaps with locked ranges
        let invalidChange = false;
        // console.log('locked ranges:', lockedRanges);

        changeIndices.forEach(change => {
          lockedRanges.forEach(range => {
            // console.log(change.end, range.index, change.start, range.index + range.length);

            let isOutsideRange;

            if (change.type === 'insert') {
              // Allow insertion if it starts exactly at the beginning of the lock
              // console.log('inserting range');
              isOutsideRange = (change.end <= range.index || change.start >= range.index + range.length || change.start === range.index);
            } else if (change.type === 'delete') {
              // console.log('deleting range');
              // Deletion should be outside the locked range entirely
              isOutsideRange = (change.end <= range.index || change.start >= range.index + range.length);
            } else {
              // console.log('elsewhere range');
              // Handle other operations if applicable
              isOutsideRange = true;
            }

            // console.log(isOutsideRange, change, range);

            // If the change is within the locked range (except insert at start), mark as invalid
            if (!isOutsideRange) {
              invalidChange = true;
            }
          });
        });

        // console.log('invalid change:', invalidChange)
        // If an invalid change was attempted, revert to the old delta
        if (invalidChange) {
          const originalContent = oldDelta.ops.map(op => (typeof op.insert === 'string' ? op.insert : '')).join('');
          // console.log('original content:', originalContent);
          editor.setContents(oldDelta);
          setEditorContent(originalContent);
          // console.log('text should not change')
          // Display an alert indicating the section is locked
          alert("This section is already locked by another user. Your changes have been reverted.");
        }
        else {
          if (socket && source === 'user') {
            // console.log('transmitted');
            // Adjust locked sections based on the delta changes
            const newlockedRanges = adjustLockedSections(delta);

            if (!areArraysEqual(newlockedRanges, lockedRanges)) {
              setLockedRanges(newlockedRanges);
              // console.log('transmitting new locks');
              // io.to(documentId).emit('lockUpdate', { lockedRanges: lockedSections[documentId] });
            }
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

  const adjustLockedSections = (delta) => {
    // Get the locked sections for the document
    const lkRanges = (lockedRanges || []).map(lock => ({ ...lock }));


    let index = 0; // Track the cumulative index as we process delta.ops
    delta.ops.forEach(op => {
      if (op.retain) {
        // Move the index by retain length
        index += op.retain;
      } else if (op.insert) {
        // Calculate insertion length
        const insertLength = typeof op.insert === 'string' ? op.insert.length : 1;

        // Move all locks after the index forward by insert length
        lkRanges.forEach(lock => {
          if (lock.index >= index) {
            lock.index += insertLength;
          }
        });

        // Update index position after insert
        index += insertLength;
      } else if (op.delete) {
        // Calculate delete length
        const deleteLength = op.delete;

        // Move all locks after the index backward by delete length
        lkRanges.forEach(lock => {
          if (lock.index > index) {
            lock.index -= deleteLength;
          }
        });

        // Index remains unchanged after delete
      }
    });
    // console.log(lockedRanges, 123)
    return lkRanges;
  };

  // Define colors for user and other users
  const userLockColor = '#48CFCB'; // User's lock color
  const otherUserLockColor = '#FEEC37'; // Other users' lock color


  return (
    <div style={{ height: '80vh', padding: '10px 50px' }}>
      <div style={{ margin: '10px 0', display: 'flex', alignItems: 'center' }}>

        <div style={{ margin: '0px' }}>
          <button
            onClick={handleLockSection}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px', // Add margin for spacing between buttons
            }}
          >
            🔒 Lock
          </button>
          <button
            onClick={handleUnlockSection}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            🗝️ Free
          </button>
        </div>
        {/* Displaying user's lock color */}
        <span style={{ display: 'flex', alignItems: 'center', marginLeft: '20px' }}>
          <span style={{ width: '20px', height: '20px', backgroundColor: userLockColor, marginRight: '8px', border: '1px solid gray' }} />
          <span style={{fontFamily: "Ubuntu, sans-serif",}}>Your Lock</span>
        </span>

        {/* Displaying other users' lock color */}
        <span style={{ display: 'flex', alignItems: 'center', marginLeft: '20px' }}>
          <span style={{ width: '20px', height: '20px', backgroundColor: otherUserLockColor, marginRight: '8px', border: '1px solid gray' }} />
          <span style={{fontFamily: "Ubuntu, sans-serif",}}>Other User's Lock</span>
        </span>

        {/* Buttons for locking and unlocking sections */}
      </div>
      <ReactQuill
        ref={quillRef}
        // value={editorContent}
        onChange={handleEditorChange}
        theme="snow"
        style={{ height: 'calc(100% - 40px)', flexGrow: 1 }}
        placeholder="Start writing your document here..."
      />
    </div>
  );
};

export default DocumentEditor;
