import { Link } from 'react-router-dom';
import { FiMusic, FiInstagram, FiYoutube, FiFacebook } from 'react-icons/fi';
import '../styles/Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <div className="footer-logo-icon">
                <FiMusic />
              </div>
              <div>
                <div className="footer-logo-title">TUCASA TIA</div>
                <div className="footer-logo-subtitle">Choir Hymns Library</div>
              </div>
            </div>
            <p className="footer-desc">
              The ultimate sacred music practice companion. Access professional guide tracks, hymn sheets, and voice-part recordings — anytime, anywhere.
            </p>
          </div>

          <div>
            <h4 className="footer-col-title">Quick Links</h4>
            <div className="footer-links">
              <Link to="/">Home</Link>
              <a href="#hymns">Hymn Library</a>
              <a href="#support">Support</a>
            </div>
          </div>

          <div>
            <h4 className="footer-col-title">Resources</h4>
            <div className="footer-links">
              <a href="#hymns">Browse Hymns</a>
              <a href="#support">Contact Us</a>
            </div>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">
          <p className="footer-copy">
            &copy; {new Date().getFullYear()} <span>TUCASA TIA Choir</span>. All rights reserved.
          </p>
          <div className="footer-socials">
            <a href="#" className="footer-social-btn" aria-label="Facebook">
              <FiFacebook />
            </a>
            <a href="#" className="footer-social-btn" aria-label="Instagram">
              <FiInstagram />
            </a>
            <a href="#" className="footer-social-btn" aria-label="YouTube">
              <FiYoutube />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
