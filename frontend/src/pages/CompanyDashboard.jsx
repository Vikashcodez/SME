import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FiUsers, 
  FiBriefcase, 
  FiCalendar, 
  FiDollarSign,
  FiBarChart2,
  FiFileText,
  FiTruck,
  FiPackage
} from 'react-icons/fi';

const CompanyDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalRevenue: 0,
    totalOrders: 0,
    pendingTasks: 0
  });

  useEffect(() => {
    // Fetch company dashboard data here
    // For now, using mock data
    setStats({
      totalEmployees: 45,
      totalRevenue: 1250000,
      totalOrders: 230,
      pendingTasks: 12
    });
  }, []);

  const statCards = [
    {
      title: 'Total Employees',
      value: stats.totalEmployees,
      icon: FiUsers,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600'
    },
    {
      title: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: FiDollarSign,
      color: 'bg-green-500',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600'
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: FiBriefcase,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600'
    },
    {
      title: 'Pending Tasks',
      value: stats.pendingTasks,
      icon: FiCalendar,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-600'
    }
  ];

  const recentActivities = [
    { id: 1, action: 'New employee added', time: '2 hours ago', type: 'employee' },
    { id: 2, action: 'Order #1234 completed', time: '4 hours ago', type: 'order' },
    { id: 3, action: 'Invoice #5678 generated', time: '6 hours ago', type: 'invoice' },
    { id: 4, action: 'Inventory updated', time: '8 hours ago', type: 'inventory' },
  ];

  const quickActions = [
    { icon: FiUsers, label: 'Manage Employees', path: '/employees' },
    { icon: FiFileText, label: 'View Reports', path: '/reports' },
    { icon: FiTruck, label: 'Orders', path: '/orders' },
    { icon: FiPackage, label: 'Inventory', path: '/inventory' },
  ];

  return (
    <div className="p-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.first_name || 'Admin'}!
        </h1>
        <p className="text-gray-600 mt-1">
          {user?.company_name} - Company Dashboard
        </p>
        {user?.is_company_admin && (
          <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            Company Admin
          </span>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-xl`}>
                <stat.icon className={`${stat.textColor} text-2xl`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow duration-300 flex flex-col items-center justify-center space-y-2 hover:bg-blue-50 group"
            >
              <div className="p-3 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                <action.icon className="text-blue-600 text-xl" />
              </div>
              <span className="text-sm font-medium text-gray-700">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activities */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activities</h2>
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'employee' ? 'bg-blue-500' :
                    activity.type === 'order' ? 'bg-green-500' :
                    activity.type === 'invoice' ? 'bg-purple-500' :
                    'bg-orange-500'
                  }`} />
                  <span className="text-sm text-gray-800">{activity.action}</span>
                </div>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;