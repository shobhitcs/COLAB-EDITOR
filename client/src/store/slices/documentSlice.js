import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const initialState = {
  documents: [],
  currentDocument: null,
  loading: false,
  error: null,
};

// Thunk to fetch all documents
export const fetchDocuments = createAsyncThunk(
  'documents/fetchDocuments',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get('http://localhost:5000/api/documents', {
        headers: {
          'x-auth-token': localStorage.getItem('token'),
        },
      });
      return res.data;  // Returning fetched documents
    } catch (err) {
      return rejectWithValue(err.response.data);  // Handling error response
    }
  }
);

// Thunk to fetch a document by ID
export const fetchDocument = createAsyncThunk(
  'documents/fetchDocument',
  async (documentId, { rejectWithValue }) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/documents/${documentId}`, {
        headers: {
          'x-auth-token': localStorage.getItem('token'),
        },
      });
      return res.data;  // Returning fetched document
    } catch (err) {
      return rejectWithValue(err.response.data);  // Handling error response
    }
  }
);

// Thunk to create a new document
export const createDocument = createAsyncThunk(
  'documents/createDocument',
  async (title, { rejectWithValue }) => {
    try {
      const res = await axios.post('http://localhost:5000/api/documents', { title }, {
        headers: {
          'x-auth-token': localStorage.getItem('token'),
        },
      });
      return res.data;  // Returning newly created document
    } catch (err) {
      return rejectWithValue(err.response.data);  // Handling error response
    }
  }
);

// Thunk to delete a document by ID
export const deleteDocument = createAsyncThunk(
  'documents/deleteDocument',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`http://localhost:5000/api/documents/${id}`, {
        headers: {
          'x-auth-token': localStorage.getItem('token'),
        },
      });
      // console.log(id, 'on delete');
      return id;  // Returning the deleted document's ID
    } catch (err) {
      // console.log(err.response.data);
      return rejectWithValue(err.response.data);  // Handling error response
    }
  }
);
// Thunk to add collaborators to a document
export const addCollaborators = createAsyncThunk(
  'documents/addCollaborators',
  async ({ documentId, usernames }, { rejectWithValue }) => {
    try {
      const res = await axios.post(
        `http://localhost:5000/api/documents/${documentId}/collaborators`,
        { usernames },
        {
          headers: {
            'x-auth-token': localStorage.getItem('token'),
          },
        }
      );
      return res.data; // Return the updated document
    } catch (err) {
      return rejectWithValue(err.response.data); // Handle error response
    }
  }
);

// Thunk to remove collaborators from a document
export const removeCollaborator = createAsyncThunk(
  'documents/removeCollaborator',
  async ({ documentId, username }, { rejectWithValue }) => {
    try {
      // console.log('Removing collaborator', username);
      const res = await axios.delete(
        `http://localhost:5000/api/documents/${documentId}/collaborators/${username}`,
        {
          headers: {
            'x-auth-token': localStorage.getItem('token'),
          },
        }
      );
      // console.log(res.data);
      return res.data; // Return the updated document
    } catch (err) {
      // console.log(err.response.data,123);
      return rejectWithValue(err.response.data); // Handle error response
    }
  }
);

const documentSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    clearCurrentDocument: (state) => {
      state.currentDocument = null;  // Clears the current document in the state
    },
  },
  extraReducers: (builder) => {
    builder
      // Handling fetchDocuments action
      .addCase(fetchDocuments.pending, (state) => {
        state.loading = true;  // Start loading when request is sent
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        // console.log(action.payload,' all documents fetched')
        state.documents = action.payload;  // Save fetched documents to state
        state.loading = false;  // Stop loading when data is fetched
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.error = action.payload;  // Store the error in the state
        state.loading = false;  // Stop loading when there's an error
      })

      // Handling fetchDocument action
      .addCase(fetchDocument.pending, (state) => {
        state.loading = true;  // Start loading when request is sent
      })
      .addCase(fetchDocument.fulfilled, (state, action) => {
        state.currentDocument = action.payload;  // Set the current document in state
        state.loading = false;  // Stop loading when data is fetched
      })
      .addCase(fetchDocument.rejected, (state, action) => {
        state.error = action.payload;  // Store the error in the state
        state.loading = false;  // Stop loading when there's an error
      })

      // Handling createDocument action
      .addCase(createDocument.pending, (state) => {
        state.loading = true;  // Start loading when request is sent
      })
      .addCase(createDocument.fulfilled, (state, action) => {
        // console.log(action.payload, 'added')
        state.documents.push(action.payload);  // Add new document to state
        state.loading = false;  // Stop loading when document is created
      })
      .addCase(createDocument.rejected, (state, action) => {
        state.error = action.payload;  // Store the error in the state
        state.loading = false;  // Stop loading when there's an error
      })

      // Handling deleteDocument action
      .addCase(deleteDocument.pending, (state) => {
        state.loading = true;  // Start loading when request is sent
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.documents = state.documents.filter(doc => doc._id !== action.payload);  // Remove deleted document
        state.loading = false;  // Stop loading when document is deleted
      })
      .addCase(deleteDocument.rejected, (state, action) => {
        state.error = action.payload;  // Store the error in the state
        state.loading = false;  // Stop loading when there's an error
      })

    //   // Handling addCollaborators action
    //   .addCase(addCollaborators.pending, (state) => {
    //     state.loading = true; // Start loading when request is sent
    //   })
    // .addCase(addCollaborators.fulfilled, (state, action) => {
    //   const index = state.documents.findIndex(doc => doc._id === action.payload._id);
    //   if (index !== -1) {
    //     state.documents[index] = action.payload; // Update the document with collaborators
    //   }
    //   state.loading = false; // Stop loading when collaborators are added
    // })
    // .addCase(addCollaborators.rejected, (state, action) => {
    //   state.error = action.payload; // Store the error in the state
    //   state.loading = false; // Stop loading when there's an error
    // })

    // // Handling removeCollaborator action
    // .addCase(removeCollaborator.pending, (state) => {
    //   state.loading = true; // Start loading when request is sent
    // })
    // .addCase(removeCollaborator.fulfilled, (state, action) => {
    //   const index = state.documents.findIndex(doc => doc._id === action.payload._id);
    //   if (index !== -1) {
    //     state.documents[index] = action.payload; // Update the document without the removed collaborator
    //   }
    //   state.loading = false; // Stop loading when collaborator is removed
    // })
    // .addCase(removeCollaborator.rejected, (state, action) => {
    //   state.error = action.payload; // Store the error in the state
    //   state.loading = false; // Stop loading when there's an error
    // });
  },
});

// Exporting action creators and reducer
export const { clearCurrentDocument } = documentSlice.actions;
export default documentSlice.reducer;
