import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config';

export interface AuthRequest extends Request {
  adminId?: number;
}

/**
 * Authenticate admin using JWT
 */
export function authenticateAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, CONFIG.WEB_JWT_SECRET) as { adminId: number };
    
    if (!CONFIG.ADMIN_IDS.includes(decoded.adminId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.adminId = decoded.adminId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Generate admin JWT token
 */
export function generateAdminToken(adminId: number): string {
  return jwt.sign({ adminId }, CONFIG.WEB_JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Admin login handler (Telegram WebApp auth)
 */
export async function loginHandler(req: Request, res: Response) {
  try {
    const { telegramId, initData } = req.body;

    // In production, validate initData using Telegram's signature
    // For now, simple check if user is in admin list
    if (!CONFIG.ADMIN_IDS.includes(telegramId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const token = generateAdminToken(telegramId);
    
    res.json({
      token,
      adminId: telegramId,
      expiresIn: '7d',
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
}
