import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = 'fresh-timesheets-secret-2026';

app.use(cors());
app.use(express.json());

// Serve React static files
app.use(express.static(path.join(__dirname, 'dist')));

// Initialize SQLite database
const db = new Database('timesheets.db');

// Auto-create default admin if no users exist
const adminCheck = db.prepare('SELECT COUNT(*) as count FROM users');
if (adminCheck.get().count === 0) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
    .run('admin', hashedPassword, 'admin');
  console.log('✅ Default admin created: admin/admin123');
}

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'staff',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT NOT NULL,
    venue TEXT NOT NULL,
    address TEXT,
    event_date DATE NOT NULL,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS timesheets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    staff_name TEXT NOT NULL,
    clock_in DATETIME NOT NULL,
    clock_out DATETIME,
    hourly_rate REAL DEFAULT 40.0,
    total_hours REAL,
    total_amount REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id)
  );
`);

// Helper: Calculate pay period (26th to 25th)
function getPayPeriod(date) {
  const d = new Date(date);
  const day = d.getDate();
  const year = d.getFullYear();
  const month = d.getMonth();
  
  if (day >= 26) {
    return {
      start: new Date(year, month, 26),
      end: new Date(year, month + 1, 25)
    };
  } else {
    return {
      start: new Date(year, month - 1, 26),
      end: new Date(year, month, 25)
    };
  }
}

// Auth routes
app.post('/api/register', async (req, res) => {
  const { username, password, role = 'staff' } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  try {
    const stmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
    const result = stmt.run(username, hashedPassword, role);
    res.json({ id: result.lastInsertRowid, username, role });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const user = stmt.get(username);
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// Middleware to verify JWT
function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Event routes
app.post('/api/events', authMiddleware, (req, res) => {
  const { client_name, venue, address, event_date } = req.body;
  
  const stmt = db.prepare('INSERT INTO events (client_name, venue, address, event_date, created_by) VALUES (?, ?, ?, ?, ?)');
  const result = stmt.run(client_name, venue, address, event_date, req.user.id);
  
  res.json({ id: result.lastInsertRowid, client_name, venue, address, event_date });
});

app.get('/api/events', authMiddleware, (req, res) => {
  const stmt = db.prepare('SELECT * FROM events ORDER BY event_date DESC');
  const events = stmt.all();
  res.json(events);
});

// Timesheet routes
app.post('/api/timesheets/clock-in', authMiddleware, (req, res) => {
  const { event_id, staff_name, clock_in } = req.body;
  
  const stmt = db.prepare('INSERT INTO timesheets (event_id, staff_name, clock_in) VALUES (?, ?, ?)');
  const result = stmt.run(event_id, staff_name, clock_in || new Date().toISOString());
  
  res.json({ id: result.lastInsertRowid, message: 'Clocked in successfully' });
});

app.post('/api/timesheets/clock-out', authMiddleware, (req, res) => {
  const { timesheet_id, clock_out } = req.body;
  
  const clockOutTime = clock_out || new Date().toISOString();
  
  // Get clock in time
  const getStmt = db.prepare('SELECT clock_in FROM timesheets WHERE id = ?');
  const record = getStmt.get(timesheet_id);
  
  if (!record) return res.status(404).json({ error: 'Timesheet not found' });
  
  const clockIn = new Date(record.clock_in);
  const clockOut = new Date(clockOutTime);
  const totalHours = (clockOut - clockIn) / (1000 * 60 * 60);
  const totalAmount = totalHours * 40; // R40/hour
  
  const updateStmt = db.prepare('UPDATE timesheets SET clock_out = ?, total_hours = ?, total_amount = ? WHERE id = ?');
  updateStmt.run(clockOutTime, totalHours, totalAmount, timesheet_id);
  
  res.json({ message: 'Clocked out successfully', total_hours: totalHours, total_amount: totalAmount });
});

app.get('/api/timesheets', authMiddleware, (req, res) => {
  const { event_id, staff_name, month, year } = req.query;
  
  let query = `
    SELECT t.*, e.client_name, e.venue, e.event_date 
    FROM timesheets t 
    JOIN events e ON t.event_id = e.id 
    WHERE 1=1
  `;
  const params = [];
  
  if (event_id) {
    query += ' AND t.event_id = ?';
    params.push(event_id);
  }
  
  if (staff_name) {
    query += ' AND t.staff_name LIKE ?';
    params.push(`%${staff_name}%`);
  }
  
  if (month && year) {
    query += ' AND strftime("%m", t.clock_in) = ? AND strftime("%Y", t.clock_in) = ?';
    params.push(month.padStart(2, '0'), year);
  }
  
  query += ' ORDER BY t.clock_in DESC';
  
  const stmt = db.prepare(query);
  const timesheets = stmt.all(...params);
  
  res.json(timesheets);
});

// Excel export for billing
app.get('/api/export/billing', authMiddleware, (req, res) => {
  const { month, year, staff_name } = req.query;
  
  let query = `
    SELECT 
      t.staff_name,
      e.client_name,
      e.venue,
      t.clock_in,
      t.clock_out,
      ROUND(t.total_hours, 2) as hours,
      t.hourly_rate,
      ROUND(t.total_amount, 2) as amount
    FROM timesheets t 
    JOIN events e ON t.event_id = e.id 
    WHERE t.clock_out IS NOT NULL
  `;
  const params = [];
  
  if (month && year) {
    query += ' AND strftime("%m", t.clock_in) = ? AND strftime("%Y", t.clock_in) = ?';
    params.push(month.padStart(2, '0'), year);
  }
  
  if (staff_name) {
    query += ' AND t.staff_name LIKE ?';
    params.push(`%${staff_name}%`);
  }
  
  query += ' ORDER BY t.staff_name, t.clock_in';
  
  const stmt = db.prepare(query);
  const data = stmt.all(...params);
  
  // Create Excel workbook
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Timesheets');
  
  // Add summary sheet
  const summary = db.prepare(`
    SELECT 
      staff_name,
      COUNT(*) as total_shifts,
      ROUND(SUM(total_hours), 2) as total_hours,
      ROUND(SUM(total_amount), 2) as total_amount
    FROM timesheets 
    WHERE clock_out IS NOT NULL
    GROUP BY staff_name
    ORDER BY total_amount DESC
  `).all();
  
  const ws2 = XLSX.utils.json_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary');
  
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  res.setHeader('Content-Disposition', `attachment; filename=timesheets_${month || 'all'}_${year || 'all'}.xlsx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

// Get monthly summary for billing cycle (26th to 25th)
app.get('/api/billing/cycle', authMiddleware, (req, res) => {
  const { date } = req.query;
  const period = getPayPeriod(date || new Date());
  
  const stmt = db.prepare(`
    SELECT 
      staff_name,
      COUNT(*) as shifts,
      ROUND(SUM(total_hours), 2) as total_hours,
      ROUND(SUM(total_amount), 2) as total_amount
    FROM timesheets
    WHERE clock_out IS NOT NULL
      AND clock_in >= ?
      AND clock_in <= ?
    GROUP BY staff_name
    ORDER BY total_amount DESC
  `);
  
  const summary = stmt.all(period.start.toISOString(), period.end.toISOString());
  
  res.json({
    period_start: period.start,
    period_end: period.end,
    staff: summary
  });
});

// SPA catch-all for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Fresh Timesheets API running on http://localhost:${PORT}`);
});
