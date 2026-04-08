import { NavLink, useLocation } from 'react-router-dom';
import {
  Image, FileImage, Layers, Scissors, Minimize2, Lock, FileText,
  ChevronLeft, ChevronRight, Zap
} from 'lucide-react';
import { TOOLS, APP_NAME } from '../../utils/constants';
import { useApp } from '../../context/useApp';
import './Sidebar.css';

const ICON_MAP = {
  Image, FileImage, Layers, Scissors, Minimize2, Lock, FileText,
};

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useApp();
  const location = useLocation();

  return (
    <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ' sidebar--collapsed'}`}>
      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">
          <Zap size={20} />
        </div>
        {sidebarOpen && (
          <span className="sidebar__logo-text">{APP_NAME}</span>
        )}
        <button
          className="sidebar__toggle"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Navigation label */}
      {sidebarOpen && <p className="sidebar__section-label">Tools</p>}

      {/* Nav items */}
      <nav className="sidebar__nav">
        {TOOLS.map((tool) => {
          const Icon = ICON_MAP[tool.icon];
          const isActive = location.pathname === tool.route;
          return (
            <NavLink
              key={tool.id}
              to={tool.route}
              className={`sidebar__item${isActive ? ' sidebar__item--active' : ''}`}
              title={!sidebarOpen ? tool.label : undefined}
            >
              <span className="sidebar__item-icon">
                {Icon && <Icon size={18} />}
              </span>
              {sidebarOpen && (
                <>
                  <span className="sidebar__item-label">{tool.label}</span>
                  {tool.badge && (
                    <span className="sidebar__badge">{tool.badge}</span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer note */}
      {sidebarOpen && (
        <div className="sidebar__footer">
          <p>All processing happens<br />locally in your browser.</p>
          <div className="sidebar__privacy-dot" />
        </div>
      )}
    </aside>
  );
}
