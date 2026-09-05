const pool = require('../config/database');

class DistrictModel {
  static async findAll() {
    const [rows] = await pool.query(
      'SELECT id, name, priority FROM districts ORDER BY name'
    );
    return rows;
  }

  static async findAllByPriority() {
    const [rows] = await pool.query(
      'SELECT id, name, priority FROM districts ORDER BY priority DESC, name'
    );
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, name, priority, lat, lng FROM districts WHERE id = ?', [id]
    );
    return rows[0] || null;
  }

  /* Coordonnées GPS depuis la DB (colonnes lat/lng) */
  static async findAllWithCoords() {
    const [rows] = await pool.query(
      'SELECT id, name, priority, lat, lng FROM districts ORDER BY name'
    );
    return rows;
  }

  static findAllWithPositions() {
    return DistrictModel.findAllWithCoords();
  }

  /* Construit la liste d'adjacence pour Dijkstra */
  static async buildGraph() {
    const [districts] = await pool.query('SELECT id FROM districts');
    const [edges]     = await pool.query('SELECT from_id, to_id, distance FROM district_edges');

    const graph = new Map();
    for (const { id } of districts) graph.set(id, []);
    for (const { from_id, to_id, distance } of edges) {
      graph.get(from_id).push({ to: to_id, weight: parseFloat(distance) });
    }
    return graph;
  }

  static async findEdges() {
    const [rows] = await pool.query(
      'SELECT from_id, to_id, distance FROM district_edges ORDER BY from_id, to_id'
    );
    return rows;
  }

  /* Crée un quartier et retourne son id */
  static async create({ name, priority, lat, lng, created_by }) {
    const [result] = await pool.query(
      'INSERT INTO districts (name, priority, lat, lng, created_by) VALUES (?,?,?,?,?)',
      [name, priority, lat ?? null, lng ?? null, created_by ?? null]
    );
    return result.insertId;
  }

  /* Supprime un quartier (cascade sur les arêtes) */
  static async delete(id) {
    await pool.query('DELETE FROM districts WHERE id = ?', [id]);
  }

  /* Crée une liaison bidirectionnelle entre deux quartiers */
  static async createEdge(from_id, to_id, distance) {
    const q = 'INSERT INTO district_edges (from_id,to_id,distance) VALUES (?,?,?) ON DUPLICATE KEY UPDATE distance=VALUES(distance)';
    await pool.query(q, [from_id, to_id, distance]);
    await pool.query(q, [to_id, from_id, distance]);
  }

  /* Supprime une liaison dans les deux sens */
  static async deleteEdge(from_id, to_id) {
    await pool.query(
      'DELETE FROM district_edges WHERE (from_id=? AND to_id=?) OR (from_id=? AND to_id=?)',
      [from_id, to_id, to_id, from_id]
    );
  }
}

module.exports = DistrictModel;
