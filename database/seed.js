/**
 * TanaClean 2035 — Script d'initialisation de la base de données
 *
 * Usage :
 *   node database/seed.js           → initialise seulement si la base est vide
 *   node database/seed.js --force   → remet à zéro et réinsère toutes les données
 *
 * Variables d'environnement (.env) :
 *   DB_HOST · DB_PORT · DB_USER · DB_PASSWORD · DB_NAME
 *
 * Mots de passe de démonstration :
 *   admin   → admin123
 *   worker  → worker123
 *   citizen → citizen123
 */

require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcrypt');

const FORCE = process.argv.includes('--force');

const DB_NAME = process.env.DB_NAME || 'tana_clean';
const DB_CONFIG_NO_DB = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
};

// ── Données de référence ─────────────────────────────────────────────────────

const DISTRICTS = [
  // id · nom · priorité · lat (WGS84) · lng (WGS84)
  [ 1, 'Analakely',          3, -18.9083,  47.5263],
  [ 2, 'Antanimena',         2, -18.8976,  47.5208],
  [ 3, 'Tsaralalana',        2, -18.9065,  47.5203],
  [ 4, 'Antsahavola',        2, -18.9093,  47.5223],
  [ 5, 'Ambatonakanga',      1, -18.9129,  47.5271],
  [ 6, 'Faravohitra',        2, -18.9097,  47.5298],
  [ 7, 'Ambohijatovo',       3, -18.9115,  47.5287],
  [ 8, 'Ankadifotsy',        1, -18.8979,  47.5258],
  [ 9, 'Ambanidia',          2, -18.9188,  47.5392],
  [10, 'Isotry',             3, -18.9100,  47.5161],
  [11, 'Andohatapenaka',     3, -18.8948,  47.5027],
  [12, 'Ampefiloha',         2, -18.9132,  47.5171],
  [13, 'Mahamasina',         2, -18.9184,  47.5248],
  [14, 'Andravoahangy',      3, -18.8984,  47.5311],
  [15, 'Anosibe',            3, -18.9249,  47.5144],
  [16, 'Soarano',            2, -18.9032,  47.5210],
  [17, 'Ambohipo',           2, -18.9050,  47.5380],
  [18, 'Ankadindramamy',     1, -18.8920,  47.5591],
  [19, 'Antaninandro',       1, -18.8952,  47.5450],
  [20, 'Anosizato',          2, -18.9379,  47.4999],
  [21, 'Andoharanofotsy',    2, -18.9790,  47.5333],
  [22, 'Manjakaray',         1, -18.8905,  47.5334],
];

// Arêtes non-orientées (from · to · distance_km)
// Distances calculées depuis les coordonnées WGS84 :
//   d = sqrt((Δlat × 111)² + (Δlng × 105)²)  [1° lng ≈ 105 km à -18.9°]
// Insérées dans les deux sens par le script
const EDGES = [
  // ── Analakely (1) — hub central ─────────────────────────────────
  [ 1,  2, 1.3],  // Analakely ↔ Antanimena
  [ 1,  3, 0.7],  // Analakely ↔ Tsaralalana
  [ 1,  4, 0.4],  // Analakely ↔ Antsahavola
  [ 1,  5, 0.5],  // Analakely ↔ Ambatonakanga
  [ 1,  6, 0.4],  // Analakely ↔ Faravohitra
  [ 1,  7, 0.4],  // Analakely ↔ Ambohijatovo
  [ 1,  8, 1.2],  // Analakely ↔ Ankadifotsy
  [ 1, 10, 1.1],  // Analakely ↔ Isotry
  [ 1, 12, 1.1],  // Analakely ↔ Ampefiloha
  [ 1, 13, 1.1],  // Analakely ↔ Mahamasina
  [ 1, 16, 0.8],  // Analakely ↔ Soarano
  // ── Antanimena (2) ──────────────────────────────────────────────
  [ 2,  3, 1.0],  // Antanimena ↔ Tsaralalana
  [ 2,  4, 1.3],  // Antanimena ↔ Antsahavola
  [ 2,  5, 1.8],  // Antanimena ↔ Ambatonakanga
  [ 2,  6, 1.6],  // Antanimena ↔ Faravohitra
  [ 2,  7, 1.8],  // Antanimena ↔ Ambohijatovo
  [ 2,  8, 0.5],  // Antanimena ↔ Ankadifotsy
  [ 2, 14, 1.1],  // Antanimena ↔ Andravoahangy
  [ 2, 16, 0.6],  // Antanimena ↔ Soarano
  [ 2, 22, 1.5],  // Antanimena ↔ Manjakaray
  // ── Tsaralalana (3) ─────────────────────────────────────────────
  [ 3,  4, 0.4],  // Tsaralalana ↔ Antsahavola
  [ 3,  8, 0.9],  // Tsaralalana ↔ Ankadifotsy
  [ 3, 10, 0.6],  // Tsaralalana ↔ Isotry
  [ 3, 11, 2.3],  // Tsaralalana ↔ Andohatapenaka
  [ 3, 12, 0.8],  // Tsaralalana ↔ Ampefiloha
  [ 3, 16, 0.5],  // Tsaralalana ↔ Soarano
  // ── Antsahavola (4) ─────────────────────────────────────────────
  [ 4,  5, 0.6],  // Antsahavola ↔ Ambatonakanga
  [ 4,  6, 0.8],  // Antsahavola ↔ Faravohitra
  [ 4,  7, 0.7],  // Antsahavola ↔ Ambohijatovo
  [ 4,  9, 2.1],  // Antsahavola ↔ Ambanidia
  [ 4, 10, 0.7],  // Antsahavola ↔ Isotry
  [ 4, 12, 1.1],  // Antsahavola ↔ Ampefiloha
  [ 4, 13, 1.0],  // Antsahavola ↔ Mahamasina
  [ 4, 16, 0.7],  // Antsahavola ↔ Soarano
  // ── Ambatonakanga (5) ───────────────────────────────────────────
  [ 5,  6, 0.5],  // Ambatonakanga ↔ Faravohitra
  [ 5,  7, 0.2],  // Ambatonakanga ↔ Ambohijatovo
  [ 5, 12, 1.1],  // Ambatonakanga ↔ Ampefiloha
  [ 5, 13, 0.7],  // Ambatonakanga ↔ Mahamasina
  [ 5, 22, 2.6],  // Ambatonakanga ↔ Manjakaray
  // ── Faravohitra (6) ─────────────────────────────────────────────
  [ 6,  7, 0.2],  // Faravohitra ↔ Ambohijatovo
  [ 6,  9, 1.4],  // Faravohitra ↔ Ambanidia
  [ 6, 17, 1.0],  // Faravohitra ↔ Ambohipo
  [ 6, 22, 2.2],  // Faravohitra ↔ Manjakaray
  // ── Ambohijatovo (7) ────────────────────────────────────────────
  [ 7,  9, 0.8],  // Ambohijatovo ↔ Ambanidia
  [ 7, 13, 1.1],  // Ambohijatovo ↔ Mahamasina
  // ── Ankadifotsy (8) ─────────────────────────────────────────────
  [ 8, 14, 0.6],  // Ankadifotsy ↔ Andravoahangy
  [ 8, 17, 1.5],  // Ankadifotsy ↔ Ambohipo
  [ 8, 18, 2.0],  // Ankadifotsy ↔ Ankadindramamy
  [ 8, 22, 1.1],  // Ankadifotsy ↔ Manjakaray
  // ── Ambanidia (9) ───────────────────────────────────────────────
  [ 9, 13, 1.5],  // Ambanidia ↔ Mahamasina
  [ 9, 17, 1.5],  // Ambanidia ↔ Ambohipo
  // ── Isotry (10) ─────────────────────────────────────────────────
  [10, 11, 1.5],  // Isotry ↔ Andohatapenaka
  [10, 12, 0.4],  // Isotry ↔ Ampefiloha
  [10, 16, 0.9],  // Isotry ↔ Soarano
  [10, 20, 3.5],  // Isotry ↔ Anosizato
  // ── Andohatapenaka (11) ─────────────────────────────────────────
  [11, 12, 2.5],  // Andohatapenaka ↔ Ampefiloha
  [11, 16, 2.1],  // Andohatapenaka ↔ Soarano
  [11, 20, 4.8],  // Andohatapenaka ↔ Anosizato
  // ── Ampefiloha (12) ─────────────────────────────────────────────
  [12, 13, 0.8],  // Ampefiloha ↔ Mahamasina
  [12, 15, 1.3],  // Ampefiloha ↔ Anosibe
  [12, 16, 1.2],  // Ampefiloha ↔ Soarano
  [12, 20, 2.8],  // Ampefiloha ↔ Anosizato
  // ── Mahamasina (13) ─────────────────────────────────────────────
  [13, 15, 1.3],  // Mahamasina ↔ Anosibe
  // ── Andravoahangy (14) ──────────────────────────────────────────
  [14, 15, 1.8],  // Andravoahangy ↔ Anosibe
  [14, 17, 1.0],  // Andravoahangy ↔ Ambohipo
  [14, 18, 2.2],  // Andravoahangy ↔ Ankadindramamy
  [14, 19, 1.5],  // Andravoahangy ↔ Antaninandro
  [14, 22, 0.9],  // Andravoahangy ↔ Manjakaray
  // ── Anosibe (15) ────────────────────────────────────────────────
  [15, 20, 2.1],  // Anosibe ↔ Anosizato
  // ── Soarano (16) connecté via 1,2,3,4,10,11,12 ─────────────────
  // ── Ambohipo (17) ───────────────────────────────────────────────
  [17, 19, 2.0],  // Ambohipo ↔ Antaninandro
  [17, 22, 1.5],  // Ambohipo ↔ Manjakaray
  // ── Ankadindramamy (18) ─────────────────────────────────────────
  [18, 19, 1.0],  // Ankadindramamy ↔ Antaninandro
  // ── Antaninandro (19) ───────────────────────────────────────────
  [19, 22, 1.3],  // Antaninandro ↔ Manjakaray
  // ── Anosizato (20) ──────────────────────────────────────────────
  [20, 21, 5.8],  // Anosizato ↔ Andoharanofotsy (liaison route nationale)
  // ── Andoharanofotsy (21) connecté via 20 (district périphérique) ─
  // ── Manjakaray (22) connecté via 2,5,6,8,14,17,19 ───────────────
];

// ── Création des tables ───────────────────────────────────────────────────────

async function createTables(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS districts (
      id         INT           NOT NULL AUTO_INCREMENT,
      name       VARCHAR(100)  NOT NULL,
      priority   TINYINT       NOT NULL DEFAULT 1,
      lat        DECIMAL(9,6)  NULL,
      lng        DECIMAL(9,6)  NULL,
      created_by INT           NULL,
      created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS district_edges (
      from_id  INT          NOT NULL,
      to_id    INT          NOT NULL,
      distance DECIMAL(6,2) NOT NULL,
      PRIMARY KEY (from_id, to_id),
      CONSTRAINT fk_edge_from FOREIGN KEY (from_id) REFERENCES districts(id) ON DELETE CASCADE,
      CONSTRAINT fk_edge_to   FOREIGN KEY (to_id)   REFERENCES districts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          INT          NOT NULL AUTO_INCREMENT,
      name        VARCHAR(150) NOT NULL,
      email       VARCHAR(255) NOT NULL,
      password    VARCHAR(255) NOT NULL,
      role        ENUM('admin','worker','citizen') NOT NULL,
      district_id INT          NULL,
      created_by  INT          NULL,
      created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_email (email),
      CONSTRAINT fk_user_district FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS trucks (
      id         INT           NOT NULL AUTO_INCREMENT,
      plate      VARCHAR(20)   NOT NULL,
      capacity_t DECIMAL(5,2)  NOT NULL,
      fill_level DECIMAL(4,3)  NOT NULL DEFAULT 0.000,
      status     ENUM('available','in_use','maintenance') NOT NULL DEFAULT 'available',
      created_by INT           NULL,
      created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_trucks_plate (plate)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS tours (
      id           INT      NOT NULL AUTO_INCREMENT,
      worker_id    INT      NOT NULL,
      truck_id     INT      NOT NULL,
      district_id  INT      NOT NULL,
      scheduled_at DATETIME NOT NULL,
      status       ENUM('planned','active','done','cancelled') NOT NULL DEFAULT 'planned',
      note         TEXT     NULL,
      created_by   INT      NOT NULL,
      created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_tours_scheduled (scheduled_at),
      INDEX idx_tours_status    (status),
      CONSTRAINT fk_tour_worker   FOREIGN KEY (worker_id)   REFERENCES users(id),
      CONSTRAINT fk_tour_truck    FOREIGN KEY (truck_id)    REFERENCES trucks(id),
      CONSTRAINT fk_tour_district FOREIGN KEY (district_id) REFERENCES districts(id),
      CONSTRAINT fk_tour_creator  FOREIGN KEY (created_by)  REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS complaints (
      id          INT        NOT NULL AUTO_INCREMENT,
      citizen_id  INT        NOT NULL,
      district_id INT        NOT NULL,
      content     TEXT       NOT NULL,
      is_urgent   TINYINT(1) NOT NULL DEFAULT 0,
      status      ENUM('open','processing','closed') NOT NULL DEFAULT 'open',
      created_by  INT        NOT NULL,
      created_at  DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_complaints_status (status),
      CONSTRAINT fk_complaint_citizen  FOREIGN KEY (citizen_id)  REFERENCES users(id),
      CONSTRAINT fk_complaint_district FOREIGN KEY (district_id) REFERENCES districts(id),
      CONSTRAINT fk_complaint_creator  FOREIGN KEY (created_by)  REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS complaint_responses (
      id           INT      NOT NULL AUTO_INCREMENT,
      complaint_id INT      NOT NULL,
      author_id    INT      NOT NULL,
      content      TEXT     NOT NULL,
      created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_cr_complaint (complaint_id),
      CONSTRAINT fk_cr_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
      CONSTRAINT fk_cr_author    FOREIGN KEY (author_id)    REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id         INT          NOT NULL AUTO_INCREMENT,
      citizen_id INT          NOT NULL,
      message    TEXT         NOT NULL,
      link       VARCHAR(255) NULL,
      is_read    TINYINT(1)   NOT NULL DEFAULT 0,
      created_by INT          NULL,
      created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_notif_citizen (citizen_id, is_read),
      CONSTRAINT fk_notif_citizen FOREIGN KEY (citizen_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_notif_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  /* Migration : ajoute la colonne link si la table existait avant */
  await conn.query(
    'ALTER TABLE notifications ADD COLUMN link VARCHAR(255) NULL AFTER message'
  ).catch(() => {});

  await conn.query(`
    CREATE TABLE IF NOT EXISTS historique (
      id         BIGINT      NOT NULL AUTO_INCREMENT,
      table_name VARCHAR(50) NOT NULL,
      record_id  INT         NOT NULL,
      action     ENUM('create','update','delete') NOT NULL,
      old_value  JSON        NULL,
      new_value  JSON        NULL,
      changed_by INT         NULL,
      changed_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_hist_table   (table_name, record_id),
      INDEX idx_hist_changed (changed_at),
      INDEX idx_hist_user    (changed_by),
      CONSTRAINT fk_historique_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS settings (
      \`key\`  VARCHAR(100) NOT NULL,
      value    TEXT         NOT NULL,
      PRIMARY KEY (\`key\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('[seed] ✓ Tables vérifiées / créées');
}

// ── Remise à zéro (--force) ──────────────────────────────────────────────────

async function truncateAll(conn) {
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  const tables = [
    'historique', 'complaint_responses', 'notifications', 'complaints',
    'tours', 'trucks', 'users', 'district_edges', 'districts', 'settings',
  ];
  for (const t of tables) {
    await conn.query(`TRUNCATE TABLE \`${t}\``);
  }
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('[seed] ✓ Tables vidées (--force)');
}

// ── Insertion des données ────────────────────────────────────────────────────

async function seed(conn) {
  // ── Districts ──
  for (const [id, name, priority, lat, lng] of DISTRICTS) {
    await conn.query(
      'INSERT INTO districts (id, name, priority, lat, lng) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), priority=VALUES(priority), lat=VALUES(lat), lng=VALUES(lng)',
      [id, name, priority, lat ?? null, lng ?? null]
    );
  }
  console.log(`[seed] ✓ ${DISTRICTS.length} districts`);

  // ── Arêtes (bidirectionnelles) ──
  for (const [from, to, dist] of EDGES) {
    await conn.query(
      'INSERT INTO district_edges (from_id,to_id,distance) VALUES (?,?,?) ON DUPLICATE KEY UPDATE distance=VALUES(distance)',
      [from, to, dist]
    );
    await conn.query(
      'INSERT INTO district_edges (from_id,to_id,distance) VALUES (?,?,?) ON DUPLICATE KEY UPDATE distance=VALUES(distance)',
      [to, from, dist]
    );
  }
  console.log(`[seed] ✓ ${EDGES.length * 2} arêtes (${EDGES.length} liaisons bidirectionnelles)`);

  // ── Mots de passe hashés ──
  const [hAdmin, hWorker, hCitizen] = await Promise.all([
    bcrypt.hash('admin123',   10),
    bcrypt.hash('worker123',  10),
    bcrypt.hash('citizen123', 10),
  ]);

  // ── Utilisateurs ──
  const users = [
    [1, 'Rakoto Fidelis',       'admin@tanaclean.mg',   hAdmin,   'admin',   null, null],
    [2, 'Rasoa Miangaly',        'admin2@tanaclean.mg',  hAdmin,   'admin',   null, 1   ],
    [3, 'Jean Parfait Randria',  'jean@tanaclean.mg',    hWorker,  'worker',  1,    1   ],
    [4, 'Patrick Raharison',     'patrick@tanaclean.mg', hWorker,  'worker',  6,    1   ],
    [5, 'Sylvain Andriantsoa',   'sylvain@tanaclean.mg', hWorker,  'worker',  10,   1   ],
    [6, 'Voahary Rabenaivo',     'voahary@mail.mg',      hCitizen, 'citizen', 1,    null],
    [7, 'Niry Andriamahefa',     'niry@mail.mg',         hCitizen, 'citizen', 7,    null],
    [8, 'Faniry Randrianasolo',  'faniry@mail.mg',       hCitizen, 'citizen', 11,   null],
  ];
  for (const [id, name, email, password, role, district_id, created_by] of users) {
    await conn.query(
      `INSERT INTO users (id,name,email,password,role,district_id,created_by)
       VALUES (?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role)`,
      [id, name, email, password, role, district_id, created_by]
    );
  }
  console.log(`[seed] ✓ ${users.length} utilisateurs`);

  // ── Camions ──
  const trucks = [
    [1, 'TAN-001-A',  8.00, 0.000, 'available',   1],
    [2, 'TAN-002-A',  8.00, 0.650, 'in_use',      1],
    [3, 'TAN-003-B', 10.00, 0.000, 'available',   1],
    [4, 'TAN-004-B', 10.00, 0.300, 'in_use',      2],
    [5, 'TAN-005-C',  6.50, 0.000, 'maintenance', 2],
  ];
  for (const [id, plate, capacity_t, fill_level, status, created_by] of trucks) {
    await conn.query(
      `INSERT INTO trucks (id,plate,capacity_t,fill_level,status,created_by)
       VALUES (?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE plate=VALUES(plate), status=VALUES(status)`,
      [id, plate, capacity_t, fill_level, status, created_by]
    );
  }
  console.log(`[seed] ✓ ${trucks.length} camions`);

  // ── Tournées (dates relatives à l'instant du seed) ──
  const now   = new Date();
  const fmt   = d => d.toISOString().slice(0, 19).replace('T', ' ');
  const add   = h => fmt(new Date(now.getTime() + h * 3600_000));
  const sub   = h => fmt(new Date(now.getTime() - h * 3600_000));

  const tours = [
    [1, 3, 2,  1, fmt(now), 'active',    'Collecte matinale centre-ville', 1],
    [2, 4, 3,  6, fmt(now), 'planned',   null,                             1],
    [3, 5, 4, 10, add(2),   'planned',   'Quartier priorité haute',        1],
    [4, 3, 1,  4, sub(24),  'done',      null,                             1],
    [5, 4, 3,  7, sub(24),  'done',      null,                             2],
    [6, 5, 5, 11, sub(48),  'cancelled', 'Camion en panne',                1],
  ];
  for (const [id, worker_id, truck_id, district_id, scheduled_at, status, note, created_by] of tours) {
    await conn.query(
      `INSERT INTO tours (id,worker_id,truck_id,district_id,scheduled_at,status,note,created_by)
       VALUES (?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE status=VALUES(status)`,
      [id, worker_id, truck_id, district_id, scheduled_at, status, note, created_by]
    );
  }
  console.log(`[seed] ✓ ${tours.length} tournées`);

  // ── Réclamations ──
  const complaints = [
    [1, 6,  1, 'Le camion ne passe plus depuis 3 jours dans la rue Rainitovo.',            0, 'open',       6],
    [2, 7,  7, "L'éboueur est passé mais n'a pas ramassé les déchets devant le n°45.",     0, 'processing', 7],
    [3, 8, 11, 'Dépôt sauvage au carrefour Andohatapenaka, intervention urgente requise.', 1, 'open',       8],
    [4, 6,  4, 'Aucun passage depuis une semaine dans notre quartier.',                    0, 'closed',     6],
  ];
  for (const [id, citizen_id, district_id, content, is_urgent, status, created_by] of complaints) {
    await conn.query(
      `INSERT INTO complaints (id,citizen_id,district_id,content,is_urgent,status,created_by)
       VALUES (?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE status=VALUES(status)`,
      [id, citizen_id, district_id, content, is_urgent, status, created_by]
    );
  }
  console.log(`[seed] ✓ ${complaints.length} réclamations`);

  // ── Notifications ──
  // [citizen_id, message, link, is_read, created_by]
  const notifs = [
    [6, 'Le camion arrive dans votre quartier (Analakely) dans 30 minutes.', '/citizen',            0, 1],
    [7, 'Passage prévu à Faravohitra cet après-midi. Préparez vos déchets.', '/citizen',            0, 1],
    [8, 'Votre réclamation #3 est en cours de traitement par notre équipe.', '/citizen/complaints', 1, 2],
    [6, 'Votre réclamation #4 a été clôturée. Merci de votre signalement.',  '/citizen/complaints', 1, 2],
  ];
  for (const [citizen_id, message, link, is_read, created_by] of notifs) {
    await conn.query(
      'INSERT INTO notifications (citizen_id,message,link,is_read,created_by) VALUES (?,?,?,?,?)',
      [citizen_id, message, link, is_read, created_by]
    );
  }
  console.log(`[seed] ✓ ${notifs.length} notifications`);

  // ── Paramètres par défaut ──
  await conn.query(
    "INSERT INTO settings (`key`, value) VALUES ('page_size', '10') ON DUPLICATE KEY UPDATE value=value"
  );
  console.log('[seed] ✓ Paramètres par défaut');
}

// ── Point d'entrée ────────────────────────────────────────────────────────────

(async () => {
  let conn;
  try {
    // Connexion sans DB pour pouvoir la créer si elle n'existe pas
    conn = await mysql.createConnection(DB_CONFIG_NO_DB);

    // Création de la base si absente
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.query(`USE \`${DB_NAME}\``);
    console.log(`[seed] Base de données : ${DB_NAME}`);

    await createTables(conn);

    // Vérification si la base est déjà initialisée
    if (!FORCE) {
      const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM users');
      if (n > 0) {
        console.log(`[seed] Base déjà initialisée (${n} utilisateurs). Utilisez --force pour réinitialiser.`);
        return;
      }
    } else {
      await truncateAll(conn);
    }

    await seed(conn);
    console.log('\n[seed]  Initialisation terminée.');
    console.log('  admin@tanaclean.mg  / admin123');
    console.log('  jean@tanaclean.mg   / worker123');
    console.log('  voahary@mail.mg     / citizen123');

  } catch (err) {
    console.error('[seed] ❌ Erreur :', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
