import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Exercise the actual pointermove callbacks, not copies of their rotation equations.
function pointerBody(path){
 const source=readFileSync(new URL(path,import.meta.url),'utf8');
 const start=source.indexOf("addEventListener('pointermove'");
 assert.ok(start>=0,`Missing pointermove callback in ${path}`);
 const open=source.indexOf('{',start);let depth=1,end=open+1;
 for(;end<source.length&&depth;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}
 assert.equal(depth,0);return source.slice(open+1,end-1);
}
const reference=pointerBody('../notes/assets/dynamics-demos.js');
const pilot=pointerBody('../notes/assets/quadrotor-scene.js');
function move(body,dx,dy,variable){
 const handler=new Function('dx','dy',`
 let az=-.65,tAz=az,el=.65,tEl=el,drag={b:0,x:0,y:0},currentState=null;
 const handler=e=>{${body}};handler({clientX:dx,clientY:dy});
 return [${variable==='az'?'az':'tAz'}+.65,${variable==='az'?'el':'tEl'}-.65];`);
 return handler(dx,dy);
}
for(const [dx,dy] of [[120,0],[-120,0],[0,40],[0,-40],[60,20],[-60,-20]]){
 const expected=move(reference,dx,dy,'tAz'),actual=move(pilot,dx,dy,'az');
 for(let axis=0;axis<2;axis++)assert.equal(Math.sign(actual[axis]),Math.sign(expected[axis]),
  `Drag (${dx}, ${dy}), axis ${axis}: Fig 11 ${actual[axis].toFixed(3)} rad opposes Fig 03 ${expected[axis].toFixed(3)} rad`);
}
console.log('Passed: Fig 11 and Figs 01–10 agree for left, right, up, down and diagonal drags.');
