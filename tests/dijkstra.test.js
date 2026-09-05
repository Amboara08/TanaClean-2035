const { dijkstra, MinHeap } = require('../src/algorithms/dijkstra');

// Graphe de test — triangle simple
//   1 --(1.0)-- 2
//   |           |
// (2.5)       (0.5)
//   |           |
//   3 --(1.0)-- 4
function buildTestGraph() {
  return new Map([
    [1, [{ to: 2, weight: 1.0 }, { to: 3, weight: 2.5 }]],
    [2, [{ to: 1, weight: 1.0 }, { to: 4, weight: 0.5 }]],
    [3, [{ to: 1, weight: 2.5 }, { to: 4, weight: 1.0 }]],
    [4, [{ to: 2, weight: 0.5 }, { to: 3, weight: 1.0 }]],
  ]);
}

describe('MinHeap (Tas binaire)', () => {
  test('push / pop maintient la propriété min-heap', () => {
    const heap = new MinHeap();
    heap.push([5, 'e']);
    heap.push([1, 'a']);
    heap.push([3, 'c']);
    heap.push([2, 'b']);
    heap.push([4, 'd']);

    expect(heap.pop()[0]).toBe(1);
    expect(heap.pop()[0]).toBe(2);
    expect(heap.pop()[0]).toBe(3);
    expect(heap.pop()[0]).toBe(4);
    expect(heap.pop()[0]).toBe(5);
  });

  test('size est correct après push et pop', () => {
    const heap = new MinHeap();
    expect(heap.size).toBe(0);
    heap.push([1, 'x']);
    heap.push([2, 'y']);
    expect(heap.size).toBe(2);
    heap.pop();
    expect(heap.size).toBe(1);
  });
});

describe('Dijkstra — cas nominaux', () => {
  test('plus court chemin direct 1→2', () => {
    const graph = buildTestGraph();
    const result = dijkstra(graph, 1, 2);
    expect(result.distance).toBe(1.0);
    expect(result.path).toEqual([1, 2]);
  });

  test('plus court chemin indirect 1→4 : via 1→2→4 = 1.5, pas 1→3→4 = 3.5', () => {
    const graph = buildTestGraph();
    const result = dijkstra(graph, 1, 4);
    expect(result.distance).toBe(1.5);
    expect(result.path).toEqual([1, 2, 4]);
  });

  test('source = target retourne distance 0 et chemin [source]', () => {
    const graph = buildTestGraph();
    const result = dijkstra(graph, 1, 1);
    expect(result.distance).toBe(0);
    expect(result.path).toEqual([1]);
  });

  test('chemin symétrique 4→1 = 1.5 (graphe non-orienté)', () => {
    const graph = buildTestGraph();
    const result = dijkstra(graph, 4, 1);
    expect(result.distance).toBe(1.5);
    expect(result.path).toEqual([4, 2, 1]);
  });
});

describe('Dijkstra — cas limites', () => {
  test('nœud non atteignable retourne distance null et path vide', () => {
    const graph = new Map([
      [1, [{ to: 2, weight: 1.0 }]],
      [2, [{ to: 1, weight: 1.0 }]],
      [3, []],  // nœud isolé
    ]);
    const result = dijkstra(graph, 1, 3);
    expect(result.distance).toBeNull();
    expect(result.path).toEqual([]);
  });

  test('graphe à un seul nœud', () => {
    const graph = new Map([[1, []]]);
    const result = dijkstra(graph, 1, 1);
    expect(result.distance).toBe(0);
    expect(result.path).toEqual([1]);
  });

  test('chemin avec plusieurs nœuds intermédiaires', () => {
    // 1→2→3→4→5, poids = 1 chacun
    const graph = new Map([
      [1, [{ to: 2, weight: 1 }]],
      [2, [{ to: 1, weight: 1 }, { to: 3, weight: 1 }]],
      [3, [{ to: 2, weight: 1 }, { to: 4, weight: 1 }]],
      [4, [{ to: 3, weight: 1 }, { to: 5, weight: 1 }]],
      [5, [{ to: 4, weight: 1 }]],
    ]);
    const result = dijkstra(graph, 1, 5);
    expect(result.distance).toBe(4);
    expect(result.path).toEqual([1, 2, 3, 4, 5]);
  });

  test('distance arrondie à 2 décimales (fractions binaires exactes)', () => {
    // 0.25 et 0.75 sont exactement représentables en binaire (1/4 et 3/4)
    // chemin 1→2 direct = 3.0 | chemin 1→3→2 = 0.25 + 0.75 = 1.0
    const graph = new Map([
      [1, [{ to: 2, weight: 3.0 }, { to: 3, weight: 0.25 }]],
      [3, [{ to: 2, weight: 0.75 }]],
      [2, []],
    ]);
    const r = dijkstra(graph, 1, 2);
    expect(r.distance).toBe(1.0);
    expect(r.path).toEqual([1, 3, 2]);
    // Vérifie que le résultat n'a pas plus de 2 décimales
    const decStr = r.distance.toString().split('.')[1] || '';
    expect(decStr.length).toBeLessThanOrEqual(2);
  });
});
