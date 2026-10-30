// Localized fallback collision mesh extracted from the *actual visible*
// terrain triangles. Rapier heightfield missed some steep off-road hills;
// this overlay closes those gaps without any invisible support slabs.
export const MOUNTAIN_COLLISION_BOUNDS=Object.freeze({
 minX:40,maxX:300,minZ:260,maxZ:500
});
export function buildMountainCollisionTriangles(geometry,bounds=MOUNTAIN_COLLISION_BOUNDS){
 const attr=geometry.getAttribute('position');
 const indices=geometry.getIndex().array;
 const points=attr.array;
 const selected=[];
 for(let t=0;t<indices.length;t+=3){
  const a=indices[t],b=indices[t+1],c=indices[t+2];
  const x=(points[a*3]+points[b*3]+points[c*3])/3;
  const z=(points[a*3+2]+points[b*3+2]+points[c*3+2])/3;
  if(x>=bounds.minX&&x<=bounds.maxX&&z>=bounds.minZ&&z<=bounds.maxZ)
   selected.push(a,b,c);
 }
 if(selected.length<300)throw new Error('Missing mountain physics surface triangles');
 return {positions:points,indices:new Uint32Array(selected),triangles:selected.length/3};
}
export function attachMountainCollisionPatch(world,RAPIER,geometry){
 if(!world)return null;
 const {positions,indices,triangles}=buildMountainCollisionTriangles(geometry);
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
 const collider=world.createCollider(RAPIER.ColliderDesc.trimesh(positions,indices)
   .setFriction(1.3).setRestitution(0),body);
 return {body,collider,triangles};
}
