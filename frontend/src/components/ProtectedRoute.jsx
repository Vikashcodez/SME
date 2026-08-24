import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole, allowedRoles }) => {
  const { isAuthenticated, role, isCompanyAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const hasRequiredRole = requiredRole === 'company_admin'
    ? isCompanyAdmin
    : requiredRole
      ? role === requiredRole
      : !allowedRoles || allowedRoles.includes(role);

  if (!hasRequiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;