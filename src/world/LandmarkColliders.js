import {FIXED_LANDMARKS} from './WorldManifest.js';

// One rigid body per authored landmark, with compound static collision shapes.
// Building identity and collision shape definitions are versioned together.
export function attachLandmarkColliders(world,RAPIER,heightAt,entries=FIXED_LANDMARKS){
  if(!world)return {bodies:[],count:0,ids:[]};
  const bodies=[],ids=[];let count=0;
  for(const entry of entries){
    if(entry.collisionOwner)continue; // airport terminal already owns its collider
    const y=heightAt(...entry.position);
    const rb=world.createRigidBody(RAPIER.RigidBodyDesc.fixed()
      .setTranslation(entry.position[0],y,entry.position[1]));
    for(const shape of entry.collision){
      let desc;
      if(shape.type==='box'){
        const [w,h,d]=shape.size;
        desc=RAPIER.ColliderDesc.cuboid(w/2,h/2,d/2);
      }else if(shape.type==='cylinder'){
        desc=RAPIER.ColliderDesc.cylinder(shape.halfHeight,shape.radius);
      }else throw new Error('Unknown collision shape '+shape.type);
      const [x,dy,z]=shape.center;
      world.createCollider(desc.setTranslation(x,dy,z).setFriction(1.3),rb);
      count++;
    }
    bodies.push(rb);ids.push(entry.id);
  }
  return {bodies,count,ids};
}
