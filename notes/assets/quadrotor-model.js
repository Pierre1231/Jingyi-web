// §7.4, normalized demonstration model. Rotor positions in body NED.
export const PHI = [45, 135, 225, 315].map(x => x * Math.PI / 180);
export const DIR = [1, -1, 1, -1];
export const BASE_SQUARED_SPEED = 64;
export const ATTITUDE_LIMITS = [60, 60, 180];
// Coordinate-transform convention from §2.5: R_v^b maps vehicle components
// into body components. Its rows are the body axes expressed in vehicle NED.
export function rotationRows(pose) {
  const [p,t,s]=pose.map(deg=>deg*Math.PI/180);
  const cp=Math.cos(p),sp=Math.sin(p),ct=Math.cos(t),st=Math.sin(t),cs=Math.cos(s),ss=Math.sin(s);
  return [
    [ct*cs,ct*ss,-st],
    [sp*st*cs-cp*ss,sp*st*ss+cp*cs,sp*ct],
    [cp*st*cs+sp*ss,cp*st*ss-sp*cs,cp*ct]
  ];
}
export const PATTERNS = {
  thrust: [1, 1, 1, 1],
  roll: [-1, -1, 1, 1],
  pitch: [1, -1, -1, 1],
  yaw: [1, -1, 1, -1]
};
export function allocatedSpeeds(channel, amount) {
  const pattern = PATTERNS[channel];
  if (!pattern) throw new Error(`Unknown allocation channel: ${channel}`);
  const delta = Math.max(-100, Math.min(100, amount)) * .32;
  return pattern.map(p => Math.sqrt(BASE_SQUARED_SPEED + p * delta));
}
export function forces(speeds) {
  const thrusts = speeds.map(w => w * w);
  return {
    thrusts,
    T: thrusts.reduce((sum, t) => sum + t, 0),
    tx: thrusts.reduce((sum, t, i) => sum - Math.sin(PHI[i]) * t, 0),
    ty: thrusts.reduce((sum, t, i) => sum + Math.cos(PHI[i]) * t, 0),
    tz: thrusts.reduce((sum, t, i) => sum + DIR[i] * .1 * t, 0)
  };
}
