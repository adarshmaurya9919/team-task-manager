import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow, isPast, parseISO } from 'date-fns';

const STATUS_COLORS = { todo: '#94a3b8', in_progress: '#3b82f6', review: '#f59e0b', done: '#10b981' };
const PRIORITY_COLORS = { low: '#10b981', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/users/dashboard').then(r => {
      setData(r.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  const { stats, myTasks, overdueTasks, tasksByStatus, recentProjects } = data;
  const total = Object.values(tasksByStatus).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Good {getGreeting()}, {user.name.split(' ')[0]} 👋</h1>
          <p className="subtitle">Here's what's happening in your workspace</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#6366f120' }}>📁</div>
          <div>
            <div className="stat-value">{stats.totalProjects}</div>
            <div className="stat-label">Projects</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#3b82f620' }}>📋</div>
          <div>
            <div className="stat-value">{stats.myTasks}</div>
            <div className="stat-label">My Tasks</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ef444420' }}>🔥</div>
          <div>
            <div className="stat-value" style={{ color: stats.overdueCount > 0 ? '#ef4444' : 'inherit' }}>
              {stats.overdueCount}
            </div>
            <div className="stat-label">Overdue</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#10b98120' }}>✅</div>
          <div>
            <div className="stat-value">{stats.completedToday}</div>
            <div className="stat-label">Done Today</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Task Status Overview */}
        <div className="card">
          <h3 className="card-title">Task Overview</h3>
          <div className="status-bars">
            {Object.entries(tasksByStatus).map(([status, count]) => (
              <div key={status} className="status-bar-item">
                <div className="status-bar-label">
                  <span>{STATUS_LABELS[status]}</span>
                  <span className="count">{count}</span>
                </div>
                <div className="status-bar-track">
                  <div
                    className="status-bar-fill"
                    style={{
                      width: `${(count / total) * 100}%`,
                      background: STATUS_COLORS[status]
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <div className="card">
            <h3 className="card-title" style={{ color: '#ef4444' }}>⚠️ Overdue Tasks</h3>
            <div className="task-list">
              {overdueTasks.slice(0, 5).map(t => (
                <div
                  key={t.id}
                  className="task-item overdue"
                  onClick={() => navigate(`/projects/${t.projectId}`)}
                >
                  <div className="task-item-dot" style={{ background: '#ef4444' }} />
                  <div className="task-item-info">
                    <div className="task-item-title">{t.title}</div>
                    <div className="task-item-meta">
                      <span className="badge" style={{ background: t.projectColor + '20', color: t.projectColor }}>
                        {t.projectName}
                      </span>
                      <span className="text-danger">
                        Due {formatDistanceToNow(parseISO(t.dueDate), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Tasks */}
        <div className="card">
          <h3 className="card-title">My Tasks</h3>
          {myTasks.length === 0 ? (
            <p className="empty-msg">No tasks assigned to you yet 🎉</p>
          ) : (
            <div className="task-list">
              {myTasks.slice(0, 8).map(t => (
                <div
                  key={t.id}
                  className="task-item"
                  onClick={() => navigate(`/projects/${t.projectId}`)}
                >
                  <div className="task-item-dot" style={{ background: PRIORITY_COLORS[t.priority] }} />
                  <div className="task-item-info">
                    <div className="task-item-title">{t.title}</div>
                    <div className="task-item-meta">
                      <span className="badge" style={{ background: t.projectColor + '20', color: t.projectColor }}>
                        {t.projectName}
                      </span>
                      <span className={`status-chip status-${t.status}`}>{STATUS_LABELS[t.status]}</span>
                    </div>
                  </div>
                  {t.dueDate && (
                    <span className={`due-date ${isPast(parseISO(t.dueDate)) && t.status !== 'done' ? 'overdue' : ''}`}>
                      {formatDistanceToNow(parseISO(t.dueDate), { addSuffix: true })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Projects */}
        <div className="card">
          <h3 className="card-title">Recent Projects</h3>
          {recentProjects.length === 0 ? (
            <p className="empty-msg">No projects yet. <button className="link-btn" onClick={() => navigate('/projects')}>Create one!</button></p>
          ) : (
            <div className="project-list">
              {recentProjects.map(p => (
                <div key={p.id} className="project-mini" onClick={() => navigate(`/projects/${p.id}`)}>
                  <div className="project-mini-dot" style={{ background: p.color }} />
                  <div>
                    <div className="project-mini-name">{p.name}</div>
                    <div className="project-mini-date">
                      {formatDistanceToNow(parseISO(p.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  <span className={`project-status-chip ${p.status}`}>{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
