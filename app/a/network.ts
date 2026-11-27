// Deterministic network layout shared by the WebGL field and the static SVG poster, so both look alike.
// Nodes sit on a gently curved plane, denser toward the upper right (design/a-signal-field.md section 4.2).

export function rng(seed: number) {
  // mulberry32
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Network {
  /** x, y in [-1, 1] (x right, y up), z small curve offset */
  nodes: Float32Array; // xyz per node
  edges: Uint32Array; // pairs of node indexes
}

export function buildNetwork(count: number, maxEdges: number, seed = 7): Network {
  const r = rng(seed);
  const nodes = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // sqrt pushes samples toward +1, so the right and the top get more nodes
    const x = -1 + 2 * Math.sqrt(r());
    const y = -1 + 2 * Math.pow(r(), 0.7);
    nodes[i * 3] = x;
    nodes[i * 3 + 1] = y;
    nodes[i * 3 + 2] = -0.35 * (x * x + 0.5 * y * y) + (r() - 0.5) * 0.2;
  }
  // Each node links to its 2 nearest neighbours, computed once. A uniform grid keeps this near O(n)
  // (the all-pairs version cost a long task on throttled mobile CPUs).
  const cells = Math.max(1, Math.round(Math.sqrt(count / 3)));
  const cellOf = (v: number) => Math.min(cells - 1, Math.max(0, Math.floor(((v + 1) / 2) * cells)));
  const grid: number[][] = Array.from({ length: cells * cells }, () => []);
  for (let i = 0; i < count; i++) grid[cellOf(nodes[i * 3 + 1]) * cells + cellOf(nodes[i * 3])].push(i);

  const seen = new Set<number>();
  const edges: number[] = [];
  for (let i = 0; i < count && edges.length / 2 < maxEdges; i++) {
    const cx = cellOf(nodes[i * 3]), cy = cellOf(nodes[i * 3 + 1]);
    let a = -1, b = -1, da = Infinity, db = Infinity;
    // widen the search ring until two neighbours are found (sparse corners need more than 3x3)
    for (let ring = 1; ring <= cells && b < 0; ring++) {
      a = -1; b = -1; da = Infinity; db = Infinity;
      for (let gy = Math.max(0, cy - ring); gy <= Math.min(cells - 1, cy + ring); gy++) {
        for (let gx = Math.max(0, cx - ring); gx <= Math.min(cells - 1, cx + ring); gx++) {
          for (const j of grid[gy * cells + gx]) {
            if (j === i) continue;
            const dx = nodes[i * 3] - nodes[j * 3];
            const dy = nodes[i * 3 + 1] - nodes[j * 3 + 1];
            const d = dx * dx + dy * dy;
            if (d < da) { b = a; db = da; a = j; da = d; }
            else if (d < db) { b = j; db = d; }
          }
        }
      }
    }
    for (const j of [a, b]) {
      if (j < 0) continue;
      const key = i < j ? i * count + j : j * count + i;
      if (seen.has(key) || edges.length / 2 >= maxEdges) continue;
      seen.add(key);
      edges.push(i, j);
    }
  }
  return { nodes, edges: Uint32Array.from(edges) };
}
