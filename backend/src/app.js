import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';

import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import userRoutes from './routes/users.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/tasks', taskRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Serve frontend in production
const distPath = join(__dirname, '../../frontend/dist');
app.use(express.static(distPath));
app.get('/{*path}', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 TaskFlow API running on port ${PORT}`);
});

export default app;
