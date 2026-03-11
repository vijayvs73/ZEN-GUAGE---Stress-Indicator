import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3334;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Supabase connected to:', supabaseUrl);

app.use(cors({ origin: true }));
app.use(express.json());

const httpServer = createServer(app);

const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
const clients = new Set();

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token verification failed' });
  }
};

// WebSocket connections
wss.on('connection', (ws, req) => {
  clients.add(ws);
  console.log('WebSocket client connected', wss.clients.size);

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', at: Date.now() }));
        return;
      }
      if (msg.type === 'assessment_complete') {
        console.log('Assessment:', msg.payload?.stressLevel, msg.payload?.id);
        
        // Store assessment in database if user is authenticated
        if (msg.payload?.userId && msg.payload?.results) {
          try {
            await supabase.from('assessments').insert({
              user_id: msg.payload.userId,
              stress_level: msg.payload.stressLevel,
              reaction_time: msg.payload.results.reactionTime || 0,
              memory_score: msg.payload.results.memoryScore || 0,
              tapping_speed: msg.payload.results.tappingSpeed || 0,
              accuracy: msg.payload.results.accuracy || 0
            });
            console.log('Assessment saved to database');
          } catch (dbError) {
            console.error('Failed to save assessment:', dbError);
          }
        }
      }
      // Broadcast to other clients
      for (const client of clients) {
        if (client !== ws && client.readyState === 1) {
          client.send(JSON.stringify({ type: 'broadcast', payload: msg }));
        }
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('WebSocket client disconnected', wss.clients.size);
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'zengauge-backend', ws: 'ws://localhost:' + PORT + '/ws', db: 'connected' });
});

// API info
app.get('/api', (req, res) => {
  res.json({ message: 'ZEN GAUGE API', version: '1.0.0', endpoints: ['/api/assessments', '/api/profile', '/api/stats'] });
});

// ==================== ASSESSMENT ENDPOINTS ====================

// Get all assessments for authenticated user
app.get('/api/assessments', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('user_id', req.user.id)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save new assessment
app.post('/api/assessments', authenticateToken, async (req, res) => {
  try {
    const { stress_level, reaction_time, memory_score, tapping_speed, accuracy, analysis } = req.body;

    const { data, error } = await supabase
      .from('assessments')
      .insert({
        user_id: req.user.id,
        stress_level,
        reaction_time,
        memory_score,
        tapping_speed,
        accuracy,
        analysis
      })
      .select()
      .single();

    if (error) throw error;
    
    // Broadcast to connected clients
    for (const client of clients) {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ 
          type: 'new_assessment', 
          payload: { userId: req.user.id, stressLevel: stress_level } 
        }));
      }
    }

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete assessment
app.delete('/api/assessments/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('assessments')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PROFILE ENDPOINTS ====================

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || { id: req.user.id, email: req.user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user profile
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { display_name, username } = req.body;

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: req.user.id,
        display_name,
        username,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== STATS ENDPOINTS ====================

// Get user statistics
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const { data: assessments, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('user_id', req.user.id)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    if (!assessments || assessments.length === 0) {
      return res.json({
        totalAssessments: 0,
        averageStress: 0,
        bestAccuracy: 0,
        streak: 0,
        recentTrend: 'stable'
      });
    }

    const totalAssessments = assessments.length;
    const averageStress = Math.round(assessments.reduce((sum, a) => sum + a.stress_level, 0) / totalAssessments);
    const bestAccuracy = Math.max(...assessments.map(a => a.accuracy || 0));

    // Calculate streak (consecutive days)
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sortedByDate = [...assessments].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    let currentDate = today;
    
    for (const assessment of sortedByDate) {
      const assessmentDate = new Date(assessment.timestamp);
      assessmentDate.setHours(0, 0, 0, 0);
      
      const diffDays = Math.floor((currentDate - assessmentDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) {
        streak++;
        currentDate = assessmentDate;
      } else {
        break;
      }
    }

    // Calculate trend (last 5 vs previous 5)
    let recentTrend = 'stable';
    if (assessments.length >= 5) {
      const recent5 = assessments.slice(0, 5);
      const previous5 = assessments.slice(5, 10);
      if (previous5.length > 0) {
        const recentAvg = recent5.reduce((s, a) => s + a.stress_level, 0) / recent5.length;
        const previousAvg = previous5.reduce((s, a) => s + a.stress_level, 0) / previous5.length;
        if (recentAvg < previousAvg - 5) recentTrend = 'improving';
        else if (recentAvg > previousAvg + 5) recentTrend = 'worsening';
      }
    }

    res.json({
      totalAssessments,
      averageStress,
      bestAccuracy,
      streak,
      recentTrend,
      lastAssessment: assessments[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ADMIN ENDPOINTS ====================

// Get all users (admin only)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const { data: adminCheck } = await supabase
      .from('admins')
      .select('id')
      .eq('id', req.user.id)
      .single();

    if (!adminCheck) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all assessments (admin only)
app.get('/api/admin/assessments', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const { data: adminCheck } = await supabase
      .from('admins')
      .select('id')
      .eq('id', req.user.id)
      .single();

    if (!adminCheck) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data, error } = await supabase
      .from('assessments')
      .select('*, profiles(username, display_name)')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get platform statistics (admin only)
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const { data: adminCheck } = await supabase
      .from('admins')
      .select('id')
      .eq('id', req.user.id)
      .single();

    if (!adminCheck) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data: assessments } = await supabase
      .from('assessments')
      .select('stress_level, timestamp');

    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const totalAssessments = assessments?.length || 0;
    const averageStress = totalAssessments > 0 
      ? Math.round(assessments.reduce((sum, a) => sum + a.stress_level, 0) / totalAssessments)
      : 0;

    // Assessments today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const assessmentsToday = assessments?.filter(a => new Date(a.timestamp) >= today).length || 0;

    res.json({
      totalUsers: userCount || 0,
      totalAssessments,
      averageStress,
      assessmentsToday,
      activeConnections: clients.size
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

httpServer.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
  console.log(`WebSocket at ws://localhost:${PORT}/ws`);
  console.log(`Database: Supabase connected`);
});
