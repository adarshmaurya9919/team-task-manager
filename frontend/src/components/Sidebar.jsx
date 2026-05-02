import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">⚡</span>
        <span className="logo-text">Ethara</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🏠</span>
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/projects" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📁</span>
          <span>Projects</span>
        </NavLink>
        {user?.role === 'admin' && (
          <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">🔑</span>
            <span>Admin</span>
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{user?.avatar || user?.name?.slice(0, 2).toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">⏻</button>
        </div>
      </div>
    </aside>
  );
}
