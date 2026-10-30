import './styles/global.css';
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import HymnDetails from './pages/HymnDetails';
import Admin from './pages/Admin';
import AttendanceAdmin from './pages/AttendanceAdmin';
import AttendancePortal from './pages/AttendancePortal';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
      <ScrollToTop />
      <Toaster
        position="top-right"
        containerStyle={{ zIndex: 400 }}
        toastOptions={{
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.875rem',
            fontWeight: 600,
            boxShadow: 'var(--shadow-md)',
          },
          success: {
            iconTheme: { primary: '#1b6545', secondary: '#ffffff' },
          },
          error: {
            iconTheme: { primary: '#a8231b', secondary: '#ffffff' },
          },
        }}
      />
      <Routes>
        {/* Admin routes — no public navbar/footer */}
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/attendance" element={<AttendanceAdmin />} />

        {/* Public routes */}
        <Route
          path="/*"
          element={
            <>
              <a href="#main-content" className="skip-link">Skip to content</a>
              <Navbar theme={theme} onToggleTheme={toggleTheme} />
              <main className="page-wrapper" id="main-content" tabIndex={-1}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/hymn/:id" element={<HymnDetails />} />
                  <Route path="/attendance" element={<AttendancePortal />} />
                </Routes>
              </main>
              <Footer />
            </>
          }
        />
      </Routes>
      </MotionConfig>
    </BrowserRouter>
  );
}
