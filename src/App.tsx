import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TimesheetForm from './components/TimesheetForm';
import EventManager from './components/EventManager';
import BillingExport from './components/BillingExport';
import Reports from './components/Reports';
import useDarkMode from './hooks/useDarkMode';

function App() {
  const [user, setUser] = useState<any>(null);
  const { isDark, toggleDarkMode } = useDarkMode();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser(payload);
    }
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-[#1a1a1a] text-white p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            <span className="text-gray-400">Fresh</span>
            <span className="text-[#a4c71d]">Timesheets</span>
          </h1>
          {user && (
            <div className="flex gap-4 items-center">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? '☀️' : '🌙'}
              </button>
              <span className="text-sm">{user.username} ({user.role})</span>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  setUser(null);
                }}
                className="bg-red-500 px-4 py-2 rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          )}
        </nav>

        <div className="container mx-auto p-6">
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login setUser={setUser} />} />
            <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/timesheet" element={user ? <TimesheetForm /> : <Navigate to="/login" />} />
            <Route path="/events" element={user ? <EventManager /> : <Navigate to="/login" />} />
            <Route path="/billing" element={user ? <BillingExport /> : <Navigate to="/login" />} />
            <Route path="/reports" element={user ? <Reports /> : <Navigate to="/login" />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
