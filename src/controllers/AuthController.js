const AuthService   = require('../services/AuthService');
const DistrictModel = require('../models/DistrictModel');

class AuthController {
  static showLogin(req, res) {
    if (req.session.user) {
      // En mode desktop, les non-admins connectés sont renvoyés vers la page de blocage
      if (process.env.ELECTRON_APP === '1' && req.session.user.role !== 'admin') {
        req.session.destroy();
        return res.render('auth/desktop-only', { layout: false });
      }
      return res.redirect(`/${req.session.user.role}`);
    }
    res.render('auth/login', {
      error: null,
      registered: req.query.registered,
      layout: false,
      isElectron: process.env.ELECTRON_APP === '1',
      desktopBlocked: false,
      blockedName: null,
      blockedRole: null,
    });
  }

  static async handleLogin(req, res) {
    const { email, password } = req.body;
    const isElectron = process.env.ELECTRON_APP === '1';
    const user = await AuthService.login(email, password);

    if (!user) {
      return res.render('auth/login', {
        error: 'Email ou mot de passe incorrect.',
        registered: null,
        layout: false,
        isElectron,
        desktopBlocked: false,
        blockedName: null,
        blockedRole: null,
      });
    }

    // Mode desktop : seuls les admins peuvent se connecter
    if (isElectron && user.role !== 'admin') {
      return res.render('auth/login', {
        error: null,
        registered: null,
        layout: false,
        isElectron,
        desktopBlocked: true,
        blockedName: user.name,
        blockedRole: user.role,
      });
    }

    // Sur le serveur web (pas Electron) : les admins sont redirigés vers la page "utiliser l'app desktop"
    if (process.env.ELECTRON_APP !== '1' && user.role === 'admin') {
      return res.render('auth/use-desktop', { layout: false });
    }

    req.session.user = user;
    res.redirect(`/${user.role}`);
  }

  static handleLogout(req, res) {
    req.session.destroy(() => res.redirect('/login'));
  }

  static async showRegister(req, res) {
    // L'inscription n'est pas disponible depuis l'app desktop
    if (process.env.ELECTRON_APP === '1') return res.redirect('/login');
    if (req.session.user) return res.redirect(`/${req.session.user.role}`);
    const districts = await DistrictModel.findAll();
    res.render('auth/register', { error: null, districts, layout: false });
  }

  static async handleRegister(req, res) {
    const { name, email, password, password_confirm, district_id } = req.body;
    const districts = await DistrictModel.findAll();

    if (!name?.trim() || !email?.trim() || !password) {
      return res.render('auth/register', { error: 'Tous les champs sont obligatoires.', districts, layout: false });
    }
    if (password.length < 6) {
      return res.render('auth/register', { error: 'Le mot de passe doit contenir au moins 6 caractères.', districts, layout: false });
    }
    if (password !== password_confirm) {
      return res.render('auth/register', { error: 'Les mots de passe ne correspondent pas.', districts, layout: false });
    }

    const result = await AuthService.register({ name: name.trim(), email: email.trim(), password, district_id });

    if (result.error) {
      return res.render('auth/register', { error: result.error, districts, layout: false });
    }

    res.redirect('/login?registered=1');
  }
}

module.exports = AuthController;
