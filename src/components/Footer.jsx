import { Link } from 'react-router-dom';
import { FiInstagram, FiYoutube } from 'react-icons/fi';
import { BsWhatsapp } from 'react-icons/bs';
import '../styles/Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <img className="footer-logo-img" src="/logo-96.jpg" alt="" width="44" height="44" loading="lazy" />
              <div>
                <div className="footer-logo-title">TUCASA TIA Mbeya</div>
                <div className="footer-logo-subtitle">Choir Hymns Library</div>
              </div>
            </div>
            <p className="footer-desc">
              A sacred music practice companion. Access guide tracks, hymn sheets, and voice-part recordings — anytime, anywhere.
            </p>
          </div>

          <div>
            <h2 className="footer-col-title">Explore</h2>
            <div className="footer-links">
              <Link to="/">Home</Link>
              <Link to="/#hymns">Hymn Library</Link>
              <Link to="/attendance">My Attendance</Link>
              <Link to="/#support">Support</Link>
            </div>
          </div>

          <div>
            <h2 className="footer-col-title">Connect</h2>
            <div className="footer-links">
              <a href="https://wa.me/255755298196" target="_blank" rel="noreferrer">
                <BsWhatsapp /> WhatsApp
              </a>
              <a
                href="https://www.instagram.com/tucasa_tia_dsm_choir?igsh=OGZrNHF5NGdlMzRv"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FiInstagram /> Instagram
              </a>
              <a
                href="https://youtube.com/@tucasatiambeyachoir?si=IGHOv1Hjnqy9jboz"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FiYoutube /> YouTube
              </a>
            </div>
          </div>
        </div>

        <p className="footer-copy">
          &copy; <span className="num">{new Date().getFullYear()}</span> TUCASA TIA Choir. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
