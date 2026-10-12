export function rotAxis(axis, th) {
  const c = Math.cos(th), s = Math.sin(th);
  if (axis === 'x') return [[1, 0, 0], [0, c, s], [0, -s, c]];
  if (axis === 'y') return [[c, 0, -s], [0, 1, 0], [s, 0, c]];
  return [[c, s, 0], [-s, c, 0], [0, 0, 1]];
}

// 笔记 §2.5 的 R_v^b(ψ,θ,φ)
export function Rvb(psi, th, phi) {
  const cps = Math.cos(psi), sps = Math.sin(psi);
  const ct = Math.cos(th), st = Math.sin(th);
  const cph = Math.cos(phi), sph = Math.sin(phi);
  return [
    [ct * cps, ct * sps, -st],
    [sph * st * cps - cph * sps, sph * st * sps + cph * cps, sph * ct],
    [cph * st * cps + sph * sps, cph * st * sps - sph * cps, cph * ct]
  ];
}


export function rotateVector(a,v,theta){
  const c=Math.cos(theta),s=Math.sin(theta),dot=a.reduce((sum,x,i)=>sum+x*v[i],0);
  const cross=[v[1]*a[2]-v[2]*a[1],v[2]*a[0]-v[0]*a[2],v[0]*a[1]-v[1]*a[0]];
  return a.map((x,i)=>x*c+cross[i]*s+v[i]*dot*(1-c));
}
export function transportTerms(mode,omega,theta,time){
  const c=Math.cos(theta),s=Math.sin(theta);
  const vector=mode==='inertial'?[c*1.2+s*.8,-s*1.2+c*.8,0]:mode==='grow'?[.8,.5+.4*time,0]:[1.2,.8,0];
  const relative=mode==='inertial'?[omega*vector[1],-omega*vector[0],0]:mode==='grow'?[0,.4,0]:[0,0,0];
  const carried=[-omega*vector[1],omega*vector[0],0];
  return {vector,relative,carried,absolute:relative.map((x,i)=>x+carried[i])};
}
