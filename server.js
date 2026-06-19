import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { Pool } from 'pg';
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

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Database setup
let db;
let isPostgres = false;
let pgPool;

if (process.env.DATABASE_URL) {
  // PostgreSQL (Render)
  isPostgres = true;
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  db = pgPool;
  console.log('✅ Using PostgreSQL database');
} else {
  // SQLite (local dev)
  db = new Database('timesheets.db');
  console.log('✅ Using SQLite database');
}

// Initialize database tables
async function initDb() {
  if (isPostgres) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'staff',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        client_name TEXT NOT NULL,
        venue TEXT NOT NULL,
        address TEXT,
        event_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
        CREATE TABLE IF NOT EXISTS timesheets (
          id SERIAL PRIMARY KEY,
          event_id INTEGER,
          event_name TEXT NOT NULL,
          staff_name TEXT NOT NULL,
          clock_in TIMESTAMP NOT NULL,
          clock_out TIMESTAMP,
          hourly_rate REAL DEFAULT 40.0,
          total_hours REAL,
          total_amount REAL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
  } else {
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS timesheets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER,
        event_name TEXT NOT NULL,
        staff_name TEXT NOT NULL,
        clock_in DATETIME NOT NULL,
        clock_out DATETIME,
        hourly_rate REAL DEFAULT 40.0,
        total_hours REAL,
        total_amount REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  // Auto-create default admin
  try {
    if (isPostgres) {
      const result = await db.query('SELECT COUNT(*) as count FROM users');
      if (parseInt(result.rows[0].count) === 0) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        await db.query('INSERT INTO users (username, password, role) VALUES ($1, $2, $3)', ['admin', hashedPassword, 'admin']);
        console.log('✅ Default admin created: admin/admin123');
      }
    } else {
      const adminCheck = db.prepare('SELECT COUNT(*) as count FROM users');
      if (adminCheck.get().count === 0) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hashedPassword, 'admin');
        console.log('✅ Default admin created: admin/admin123');
      }
    }
  } catch (err) {
    console.log('Admin check skipped:', err.message);
  }
}

initDb().then(() => console.log('✅ Database initialized'));

// DB query helpers
async function dbQuery(sql, params = []) {
  if (isPostgres) {
    // Convert ? params to $1, $2, etc for PostgreSQL
    let pgSql = sql;
    let pgParams = params;
    
    if (sql.includes('?')) {
      let idx = 0;
      pgSql = sql.replace(/\?/g, () => `$${++idx}`);
    }
    
    const result = await db.query(pgSql, pgParams);
    return result.rows;
  } else {
    // SQLite
    const stmt = db.prepare(sql);
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
    
    if (isSelect) {
      return stmt.all(...params);
    } else if (sql.trim().toUpperCase().startsWith('INSERT')) {
      const result = stmt.run(...params);
      return [{ id: result.lastInsertRowid, changes: result.changes }];
    } else if (sql.trim().toUpperCase().startsWith('UPDATE') || sql.trim().toUpperCase().startsWith('DELETE')) {
      const result = stmt.run(...params);
      return [{ changes: result.changes }];
    }
    return stmt.run(...params);
  }
}

async function dbGet(sql, params = []) {
  const rows = await dbQuery(sql, params);
  return rows[0];
}

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
  try {
    const { username, password, role = 'staff' } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Missing required field: username or password' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    try {
      const result = await dbQuery(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, hashedPassword, role]
      );
      res.json({ id: result[0].id, username, role });
    } catch (err) {
      if (err.message?.includes('UNIQUE') || err.code === '23505') {
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
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Missing required field: username or password' });
    }
    
    dbGet('SELECT * FROM users WHERE username = ?', [username]).then(user => {
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
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
app.post('/api/events', authMiddleware, async (req, res) => {
  try {
    const { client_name, venue, address, event_date, start_time, end_time } = req.body;
    
    if (!client_name || !venue || !event_date) {
      return res.status(400).json({ error: 'Missing required field: client_name, venue, or event_date' });
    }
    
    const result = await dbQuery(
      'INSERT INTO events (client_name, venue, address, event_date, start_time, end_time, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [client_name, venue, address || null, event_date, start_time || null, end_time || null, req.user.id]
    );
    
    res.json({ id: result[0].id, client_name, venue, address, event_date });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/events', authMiddleware, async (req, res) => {
  try {
    const events = await dbQuery('SELECT * FROM events ORDER BY event_date DESC');
    res.json(events);
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/events/:id', authMiddleware, async (req, res) => {
  try {
    const { client_name, venue, address, event_date, start_time, end_time } = req.body;
    const { id } = req.params;
    
    if (!client_name || !venue || !event_date) {
      return res.status(400).json({ error: 'Missing required field: client_name, venue, or event_date' });
    }
    
    const result = await dbQuery(
      'UPDATE events SET client_name = ?, venue = ?, address = ?, event_date = ?, start_time = ?, end_time = ? WHERE id = ?',
      [client_name, venue, address || null, event_date, start_time || null, end_time || null, id]
    );
    
    if (result[0].changes === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ id, client_name, venue, address, event_date });
  } catch (err) {
    console.error('Update event error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/events/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dbQuery('DELETE FROM events WHERE id = ?', [id]);
    
    if (result[0].changes === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Delete event error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Timesheet routes
app.post('/api/timesheets/clock-in', authMiddleware, async (req, res) => {
  try {
    const { event_name, staff_name, staff_names, clock_in } = req.body;
    
    if (!event_name || (!staff_name && !staff_names)) {
      return res.status(400).json({ error: 'Missing required field: event_name and staff_name/staff_names' });
    }
    
    const clockInTime = clock_in || new Date().toISOString();
    const results = [];
    
    // Handle group clock in (array of staff names)
    const names = staff_names && Array.isArray(staff_names) ? staff_names : [staff_name];
    
    for (const name of names) {
      const result = await dbQuery(
        'INSERT INTO timesheets (event_name, staff_name, clock_in) VALUES (?, ?, ?)',
        [event_name, name, clockInTime]
      );
      results.push({ id: result[0].id, staff_name: name });
    }
    
    res.json({ 
      message: `Clocked in ${results.length} staff successfully`, 
      records: results 
    });
  } catch (err) {
    console.error('Clock in error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/timesheets/clock-out', authMiddleware, async (req, res) => {
  try {
    const { timesheet_id, clock_out } = req.body;
    
    if (!timesheet_id) {
      return res.status(400).json({ error: 'Missing timesheet_id' });
    }
    
    const clockOutTime = clock_out || new Date().toISOString();
    
    const record = await dbGet('SELECT clock_in, hourly_rate FROM timesheets WHERE id = ?', [timesheet_id]);
    
    if (!record) return res.status(404).json({ error: 'Timesheet not found' });
    
    const clockIn = new Date(record.clock_in);
    const clockOut = new Date(clockOutTime);
    const totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
    const totalAmount = totalHours * (record.hourly_rate || 40);
    
    await dbQuery(
      'UPDATE timesheets SET clock_out = ?, total_hours = ?, total_amount = ? WHERE id = ?',
      [clockOutTime, totalHours, totalAmount, timesheet_id]
    );
    
    res.json({ message: 'Clocked out successfully', total_hours: totalHours, total_amount: totalAmount });
  } catch (err) {
    console.error('Clock out error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unique event names for previous events
app.get('/api/events/names', authMiddleware, async (req, res) => {
  try {
    const names = await dbQuery('SELECT DISTINCT event_name FROM timesheets WHERE event_name IS NOT NULL ORDER BY event_name ASC');
    res.json(names.map(n => n.event_name));
  } catch (err) {
    console.error('Get event names error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/timesheets', authMiddleware, async (req, res) => {
  try {
    const { event_name, staff_name, month, year } = req.query;
    
    let query = `
      SELECT t.* 
      FROM timesheets t 
      WHERE 1=1
    `;
    const params = [];
    
    if (event_name) {
      query += ' AND t.event_name LIKE ?';
      params.push(`%${event_name}%`);
    }
    
    if (staff_name) {
      query += ' AND t.staff_name LIKE ?';
      params.push(`%${staff_name}%`);
    }
    
    if (month && year) {
      if (isPostgres) {
        query += ' AND EXTRACT(MONTH FROM t.clock_in) = ? AND EXTRACT(YEAR FROM t.clock_in) = ?';
      } else {
        query += ' AND strftime("%m", t.clock_in) = ? AND strftime("%Y", t.clock_in) = ?';
      }
      params.push(month.padStart(2, '0'), year);
    }
    
    query += ' ORDER BY t.clock_in DESC';
    
    const timesheets = await dbQuery(query, params);
    res.json(timesheets);
  } catch (err) {
    console.error('Get timesheets error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Excel export for billing
app.get('/api/export/billing', authMiddleware, async (req, res) => {
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
      if (isPostgres) {
        query += ' AND EXTRACT(MONTH FROM t.clock_in) = ? AND EXTRACT(YEAR FROM t.clock_in) = ?';
      } else {
        query += ' AND strftime("%m", t.clock_in) = ? AND strftime("%Y", t.clock_in) = ?';
      }
      params.push(month.padStart(2, '0'), year);
    }
    
    if (staff_name) {
      query += ' AND t.staff_name LIKE ?';
      params.push(`%${staff_name}%`);
    }
    
    query += ' ORDER BY t.staff_name, t.clock_in';
    
    const data = await dbQuery(query, params);
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Timesheets');
    
    const summary = await dbQuery(`
      SELECT
        staff_name,
        COUNT(*) as total_shifts,
        ROUND(SUM(total_hours), 2) as total_hours,
        ROUND(AVG(hourly_rate), 2) as rate,
        ROUND(SUM(total_amount), 2) as total_amount
      FROM timesheets
      WHERE clock_out IS NOT NULL
      GROUP BY staff_name
      ORDER BY total_amount DESC
    `);
    
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
app.get('/api/billing/cycle', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const period = getPayPeriod(date || new Date());
    
    const summary = await dbQuery(`
      SELECT
        staff_name,
        COUNT(*) as shifts,
        ROUND(SUM(total_hours), 2) as total_hours,
        ROUND(AVG(hourly_rate), 2) as rate,
        ROUND(SUM(total_amount), 2) as total_amount
      FROM timesheets
      WHERE clock_out IS NOT NULL
        AND clock_in >= ?
        AND clock_in <= ?
      GROUP BY staff_name
      ORDER BY total_amount DESC
    `, [period.start.toISOString(), period.end.toISOString()]);
    
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

// Dashboard stats
app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const eventCount = await dbGet('SELECT COUNT(*) as count FROM events');
    const userCount = await dbGet('SELECT COUNT(*) as count FROM users');
    const hoursResult = await dbGet('SELECT COALESCE(SUM(total_hours), 0) as total FROM timesheets WHERE clock_out IS NOT NULL');
    const billingResult = await dbGet('SELECT COALESCE(SUM(total_amount), 0) as total FROM timesheets WHERE clock_out IS NOT NULL');

    const now = new Date().toISOString().split('T')[0];
    const activeEvents = await dbGet('SELECT COUNT(*) as count FROM events WHERE event_date >= ?', [now]);

    res.json({
      totalEvents: eventCount?.count || 0,
      teamMembers: userCount?.count || 0,
      totalHours: parseFloat(hoursResult?.total) || 0,
      totalBilling: parseFloat(billingResult?.total) || 0,
      activeEvents: activeEvents?.count || 0,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: isPostgres ? 'postgres' : 'sqlite', timestamp: new Date().toISOString() });
});

// Notification placeholder routes (to be implemented with email service)
app.post('/api/notifications/settings', authMiddleware, async (req, res) => {
  // TODO: Save notification settings to database
  res.json({ message: 'Settings saved (placeholder)' });
});

app.post('/api/notifications/test', authMiddleware, async (req, res) => {
  // TODO: Send actual test email
  res.json({ message: 'Test email sent (placeholder)' });
});

// SPA catch-all
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Fresh Timesheets API running on port ${PORT}`);
});
