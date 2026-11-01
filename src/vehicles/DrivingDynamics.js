export const REVERSE_LIMIT=13;
export function longitudinalAcceleration({gas,brake},speed,spec){
  if(!Number.isFinite(speed))return 0;
  if(brake){
    if(speed>1.2)return -spec.brake*1.65; // first slow to a stop
    if(speed > -REVERSE_LIMIT)return -spec.accel*.84; // then reverse, same pedal
    return 0;
  }
  if(gas){
    if(speed < -.8)return spec.brake*1.5; // braking while changing direction
    if(speed>=spec.topSpeed)return 0;
    const ratio=Math.max(0,1-Math.max(0,speed)/spec.topSpeed);
    return spec.accel*(.27+.73*ratio)*1.20; // responsive, but not an instant 5g launch
  }
  return -speed*.85; // coasting, no forced braking
}
