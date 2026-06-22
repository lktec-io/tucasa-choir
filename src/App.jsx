import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import HymnDetails from './pages/HymnDetails';
import Admin from './pages/Admin';
import AttendanceAdmin from './pages/AttendanceAdmin';
import AttendancePortal from './pages/AttendancePortal';
import './styles/global.css';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: theme === 'dark' ? '#1a4a2e' : '#ffffff',
            color: theme === 'dark' ? '#e8f5ee' : '#1e3d2a',
            border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(26,74,46,0.18)'}`,
            borderRadius: '12px',
            fontSize: '0.88rem',
            boxShadow: theme === 'dark' ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.12)',
          },
          success: {
            iconTheme: { primary: '#4caf7d', secondary: theme === 'dark' ? '#e8f5ee' : '#fff' },
          },
          error: {
            iconTheme: { primary: '#f87171', secondary: theme === 'dark' ? '#e8f5ee' : '#fff' },
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
              <Navbar theme={theme} onToggleTheme={toggleTheme} />
              <main className="page-wrapper">
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
    </BrowserRouter>
  );
}
