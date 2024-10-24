import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loadUser } from './store/slices/authSlice';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import DocumentList from './components/DocumentList';
import DocumentEditor from './components/DocumentEditor';

const App = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, loading, token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token) {
      dispatch(loadUser());
    }
  }, [dispatch, token]);

  if (loading && token) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/documents" />} />
        <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/documents" />} />
        <Route path="/documents" element={isAuthenticated ? <DocumentList /> : <Navigate to="/login" />} />
        <Route path="/documents/:id" element={isAuthenticated ? <DocumentEditor /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/documents" : "/login"} />} />
      </Routes>
    </Router>
  );
};

export default App;