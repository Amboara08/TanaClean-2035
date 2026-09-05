const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_PATH = path.join(__dirname, '../../database/tanaclean.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Création des tables (SQLite — dev) ──────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS districts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    priority   INTEGER NOT NULL DEFAULT 1,
    created_by INTEGER,
    created_at TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL CHECK(role IN ('admin','worker','citizen')),
    district_id INTEGER REFERENCES districts(id) ON DELETE SET NULL,
    created_by  INTEGER,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trucks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    plate      TEXT    NOT NULL UNIQUE,
    capacity_t REAL    NOT NULL,
    fill_level REAL    NOT NULL DEFAULT 0.0 CHECK(fill_level BETWEEN 0 AND 1),
    status     TEXT    NOT NULL DEFAULT 'available'
                       CHECK(status IN ('available','in_use','maintenance')),
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tours (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id    INTEGER NOT NULL REFERENCES users(id),
    truck_id     INTEGER NOT NULL REFERENCES trucks(id),
    district_id  INTEGER NOT NULL REFERENCES districts(id),
    scheduled_at TEXT    NOT NULL,
    status       TEXT    NOT NULL DEFAULT 'planned'
                         CHECK(status IN ('planned','active','done','cancelled')),
    note         TEXT,
    created_by   INTEGER NOT NULL REFERENCES users(id),
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS complaints (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    citizen_id  INTEGER NOT NULL REFERENCES users(id),
    district_id INTEGER NOT NULL REFERENCES districts(id),
    content     TEXT    NOT NULL,
    is_urgent   INTEGER NOT NULL DEFAULT 0,
    status      TEXT    NOT NULL DEFAULT 'open'
                        CHECK(status IN ('open','processing','closed')),
    created_by  INTEGER NOT NULL REFERENCES users(id),
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    citizen_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message    TEXT    NOT NULL,
    is_read    INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS historique (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT    NOT NULL,
    record_id  INTEGER NOT NULL,
    action     TEXT    NOT NULL CHECK(action IN ('create','update','delete')),
    old_value  TEXT,
    new_value  TEXT,
    changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_tours_scheduled   ON tours(scheduled_at);
  CREATE INDEX IF NOT EXISTS idx_tours_status      ON tours(status);
  CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
  CREATE INDEX IF NOT EXISTS idx_notif_citizen     ON notifications(citizen_id, is_read);
  CREATE INDEX IF NOT EXISTS idx_hist_table        ON historique(table_name, record_id);
  CREATE INDEX IF NOT EXISTS idx_hist_user         ON historique(changed_by);
`);

// ── Seed (si la base est vide) ───────────────────────────────────────────────

const count = db.prepare('SELECT COUNT(*) AS n FROM users').get();

if (count.n === 0) {
  const bcrypt = require('bcrypt');

  const hashAdmin   = bcrypt.hashSync('admin123',   10);
  const hashWorker  = bcrypt.hashSync('worker123',  10);
  const hashCitizen = bcrypt.hashSync('citizen123', 10);

  const seedDistricts = db.prepare(
    'INSERT INTO districts (id, name, priority) VALUES (?, ?, ?)'
  );
  const districts = [
    [1,'Analakely',3],[2,'Antanimena',2],[3,'Tsaralalana',2],[4,'Antsahavola',2],
    [5,'Ambatonakanga',1],[6,'Faravohitra',2],[7,'Ambohijatovo',3],[8,'Ankadifotsy',1],
    [9,'Ambanidia',2],[10,'Isotry',3],[11,'Andohatapenaka',3],[12,'Ampefiloha',2],
    [13,'Mahamasina',2],[14,'Andravoahangy',3],[15,'Anosibe',3],[16,'Soarano',2],
    [17,'Ambohipo',2],[18,'Ankadindramamy',1],[19,'Antaninandro',1],
    [20,'Anosizato',2],[21,'Andoharanofotsy',2],[22,'Manjakaray',1]
  ];
  const seedAll = db.transaction(() => {
    for (const d of districts) seedDistricts.run(...d);
  });
  seedAll();

  const seedUser = db.prepare(
    'INSERT INTO users (id, name, email, password, role, district_id, created_by) VALUES (?,?,?,?,?,?,?)'
  );
  db.transaction(() => {
    seedUser.run(1, 'Rakoto Fidelis',      'admin@tanaclean.mg',   hashAdmin,   'admin',   null, null);
    seedUser.run(2, 'Rasoa Miangaly',      'admin2@tanaclean.mg',  hashAdmin,   'admin',   null, 1);
    seedUser.run(3, 'Jean Parfait Randria','jean@tanaclean.mg',    hashWorker,  'worker',  1,    1);
    seedUser.run(4, 'Patrick Raharison',   'patrick@tanaclean.mg', hashWorker,  'worker',  6,    1);
    seedUser.run(5, 'Sylvain Andriantsoa', 'sylvain@tanaclean.mg', hashWorker,  'worker',  10,   1);
    seedUser.run(6, 'Voahary Rabenaivo',   'voahary@mail.mg',      hashCitizen, 'citizen', 1,    null);
    seedUser.run(7, 'Niry Andriamahefa',   'niry@mail.mg',         hashCitizen, 'citizen', 7,    null);
    seedUser.run(8, 'Faniry Randrianasolo','faniry@mail.mg',        hashCitizen, 'citizen', 11,   null);
  })();

  const seedTruck = db.prepare(
    'INSERT INTO trucks (id, plate, capacity_t, fill_level, status, created_by) VALUES (?,?,?,?,?,?)'
  );
  db.transaction(() => {
    seedTruck.run(1,'TAN-001-A', 8.0,  0.0,   'available',   1);
    seedTruck.run(2,'TAN-002-A', 8.0,  0.65,  'in_use',      1);
    seedTruck.run(3,'TAN-003-B',10.0,  0.0,   'available',   1);
    seedTruck.run(4,'TAN-004-B',10.0,  0.3,   'in_use',      2);
    seedTruck.run(5,'TAN-005-C', 6.5,  0.0,   'maintenance', 2);
  })();

  const now  = new Date().toISOString().slice(0,19).replace('T',' ');
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0,19).replace('T',' ');
  const seedTour = db.prepare(
    'INSERT INTO tours (id,worker_id,truck_id,district_id,scheduled_at,status,note,created_by) VALUES (?,?,?,?,?,?,?,?)'
  );
  db.transaction(() => {
    seedTour.run(1,3,2, 1,now, 'active',   'Collecte matinale centre-ville',1);
    seedTour.run(2,4,3, 6,now, 'planned',  null,                            1);
    seedTour.run(3,5,4,10,now, 'planned',  'Quartier priorité haute',       1);
    seedTour.run(4,3,1, 4,yest,'done',     null,                            1);
    seedTour.run(5,4,3, 7,yest,'done',     null,                            2);
    seedTour.run(6,5,5,11,yest,'cancelled','Camion en panne',               1);
  })();

  const seedComp = db.prepare(
    'INSERT INTO complaints (id,citizen_id,district_id,content,is_urgent,status,created_by) VALUES (?,?,?,?,?,?,?)'
  );
  db.transaction(() => {
    seedComp.run(1,6, 1,'Le camion ne passe plus depuis 3 jours dans la rue Rainitovo.',0,'open',      6);
    seedComp.run(2,7, 7,'L\'éboueur est passé mais n\'a pas ramassé les déchets devant le n°45.',0,'processing',7);
    seedComp.run(3,8,11,'Dépôt sauvage au carrefour Andohatapenaka, intervention urgente requise.',1,'open',8);
    seedComp.run(4,6, 4,'Aucun passage depuis une semaine dans notre quartier.',0,'closed',6);
  })();

  const seedNotif = db.prepare(
    'INSERT INTO notifications (citizen_id, message, is_read, created_by) VALUES (?,?,?,?)'
  );
  db.transaction(() => {
    seedNotif.run(6,'Le camion arrive dans votre quartier (Analakely) dans 30 minutes.',0,1);
    seedNotif.run(7,'Passage prévu à Faravohitra cet après-midi. Préparez vos déchets.',0,1);
    seedNotif.run(8,'Votre réclamation #3 est en cours de traitement par notre équipe.',1,2);
    seedNotif.run(6,'Votre réclamation #4 a été clôturée. Merci de votre signalement.',1,2);
  })();

  console.log('[db] Base initialisée avec les données de test.');
}

module.exports = db;
