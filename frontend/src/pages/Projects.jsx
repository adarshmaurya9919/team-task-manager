import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { formatDistanceToNow, parseISO } from 'date-fns';

const COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'];

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0], dueDate: '' });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const fetchProjects = () => {
    api.get('/projects').then(r => {
      setProjects(r.data.projects);
      setLoading(false);
    });
  };

  useEffect(() => { fetchProjects(); }, []);

  const createProject = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/projects', form);
      toast.success('Project created!');
      setShowModal(false);
      setForm({ name: '', description: '', color: COLORS[0], dueDate: '' });
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} in your workspace</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ New Project</button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>No projects yet</h3>
          <p>Create your first project to start collaborating</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>Create Project</button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(p => {
            const pct = p.taskCount > 0 ? Math.round((p.completedCount / p.taskCount) * 100) : 0;
            return (
              <div key={p.id} className="project-card" onClick={() => navigate(`/projects/${p.id}`)}>
                <div className="project-card-top" style={{ borderTop: `4px solid ${p.color}` }}>
                  <div className="project-card-header">
                    <div className="project-dot" style={{ background: p.color }} />
                    <span className={`project-status-chip ${p.status}`}>{p.status}</span>
                  </div>
                  <h3 className="project-name">{p.name}</h3>
                  {p.description && <p className="project-desc">{p.description}</p>}
                </div>
                <div className="project-card-footer">
                  <div className="project-progress">
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: p.color }} />
                    </div>
                    <span className="progress-pct">{pct}%</span>
                  </div>
                  <div className="project-meta">
                    <span>👥 {p.memberCount}</span>
                    <span>📋 {p.completedCount}/{p.taskCount} tasks</span>
                    {p.dueDate && <span>📅 {formatDistanceToNow(parseISO(p.dueDate), { addSuffix: true })}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Project</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={createProject}>
              <div className="field">
                <label>Project Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Website Redesign"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea
                  placeholder="What is this project about?"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="field">
                <label>Color</label>
                <div className="color-picker">
                  {COLORS.map(c => (
                    <div
                      key={c}
                      className={`color-dot ${form.color === c ? 'selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => setForm({ ...form, color: c })}
                    />
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Due Date (optional)</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
