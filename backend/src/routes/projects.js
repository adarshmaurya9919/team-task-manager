import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import { getDb } from '../db.js';
import { authenticate, requireProjectAccess } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/projects - list projects accessible to user
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    let projects;
    if (req.user.role === 'admin') {
      projects = db.data.projects;
    } else {
      const myProjectIds = db.data.projectMembers
        .filter(m => m.userId === req.user.id)
        .map(m => m.projectId);
      projects = db.data.projects.filter(p => myProjectIds.includes(p.id));
    }

    const enriched = projects.map(p => {
      const members = db.data.projectMembers.filter(m => m.projectId === p.id);
      const tasks = db.data.tasks.filter(t => t.projectId === p.id);
      const owner = db.data.users.find(u => u.id === p.ownerId);
      return {
        ...p,
        memberCount: members.length,
        taskCount: tasks.length,
        completedCount: tasks.filter(t => t.status === 'done').length,
        ownerName: owner?.name || 'Unknown'
      };
    });

    res.json({ projects: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects
router.post('/', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name required'),
  body('description').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const db = await getDb();
    const project = {
      id: uuidv4(),
      name: req.body.name,
      description: req.body.description || '',
      color: req.body.color || '#6366f1',
      status: 'active',
      ownerId: req.user.id,
      createdAt: new Date().toISOString(),
      dueDate: req.body.dueDate || null
    };

    db.data.projects.push(project);
    // Add creator as project admin
    db.data.projectMembers.push({
      id: uuidv4(),
      projectId: project.id,
      userId: req.user.id,
      role: 'admin',
      joinedAt: new Date().toISOString()
    });
    await db.write();
    res.status(201).json({ project });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/projects/:id
router.get('/:id', requireProjectAccess, async (req, res) => {
  try {
    const db = await getDb();
    const members = db.data.projectMembers
      .filter(m => m.projectId === req.project.id)
      .map(m => {
        const user = db.data.users.find(u => u.id === m.userId);
        return { ...m, name: user?.name, email: user?.email, avatar: user?.avatar };
      });
    const tasks = db.data.tasks.filter(t => t.projectId === req.project.id);
    res.json({ project: req.project, members, tasks });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/projects/:id
router.put('/:id', requireProjectAccess, [
  body('name').optional().trim().isLength({ min: 2 }),
], async (req, res) => {
  try {
    const db = await getDb();
    const idx = db.data.projects.findIndex(p => p.id === req.params.id);
    const allowed = ['name', 'description', 'color', 'status', 'dueDate'];
    allowed.forEach(k => {
      if (req.body[k] !== undefined) db.data.projects[idx][k] = req.body[k];
    });
    db.data.projects[idx].updatedAt = new Date().toISOString();
    await db.write();
    res.json({ project: db.data.projects[idx] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', requireProjectAccess, async (req, res) => {
  try {
    const db = await getDb();
    db.data.projects = db.data.projects.filter(p => p.id !== req.params.id);
    db.data.projectMembers = db.data.projectMembers.filter(m => m.projectId !== req.params.id);
    db.data.tasks = db.data.tasks.filter(t => t.projectId !== req.params.id);
    await db.write();
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects/:projectId/members
router.post('/:projectId/members', requireProjectAccess, [
  body('email').isEmail(),
  body('role').optional().isIn(['admin', 'member']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const db = await getDb();
    const targetUser = db.data.users.find(u => u.email === req.body.email);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const existing = db.data.projectMembers.find(
      m => m.projectId === req.params.projectId && m.userId === targetUser.id
    );
    if (existing) return res.status(409).json({ error: 'Already a member' });

    const member = {
      id: uuidv4(),
      projectId: req.params.projectId,
      userId: targetUser.id,
      role: req.body.role || 'member',
      joinedAt: new Date().toISOString()
    };
    db.data.projectMembers.push(member);
    await db.write();
    res.status(201).json({ member: { ...member, name: targetUser.name, email: targetUser.email } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:projectId/members/:userId
router.delete('/:projectId/members/:userId', requireProjectAccess, async (req, res) => {
  try {
    const db = await getDb();
    db.data.projectMembers = db.data.projectMembers.filter(
      m => !(m.projectId === req.params.projectId && m.userId === req.params.userId)
    );
    await db.write();
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
