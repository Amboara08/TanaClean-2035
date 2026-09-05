const { greedySchedule } = require('../src/algorithms/greedy');

describe('greedySchedule — ordonnancement glouton', () => {
  test('trie par score décroissant (priorité / distance)', () => {
    const districts = [
      { id: 1, priority: 1, distance: 2.0, name: 'A' },
      { id: 2, priority: 3, distance: 1.5, name: 'B' },
      { id: 3, priority: 2, distance: 1.0, name: 'C' },
    ];
    const result = greedySchedule(districts);
    // scores: A=0.5, B=2.0, C=2.0 → B ou C en premier (égalité → priorité B=3 > C=2)
    expect(result[0].id).toBe(2); // B : score 2.0, priorité 3
    expect(result[1].id).toBe(3); // C : score 2.0, priorité 2
    expect(result[2].id).toBe(1); // A : score 0.5
  });

  test('priorité haute + distance courte = premier', () => {
    // scores : id1 = 3/0.5 = 6.0 · id2 = 1/0.3 ≈ 3.33 · id3 = 3/5.0 = 0.6
    // ordre attendu : 1, 2, 3
    const districts = [
      { id: 1, priority: 3, distance: 0.5, name: 'Proche urgent' },
      { id: 2, priority: 1, distance: 0.3, name: 'Proche non-urgent' },
      { id: 3, priority: 3, distance: 5.0, name: 'Loin urgent' },
    ];
    const result = greedySchedule(districts);
    expect(result[0].id).toBe(1); // score 6.0
    expect(result[1].id).toBe(2); // score ≈ 3.33
    expect(result[2].id).toBe(3); // score 0.6
  });

  test('propriété score ajoutée à chaque élément', () => {
    const districts = [{ id: 1, priority: 2, distance: 4.0 }];
    const result = greedySchedule(districts);
    expect(result[0]).toHaveProperty('score');
    expect(result[0].score).toBe(0.5);
  });

  test('distance = 0 utilise epsilon (pas de division par zéro)', () => {
    const districts = [{ id: 1, priority: 2, distance: 0 }];
    expect(() => greedySchedule(districts)).not.toThrow();
    const result = greedySchedule(districts);
    expect(result[0].score).toBeGreaterThan(0);
    expect(isFinite(result[0].score)).toBe(true);
  });

  test('tableau vide retourne tableau vide', () => {
    expect(greedySchedule([])).toEqual([]);
  });

  test('un seul élément retourne ce même élément avec son score', () => {
    const result = greedySchedule([{ id: 5, priority: 3, distance: 2.0 }]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(5);
    expect(result[0].score).toBe(1.5);
  });

  test('préserve les propriétés originales des districts', () => {
    const districts = [{ id: 7, priority: 2, distance: 1.0, name: 'Isotry', custom: 'abc' }];
    const result = greedySchedule(districts);
    expect(result[0].name).toBe('Isotry');
    expect(result[0].custom).toBe('abc');
  });
});
