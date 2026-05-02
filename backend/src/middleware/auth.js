import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';

export const authenticate = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
    const db = await getDb();
    const user = db.data.users.find(u => u.id === payload.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const requireProjectAccess = async (req, res, next) => {
  const db = await getDb();
  const projectId = req.params.projectId || req.params.id;
  const project = db.data.projects.find(p => p.id === projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  // Global admins have full access
  if (req.user.role === 'admin') {
    req.project = project;
    return next();
  }

  const membership = db.data.projectMembers.find(
    m => m.projectId === projectId && m.userId === req.user.id
  );
  if (!membership) return res.status(403).json({ error: 'No access to this project' });

  req.project = project;
  req.projectRole = membership.role;
  next();
};
