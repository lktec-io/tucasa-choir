import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import HymnDetails from './pages/HymnDetails';
import Admin from './pages/Admin';
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
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a4a2e',
            color: '#e8f5ee',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            fontSize: '0.88rem',
          },
          success: { iconTheme: { primary: '#4caf7d', secondary: '#e8f5ee' } },
          error: { iconTheme: { primary: '#f87171', secondary: '#e8f5ee' } },
        }}
      />
      <Routes>
        {/* Admin route — no public navbar/footer */}
        <Route path="/admin" element={<Admin />} />

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
