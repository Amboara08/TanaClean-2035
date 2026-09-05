  /**
 * Structure Union-Find (Disjoint Set Union)
 * avec compression de chemin et union par rang.
 *
 * Utilisation dans TanaClean :
 *   - Regrouper les quartiers connectés en secteurs
 *   - Vérifier si deux quartiers sont dans le même secteur de collecte
 *   - Détecter les quartiers isolés (non reliés au réseau principal)
 *
 * Complexité par opération : O(α(n)) ≈ O(1) (fonction d'Ackermann inverse)
 */
class UnionFind {
  /**
   * @param {number} n  Nombre maximum de nœuds (IDs de 1 à n)
   */
  constructor(n) {
    this.parent     = Array.from({ length: n + 1 }, (_, i) => i);
    this.rank       = new Array(n + 1).fill(0);
    this._components = n;
  }

  /**
   * Trouve la racine du composant contenant x.
   * Applique la compression de chemin.
   * @param {number} x
   * @returns {number} racine
   */
  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }

  /**
   * Fusionne les composants de x et y.
   * @param {number} x
   * @param {number} y
   * @returns {boolean} true si une fusion a eu lieu, false s'ils étaient déjà connectés
   */
  union(x, y) {
    const px = this.find(x);
    const py = this.find(y);
    if (px === py) return false;

    if (this.rank[px] < this.rank[py]) {
      this.parent[px] = py;
    } else if (this.rank[px] > this.rank[py]) {
      this.parent[py] = px;
    } else {
      this.parent[py] = px;
      this.rank[px]++;
    }
    this._components--;
    return true;
  }

  /**
   * Vérifie si x et y sont dans le même composant (même secteur).
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  connected(x, y) {
    return this.find(x) === this.find(y);
  }

  /**
   * Nombre de composants connexes distincts.
   * @returns {number}
   */
  components() {
    return this._components;
  }

  /**
   * Retourne un Map { racine → [nodeIds] } listant tous les secteurs.
   * @param {number[]} nodes  Liste des IDs de nœuds à analyser
   * @returns {Map<number, number[]>}
   */
  getSectors(nodes) {
    const map = new Map();
    for (const node of nodes) {
      const root = this.find(node);
      if (!map.has(root)) map.set(root, []);
      map.get(root).push(node);
    }
    return map;
  }
}

module.exports = { UnionFind };
