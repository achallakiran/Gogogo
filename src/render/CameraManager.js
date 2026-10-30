import * as THREE from 'three';
const modes=['chase','close','hood','cockpit','orbit'];
export class CameraManager{
  constructor(camera){this.camera=camera;this.mode='chase';this.orbitAngle=.5;this.occluders=[];this.ray=new THREE.Raycaster();this.initial=true;this.smoothedTarget=new THREE.Vector3();this.smoothedDistance=10;}
  setMode(mode){if(!modes.includes(mode))return;this.mode=mode;this.initial=true;}
  next(){this.setMode(modes[(modes.indexOf(this.mode)+1)%modes.length]);return this.mode;}
  rotateOrbit(delta){this.orbitAngle+=delta;}
  update(vehicle,dt){
    const p=vehicle.model.root.position,q=vehicle.model.root.quaternion;
    const forward=new THREE.Vector3(0,0,-1).applyQuaternion(q);forward.y=0;forward.normalize();
    const back=forward.clone().negate();const center=p.clone().add(new THREE.Vector3(0,1.0,0));
    let desired,target=center.clone();
    switch(this.mode){
      case 'close':desired=center.clone().addScaledVector(back,5.2).add(new THREE.Vector3(0,2.0,0));break;
      case 'hood':desired=p.clone().addScaledVector(forward,vehicle.spec.length*.36).add(new THREE.Vector3(0,.75,0));target=desired.clone().addScaledVector(forward,25).add(new THREE.Vector3(0,.08,0));break;
      case 'cockpit':desired=p.clone().addScaledVector(forward,.18).add(new THREE.Vector3(0,vehicle.spec.bodyHeight*.44+.25,0));target=desired.clone().addScaledVector(forward,26);break;
      case 'orbit':desired=center.clone().add(new THREE.Vector3(Math.sin(this.orbitAngle)*11,5,Math.cos(this.orbitAngle)*11));break;
      default:desired=center.clone().addScaledVector(back,10.3).add(new THREE.Vector3(0,4.4,0));break;
    }
    if(['chase','close','orbit'].includes(this.mode) && this.occluders.length){
      const diff=desired.clone().sub(center);const dist=diff.length();this.ray.set(center,diff.normalize());this.ray.far=dist;
      const hits=this.ray.intersectObjects(this.occluders,false);
      if(hits.length)desired.copy(center).addScaledVector(diff,Math.max(2,hits[0].distance-.7));
    }
    const look=target.clone();
    if(this.mode==='chase'||this.mode==='close')look.addScaledVector(forward,2.8);
    if(this.initial){
      this.camera.position.copy(desired);
      this.smoothedTarget.copy(look);
      this.initial=false;
    }else{
      this.camera.position.lerp(desired,1-Math.exp(-dt*5.5));
      this.smoothedTarget.lerp(look,1-Math.exp(-dt*6));
    }
    this.camera.lookAt(this.smoothedTarget);
    const targetFov=['hood','cockpit'].includes(this.mode)?76:64;
    if(Math.abs(this.camera.fov-targetFov)>.01){this.camera.fov=targetFov;this.camera.updateProjectionMatrix();}
  }
}
