// Vehicle local forward is -Z. A positive yaw points the nose toward -X,
// so the physical yaw response must be negated for RIGHT steering input.
export function steeringYawRate(steer,speedFactor,handling,forwardSpeed){
  if(!Number.isFinite(steer)||!Number.isFinite(speedFactor)||!Number.isFinite(handling))return 0;
  const motionDirection=forwardSpeed < -.05 ? -1:1;
  return -steer*Math.max(0,Math.min(1,speedFactor))*handling*1.22*motionDirection;
}
