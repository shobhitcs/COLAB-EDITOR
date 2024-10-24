import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';

const Navbar = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const onLogout = () => {
    dispatch(logout());
  };

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-gray-900 shadow-lg p-4">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="text-white text-3xl font-bold tracking-wide">
          Collab-Editor
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-6">
          {isAuthenticated ? (
            <>
              <span className="text-gray-300">Welcome, {user && user.username}</span>
              <button
                onClick={onLogout}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-full transition-transform transform hover:scale-105"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-full transition-transform transform hover:scale-105"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-full transition-transform transform hover:scale-105"
              >
                Register
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            className="text-white focus:outline-none"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden mt-4 space-y-2">
          {isAuthenticated ? (
            <>
              <span className="text-gray-300 block text-center">Welcome, {user && user.username}</span>
              <button
                onClick={onLogout}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-full"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-full text-center"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="block w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-full text-center"
              >
                Register
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
