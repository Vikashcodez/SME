import React from 'react';
import { useAuth } from '../context/AuthContext';
import { FiSearch, FiBell, FiUser, FiMenu } from 'react-icons/fi';

const Header = ({ toggleSidebar }) => {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 h-16 px-6 flex items-center justify-between">
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
        >
          <FiMenu size={24} className="text-gray-600" />
        </button>
        <div className="hidden md:flex items-center space-x-2">
          <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
          <span className="text-sm text-gray-400">/</span>
          <span className="text-sm text-gray-500">Overview</span>
        </div>
      </div>

      {/* Center - Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <FiBell size={20} className="text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <FiUser className="text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-700">
              {user?.email || 'Admin'}
            </p>
            <p className="text-xs text-gray-500">Super Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;