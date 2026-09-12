require('dotenv').config();
const express        = require('express');
const session        = require('express-session');
const MySQLStore     = require('express-mysql-session')(session);
const path           = require('path');
const ejsLayouts     = require('express-ejs-layouts');

const AuthController = require('./controllers/AuthController');
const adminRoutes    = require('./routes/admin');
const workerRoutes   = require('./routes/worker');
const citizenRoutes  = require('./routes/citizen');
const notifRoutes    = require('./routes/notif');
const wrap           = require('./utils/asyncHandler');
const runMigrations  = require('./config/migrate');

const app         = express();
const PORT        = parseInt(process.env.PORT) || 3131;
const IS_DESKTOP  = process.env.ELECTRON_APP === '1'; 
const BIND_HOST   = IS_DESKTOP ? '127.0.0.1' : '0.0.0.0'; 

// ── View engine ──────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(ejsLayouts);
app.set('layout', 'layout/base');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// ── Middlewares ───────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const sessionStore = new MySQLStore({
  host:                process.env.DB_HOST     || 'localhost',
  port:                parseInt(process.env.DB_PORT) || 3306,
  user:                process.env.DB_USER     || 'root',
  password:            process.env.DB_PASSWORD || '',
  database:            process.env.DB_NAME     || 'tanaclean',
  createDatabaseTable: true,
  expiration:          8 * 60 * 60 * 1000,
});

app.use(session({
  store:             sessionStore,
  secret:            process.env.SESSION_SECRET || 'tanaclean-secret-2035',
  resave:            false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 },
}));

// ── Locals globaux ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.locals.user       = req.session.user || null;
  res.locals.isDesktop  = IS_DESKTOP;
  next();
});

// ── Blocage des routes admin sur le serveur web (port 3131) ──────────────────
// Si quelqu'un accède à /admin/* depuis le serveur web, on lui dit d'utiliser l'app desktop.
if (!IS_DESKTOP) {
  app.use('/admin', (req, res) => {
    res.render('auth/use-desktop', { layout: false });
  });
}

// ── Routes publiques ──────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect(`/${req.session.user.role}`);
  res.redirect('/login');
});

app.get('/login',      AuthController.showLogin);
app.post('/login',     wrap(AuthController.handleLogin));
app.post('/logout',    AuthController.handleLogout);
app.get('/register',   wrap(AuthController.showRegister));
app.post('/register',  wrap(AuthController.handleRegister));

// ── Routes protégées ──────────────────────────────────────────────────────────
app.use('/admin',   adminRoutes);
app.use('/worker',  workerRoutes);
app.use('/citizen', citizenRoutes);
app.use('/notif',   notifRoutes);

// ── Gestion des erreurs ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('errors/404', { layout: false });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('errors/500', { message: err.message, layout: false });
});

// ── Écoute ────────────────────────────────────────────────────────────────────
// Desktop : bind sur 127.0.0.1 (inaccessible depuis le réseau local)
// Web     : bind sur 0.0.0.0 (accessible depuis le réseau local)
app.listen(PORT, BIND_HOST, async () => {
  console.log(`[server] TanaClean 2035 → http://localhost:${PORT}  (${IS_DESKTOP ? 'desktop 127.0.0.1 only' : 'web 0.0.0.0'})`);
  await runMigrations();
});

module.exports = app;
