const SettingsService = require('../services/SettingsService');

/**
 * Middleware admin — injecte res.locals.pageSize à chaque requête.
 * Priorité : session → DB → défaut 10.
 * Cela garantit que le page size est toujours disponible dans les controllers
 * et les vues sans dépendre du cache module-level de SettingsService.
 */
async function injectPageSize(req, res, next) {
  try {
    // La session stocke la préférence de l'admin courant
    if (req.session.pageSize) {
      res.locals.pageSize = req.session.pageSize;
    } else {
      const ps = await SettingsService.getPageSize();
      res.locals.pageSize = ps;
      req.session.pageSize = ps; // met en cache dans la session
    }
  } catch {
    res.locals.pageSize = 10;
  }
  next();
}

module.exports = injectPageSize;
