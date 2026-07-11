import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import type { AuthUser } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import EventManager from './components/EventManager';
import BillingExport from './components/BillingExport';
import Reports from './components/Reports';
import EmailNotifications from './components/EmailNotifications';
import CalendarView from './components/CalendarView';
import QuotationForm from './components/QuotationForm';
import TimesheetEntry from './components/TimesheetEntry';
import useDarkMode from './hooks/useDarkMode';

function parseTokenUser(token: string): AuthUser | null {
  try {
    return JSON.parse(atob(token.split('.')[1])) as AuthUser;
  } catch {
    return null;
  }
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem('token');
    return token ? parseTokenUser(token) : null;
  });
  const { isDark, toggleDarkMode } = useDarkMode();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <i className="fas fa-clock text-[#a4c71d] text-2xl"></i>
              <h1 className="text-xl font-bold">
                <span className="text-gray-700 dark:text-gray-200">Fresh</span>
                <span className="text-[#a4c71d]">People</span>
              </h1>
            </div>
            {user && (
              <div className="flex gap-3 items-center">
                <button onClick={toggleDarkMode} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title={isDark ? 'Light Mode' : 'Dark Mode'}>
                  {isDark ? <i className="fas fa-sun text-yellow-500"></i> : <i className="fas fa-moon text-gray-600 dark:text-gray-300"></i>}
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">{user.username}</span>
                <span className="px-2 py-1 bg-[#a4c71d] text-white text-xs rounded-full">{user.role}</span>
                <button onClick={() => { localStorage.removeItem('token'); setUser(null); }} className="btn-secondary text-sm">
                  <i className="fas fa-sign-out-alt mr-2"></i>Logout
                </button>
              </div>
            )}
          </div>
        </nav>

        <div className="container mx-auto p-6">
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login setUser={setUser} />} />
            <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/events" element={user ? <EventManager /> : <Navigate to="/login" />} />
            <Route path="/billing" element={user ? <BillingExport /> : <Navigate to="/login" />} />
            <Route path="/reports" element={user ? <Reports /> : <Navigate to="/login" />} />
            <Route path="/notifications" element={user ? <EmailNotifications /> : <Navigate to="/login" />} />
            <Route path="/calendar" element={user ? <CalendarView /> : <Navigate to="/login" />} />
            <Route path="/quotation" element={user ? <QuotationForm /> : <Navigate to="/login" />} />
            <Route path="/timesheets" element={user ? <TimesheetEntry /> : <Navigate to="/login" />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
