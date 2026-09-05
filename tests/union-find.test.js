const { UnionFind } = require('../src/algorithms/union-find');

describe('UnionFind — structure de base', () => {
  test('find retourne le nœud lui-même à l\'initialisation', () => {
    const uf = new UnionFind(5);
    for (let i = 1; i <= 5; i++) {
      expect(uf.find(i)).toBe(i);
    }
  });

  test('tous les nœuds sont disconnected à l\'initialisation', () => {
    const uf = new UnionFind(4);
    expect(uf.connected(1, 2)).toBe(false);
    expect(uf.connected(3, 4)).toBe(false);
  });

  test('components() retourne n au départ', () => {
    const uf = new UnionFind(6);
    expect(uf.components()).toBe(6);
  });
});

describe('UnionFind — union et connected', () => {
  test('union connecte deux nœuds', () => {
    const uf = new UnionFind(3);
    uf.union(1, 2);
    expect(uf.connected(1, 2)).toBe(true);
  });

  test('union retourne false si déjà connectés', () => {
    const uf = new UnionFind(3);
    expect(uf.union(1, 2)).toBe(true);
    expect(uf.union(1, 2)).toBe(false);
  });

  test('union transitive : 1-2, 2-3 → 1-3 connectés', () => {
    const uf = new UnionFind(3);
    uf.union(1, 2);
    uf.union(2, 3);
    expect(uf.connected(1, 3)).toBe(true);
  });

  test('nœuds non reliés restent disconnectés', () => {
    const uf = new UnionFind(4);
    uf.union(1, 2);
    expect(uf.connected(1, 3)).toBe(false);
    expect(uf.connected(2, 4)).toBe(false);
  });

  test('components() décroît correctement', () => {
    const uf = new UnionFind(5);
    expect(uf.components()).toBe(5);
    uf.union(1, 2);
    expect(uf.components()).toBe(4);
    uf.union(3, 4);
    expect(uf.components()).toBe(3);
    uf.union(1, 3); // fusionne {1,2} et {3,4}
    expect(uf.components()).toBe(2);
    uf.union(1, 4); // déjà dans le même composant
    expect(uf.components()).toBe(2);
  });
});

describe('UnionFind — sectorisation (cas TanaClean)', () => {
  test('getSectors regroupe correctement les quartiers', () => {
    const uf = new UnionFind(6);
    // Secteur A : districts 1, 2, 3
    uf.union(1, 2);
    uf.union(2, 3);
    // Secteur B : districts 4, 5
    uf.union(4, 5);
    // District 6 isolé

    const sectors = uf.getSectors([1, 2, 3, 4, 5, 6]);
    expect(sectors.size).toBe(3); // 3 composants
    // Secteur A contient 3 districts
    const sectorA = [...sectors.values()].find(s => s.length === 3);
    expect(sectorA).toBeDefined();
    expect(sectorA.sort()).toEqual([1, 2, 3]);
    // Secteur B contient 2 districts
    const sectorB = [...sectors.values()].find(s => s.length === 2);
    expect(sectorB).toBeDefined();
    expect(sectorB.sort()).toEqual([4, 5]);
  });

  test('compression de chemin : find reste cohérent après unions multiples', () => {
    const uf = new UnionFind(10);
    for (let i = 1; i < 10; i++) uf.union(i, i + 1);
    const root = uf.find(1);
    for (let i = 2; i <= 10; i++) {
      expect(uf.find(i)).toBe(root);
    }
    expect(uf.components()).toBe(1);
  });
});
