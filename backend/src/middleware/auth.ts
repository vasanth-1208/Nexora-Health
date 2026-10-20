import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_nexora_health_jwt_key_2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string; // Database User _id
    username: string; // Employee ID or Patient ID
    role: string;
    name: string;
    patientDocId?: string; // Database Patient _id
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expected "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ message: 'Authentication token required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      name: decoded.name,
      patientDocId: decoded.patientDocId,
    };
    next();
  });
};

export const requireRole = (allowedRoles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Access denied. Role ${req.user.role} is not authorized for this resource.` });
    }

    next();
  };
};

/**
 * IDOR Protection:
 * Allows access if the user is in allowedStaffRoles, OR if the request is made by
 * the patient themselves matching req.params.patientId / req.params.id / req.params.targetId.
 */
export const requireOwnershipOrStaff = (
  allowedStaffRoles: string[] = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTION', 'BILLING', 'WARD_STAFF', 'DIAGNOSTICS', 'PHARMACY']
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }

    if (allowedStaffRoles.includes(req.user.role)) {
      return next();
    }

    if (req.user.role === 'PATIENT') {
      const target = req.params.patientId || req.params.id || req.params.targetId;
      if (
        target &&
        target !== req.user.userId &&
        target !== req.user.username &&
        target !== req.user.patientDocId
      ) {
        return res.status(403).json({ message: 'Access denied: You are only authorized to access your own medical records.' });
      }
    }

    next();
  };
};
