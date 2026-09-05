-- ================================================================
--  TanaClean 2035 — Schéma de référence MySQL
--  Système d'optimisation de la collecte des déchets — Antananarivo
--  Étudiant : ANDRIAMAMONJISOA Amboara · NIE : SE20240277
--
--  USAGE :
--    Ce fichier est la référence DDL du projet.
--    Pour initialiser ou réinitialiser la base, utiliser seed.js :
--      node database/seed.js
--    Le script seed.js crée la base, les tables et insère les données.
--
--  CONNEXION (variables d'environnement dans .env) :
--    DB_HOST     localhost
--    DB_PORT     3306
--    DB_USER     root
--    DB_PASSWORD (vide par défaut)
--    DB_NAME     tana_clean
-- ================================================================

CREATE DATABASE IF NOT EXISTS tana_clean
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tana_clean;


-- ----------------------------------------------------------------
--  districts — Quartiers d'Antananarivo (nœuds du graphe)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS districts (
  id         INT           NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100)  NOT NULL,
  priority   TINYINT       NOT NULL DEFAULT 1
               COMMENT '1=basse  2=normale  3=haute — exploité par l algo glouton',
  lat        DECIMAL(9,6)  NULL COMMENT 'Latitude WGS84 (Nominatim/OSM)',
  lng        DECIMAL(9,6)  NULL COMMENT 'Longitude WGS84 (Nominatim/OSM)',
  created_by INT           NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------
--  district_edges — Liaisons entre quartiers (arêtes du graphe)
--  Chaque liaison est stockée dans les deux sens (non-orienté).
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS district_edges (
  from_id  INT           NOT NULL,
  to_id    INT           NOT NULL,
  distance DECIMAL(6,2)  NOT NULL COMMENT 'Distance en kilomètres',
  PRIMARY KEY (from_id, to_id),
  CONSTRAINT fk_edge_from FOREIGN KEY (from_id) REFERENCES districts(id) ON DELETE CASCADE,
  CONSTRAINT fk_edge_to   FOREIGN KEY (to_id)   REFERENCES districts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------
--  users — Comptes utilisateurs (admin / worker / citizen)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          INT          NOT NULL AUTO_INCREMENT,
  name        VARCHAR(150) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  password    VARCHAR(255) NOT NULL COMMENT 'Hash bcrypt (rounds=10)',
  role        ENUM('admin','worker','citizen') NOT NULL,
  district_id INT          NULL COMMENT 'Quartier du citoyen ou base de l éboueur',
  created_by  INT          NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY  uq_users_email (email),
  CONSTRAINT fk_user_district FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------
--  trucks — Camions de collecte
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trucks (
  id         INT           NOT NULL AUTO_INCREMENT,
  plate      VARCHAR(20)   NOT NULL,
  capacity_t DECIMAL(5,2)  NOT NULL COMMENT 'Capacité en tonnes',
  fill_level DECIMAL(4,3)  NOT NULL DEFAULT 0.000
               COMMENT 'Taux de remplissage 0.000 → 1.000',
  status     ENUM('available','in_use','maintenance') NOT NULL DEFAULT 'available',
  created_by INT           NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY  uq_trucks_plate (plate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------
--  tours — Tournées planifiées (1 éboueur · 1 camion · 1 quartier)
-- ----------------------------------------------------------------
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
--  complaints — Réclamations des citoyens
--  is_urgent = 1 → appel urgent (BF11 cahier de charge)
-- ----------------------------------------------------------------
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------
--  notifications — Alertes envoyées aux citoyens (polling HTMX)
-- ----------------------------------------------------------------
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------
--  historique — Journal des modifications (audit trail)
-- ----------------------------------------------------------------
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------
--  complaint_responses — Réponses admin/worker aux réclamations
-- ----------------------------------------------------------------
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------
--  settings — Configuration applicative (clé / valeur)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  `key`  VARCHAR(100) NOT NULL,
  value  TEXT         NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ================================================================
--  VUE utilitaire : planning_today
--  Planning du jour — utilisée par le tableau de bord admin
-- ================================================================
CREATE OR REPLACE VIEW planning_today AS
SELECT
  t.id                          AS tour_id,
  u.name                        AS worker_name,
  tk.plate                      AS truck_plate,
  ROUND(tk.fill_level * 100, 0) AS fill_pct,
  d.name                        AS district_name,
  d.priority,
  t.scheduled_at,
  t.status,
  creator.name                  AS created_by_name
FROM tours t
  JOIN users     u       ON t.worker_id  = u.id
  JOIN trucks    tk      ON t.truck_id   = tk.id
  JOIN districts d       ON t.district_id = d.id
  JOIN users     creator ON t.created_by  = creator.id
WHERE DATE(t.scheduled_at) = CURDATE()
ORDER BY d.priority DESC, t.scheduled_at ASC;
