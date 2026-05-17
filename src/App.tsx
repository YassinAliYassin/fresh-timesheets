import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TimesheetForm from './components/TimesheetForm';
import EventManager from './components/EventManager';
import BillingExport from './components/BillingExport';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }, [token]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!token ? <Login setToken={setToken} /> : <Navigate to="/" />} />
        <Route path="/" element={token ? <Dashboard token={token} /> : <Navigate to="/login" />} />
        <Route path="/timesheets" element={token ? <TimesheetForm token={token} /> : <Navigate to="/login" />} />
        <Route path="/events" element={token ? <EventManager token={token} /> : <Navigate to="/login" />} />
        <Route path="/billing" element={token ? <BillingExport token={token} /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
