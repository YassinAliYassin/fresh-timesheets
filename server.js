import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = 'solid-timesheets-secret-key';
const db = new Database('timesheets.db');

app.use(cors());
app.use(express.json());

// Init DB
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'staff'
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    client_name TEXT,
    venue TEXT,
    address TEXT,
    event_date DATE
  );

  CREATE TABLE IF NOT EXISTS timesheets (
    id INTEGER PRIMARY KEY,
    event_id INTEGER,
    staff_name TEXT,
    clock_in DATETIME,
    clock_out DATETIME,
    hourly_rate REAL DEFAULT 40.0,
    total_hours REAL,
    total_amount REAL
  );
`);

// Create default admin
const adminCheck = db.prepare('SELECT COUNT(*) as count FROM users');
if (adminCheck.get().count === 0) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hashedPassword, 'admin');
  console.log('✅ Default admin created: admin/admin123');
}

// Auth routes
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  try {
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashedPassword);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'User exists' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    res.json({ token, role: user.role });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// API routes for events & timesheets
app.get('/api/events', (req, res) => {
  const events = db.prepare('SELECT * FROM events ORDER BY event_date DESC').all();
  res.json(events);
});

app.post('/api/events', (req, res) => {
  const { client_name, venue, address, event_date } = req.body;
  const result = db.prepare('INSERT INTO events (client_name, venue, address, event_date) VALUES (?, ?, ?, ?)').run(client_name, venue, address, event_date);
  res.json({ id: result.lastInsertRowid });
});

app.delete('/api/events/:id', (req, res) => {
  const id = req.params.id;
  db.prepare('DELETE FROM events WHERE id = ?').run(id);
  res.json({ success: true });
});

app.get('/api/timesheets', (req, res) => {
  const sheets = db.prepare(`
    SELECT t.*, e.client_name, e.venue 
    FROM timesheets t 
    LEFT JOIN events e ON t.event_id = e.id 
    ORDER BY t.clock_in DESC
  `).all();
  res.json(sheets);
});

app.post('/api/timesheets/clockin', (req, res) => {
  const { event_id, staff_name, hourly_rate } = req.body;
  const result = db.prepare('INSERT INTO timesheets (event_id, staff_name, clock_in, hourly_rate) VALUES (?, ?, ?, ?)').run(event_id, staff_name, new Date().toISOString(), hourly_rate || 40);
  res.json({ id: result.lastInsertRowid });
});

app.post('/api/timesheets/clockout/:id', (req, res) => {
  const id = req.params.id;
  const entry = db.prepare('SELECT * FROM timesheets WHERE id = ?').get(id);
  if (entry && !entry.clock_out) {
    const clockOut = new Date().toISOString();
    const hours = (new Date(clockOut) - new Date(entry.clock_in)) / 3600000;
    const amount = hours * entry.hourly_rate;
    db.prepare('UPDATE timesheets SET clock_out = ?, total_hours = ?, total_amount = ? WHERE id = ?').run(clockOut, hours, amount, id);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Already clocked out' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Solid Timesheets API running on http://localhost:${PORT}`);
});
