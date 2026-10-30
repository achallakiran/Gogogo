// Non-oscillating, bounded load assist per wheel. This is force feedback,
// not a replacement for the existing tire collider on this beta milestone.
export function suspensionAcceleration(distance,pointVerticalSpeed,
  restLength=1.40,stiffness=18,damping=3.8,maxAccel=5){
 if(!Number.isFinite(distance)||!Number.isFinite(pointVerticalSpeed))return 0;
 const compressed=Math.max(0,restLength-distance);
 return Math.min(maxAccel,Math.max(0,compressed*stiffness-pointVerticalSpeed*damping));
}
