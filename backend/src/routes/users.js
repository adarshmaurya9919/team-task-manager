import { Router } from 'express';
import { getDb } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/users - list all users (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const users = db.data.users.map(({ password, ...u }) => u);
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/search?q= - search users for adding to projects
router.get('/search', async (req, res) => {
  try {
    const db = await getDb();
    const q = (req.query.q || '').toLowerCase();
    const users = db.data.users
      .filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .map(({ password, ...u }) => u)
      .slice(0, 10);
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/users/:id/role - change user role (admin only)
router.patch('/:id/role', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const idx = db.data.users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    db.data.users[idx].role = req.body.role;
    await db.write();
    const { password, ...safe } = db.data.users[idx];
    res.json({ user: safe });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/dashboard - current user's dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const db = await getDb();
    const now = new Date();

    // My tasks
    const myTasks = db.data.tasks.filter(t => t.assigneeId === req.user.id);
    const overdue = myTasks.filter(t =>
      t.dueDate && new Date(t.dueDate) < now && t.status !== 'done'
    );

    // My projects
    const myProjectIds = db.data.projectMembers
      .filter(m => m.userId === req.user.id)
      .map(m => m.projectId);
    const myProjects = db.data.projects.filter(p =>
      req.user.role === 'admin' ? true : myProjectIds.includes(p.id)
    );

    // Stats
    const allTasks = req.user.role === 'admin'
      ? db.data.tasks
      : db.data.tasks.filter(t => myProjectIds.includes(t.projectId));

    res.json({
      stats: {
        totalProjects: myProjects.length,
        myTasks: myTasks.length,
        overdueCount: overdue.length,
        completedToday: myTasks.filter(t => {
          if (t.status !== 'done' || !t.updatedAt) return false;
          return new Date(t.updatedAt).toDateString() === now.toDateString();
        }).length
      },
      myTasks: myTasks.slice(0, 10).map(t => {
        const project = db.data.projects.find(p => p.id === t.projectId);
        return { ...t, projectName: project?.name, projectColor: project?.color };
      }),
      overdueTasks: overdue.map(t => {
        const project = db.data.projects.find(p => p.id === t.projectId);
        return { ...t, projectName: project?.name, projectColor: project?.color };
      }),
      tasksByStatus: {
        todo: allTasks.filter(t => t.status === 'todo').length,
        in_progress: allTasks.filter(t => t.status === 'in_progress').length,
        review: allTasks.filter(t => t.status === 'review').length,
        done: allTasks.filter(t => t.status === 'done').length,
      },
      recentProjects: myProjects.slice(-5).reverse()
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
