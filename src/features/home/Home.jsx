import { Link } from 'react-router-dom';
import {
  Image, FileImage, Layers, Scissors, Minimize2, Lock, FileText, ArrowRight, Shield, Zap, Globe
} from 'lucide-react';
import { TOOLS } from '../../utils/constants';
import './Home.css';

const ICON_MAP = { Image, FileImage, Layers, Scissors, Minimize2, Lock, FileText };

const FEATURES = [
  { icon: Shield, title: '100% Private', desc: 'Files never leave your device. Zero uploads, zero tracking.' },
  { icon: Zap, title: 'Instant Processing', desc: 'All conversions happen in milliseconds right in your browser.' },
  { icon: Globe, title: 'Works Offline', desc: 'No internet required after first load. A true desktop-grade tool.' },
];

export default function Home() {
  return (
    <div className="home">
      {/* Hero */}
      <section className="home__hero">
        <div className="home__hero-glow" />
        <div className="home__badge">
          <Shield size={12} />
          <span>100% client-side — your files never leave your browser</span>
        </div>
        <h1 className="home__title">
          The PDF toolkit that <br />
          <span className="gradient-text">respects your privacy</span>
        </h1>
        <p className="home__subtitle">
          Convert, merge, split, compress, and protect PDF files — all locally in your browser.
          No uploads. No accounts. No limits.
        </p>
      </section>

      {/* Tools Grid */}
      <section className="home__tools">
        <h2 className="home__section-title">Pick a tool to get started</h2>
        <div className="home__grid">
          {TOOLS.map((tool) => {
            const Icon = ICON_MAP[tool.icon];
            return (
              <Link key={tool.id} to={tool.route} className="home__tool-card glass-hover">
                <div className="home__tool-card-inner">
                  <div className="home__tool-icon" style={{ '--tool-color': tool.color }}>
                    {Icon && <Icon size={22} />}
                  </div>
                  <div className="home__tool-info">
                    <div className="home__tool-title-row">
                      <h3>{tool.label}</h3>
                      {tool.badge && <span className="home__tool-badge">{tool.badge}</span>}
                    </div>
                    <p>{tool.description}</p>
                  </div>
                  <div className="home__tool-arrow">
                    <ArrowRight size={16} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Feature highlights */}
      <section className="home__features">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="home__feature-card glass">
              <div className="home__feature-icon">
                <Icon size={20} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
