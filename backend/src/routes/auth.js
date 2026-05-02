import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import { getDb } from '../db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// POST /api/auth/signup
router.post('/signup', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const db = await getDb();
    const { name, email, password } = req.body;

    if (db.data.users.find(u => u.email === email)) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const isFirstUser = db.data.users.length === 0;
    const user = {
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      role: isFirstUser ? 'admin' : 'member', // First user is admin
      createdAt: new Date().toISOString(),
      avatar: name.slice(0, 2).toUpperCase()
    };

    db.data.users.push(user);
    await db.write();

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user;
    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const db = await getDb();
    const { email, password } = req.body;
    const user = db.data.users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const token = auth.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);
    const db = await getDb();
    const user = db.data.users.find(u => u.id === payload.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
