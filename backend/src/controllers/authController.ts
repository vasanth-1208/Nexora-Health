import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, Patient } from '../models';

import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_nexora_health_jwt_key_2026';

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'User ID / Employee ID and password are required.' });
    }

    // Find user in MongoDB
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Check if account is deactivated
    if (user.isActive === false) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact administration.' });
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const waitMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return res.status(423).json({
        message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${waitMinutes} minute(s).`,
      });
    }

    // Strictly verify password using bcrypt ONLY - ZERO BACKDOORS
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
        user.failedLoginAttempts = 0;
      }
      await user.save();
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    let patientDocId: string | undefined;
    if (user.role === 'PATIENT') {
      const patient = await Patient.findOne({ userId: user._id });
      if (patient) {
        patientDocId = patient._id.toString();
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role,
        name: user.name,
        labType: user.labType || 'ALL',
        patientDocId,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return response
    return res.status(200).json({
      userId: user.username, // Returns custom user ID (P1001, doctor1, etc.)
      name: user.name,
      role: user.role,
      labType: user.labType || 'ALL',
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const user = await User.findById(req.user.userId).select('-passwordHash -passwordResetToken -passwordResetExpires');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json(user);
  } catch (error: any) {
    console.error('GetMe error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { username, email } = req.body;
    if (!username && !email) {
      return res.status(400).json({ message: 'Please provide your User ID or Email.' });
    }

    const user = await User.findOne({
      $or: [
        ...(username ? [{ username }] : []),
        ...(email ? [{ email }] : []),
      ],
    });

    if (!user) {
      // Do not reveal account non-existence
      return res.status(200).json({ message: 'If the specified account exists, a secure reset token has been issued.' });
    }

    // Generate cryptographically secure random token
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry
    await user.save();

    return res.status(200).json({
      message: 'If the specified account exists, a secure reset token has been issued.',
      resetToken: rawResetToken, // Returned for dev/academic demonstration without real SMTP credentials
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Reset token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset token.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    await user.save();

    return res.status(200).json({ message: 'Password reset successfully. Please log in with your new password.' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};
