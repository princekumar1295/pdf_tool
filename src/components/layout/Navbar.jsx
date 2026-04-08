import { useLocation } from 'react-router-dom';
import { Menu, ExternalLink } from 'lucide-react';
import { TOOLS, APP_NAME } from '../../utils/constants';
import { useApp } from '../../context/useApp';
import './Navbar.css';

export default function Navbar() {
  const { toggleSidebar } = useApp();
  const location = useLocation();

  const currentTool = TOOLS.find((t) => t.route === location.pathname);
  const pageTitle = currentTool ? currentTool.label : APP_NAME;

  return (
    <header className="navbar">
      <button className="navbar__menu-btn" onClick={toggleSidebar} aria-label="Toggle sidebar">
        <Menu size={20} />
      </button>
      <div className="navbar__breadcrumb">
        <span className="navbar__app-name">{APP_NAME}</span>
        {currentTool && (
          <>
            <span className="navbar__sep">/</span>
            <span className="navbar__page">{pageTitle}</span>
          </>
        )}
      </div>
      <div className="navbar__actions">
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="navbar__icon-btn"
          aria-label="GitHub"
        >
          <ExternalLink size={18} />
        </a>
      </div>
    </header>
  );
}
