import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow, parseISO, isPast } from 'date-fns';

const STATUSES = ['todo', 'in_progress', 'review', 'done'];
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
const STATUS_COLORS = { todo: '#94a3b8', in_progress: '#3b82f6', review: '#f59e0b', done: '#10b981' };
const PRIORITY_COLORS = { low: '#10b981', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' };
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('board'); // board | list
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [dragTask, setDragTask] = useState(null);

  const fetch = () => api.get(`/projects/${id}`).then(r => {
    setProject(r.data.project);
    setMembers(r.data.members);
    setTasks(r.data.tasks);
    setLoading(false);
  });

  useEffect(() => { fetch(); }, [id]);

  const moveTask = async (taskId, newStatus) => {
    try {
      await api.put(`/projects/${id}/tasks/${taskId}`, { status: newStatus });
      setTasks(ts => ts.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch { toast.error('Failed to update task'); }
  };

  const deleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    await api.delete(`/projects/${id}/tasks/${taskId}`);
    setTasks(ts => ts.filter(t => t.id !== taskId));
    setSelectedTask(null);
    toast.success('Task deleted');
  };

  const deleteProject = async () => {
    if (!confirm('Delete this project and all its tasks?')) return;
    await api.delete(`/projects/${id}`);
    toast.success('Project deleted');
    navigate('/projects');
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  const tasksByStatus = STATUSES.reduce((acc, s) => ({
    ...acc, [s]: tasks.filter(t => t.status === s)
  }), {});

  return (
    <div className="page project-detail">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="project-dot big" style={{ background: project.color }} />
          <div>
            <h1>{project.name}</h1>
            {project.description && <p className="subtitle">{project.description}</p>}
          </div>
        </div>
        <div className="header-actions">
          <div className="view-toggle">
            <button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}>⬛ Board</button>
            <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>≡ List</button>
          </div>
          <button className="btn-secondary" onClick={() => setShowMemberModal(true)}>👥 Team</button>
          <button className="btn-primary" onClick={() => { setEditingTask(null); setShowTaskModal(true); }}>+ Task</button>
          {(user.role === 'admin' || project.ownerId === user.id) && (
            <button className="btn-danger" onClick={deleteProject}>🗑️</button>
          )}
        </div>
      </div>

      {/* Project Stats Bar */}
      <div className="project-stats-bar">
        {STATUSES.map(s => {
          const count = tasksByStatus[s].length;
          return (
            <div key={s} className="project-stat">
              <span className="project-stat-dot" style={{ background: STATUS_COLORS[s] }} />
              <span className="project-stat-label">{STATUS_LABELS[s]}</span>
              <span className="project-stat-count">{count}</span>
            </div>
          );
        })}
        <div className="project-stat members-stat">
          <span>👥 {members.length} members</span>
        </div>
      </div>

      {/* BOARD VIEW */}
      {view === 'board' && (
        <div className="kanban-board">
          {STATUSES.map(status => (
            <div
              key={status}
              className="kanban-col"
              onDragOver={e => e.preventDefault()}
              onDrop={() => dragTask && moveTask(dragTask, status)}
            >
              <div className="kanban-col-header" style={{ borderTop: `3px solid ${STATUS_COLORS[status]}` }}>
                <span className="kanban-col-title">{STATUS_LABELS[status]}</span>
                <span className="kanban-col-count">{tasksByStatus[status].length}</span>
              </div>
              <div className="kanban-cards">
                {tasksByStatus[status].map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    members={members}
                    onClick={() => setSelectedTask(task)}
                    onDragStart={() => setDragTask(task.id)}
                    onDragEnd={() => setDragTask(null)}
                  />
                ))}
                <button
                  className="add-task-btn"
                  onClick={() => { setEditingTask({ status }); setShowTaskModal(true); }}
                >
                  + Add task
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="task-table-wrap">
          <table className="task-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Due Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>No tasks yet</td></tr>
              )}
              {tasks.map(task => (
                <tr key={task.id} onClick={() => setSelectedTask(task)} style={{ cursor: 'pointer' }}>
                  <td><span className="task-title-cell">{task.title}</span></td>
                  <td><span className={`status-chip status-${task.status}`}>{STATUS_LABELS[task.status]}</span></td>
                  <td>
                    <span className="priority-chip" style={{ color: PRIORITY_COLORS[task.priority] }}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  </td>
                  <td>
                    {task.assigneeId ? (
                      <span className="avatar-chip">{members.find(m => m.userId === task.assigneeId)?.name?.slice(0, 1) || '?'}</span>
                    ) : <span className="muted">—</span>}
                  </td>
                  <td>
                    {task.dueDate ? (
                      <span className={isPast(parseISO(task.dueDate)) && task.status !== 'done' ? 'text-danger' : ''}>
                        {formatDistanceToNow(parseISO(task.dueDate), { addSuffix: true })}
                      </span>
                    ) : <span className="muted">—</span>}
                  </td>
                  <td onClick={e => { e.stopPropagation(); deleteTask(task.id); }}>
                    <button className="icon-btn danger">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <TaskModal
          projectId={id}
          members={members}
          initialStatus={editingTask?.status || 'todo'}
          onClose={() => setShowTaskModal(false)}
          onSaved={(task) => {
            setTasks(ts => [...ts, task]);
            setShowTaskModal(false);
            toast.success('Task created!');
          }}
        />
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          projectId={id}
          members={members}
          onClose={() => setSelectedTask(null)}
          onUpdated={(updated) => {
            setTasks(ts => ts.map(t => t.id === updated.id ? updated : t));
            setSelectedTask(updated);
          }}
          onDeleted={() => deleteTask(selectedTask.id)}
        />
      )}

      {/* Members Modal */}
      {showMemberModal && (
        <MembersModal
          projectId={id}
          members={members}
          onClose={() => setShowMemberModal(false)}
          onUpdated={setMembers}
        />
      )}
    </div>
  );
}

function TaskCard({ task, members, onClick, onDragStart, onDragEnd }) {
  const assignee = members.find(m => m.userId === task.assigneeId);
  const overdue = task.dueDate && isPast(parseISO(task.dueDate)) && task.status !== 'done';
  return (
    <div
      className={`kanban-card ${overdue ? 'overdue' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      <div className="kanban-card-title">{task.title}</div>
      {task.description && <p className="kanban-card-desc">{task.description}</p>}
      <div className="kanban-card-footer">
        <span className="priority-dot" style={{ background: PRIORITY_COLORS[task.priority] }} title={task.priority} />
        {task.dueDate && (
          <span className={`card-due ${overdue ? 'overdue' : ''}`}>
            📅 {formatDistanceToNow(parseISO(task.dueDate), { addSuffix: true })}
          </span>
        )}
        {assignee && (
          <span className="card-avatar" title={assignee.name}>{assignee.name?.slice(0, 2).toUpperCase()}</span>
        )}
      </div>
      {task.tags?.length > 0 && (
        <div className="card-tags">
          {task.tags.map(tag => <span key={tag} className="card-tag">{tag}</span>)}
        </div>
      )}
    </div>
  );
}

function TaskModal({ projectId, members, initialStatus, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: '', description: '', status: initialStatus, priority: 'medium',
    assigneeId: '', dueDate: '', tags: ''
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [] };
      if (!payload.assigneeId) delete payload.assigneeId;
      const r = await api.post(`/projects/${projectId}/tasks`, payload);
      onSaved(r.data.task);
    } catch (err) {
      toast.error('Failed to create task');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Task</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="field">
            <label>Title *</label>
            <input autoFocus type="text" placeholder="What needs to be done?" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea rows={3} placeholder="Add details..." value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Assignee</label>
              <select value={form.assigneeId} onChange={e => setForm({ ...form, assigneeId: e.target.value })}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.userId} value={m.userId}>{m.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Tags (comma separated)</label>
            <input type="text" placeholder="bug, frontend, urgent" value={form.tags}
              onChange={e => setForm({ ...form, tags: e.target.value })} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskDetailModal({ task, projectId, members, onClose, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...task, tags: task.tags?.join(', ') || '' });
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/projects/${projectId}/tasks/${task.id}/comments`).then(r => setComments(r.data.comments));
  }, [task.id]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [] };
      const r = await api.put(`/projects/${projectId}/tasks/${task.id}`, payload);
      onUpdated(r.data.task);
      setEditing(false);
      toast.success('Task updated');
    } finally { setSaving(false); }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    const r = await api.post(`/projects/${projectId}/tasks/${task.id}/comments`, { content: comment });
    setComments(cs => [...cs, r.data.comment]);
    setComment('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          {editing ? (
            <input className="edit-title-input" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
          ) : (
            <h2>{task.title}</h2>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            {editing ? (
              <>
                <button className="btn-primary" onClick={save} disabled={saving}>{saving ? '...' : 'Save'}</button>
                <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              </>
            ) : (
              <button className="btn-secondary" onClick={() => setEditing(true)}>✏️ Edit</button>
            )}
            <button className="btn-danger small" onClick={onDeleted}>🗑️</button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="task-detail-body">
          <div className="task-detail-main">
            {editing ? (
              <textarea className="edit-desc-input" rows={4} value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Add description..." />
            ) : (
              <p className="task-desc">{task.description || <span className="muted">No description</span>}</p>
            )}

            {/* Comments */}
            <div className="comments-section">
              <h4>Comments ({comments.length})</h4>
              <div className="comments-list">
                {comments.map(c => (
                  <div key={c.id} className="comment">
                    <div className="comment-avatar">{c.userAvatar || c.userName?.slice(0, 2).toUpperCase()}</div>
                    <div className="comment-body">
                      <div className="comment-author">{c.userName} <span className="comment-time">{formatDistanceToNow(parseISO(c.createdAt), { addSuffix: true })}</span></div>
                      <div className="comment-content">{c.content}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="comment-input-row">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addComment()}
                />
                <button className="btn-primary" onClick={addComment}>Send</button>
              </div>
            </div>
          </div>

          <div className="task-detail-sidebar">
            <div className="detail-field">
              <label>Status</label>
              {editing ? (
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              ) : <span className={`status-chip status-${task.status}`}>{STATUS_LABELS[task.status]}</span>}
            </div>
            <div className="detail-field">
              <label>Priority</label>
              {editing ? (
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ) : <span className="priority-chip" style={{ color: PRIORITY_COLORS[task.priority] }}>{PRIORITY_LABELS[task.priority]}</span>}
            </div>
            <div className="detail-field">
              <label>Assignee</label>
              {editing ? (
                <select value={form.assigneeId || ''} onChange={e => setForm({ ...form, assigneeId: e.target.value })}>
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.userId} value={m.userId}>{m.name}</option>)}
                </select>
              ) : <span>{members.find(m => m.userId === task.assigneeId)?.name || 'Unassigned'}</span>}
            </div>
            <div className="detail-field">
              <label>Due Date</label>
              {editing ? (
                <input type="date" value={form.dueDate || ''} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
              ) : <span>{task.dueDate ? formatDistanceToNow(parseISO(task.dueDate), { addSuffix: true }) : 'None'}</span>}
            </div>
            {editing && (
              <div className="detail-field">
                <label>Tags</label>
                <input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="bug, feature" />
              </div>
            )}
            {!editing && task.tags?.length > 0 && (
              <div className="detail-field">
                <label>Tags</label>
                <div className="card-tags">{task.tags.map(t => <span key={t} className="card-tag">{t}</span>)}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MembersModal({ projectId, members, onClose, onUpdated }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [adding, setAdding] = useState(false);

  const addMember = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const r = await api.post(`/projects/${projectId}/members`, { email, role });
      onUpdated(prev => [...prev, r.data.member]);
      setEmail('');
      toast.success('Member added!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    } finally { setAdding(false); }
  };

  const removeMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    await api.delete(`/projects/${projectId}/members/${userId}`);
    onUpdated(prev => prev.filter(m => m.userId !== userId));
    toast.success('Member removed');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Team Members</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={addMember} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input type="email" placeholder="member@email.com" value={email}
            onChange={e => setEmail(e.target.value)} required style={{ flex: 1 }} />
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="btn-primary" disabled={adding}>Add</button>
        </form>
        <div className="members-list">
          {members.map(m => (
            <div key={m.id} className="member-row">
              <div className="member-avatar">{m.avatar || m.name?.slice(0, 2).toUpperCase()}</div>
              <div className="member-info">
                <div className="member-name">{m.name}</div>
                <div className="member-email">{m.email}</div>
              </div>
              <span className={`role-badge ${m.role}`}>{m.role}</span>
              <button className="icon-btn danger" onClick={() => removeMember(m.userId)}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
