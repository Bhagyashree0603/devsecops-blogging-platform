const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('./db');
const auth = require('./auth');
const { validatePostInput } = require('./validators');
const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));
app.use(express.json({ limit: '100kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));
app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', service: 'blogging-api' }); }
  catch { res.status(503).json({ status: 'unavailable' }); }
});
app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password || password.length < 8) return res.status(400).json({ error: 'Name, valid email and password (8+ characters) are required' });
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query('INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,email', [name.trim(), email.toLowerCase().trim(), hash]);
    res.status(201).json({ user: result.rows[0] });
  } catch (e) { if (e.code === '23505') return res.status(409).json({ error: 'Email already registered' }); next(e); }
});
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [(email || '').toLowerCase().trim()]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password || '', user.password_hash))) return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) { next(e); }
});
app.get('/api/posts', async (req, res, next) => {
  try { const r = await pool.query('SELECT p.id,p.user_id,p.title,p.content,p.category,p.created_at,u.name AS author FROM posts p JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC'); res.json(r.rows); } catch(e) { next(e); }
});
app.get('/api/posts/:id', async (req, res, next) => {
  try { const r = await pool.query('SELECT p.id,p.title,p.content,p.category,p.created_at,u.name AS author FROM posts p JOIN users u ON u.id=p.user_id WHERE p.id=$1', [req.params.id]); if (!r.rowCount) return res.status(404).json({error:'Post not found'}); res.json(r.rows[0]); } catch(e) { next(e); }
});
app.post('/api/posts', auth, async (req, res, next) => {
  try { const checked = validatePostInput(req.body); if (!checked.valid) return res.status(400).json({error: checked.error}); const { title, content, category } = checked.value; const r=await pool.query('INSERT INTO posts(user_id,title,content,category) VALUES($1,$2,$3,$4) RETURNING *',[req.user.id,title,content,category]); res.status(201).json(r.rows[0]); } catch(e) { next(e); }
});
app.put('/api/posts/:id', auth, async (req, res, next) => {
  try { const { title, content, category }=req.body||{}; const r=await pool.query('UPDATE posts SET title=COALESCE($1,title),content=COALESCE($2,content),category=COALESCE($3,category),updated_at=NOW() WHERE id=$4 AND user_id=$5 RETURNING *',[title,content,category,req.params.id,req.user.id]); if(!r.rowCount) return res.status(404).json({error:'Post not found or not owned by you'}); res.json(r.rows[0]); } catch(e) { next(e); }
});
app.delete('/api/posts/:id', auth, async (req, res, next) => {
  try { const r=await pool.query('DELETE FROM posts WHERE id=$1 AND user_id=$2 RETURNING id',[req.params.id,req.user.id]); if(!r.rowCount) return res.status(404).json({error:'Post not found or not owned by you'}); res.status(204).end(); } catch(e) { next(e); }
});
app.use((err,_req,res,_next)=>{ console.error(err); res.status(500).json({error:'Internal server error'}); });
module.exports = app;
