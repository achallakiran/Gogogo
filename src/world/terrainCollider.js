// Use a regular heightfield instead of a giant triangle mesh: much less WASM work.
// In Rapier, samples are column-major: columns run along X, rows run along Z.
export function makeTerrainHeightfield(heightAt, width = 900, depth = 730, ncols = 90, nrows = 74) {
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
  world.createCollider(RAPIER.ColliderDesc.heightfield(nrows, ncols, heights, scale), body);
  return body;
}
