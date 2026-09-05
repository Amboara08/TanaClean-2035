/**
 * Algorithme glouton d'ordonnancement des tournées
 *
 * Stratégie : à chaque itération, sélectionner le quartier non encore visité
 * dont le score est le plus élevé.
 *
 * Score = priority / distance
 *   - priority  (1 = basse, 2 = normale, 3 = haute)
 *   - distance  en km depuis le dépôt (ou le quartier précédent)
 *
 * Un quartier à haute priorité et proche sera toujours sélectionné en premier.
 * Si distance = 0, on utilise un epsilon pour éviter la division par zéro.
 *
 * @param {Array<{id: number, priority: number, distance: number, [key]: any}>} districts
 *   Liste des quartiers à ordonner.
 *
 * @returns {Array<{id: number, priority: number, distance: number, score: number, [key]: any}>}
 *   Même tableau trié par score décroissant, avec la propriété `score` ajoutée.
 *
 * Complexité : O(n log n)
 */
function greedySchedule(districts) {
  if (!Array.isArray(districts) || districts.length === 0) return [];

  const EPSILON = 0.01;

  const scored = districts.map(d => ({
    ...d,
    score: parseFloat(
      (d.priority / (d.distance > 0 ? d.distance : EPSILON)).toFixed(4)
    ),
  }));

  // Tri décroissant par score (en cas d'égalité : priorité décroissante)
  scored.sort((a, b) => b.score - a.score || b.priority - a.priority);

  return scored;
}

module.exports = { greedySchedule };
