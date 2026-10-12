import assert from 'node:assert/strict';
import * as T from '../vendor/three/three.module.js';
import {rotAxis,Rvb,rotateVector,transportTerms} from '../notes/assets/dynamics-model.js';
import {rotationRows} from '../notes/assets/quadrotor-model.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const multiply=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((sum,x,k)=>sum+x*b[k][j],0)));
const flatten=a=>a.flat();
let cases=0;
for(const pose of [[0,0,0],[25,0,0],[0,25,0],[0,0,90],[30,20,40],[-30,-20,-40],[45,90,60],[45,-90,60],[180,180,180]]){
 const [roll,pitch,yaw]=pose.map(x=>x*Math.PI/180),R=Rvb(yaw,pitch,roll);
 flatten(R).forEach((x,i)=>near(x,flatten(rotationRows(pose))[i]));
 const chain=multiply(rotAxis('x',roll),multiply(rotAxis('y',pitch),rotAxis('z',yaw)));
 flatten(chain).forEach((x,i)=>near(x,flatten(R)[i]));
 // Independent active Euler geometry must equal the transpose of the passive matrix.
 const q=new T.Quaternion().setFromEuler(new T.Euler(roll,pitch,yaw,'ZYX'));
 for(let i=0;i<3;i++){
  const axis=new T.Vector3(i===0?1:0,i===1?1:0,i===2?1:0).applyQuaternion(q).toArray();
  axis.forEach((x,j)=>near(x,R[i][j]));
 }
 cases++;
}
for(const v of [[0,0,1],[1,0,0],[1,2,3]])for(const angle of [0,Math.PI/2,Math.PI,2*Math.PI]){
 const axis=new T.Vector3(...v).normalize(),a=[1,.4,-.2];
 const rotated=rotateVector(a,axis.toArray(),angle);
 const independent=new T.Vector3(...a).applyQuaternion(new T.Quaternion().setFromAxisAngle(axis,angle));
 rotated.forEach((x,i)=>near(x,independent.toArray()[i]));near(Math.hypot(...rotated),Math.hypot(...a));cases++;
}
for(const mode of ['body','inertial','grow'])for(const omega of [0,Math.PI/3,2*Math.PI/3])for(const theta of [0,.8,2]){
 const t=2,eps=1e-5,terms=transportTerms(mode,omega,theta,t);
 const toI=(vec,th)=>[Math.cos(th)*vec[0]-Math.sin(th)*vec[1],Math.sin(th)*vec[0]+Math.cos(th)*vec[1],vec[2]];
 const before=toI(transportTerms(mode,omega,theta-omega*eps,t-eps).vector,theta-omega*eps);
 const after=toI(transportTerms(mode,omega,theta+omega*eps,t+eps).vector,theta+omega*eps);
 const derivative=toI(terms.absolute,theta);
 derivative.forEach((x,i)=>assert.ok(Math.abs(x-(after[i]-before[i])/(2*eps))<1e-8));
 if(mode==='inertial')terms.absolute.forEach(x=>near(x,0));cases++;
}
console.log(`Passed ${cases} signed-attitude, Euler-chain, quaternion and transport-identity cases.`);
