// Use a regular heightfield instead of a giant triangle mesh: much less WASM work.
// In Rapier, samples are column-major: columns run along X, rows run along Z.
// Terrain and Rapier share exactly one footprint. The airport apron and runway
// reach x=516, beyond the original x=450 ground edge.
export const TERRAIN_WIDTH=1320;
export const TERRAIN_DEPTH=1000;
export const TERRAIN_COLS=132;
export const TERRAIN_ROWS=100;
export function makeTerrainHeightfield(heightAt, width = TERRAIN_WIDTH, depth = TERRAIN_DEPTH, ncols = TERRAIN_COLS, nrows = TERRAIN_ROWS) {
  if (ncols < 1 || nrows < 1) throw new Error('Invalid terrain resolution');
  const heights = new Float32Array((ncols + 1) * (nrows + 1));
  for (let col = 0; col <= ncols; col++) {
    const x = -width / 2 + (col / ncols) * width;
    for (let row = 0; row <= nrows; row++) {
      const z = -depth / 2 + (row / nrows) * depth;
      const elevation = heightAt(x, z);
      if (!Number.isFinite(elevation)) throw new Error(`Invalid terrain at ${x}, ${z}`);
      heights[col * (nrows + 1) + row] = elevation;
    }
  }
  return { nrows, ncols, heights, scale: { x: width, y: 1, z: depth } };
}
export function attachTerrainCollider(world, RAPIER, heightAt) {
  const { nrows, ncols, heights, scale } = makeTerrainHeightfield(heightAt);
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  world.createCollider(RAPIER.ColliderDesc.heightfield(nrows, ncols, heights, scale).setFriction(1.25), body);
  // Catch-all under the actual heightfield. Even if a wheel slips through a
  // heightfield cell at high speed, there is no bottomless void.
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(scale.x/2, .35, scale.z/2).setTranslation(0,-9,0).setFriction(1.4),
    body
  );
  return body;
}
