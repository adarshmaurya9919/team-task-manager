import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import { getDb } from '../db.js';
import { authenticate, requireProjectAccess } from '../middleware/auth.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

const VALID_STATUSES = ['todo', 'in_progress', 'review', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// GET /api/projects/:projectId/tasks
router.get('/', requireProjectAccess, async (req, res) => {
  try {
    const db = await getDb();
    let tasks = db.data.tasks.filter(t => t.projectId === req.params.projectId);

    // Enrich with assignee info
    const enriched = tasks.map(t => {
      const assignee = t.assigneeId ? db.data.users.find(u => u.id === t.assigneeId) : null;
      const creator = db.data.users.find(u => u.id === t.createdBy);
      return {
        ...t,
        assigneeName: assignee?.name,
        assigneeAvatar: assignee?.avatar,
        creatorName: creator?.name,
        commentCount: db.data.comments.filter(c => c.taskId === t.id).length
      };
    });

    res.json({ tasks: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects/:projectId/tasks
router.post('/', requireProjectAccess, [
  body('title').trim().isLength({ min: 1 }).withMessage('Title required'),
  body('status').optional().isIn(VALID_STATUSES),
  body('priority').optional().isIn(VALID_PRIORITIES),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const db = await getDb();
    const task = {
      id: uuidv4(),
      projectId: req.params.projectId,
      title: req.body.title,
      description: req.body.description || '',
      status: req.body.status || 'todo',
      priority: req.body.priority || 'medium',
      assigneeId: req.body.assigneeId || null,
      createdBy: req.user.id,
      dueDate: req.body.dueDate || null,
      tags: req.body.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.data.tasks.push(task);
    await db.write();
    res.status(201).json({ task });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/projects/:projectId/tasks/:taskId
router.put('/:taskId', requireProjectAccess, async (req, res) => {
  try {
    const db = await getDb();
    const idx = db.data.tasks.findIndex(
      t => t.id === req.params.taskId && t.projectId === req.params.projectId
    );
    if (idx === -1) return res.status(404).json({ error: 'Task not found' });

    const allowed = ['title', 'description', 'status', 'priority', 'assigneeId', 'dueDate', 'tags'];
    allowed.forEach(k => {
      if (req.body[k] !== undefined) db.data.tasks[idx][k] = req.body[k];
    });
    db.data.tasks[idx].updatedAt = new Date().toISOString();
    await db.write();
    res.json({ task: db.data.tasks[idx] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:projectId/tasks/:taskId
router.delete('/:taskId', requireProjectAccess, async (req, res) => {
  try {
    const db = await getDb();
    db.data.tasks = db.data.tasks.filter(
      t => !(t.id === req.params.taskId && t.projectId === req.params.projectId)
    );
    db.data.comments = db.data.comments.filter(c => c.taskId !== req.params.taskId);
    await db.write();
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/projects/:projectId/tasks/:taskId/comments
router.get('/:taskId/comments', requireProjectAccess, async (req, res) => {
  try {
    const db = await getDb();
    const comments = db.data.comments
      .filter(c => c.taskId === req.params.taskId)
      .map(c => {
        const user = db.data.users.find(u => u.id === c.userId);
        return { ...c, userName: user?.name, userAvatar: user?.avatar };
      });
    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects/:projectId/tasks/:taskId/comments
router.post('/:taskId/comments', requireProjectAccess, [
  body('content').trim().isLength({ min: 1 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const db = await getDb();
    const comment = {
      id: uuidv4(),
      taskId: req.params.taskId,
      userId: req.user.id,
      content: req.body.content,
      createdAt: new Date().toISOString()
    };
    db.data.comments.push(comment);
    await db.write();
    const user = db.data.users.find(u => u.id === req.user.id);
    res.status(201).json({ comment: { ...comment, userName: user?.name, userAvatar: user?.avatar } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
