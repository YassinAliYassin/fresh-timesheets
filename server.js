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
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fresh-timesheets-secret-2026';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

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

// Create tables with proper schema
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
    start_time TIME,
    end_time TIME,
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

console.log('✅ Database initialized');

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

// Helper: Validate input
function validateInput(data, requiredFields) {
  for (const field of requiredFields) {
    if (!data[field]) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

// Auth routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, role = 'staff' } = req.body;
    
    const error = validateInput({ username, password }, ['username', 'password']);
    if (error) return res.status(400).json({ error });

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    try {
      const stmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
      const result = stmt.run(username, hashedPassword, role);
      res.json({ id: result.lastInsertRowid, username, role });
    } catch (err) {
      if (err.message.includes('UNIQUE constraint')) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      throw err;
    }
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    const error = validateInput({ username, password }, ['username', 'password']);
    if (error) return res.status(400).json({ error });

    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = stmt.get(username);
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to verify JWT
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Event routes
app.post('/api/events', authMiddleware, (req, res) => {
  try {
    const { client_name, venue, address, event_date, start_time, end_time } = req.body;
    
    const error = validateInput({ client_name, venue, event_date }, ['client_name', 'venue', 'event_date']);
    if (error) return res.status(400).json({ error });

    const stmt = db.prepare('INSERT INTO events (client_name, venue, address, event_date, start_time, end_time, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const result = stmt.run(client_name, venue, address || null, event_date, start_time || null, end_time || null, req.user.id);
    
    res.json({ id: result.lastInsertRowid, client_name, venue, address, event_date });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/events', authMiddleware, (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM events ORDER BY event_date DESC');
    const events = stmt.all();
    res.json(events);
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/events/:id', authMiddleware, (req, res) => {
  try {
    const { client_name, venue, address, event_date, start_time, end_time } = req.body;
    const { id } = req.params;
    
    const error = validateInput({ client_name, venue, event_date }, ['client_name', 'venue', 'event_date']);
    if (error) return res.status(400).json({ error });

    const stmt = db.prepare('UPDATE events SET client_name = ?, venue = ?, address = ?, event_date = ?, start_time = ?, end_time = ? WHERE id = ?');
    const result = stmt.run(client_name, venue, address || null, event_date, start_time || null, end_time || null, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ id, client_name, venue, address, event_date });
  } catch (err) {
    console.error('Update event error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/events/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    
    const stmt = db.prepare('DELETE FROM events WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Delete event error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Timesheet routes
app.post('/api/timesheets/clock-in', authMiddleware, (req, res) => {
  try {
    const { event_id, staff_name, clock_in } = req.body;
    
    const error = validateInput({ event_id, staff_name }, ['event_id', 'staff_name']);
    if (error) return res.status(400).json({ error });

    const stmt = db.prepare('INSERT INTO timesheets (event_id, staff_name, clock_in) VALUES (?, ?, ?)');
    const result = stmt.run(event_id, staff_name, clock_in || new Date().toISOString());
    
    res.json({ id: result.lastInsertRowid, message: 'Clocked in successfully' });
  } catch (err) {
    console.error('Clock in error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/timesheets/clock-out', authMiddleware, (req, res) => {
  try {
    const { timesheet_id, clock_out } = req.body;
    
    if (!timesheet_id) {
      return res.status(400).json({ error: 'Missing timesheet_id' });
    }

    const clockOutTime = clock_out || new Date().toISOString();
    
    // Get clock in time
    const getStmt = db.prepare('SELECT clock_in, hourly_rate FROM timesheets WHERE id = ?');
    const record = getStmt.get(timesheet_id);
    
    if (!record) return res.status(404).json({ error: 'Timesheet not found' });
    
    const clockIn = new Date(record.clock_in);
    const clockOut = new Date(clockOutTime);
    const totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
    const totalAmount = totalHours * (record.hourly_rate || 40);
    
    const updateStmt = db.prepare('UPDATE timesheets SET clock_out = ?, total_hours = ?, total_amount = ? WHERE id = ?');
    updateStmt.run(clockOutTime, totalHours, totalAmount, timesheet_id);
    
    res.json({ message: 'Clocked out successfully', total_hours: totalHours, total_amount: totalAmount });
  } catch (err) {
    console.error('Clock out error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/timesheets', authMiddleware, (req, res) => {
  try {
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
  } catch (err) {
    console.error('Get timesheets error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Excel export for billing
app.get('/api/export/billing', authMiddleware, (req, res) => {
  try {
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
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get monthly summary for billing cycle (26th to 25th)
app.get('/api/billing/cycle', authMiddleware, (req, res) => {
  try {
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
  } catch (err) {
    console.error('Billing cycle error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA catch-all for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Fresh Timesheets API running on http://localhost:${PORT}`);
});
