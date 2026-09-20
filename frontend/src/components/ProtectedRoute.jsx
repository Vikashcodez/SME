import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole, allowedRoles }) => {
  const { isAuthenticated, role, isSuperAdmin, isCompanyAdmin, isBranchAdmin, isEmployee, loading } = useAuth();

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

  let hasRequiredRole = true;

  if (requiredRole === 'super_admin') {
    hasRequiredRole = isSuperAdmin;
  } else if (requiredRole === 'company_admin') {
    hasRequiredRole = isCompanyAdmin;
  } else if (requiredRole === 'branch_admin') {
    hasRequiredRole = isBranchAdmin;
  } else if (requiredRole === 'employee') {
    hasRequiredRole = isEmployee || (!isSuperAdmin && !isCompanyAdmin && !isBranchAdmin);
  } else if (requiredRole) {
    hasRequiredRole = role === requiredRole;
  } else if (allowedRoles && allowedRoles.length > 0) {
    hasRequiredRole = allowedRoles.includes(role);
  }

  if (!hasRequiredRole) {
    const fallbackPath = isSuperAdmin
      ? '/dashboard'
      : isBranchAdmin
      ? '/branch-dashboard'
      : isCompanyAdmin
      ? '/company-dashboard'
      : '/employee-dashboard';
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

export default ProtectedRoute;