import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { fetchDocuments, createDocument, deleteDocument, addCollaborators } from '../store/slices/documentSlice'; // Import shareDocument action

const DocumentList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { documents, loading, error } = useSelector((state) => state.documents);
  const { user } = useSelector((state) => state.auth);
  // console.log(documents, 'documents', user)
  // State for managing the modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDocumentTitle, setNewDocumentTitle] = useState('');

  // State for sharing modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [collaboratorUsernames, setCollaboratorUsernames] = useState('');

  // State for delete confirmation modal
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [deleteRejectionModalOpen, setDeleteRejectionModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState('');

  useEffect(() => {
    dispatch(fetchDocuments());
  }, [dispatch]);

  const handleCreateDocument = () => {
    if (newDocumentTitle.trim()) {
      dispatch(createDocument(newDocumentTitle));
      setIsCreateModalOpen(false); // Close modal after creation
      setNewDocumentTitle(''); // Reset the input field
    }
  };

  const handleDeleteDocument = (id) => {
    const documentToDelete = documents.find((doc) => doc._id === id);
    if (documentToDelete && documentToDelete.owner === user._id) {
      dispatch(deleteDocument(id));
      // console.log('documents', documents, 'after delete');
      setIsDeleteConfirmModalOpen(false); // Close confirmation modal after deletion
    }
    else {
      setIsDeleteConfirmModalOpen(false); // Close confirmation modal after deletion
      setDeleteRejectionModalOpen(true); // Close confirmation modal after deletion

    }
  };

  const handleDocumentClick = (id) => {
    navigate(`/documents/${id}`);
  };

  const handleShareDocument = () => {
    const usernamesArray = collaboratorUsernames.split(',').map(username => username.trim());
    dispatch(addCollaborators({ documentId: selectedDocumentId, usernames: usernamesArray }));
    // console.log('Added collaborator')
    setIsShareModalOpen(false); // Close share modal after sharing
    setCollaboratorUsernames(''); // Reset input field
  };

  // Handle key press event for create modal
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission if wrapped in a form
      handleCreateDocument(); // Call the function to create document
    }
  };

  // Handle key press event for share modal
  const handleShareKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      handleShareDocument(); // Call the function to share document
    }
  };

  // Handle key press event for delete confirm modal
  const handleDeleteConfirmKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleDeleteDocument(documentToDelete);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 mt-8">
      <h1 className="text-4xl font-extrabold mb-6 text-gray-800 text-center" style={{ fontFamily: "Maven Pro, sans-serif", }}>Your Documents</h1>

      {/* Create Button */}
      <div className="flex justify-center mb-8">
        <button
          onClick={() => setIsCreateModalOpen(true)} // Open create modal on click
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105"
          aria-label="Create new document" style={{ fontFamily: "Maven Pro, sans-serif", }}
        >
          + Create New Document
        </button>
      </div>

      {/* Document List */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map((doc) => (
          <li
            key={doc._id}
            onClick={() => handleDocumentClick(doc._id)}
            className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow duration-300 cursor-pointer"
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-gray-800 truncate" style={{ fontFamily: "Maven Pro, sans-serif", }}>
                {doc.title}
              </h2>
              <div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDocumentId(doc._id); // Set selected document ID for sharing
                    setIsShareModalOpen(true); // Open share modal
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded-full transition-transform transform hover:scale-105 mr-2"
                  aria-label={`Share document ${doc.title}`} style={{ fontFamily: "Maven Pro, sans-serif", }}
                >
                  Share
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDocumentToDelete(doc._id); // Set the document ID for deletion
                    setIsDeleteConfirmModalOpen(true); // Open delete confirmation modal
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded-full transition-transform transform hover:scale-105"
                  aria-label={`Delete document ${doc.title}`} style={{ fontFamily: "Maven Pro, sans-serif", }}
                >
                  Delete
                </button>
              </div>
            </div>
            <span className="text-gray-500 text-sm" style={{ fontFamily: "Monda, sans-serif", }}>
              Owner: {doc.ownerUsername} {/* Display the owner's username directly */}
            </span>
          </li>
        ))}
      </ul>

      {/* Modal for creating a new document */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md" style={{ fontFamily: "Barlow, sans-serif", }}>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Create New Document</h2>
            <input
              type="text"
              value={newDocumentTitle}
              onChange={(e) => setNewDocumentTitle(e.target.value)}
              onKeyDown={handleKeyDown} // Add event listener for key down
              placeholder="Enter document title"
              className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setIsCreateModalOpen(false)} // Close modal
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-full"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDocument}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-full"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for sharing document */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md" style={{ fontFamily: "Barlow, sans-serif", }}>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Share Document</h2>
            <input
              type="text"
              value={collaboratorUsernames}
              onChange={(e) => setCollaboratorUsernames(e.target.value)}
              onKeyDown={handleShareKeyDown} // Add event listener for key down
              placeholder="Enter usernames, separated by commas"
              className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setIsShareModalOpen(false)} // Close modal
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-full"
              >
                Cancel
              </button>
              <button
                onClick={handleShareDocument}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-full"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for delete confirmation */}
      {isDeleteConfirmModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md" style={{ fontFamily: "Barlow, sans-serif", }}>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Confirm Deletion</h2>
            <p>Are you sure you want to delete this document? This action cannot be undone.</p>
            <div className="flex justify-end space-x-4 mt-4">
              <button
                onClick={() => setIsDeleteConfirmModalOpen(false)} // Close modal
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-full"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDocument(documentToDelete)}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-full"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteRejectionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md" style={{ fontFamily: "Barlow, sans-serif", }}>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Confirm Deletion</h2>
            <p>You cannot delete other users files.</p>
            <div className="flex justify-end space-x-4 mt-4">
              <button
                onClick={() => setDeleteRejectionModalOpen(false)} // Close modal
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentList;
