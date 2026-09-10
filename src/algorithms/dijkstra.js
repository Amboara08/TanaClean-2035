
class MinHeap {
  constructor() {
    this.data = [];
  }

  get size() {
    return this.data.length;
  }

  push(item) {
    this.data.push(item);
    this._bubbleUp(this.data.length - 1);
  }

  pop() {
    const top  = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[parent][0] <= this.data[i][0]) break;
      [this.data[parent], this.data[i]] = [this.data[i], this.data[parent]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.data[l][0] < this.data[smallest][0]) smallest = l;
      if (r < n && this.data[r][0] < this.data[smallest][0]) smallest = r;
      if (smallest === i) break;
      [this.data[smallest], this.data[i]] = [this.data[i], this.data[smallest]];
      i = smallest;
    }
  }
}

/**
 *
 * @param {Map<number, Array<{to: number, weight: number}>>} graph
 *
 * @param {number} source  Nœud de départ
 * @param {number} target  Nœud d'arrivée
 *
 * @returns {{ distance: number|null, path: number[] }}
 *   distance : distance minimale en km (null si non atteignable)
 *   path     : tableau d'IDs de nœuds du chemin optimal
 *
 * Complexité : O((V + E) log V)
 */
function dijkstra(graph, source, target) {
  const dist    = new Map();
  const prev    = new Map();
  const visited = new Set();
  const heap    = new MinHeap();

  for (const node of graph.keys()) {
    dist.set(node, Infinity);
  }
  dist.set(source, 0);
  heap.push([0, source]);

  while (heap.size > 0) {
    const [d, u] = heap.pop();

    if (visited.has(u)) continue;
    visited.add(u);

    if (u === target) break;

    for (const { to, weight } of (graph.get(u) || [])) {
      if (visited.has(to)) continue;
      const alt = d + weight;
      if (alt < (dist.get(to) ?? Infinity)) {
        dist.set(to, alt);
        prev.set(to, u);
        heap.push([alt, to]);
      }
    }
  }

  const finalDist = dist.get(target);
  if (finalDist === undefined || finalDist === Infinity) {
    return { distance: null, path: [] };
  }

  // Reconstruction du chemin par remontée des prédécesseurs
  const path = [];
  let curr = target;
  while (curr !== undefined) {
    path.unshift(curr);
    curr = prev.get(curr);
  }

  return {
    distance: Math.round(finalDist * 100) / 100,
    path,
  };
}

module.exports = { dijkstra, MinHeap };
