import * as THREE from 'three';
import {createVoxelVehicleModel} from '../vehicles/VoxelVehicleModel.js';

// One renderer for the entire garage; reuses the existing real voxel assets.
export class CarShowroom {
 constructor(){
  this.renderer=null;this.vehicle=null;this.active=false;this.host=null;
  this.scene=new THREE.Scene();
  this.scene.background=new THREE.Color('#132840');
  this.camera=new THREE.PerspectiveCamera(38,1,.1,100);
  this.camera.position.set(8.7,5.0,10.4);this.camera.lookAt(0,.4,0);
  this.scene.add(new THREE.AmbientLight('#d5eeff',1.35));
  const sun=new THREE.DirectionalLight('#fff0d4',3.1);sun.position.set(6,10,7);this.scene.add(sun);
  const rim=new THREE.DirectionalLight('#5bc9ff',1.5);rim.position.set(-4,4,-8);this.scene.add(rim);
  const floor=new THREE.Mesh(new THREE.CylinderGeometry(4.3,4.6,.18,48),
    new THREE.MeshLambertMaterial({color:'#213b52'}));
  floor.position.y=-1.22;this.scene.add(floor);
  this.angle=.20;this.last=0;this.loop=this.loop.bind(this);
 }
 mount(host,spec,color){
  if(!host)return;
  if(!this.renderer){
   this.renderer=new THREE.WebGLRenderer({alpha:false,antialias:true,powerPreference:'low-power'});
   this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));
   this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  }
  this.host=host;host.appendChild(this.renderer.domElement);
  if(this.carId!==spec.id||this.carColor!==color){
   if(this.vehicle){
    this.scene.remove(this.vehicle.root);
    this.vehicle.root.traverse(x=>{if(x.geometry)x.geometry.dispose()});
    this.vehicle.paint.dispose();
   }
   this.vehicle=createVoxelVehicleModel(spec,color);
   this.scene.add(this.vehicle.root);
   this.carId=spec.id;this.carColor=color;
  }
  this.updateSize();
  if(!this.active){this.active=true;this.last=0;requestAnimationFrame(this.loop);}
 }
 updateSize(){
  if(!this.renderer||!this.host)return;
  const w=Math.max(220,this.host.clientWidth||400),h=Math.max(130,this.host.clientHeight||180);
  this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
  this.renderer.setSize(w,h,false);
 }
 loop(now){
  if(!this.active)return;
  if(!this.host?.isConnected){this.active=false;return;}
  if(this.vehicle){
    const dt=this.last?Math.min(.05,(now-this.last)/1000):0;
    this.angle+=dt*.34;this.vehicle.root.rotation.y=this.angle;
    this.vehicle.wheels.forEach(w=>{w.spin.rotation.x+=dt*.4});
  }
  this.last=now;this.renderer.render(this.scene,this.camera);
  requestAnimationFrame(this.loop);
 }
 suspend(){this.active=false;this.host=null;}
}
