// Anatomy Figure: a fixed quadrotor on a thrust-measurement bench.
// Parts: 8 feet, base, bezel, ruler, 8 base screws, 3 pedestal parts,
// X-frame, 3 centre decks, 4 deck screws, 4 × (flange, motor, cap,
// shaft, propeller, hub, 4 flange screws), dial housing, dial face.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as k from '../vendor/anatomy/iso-kit.mjs';
import * as A from '../vendor/anatomy/audit.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const width = 760, height = 470;
const plate = { x: -134, y: -126, w: 268, d: 264, r: 12 };
const P = k.fitProjection(k.boxCorners(plate, -14, 106), width, height,
  { pad: 46, azimuth: 38, elevation: 36 });
const R = A.recorder(P);
const line = k.lineSvg;
const dots = (points) => k.dotsSvg(points.map(p => k.iso(p, P)), { size: .65, tone: 'hi' });
let n = 0;
function put(name, paths, shape, at, inner = '', attrs = '', tone = 'mid') {
  n++;
  R.put({ name, at, svg: `<g ${attrs}>${k.solidSvg(paths, { tone, inner })}</g>`,
    shapes: [R.solid(shape)] });
}
function slab(name, plan, z, h, inner = '', attrs = '', tone = 'mid') {
  put(name, k.slabOf(plan, z, h, P, 6, .6), A.slab(plan, z, h, { name }, 6),
    [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], inner, attrs, tone);
}
function cyl(name, x, y, r, z, h, inner = '', attrs = '', tone = 'mid') {
  put(name, k.cylinder(x, y, r, z, h, P, 48, .4), A.cylinder(x, y, r, z, h, { name }),
    [x, y, z + h / 2], inner, attrs, tone);
}
function screw(name, x, y, z, r = 1.6) {
  cyl(name, x, y, r, z, 1, dots([[x, y, z + 1]]), '', 'hi');
}
for (const [i, [x, y]] of k.corners(plate, 20).entries()) {
  cyl(`stand.foot${i}`, x, y, 9, -14, 3);
  cyl(`stand.pad${i}`, x, y, 7, -11, 3,
    line(k.knurl(x, y, 7, -11, -8, 24, P), { tone: 'lo' }));
}
slab('stand.plate', plate, -8, 8,
  line(k.planOutline(k.insetPlan(plate, 5), 0, P), { tone: 'lo' }));
for (const [i, [x, y]] of k.corners(plate, 10).entries()) screw(`stand.bolt${i}`, x, y, 0, 2);
const ruler = { x: -111, y: 119, w: 89, d: 7, r: 1 };
const ticks = k.topTicks(-107, -27, 4, 5, 119.6, 1, [2, 4], P);
slab('stand.ruler', ruler, 0, 1,
  line(ticks.minor, { tone: 'lo' }) + line(ticks.major, { tone: 'mid' }));
cyl('pedestal.foot', 0, 0, 23, 0, 6,
  line(k.ring(0, 0, 19, 6, P, 48), { tone: 'lo' }));
for (let i = 0; i < 4; i++) {
  const a = Math.PI / 4 + i * Math.PI / 2;
  screw(`pedestal.bolt${i}`, 18 * Math.cos(a), 18 * Math.sin(a), 6);
}
cyl('pedestal.column', 0, 0, 12, 6, 44,
  line([18, 34, 46].map(z => k.sideArc(0, 0, 12, z, P, 32)).join(''), { tone: 'faint' }));
cyl('pedestal.head', 0, 0, 18, 50, 4);
const cross = [[-70,-58],[-58,-70],[0,-12],[58,-70],[70,-58],[12,0],
  [70,58],[58,70],[0,12],[-58,70],[-70,58],[-12,0]];
put('airframe.cross', k.extrude(cross, 54, 4, P, { convex: false, bevel: .5 }),
  A.extruded(cross, 54, 4, { name: 'airframe.cross' }), [0,0,56], '', '', 'hi');
const deck = { x: -23, y: -23, w: 46, d: 46, r: 5 };
slab('airframe.deck', deck, 58, 5,
  line(k.planOutline(k.insetPlan(deck, 3), 63, P), { tone: 'faint' }), '', 'hi');
slab('airframe.controller', { x: -14, y: -15, w: 28, d: 30, r: 3 }, 63, 6,
  line([-9,-5,-1,3,7].map(x => k.planOutline({x,y:-11,w:2,d:22,r:.7},69,P)).join(''), {tone:'lo'}));
for (const [i, [x,y]] of k.corners(deck, 5).entries()) screw(`airframe.bolt${i}`,x,y,63);
slab('airframe.nose', { x: 16, y: -5, w: 6, d: 10, r: 1 }, 63, 1, '', '', 'hi');

const motors = [];
for (let i = 0; i < 4; i++) {
  const phi = (45 + i * 90) * Math.PI / 180;
  // Body NED → drawing z-up: (x_b, y_b, z_b) ↦ (x_b, −y_b, −z_b).
  const x = 64 * Math.sign(Math.cos(phi)), y = -64 * Math.sign(Math.sin(phi));
  const name = `motor${i + 1}`;
  cyl(`${name}.flange`, x,y,14,58,3, '', `data-motor-assembly="${i}"`, 'hi');
  for (let j = 0; j < 4; j++) {
    const a = j * Math.PI / 2;
    screw(`${name}.bolt${j}`,x + 12 * Math.cos(a),y + 12 * Math.sin(a),61,1);
  }
  cyl(`${name}.can`, x,y,10,61,12,
    line(k.knurl(x,y,10,61,73,28,P),{tone:'lo'}), `data-motor-assembly="${i}"`, 'hi');
  cyl(`${name}.cap`,x,y,12,73,3,
    line(k.ring(x,y,9,76,P,48),{tone:'lo'}), '', 'hi');
  cyl(`${name}.shaft`,x,y,2.5,76,4, '', '', 'hi');
  const blade = [[x-44,y-3],[x+44,y-3],[x+44,y+3],[x-44,y+3]];
  const bladePaths=k.extrude(blade,80,1.2,P,{bevel:.3});
  // All shade nodes must exist: visible sides change as the propeller rotates.
  bladePaths.shades=bladePaths.shades.map(d=>d||`M${k.iso([x,y,80],P).join(' ')}`);
  put(`${name}.blade`,bladePaths,
    A.extruded(blade,80,1.2,{name:`${name}.blade`}),[x,y,80.6], '', `data-blade="${i}"`, 'hi');
  cyl(`${name}.hub`,x,y,4,81.2,3, dots([[x,y,84.2]]), '', 'hi');
  // Rotor identifiers are engraved on a supported plate, not floating labels.
  const tag = { x: x-10, y: y+16, w:20, d:10, r:2 };
  // A tag bracket connects the motor flange's edge to its identifying plate.
  slab(`${name}.tag-bracket`, { x:x-3,y:y+14,w:6,d:2,r:0 }, 58, 2);
  slab(`${name}.tag`,tag,58,2,
    k.faceTextSvg(k.topMatrix([x,y+23],60,P),`M${i+1}`,{size:6,anchor:'middle',tone:'hi'}));
  motors.push({x,y,z:80,dir:i%2===0?1:-1});
}
// Instrument face: the selected channel is read on a real bench dial.
cyl('instrument.case', 58,110,20,0,6,
  line(k.knurl(58,110,20,0,6,64,P),{tone:'lo'}), '', 'hi');
cyl('instrument.face',58,110,18,6,.8,
  line(k.ring(58,110,16,6.8,P,64),{tone:'mid'}) + (()=>{
    const t=k.radialTicks(58,110,16,41,5,6.8,[1.2,3],P,-2.2,4.4);
    return line(t.minor,{tone:'lo'})+line(t.major,{tone:'mid'});
  })());
cyl('instrument.pin',58,110,1.5,6.8,1, '', '', 'hi');
slab('instrument.label',{x:91,y:98,w:29,d:21,r:2},0,1,
  k.faceTextSvg(k.topMatrix([105.5,111],1,P),'NED',{size:6,anchor:'middle',tone:'hi'}));

A.settle(R,P);
A.auditOrExit(R,P);
const needle = line(k.lineOnTop([58,110],[58,97],7,P),{tone:'lit',free:'end'})
  .replace('<path ', '<path data-gauge-needle ');
const body = `<path class="iso-halo" d="${k.haloOf(plate,-14,4,P)}"/>` +
  R.items.sort((a,b)=>a.key-b.key).map(i=>i.svg).join('') + needle;
const svg = k.figureSvg({width,height,label:'固定在测力台上的 X 型四旋翼。四个电机的桨叶转速随输入变化，台面仪表显示选中的推力或力矩通道。',body:[body]});
const config = JSON.stringify({projection:P,motors,gauge:{x:58,y:110,z:7,r:13},parts:n});
const path = root + 'notes/quadrotor-dynamics.html';
let html = readFileSync(path,'utf8');
html = html.replace(/<!-- QUAD-RIG-ART:START -->[\s\S]*?<!-- QUAD-RIG-ART:END -->/,
  `<!-- QUAD-RIG-ART:START -->\n${svg}\n<script type="application/json" id="quad-rig-config">${config}</script>\n<!-- QUAD-RIG-ART:END -->`);
writeFileSync(path,html);
console.log(`Built quadrotor Figure: ${n} solids; light-theme SVG; ${svg.length} bytes.`);
