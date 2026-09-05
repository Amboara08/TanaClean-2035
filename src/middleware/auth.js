function requireAuth(role) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/login');
    }
    if (role && req.session.user.role !== role) {
      return res.status(403).render('errors/403', { layout: false });
    }
    next();
  };
}

/**
 * Bloque l'accès aux routes worker/citizen en mode desktop Electron.
 * L'app desktop est réservée aux administrateurs.
 */
function requireWeb(req, res, next) {
  if (process.env.ELECTRON_APP === '1') {
    return res.render('auth/desktop-only', { layout: false });
  }
  next();
}

module.exports = { requireAuth, requireWeb };
