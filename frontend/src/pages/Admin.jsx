import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users').then(r => { setUsers(r.data.users); setLoading(false); });
  }, []);

  if (!loading && user.role !== 'admin') return <Navigate to="/" />;

  const changeRole = async (userId, role) => {
    try {
      const r = await api.patch(`/users/${userId}/role`, { role });
      setUsers(us => us.map(u => u.id === userId ? r.data.user : u));
      toast.success('Role updated');
    } catch { toast.error('Failed to update role'); }
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Admin Panel</h1>
          <p className="subtitle">Manage all users in the workspace</p>
        </div>
        <div className="admin-badge">🔑 Admin</div>
      </div>

      <div className="card">
        <h3 className="card-title">All Users ({users.length})</h3>
        <table className="task-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Change Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="member-avatar small">{u.avatar || u.name.slice(0, 2).toUpperCase()}</div>
                    <span>{u.name} {u.id === user.id ? <span className="muted">(you)</span> : ''}</span>
                  </div>
                </td>
                <td>{u.email}</td>
                <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
                <td>{formatDistanceToNow(parseISO(u.createdAt), { addSuffix: true })}</td>
                <td>
                  {u.id !== user.id ? (
                    <select
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}
                      className="role-select"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : <span className="muted">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
