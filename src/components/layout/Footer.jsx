import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <p>
        © {new Date().getFullYear()} <span className="footer__brand">PDFCraft</span> — 
        All conversions happen locally. No files are uploaded to any server.
      </p>
    </footer>
  );
}
