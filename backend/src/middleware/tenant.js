
export const tenantMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication context required for tenant resolution.',
      },
    });
  }

  const requestedCompany =
    req.headers['x-company-id'] || req.headers['x-company-code'] || req.user.companyCode;

  
  if (req.user.role === 'super_admin' || req.user.role === 'Super Admin') {
    const resolvedCode = requestedCompany || req.user.companyCode || 'CO-0001';
    req.companyCode = resolvedCode;
    req.companyId = resolvedCode;
    req.tenant = { companyCode: resolvedCode, companyId: resolvedCode };
    return next();
  }

  
  const allowedCompanies = req.user.allowedCompanies || [req.user.companyCode];
  if (!allowedCompanies.includes(requestedCompany)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'TENANT_FORBIDDEN',
        message: `You do not have permission to access records for company '${requestedCompany}'.`,
      },
    });
  }

  req.companyCode = requestedCompany;
  req.companyId = requestedCompany;
  req.tenant = { companyCode: requestedCompany, companyId: requestedCompany };
  next();
};

export default tenantMiddleware;
