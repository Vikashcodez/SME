import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FiHome, 
  FiBriefcase, 
  FiUsers, 
  FiSettings, 
  FiLogOut,
  FiChevronLeft,
  FiChevronRight,
  FiBarChart2,
  FiFileText,
  FiBell
} from 'react-icons/fi';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/companies', icon: FiBriefcase, label: 'Companies' },
    { path: '/users', icon: FiUsers, label: 'Users' },
    { path: '/reports', icon: FiBarChart2, label: 'Reports' },
    { path: '/invoices', icon: FiFileText, label: 'Invoices' },
    { path: '/settings', icon: FiSettings, label: 'Settings' },
  ];

  return (
    <div 
      className={`bg-gray-900 text-white h-screen fixed left-0 top-0 z-50 transition-all duration-300 flex flex-col ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FiBriefcase className="text-white text-xl" />
            </div>
            <span className="text-lg font-bold">Admin</span>
          </div>
        )}
        {isCollapsed && (
          <div className="mx-auto bg-blue-600 p-2 rounded-lg">
            <FiBriefcase className="text-white text-xl" />
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-lg hover:bg-gray-800 transition-colors"
        >
          {isCollapsed ? <FiChevronRight size={20} /> : <FiChevronLeft size={20} />}
        </button>
      </div>

      {/* User Profile */}
      <div className={`flex items-center px-4 py-4 border-b border-gray-800 ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-lg">
            {user?.email?.charAt(0).toUpperCase() || 'A'}
          </span>
        </div>
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.email || 'Admin'}</p>
            <p className="text-xs text-gray-400 truncate">Super Admin</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  } ${isCollapsed ? 'justify-center' : 'space-x-3'}`
                }
                title={isCollapsed ? item.label : ''}
              >
                <item.icon size={20} className="flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-gray-800 p-4">
        <button
          onClick={handleLogout}
          className={`flex items-center w-full px-4 py-3 text-gray-300 hover:bg-red-600 hover:text-white rounded-lg transition-all duration-200 ${
            isCollapsed ? 'justify-center' : 'space-x-3'
          }`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <FiLogOut size={20} className="flex-shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;