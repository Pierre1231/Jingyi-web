import {rotAxis,Rvb,rotateVector,transportTerms} from './dynamics-model.js';
import * as T from '../../vendor/three/three.module.js';
const { AmbientLight, ArrowHelper, BoxGeometry, BufferGeometry, CircleGeometry, Color, CylinderGeometry, DirectionalLight, DoubleSide, Float32BufferAttribute, Group, Line, LineBasicMaterial, LineDashedMaterial, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, Scene, SphereGeometry, TorusGeometry, Vector3, WebGLRenderer }=T;
import {createQuadrotorBody} from './quadrotor-body.js';
import {instrumentBase, calibratedRing, measuringRod} from './dynamics-instruments.js';
const stillness=matchMedia('(prefers-reduced-motion: reduce)');
/* ===== 四旋翼动力学笔记 — 交互式 3D 示例 =====
 * 原有示例通过上方 import 复用本地 Three.js r160；
 * 动态四旋翼也引用同一模块，避免重复加载运行库。
 */

/* ---------- 通用 helper ---------- */

// 轻量视角控制：左键旋转 / 滚轮缩放 / 右键平移，带阻尼
function orbitControl(camera, dom, opts) {
  opts = opts || {};
  // 默认视角：从后上方看向原点（世界 y 向上；演示数学坐标经 world 组映射，屏幕上 z 轴向下即 NED）
  let az = opts.az !== undefined ? opts.az : -.65;
  let el = opts.el !== undefined ? opts.el : .65;
  let dist = opts.dist !== undefined ? opts.dist : 6;
  const target = opts.target ? opts.target.clone() : new Vector3(0,-.65,0);
  let tAz = az, tEl = el, tDist = dist;
  const tTarget = target.clone();
  let drag = null,fitRadius=null;
  dom.style.touchAction = 'pan-y';
  dom.addEventListener('contextmenu', e => e.preventDefault());
  dom.addEventListener('pointerdown', e => {
    drag = { b: e.button, x: e.clientX, y: e.clientY };
    dom.setPointerCapture(e.pointerId);
  });
  dom.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    if (drag.b === 0) {
      tAz += dx * 0.006;
      // 俯仰角限制在 ±87° 内，避免相机越过天顶/天底极点时 lookAt 姿态翻转
      tEl = Math.min(1.52, Math.max(-1.52, tEl + dy * 0.006));
    } else if (drag.b === 2) {
      const s = tDist * 0.0016;
      const fwd = new Vector3();
      camera.getWorldDirection(fwd);
      const right = new Vector3().crossVectors(fwd, camera.up).normalize();
      const upv = new Vector3().crossVectors(right, fwd).normalize();
      tTarget.addScaledVector(right, -dx * s).addScaledVector(upv, dy * s);
    }
  });
  const end = () => { drag = null; };
  dom.addEventListener('pointerup', end);
  dom.addEventListener('pointercancel', end);
  dom.addEventListener('wheel', e => {
    e.preventDefault();
    tDist = Math.min(60, Math.max(1.5, tDist * Math.exp(e.deltaY * 0.001)));
  }, { passive: false });
  const surface=dom.parentElement;
  surface.tabIndex=0;surface.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight ArrowUp ArrowDown + - 0');
  surface.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft')tAz-=.1;else if(event.key==='ArrowRight')tAz+=.1;
    else if(event.key==='ArrowUp')tEl=Math.min(1.52,tEl+.1);else if(event.key==='ArrowDown')tEl=Math.max(-1.52,tEl-.1);
    else if(event.key==='+')tDist=Math.max(1.5,tDist*.85);else if(event.key==='-')tDist=Math.min(60,tDist/ .85);
    else if(event.key==='0'){tAz=opts.az??-.65;tEl=opts.el??.65;tDist=opts.dist??6;tTarget.set(0,-.65,0);}
    else return;
    event.preventDefault();surface.closest('figure')._demo?.wake();
  });
  function update(dt=1/60) {
    const follow=stillness.matches?1:1-Math.exp(-dt/.13);
    az += (tAz - az) * follow;
    el += (tEl - el) * follow;
    dist += (tDist - dist) * follow;
    target.lerp(tTarget, follow);
    const se = Math.sin(el), ce = Math.cos(el);
    // 世界坐标 y 向上（与 createDemo 的 camera.up=(0,1,0) 一致；演示的数学坐标经 world 组映射为 NED）：
    // az 为绕 y 轴的方位角，el 为相对 xz 平面的仰角，极点在 ±y 方向（已被钳制避开）
    camera.position.set(
      target.x + dist * ce * Math.cos(az),
      target.y + dist * se,
      target.z + dist * ce * Math.sin(az)
    );
    camera.lookAt(target);
  }
  update();
  return { update, fit(radius){if(fitRadius!==null&&Math.abs(radius-fitRadius)<1e-5)return;fitRadius=radius;const half=Math.atan(Math.tan(camera.fov*Math.PI/360)*Math.min(1,camera.aspect));tDist=Math.max(opts.dist??8,radius/Math.sin(half)*1.04);}, reset(){fitRadius=null;tAz=opts.az??-.65;tEl=opts.el??.65;tDist=opts.dist??6;tTarget.set(0,-.65,0);} };
}

// HTML 绝对定位文字标签：每帧把 Vector3 投影到屏幕坐标
// 标签位置以数学坐标（z 向下右手系，NED 约定）记录，投影前映射到世界坐标 (x, -z, y)
// 把 X^n / X_n 形式的纯文本转为上下标 HTML（仅用于受控的界面文案）
function supsub(s) {
  return s
    .replace(/\^([A-Za-z0-9]+)/g, '<sup>$1</sup>')
    .replace(/_([A-Za-z0-9]+)/g, '<sub>$1</sub>');
}

function makeLabeler(stage) {
  const items = [];
  function add(text, color) {
    const el = document.createElement('div');
    el.className = 'demo-lbl';
    el.innerHTML = supsub(text);
    if (color) el.style.color = color;
    el.dataset.label=text;
    stage.appendChild(el);
    const item = { pos: new Vector3(), el };
    items.push(item);
    return item;
  }
  const v = new Vector3();
  function update(camera, w, h) {
    for (const it of items) {
      v.set(it.pos.x, -it.pos.z, it.pos.y).project(camera);
      it.el.style.left = Math.max(it.el.offsetWidth/2+6, Math.min(w-it.el.offsetWidth/2-6,(v.x*.5+.5)*w)) + 'px';
      it.el.style.top = Math.max(18,Math.min(h-18,(-v.y*.5+.5)*h)) + 'px';
      it.el.hidden = v.z >= 1;
    }
  }
  return { add, update };
}

function arrow(dir, len, color, origin) {
  const hl = Math.min(0.22, len * 0.22);
  return new ArrowHelper(dir.clone().normalize(), origin || new Vector3(), len, color, hl, hl * 0.55);
}

// 坐标轴箭头助手：x 红 / y 绿 / z 蓝
function addAxes(scene, size, labeler) {
  const axes = [
    [new Vector3(1, 0, 0), 0xcd625b, 'x', '#b94f48'],
    [new Vector3(0, 1, 0), 0x56996a, 'y', '#477f57'],
    [new Vector3(0, 0, 1), 0x3e88b6, 'z', '#327899']
  ];
  for (const [d, c, t, lc] of axes) {
    scene.add(arrow(d, size, c));
    if (labeler) labeler.add(t, lc).pos.copy(d).multiplyScalar(size + 0.25);
  }
}

function makeDashed(color) {
  const geo = new BufferGeometry().setFromPoints([new Vector3(), new Vector3(1, 0, 0)]);
  const l = new Line(geo, new LineDashedMaterial({ color, dashSize: 0.07, gapSize: 0.05 }));
  l.frustumCulled = false;
  return l;
}

function setLine(l, a, b) {
  const p = l.geometry.attributes.position;
  p.setXYZ(0, a.x, a.y, a.z);
  p.setXYZ(1, b.x, b.y, b.z);
  p.needsUpdate = true;
  l.computeLineDistances();
}

// 用 R 的三个行向量（= 新系基向量在原系下的坐标）设置 group 姿态
function setBasisRows(group, r1, r2, r3) {
  group.matrixAutoUpdate = false;
  group.matrix.makeBasis(r1, r2, r3);
  group.matrixWorldNeedsUpdate = true;
}

// 笔记 §1.1 / §2.5 形式的坐标系旋转矩阵（行 = 新系基在原系下的坐标）
function fmt(v) {
  if (Math.abs(v) < 5e-13) v = 0;
  return v.toFixed(3);
}

function matHTML(m) {
  let s = '<table class="mat">';
  for (let r = 0; r < 3; r++) {
    s += '<tr>';
    for (let c = 0; c < 3; c++) s += '<td>' + fmt(m[r][c]) + '</td>';
    s += '</tr>';
  }
  return s + '</table>';
}

// 控制面板滑块
let controlCount=0;
function addSlider(panel, label, min, max, step, val, onchange, unit='') {
  const row=document.createElement('div');row.className='ctl';
  const lb=document.createElement('label');lb.innerHTML=supsub(label);
  const inp=document.createElement('input');inp.type='range';inp.id=`note-control-${++controlCount}`;
  lb.htmlFor=inp.id;inp.min=min;inp.max=max;inp.step=step;inp.value=val;inp.dataset.initial=val;
  const out=document.createElement('output');out.className='val';out.htmlFor=inp.id;
  const dec=step<.1?2:step<1?1:0;
  const control={current:val,target:val,apply(value){out.textContent=value.toFixed(dec)+unit;onchange(value);},input:inp};
  panel.closest('figure')._demo.controls.push(control);
  out.textContent=Number(val).toFixed(dec)+unit;
  inp.addEventListener('input',()=>{control.target=+inp.value;panel.closest('figure')._demo.wake();});
  row.append(lb,out,inp);panel.appendChild(row);return inp;
}
function addReadout(panel) {
  const d=document.createElement('div');d.className='readout';
  panel.closest('figure').querySelector('.note-results').appendChild(d);return d;
}

// 场景脚手架：renderer / 相机 / 视角控制 / 标签 / 可见时才渲染
// 各演示统一采用 z 向下的右手系（与笔记 NED 约定一致）：演示内容全部挂在 world 组下，
// world 绕 x 轴转 π/2 把数学坐标 (x,y,z) 映射为世界坐标 (x,-z,y)，使 +z 在屏幕上指向下方
function createDemo(stage, opts={}) {
  const figure=stage.closest('figure');
  let renderer;
  try{renderer=new WebGLRenderer({antialias:true,alpha:true});}
  catch(error){stage.innerHTML='<p class="note-fallback">当前浏览器无法显示 3D 模型。下方仍可调整参数并查看实时计算结果。</p>';renderer={domElement:document.createElement('div'),setPixelRatio(){},setSize(){},render(){}};}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.domElement.setAttribute('aria-hidden','true');stage.appendChild(renderer.domElement);
  const scene=new Scene();scene.add(new T.HemisphereLight(0xffffff,0x9199a7,2.4));
  const dl=new DirectionalLight(0xffffff,3);dl.position.set(4,8,3);scene.add(dl);
  const world=new Group();world.rotation.x=Math.PI/2;scene.add(world);
  const base=instrumentBase(stage.id==='demo-frame-v'?3.25:2.45);world.add(base);
  const camera=new PerspectiveCamera(40,2,.1,200);
  const orbit=orbitControl(camera,renderer.domElement,opts),labeler=makeLabeler(stage);
  let visible=false,raf=0,last=0,time=0;
  const controls=[];
  const api={scene:world,camera,renderer,labeler,stage,controls,wake,fit:orbit.fit,get time(){return time;}};figure._demo=api;
  function wake(){if(visible&&!document.hidden&&!raf)raf=requestAnimationFrame(frame);}
  function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=2*Math.atan(Math.tan(20*Math.PI/180)/Math.min(1,camera.aspect))*180/Math.PI;camera.updateProjectionMatrix();wake();}
  new ResizeObserver(resize).observe(stage);resize();
  function frame(t){
    raf=0;if(!visible||document.hidden){last=0;return;}
    const dt=last?Math.min(.05,(t-last)/1000):0;last=t;time+=dt*1000;
    let moving=false;
    for(const control of controls){
      if(Math.abs(control.target-control.current)>.00001){
        const next=stillness.matches?control.target:control.current+(control.target-control.current)*(1-Math.exp(-dt/.16));
        control.current=Math.abs(next-control.target)<.005?control.target:next;
        control.apply(control.current);moving=true;
      }
    }
    orbit.update(dt);if(opts.render)opts.render(time);
    world.traverse(item=>{if(item.userData.aircraft){
      const q=item.userData.aircraft;
      for(let i=0;i<4;i++)q.motorParts[i].propeller.rotation.z=stillness.matches?0:time*.0015*(i%2?1:-1);
    }});
    renderer.render(scene,camera);labeler.update(camera,stage.clientWidth,stage.clientHeight);
    stage.dataset.renderTime=time.toFixed(0);
    if(!stillness.matches||moving)raf=requestAnimationFrame(frame);else last=0;
  }
  new IntersectionObserver(es=>{visible=es[es.length-1].isIntersecting;if(visible){last=0;wake();}else{cancelAnimationFrame(raf);raf=0;last=0;}}).observe(figure);
  document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(raf);raf=0;last=0;wake();});
  stillness.addEventListener('change',wake);
  figure.addEventListener('input',wake);figure.addEventListener('change',wake);figure.addEventListener('click',wake);
  for(const event of ['pointerdown','pointermove','pointerup','wheel'])renderer.domElement.addEventListener(event,wake);
  figure.querySelector('[data-camera-reset]').addEventListener('click',()=>{orbit.reset();wake();});
  figure.querySelector('[data-demo-reset]').addEventListener('click',()=>{
    figure.dispatchEvent(new Event('demo-reset'));
    for(const input of figure.querySelectorAll('input[type=range]')){input.value=input.dataset.initial;input.dispatchEvent(new Event('input',{bubbles:true}));}
    for(const input of figure.querySelectorAll('select')){input.value=input.dataset.initial;input.dispatchEvent(new Event('change',{bubbles:true}));}
    orbit.reset();wake();
  });
  return api;
}

function aircraftColor(body,pose){
  const q=body.userData.aircraft;if(!q)return;
  const shares=pose.map(x=>Math.min(1,Math.abs(x)/60)),axis=shares.indexOf(Math.max(...shares));
  const color=new Color([0xdb716b,0x64ab76,0x569fcb][axis]);
  q.materials.deck.color.set(0xf5f6f7).lerp(color,Math.min(1,shares[axis]*1.6));
  q.materials.arm.color.set(0xcbd2db).lerp(color,shares[axis]*.3);
}
function noseLabel(body,labeler){
  const label=labeler.add('机头 · +xᵇ','#b66e0d');
  return ()=>{label.pos.set(1.05,0,-.08).applyMatrix4(body.matrix);};
}

/* ---------- 示例 1：demo-rotation（§1 坐标系与旋转矩阵） ---------- */
(function () {
  const stage = document.getElementById('demo-rotation');
  const panel = document.getElementById('demo-rotation-panel');
  if (!stage || !panel) return;
  const d = createDemo(stage, { dist: 8 });
  const { scene, labeler } = d;

  // F0：灰色惯性系
  const AX = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];
  for (const a of AX) scene.add(arrow(a, 1.7, 0x777777));
  const lblF0 = labeler.add('F0', '#727c88');
  lblF0.pos.set(-0.25, -0.25, -0.1);

  // F1：彩色旋转系
  const g = new Group();
  scene.add(g);
  const F1COL = [0xcd625b, 0x56996a, 0x3e88b6];
  for (let i = 0; i < 3; i++) g.add(arrow(AX[i], 1.7, F1COL[i]));
  const lblF1 = labeler.add('F1', '#a37521');

  // 向量 P 与投影虚线
  const P = new Vector3(1.2, 0.8, 0.9);
  const pArrow = arrow(new Vector3(1, 1, 1), 1, 0xd58c23);
  scene.add(pArrow);
  const lblP = labeler.add('P', '#ad741c');
  const dashes = [makeDashed(0xcd625b), makeDashed(0x56996a), makeDashed(0x3e88b6)];
  for (const l of dashes) scene.add(l);

  const dial=calibratedRing(1.45,'z',0x6b839c);g.add(dial);
  const state = { axis: 'z', th: 40, px: 1.2, py: 0.8, pz: 0.9 };

  // 控制面板
  const selRow = document.createElement('div');
  selRow.className = 'ctl';
  const selLb = document.createElement('label');
  selLb.textContent = '转轴';
  const sel = document.createElement('select');
  for (const a of ['x', 'y', 'z']) {
    const o = document.createElement('option');
    o.value = a; o.textContent = '绕 ' + a + ' 轴';
    if (a === 'z') o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => { state.axis = sel.value; update(); });
  const selVal = document.createElement('span');
  selVal.className = 'val';
  selRow.append(selLb, sel, selVal);
  panel.appendChild(selRow);
  addSlider(panel, '角度 θ', -180, 180, 1, 40, v => { state.th = v; update(); }, '°');
  addSlider(panel, 'P_x', -2, 2, 0.1, 1.2, v => { state.px = v; update(); });
  addSlider(panel, 'P_y', -2, 2, 0.1, 0.8, v => { state.py = v; update(); });
  addSlider(panel, 'P_z', -2, 2, 0.1, 0.9, v => { state.pz = v; update(); });
  const out = addReadout(panel);

  function update() {
    const th = state.th * Math.PI / 180;
    const R = rotAxis(state.axis, th);
    dial.rotation.set(state.axis==='y'?Math.PI/2:0,state.axis==='x'?Math.PI/2:0,0);
    stage.dataset.angle=fmt(state.th);stage.dataset.axis=state.axis;
    const rows = R.map(r => new Vector3(r[0], r[1], r[2]));
    setBasisRows(g, rows[0], rows[1], rows[2]);
    lblF1.pos.copy(rows[0]).multiplyScalar(2.0);

    P.set(state.px, state.py, state.pz);
    const len = P.length();d.fit(Math.max(2.6,len));
    pArrow.visible=len>1e-9;lblP.el.style.visibility=len>1e-9?'visible':'hidden';
    if (len > 1e-9) {
      pArrow.setDirection(P.clone().normalize());
      pArrow.setLength(len, Math.min(0.22, len * 0.22), Math.min(0.12, len * 0.12));
    }
    lblP.pos.copy(P).multiplyScalar(1.08);

    // P 在 F1 各基轴上的投影虚线；P^1 = R·P^0 的各分量即点积
    const p1 = [];
    for (let i = 0; i < 3; i++) {
      const e = rows[i];
      const t = P.dot(e);
      p1.push(t);
      setLine(dashes[i], P, e.clone().multiplyScalar(t));
    }
    out.innerHTML =
      '<div class="mrow"><span>R₀¹ =</span>' + matHTML(R) + '</div>' +
      '<div class="mrow"><span>P¹ = R₀¹·P⁰ = (' +
      fmt(p1[0]) + ', ' + fmt(p1[1]) + ', ' + fmt(p1[2]) + ')ᵀ</span></div>';
  }
  update();
})();

/* ---------- 示例 2：demo-euler（§2/§3 欧拉角与万向节锁） ---------- */
(function () {
  const stage = document.getElementById('demo-euler');
  const panel = document.getElementById('demo-euler-panel');
  if (!stage || !panel) return;
  const d = createDemo(stage, { dist: 8 });
  const { scene, labeler } = d;

  addAxes(scene, 2.3, labeler);

  // 三环万向节：外环 yaw 绕 z（黄）、中环 pitch（绿）、内环 roll（红）
  // 正角主动旋转 Rz(ψ)Ry(θ)Rx(φ) = (R_v^b)^T，与正文的被动坐标变换一致。
  const gYaw = new Group(); scene.add(gYaw);
  const gPitch = new Group(); gYaw.add(gPitch);
  const gRoll = new Group(); gPitch.add(gRoll);

  const mkRing = (r, axis, color) => {
    const geo = new TorusGeometry(r, 0.065, 16, 96);
    const mat = new MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 });
    const m = new Mesh(geo, mat);
    if (axis === 'y') m.rotation.x = Math.PI / 2;
    if (axis === 'x') m.rotation.y = Math.PI / 2;
    const ring=new Group();ring.add(m);const detail=calibratedRing(r,axis,color);ring.add(detail);return ring;
  };
  const ringYaw = mkRing(2.0, 'z', 0xb28c2a);
  const ringPitch = mkRing(1.7, 'y', 0x64ab76);
  const ringRoll = mkRing(1.4, 'x', 0xcd625b);
  gYaw.add(ringYaw);
  gPitch.add(ringPitch);
  gRoll.add(ringRoll);
  const aircraft=buildQuad();aircraft.scale.setScalar(.65);gRoll.add(aircraft);
  const ringYawBase = 0xb28c2a, ringRollBase = 0xcd625b;

  // 中心机体坐标轴
  const AX = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];
  const COL = [0xcd625b, 0x56996a, 0x3e88b6];
  for (let i = 0; i < 3; i++) gRoll.add(arrow(AX[i], 1.15, COL[i]));
  const lblB = labeler.add('机体 F^b', '#a37521');
  const lblY = labeler.add('Yaw 环 (z)', '#b28c2a');
  lblY.pos.set(0, 2.05, 0.1);
  const lblP = labeler.add('Pitch 环', '#477f57');
  lblP.pos.set(0, 0.2, 1.85);
  const lblR = labeler.add('Roll 环', '#b94f48');
  lblR.pos.set(1.5, 0.15, 0.15);

  const state = { psi: 25, th: 20, phi: 30 };
  addSlider(panel, 'Yaw ψ', -180, 180, 1, 25, v => { state.psi = v; update(); }, '°');
  addSlider(panel, 'Pitch θ', -90, 90, 1, 20, v => { state.th = v; update(); }, '°');
  addSlider(panel, 'Roll φ', -180, 180, 1, 30, v => { state.phi = v; update(); }, '°');
  const out = addReadout(panel);

  function update() {
    const psi = state.psi * Math.PI / 180;
    const th = state.th * Math.PI / 180;
    const phi = state.phi * Math.PI / 180;
    gYaw.rotation.z = psi;
    gPitch.rotation.y = th;
    gRoll.rotation.x = phi;
    // 同一正角旋转合成机头方向。
    const bx = new Vector3(1, 0, 0)
      .applyAxisAngle(new Vector3(1, 0, 0), phi)
      .applyAxisAngle(new Vector3(0, 1, 0), th)
      .applyAxisAngle(new Vector3(0, 0, 1), psi);
    lblB.pos.copy(bx).multiplyScalar(1.0);lblB.el.innerHTML='机头 · +xᵇ';
    aircraftColor(aircraft,[state.phi,state.th,state.psi]);
    stage.dataset.pose=[state.phi,state.th,state.psi].map(fmt).join(',');

    // 万向节锁：|θ| → 90°，roll 轴与 yaw 轴重合
    const lock = Math.abs(Math.cos(th)) < 1e-8;
    const nearLock=Math.abs(Math.cos(th))<.2;
    ringYaw.children[0].material.color.setHex(lock ? 0xff2222 : ringYawBase);
    ringRoll.children[0].material.color.setHex(lock ? 0xff2222 : ringRollBase);

    const R = Rvb(psi, th, phi);
    out.innerHTML =
      supsub('<div class="mrow"><span>R_v^b(ψ,θ,φ) =</span>') + matHTML(R) + '</div>' +
      (lock
        ? '<div class="mrow"><span class="warn">⚠ 万向节锁：Pitch = ±90°，Yaw 与 Roll 转轴重合，丢失一个自由度</span></div>'
        : nearLock?'<div class="mrow"><span class="warn">接近奇异姿态：继续将 Pitch 调至 ±90°，观察外环与内环转轴重合。</span></div>':'<div class="mrow">三个旋转轴独立；可将 Pitch 调至 90° 比较。</div>');
  }
  update();
})();

/* ---------- 示例 3：demo-quaternion（§3.4 / §7.1 轴角与四元数旋转） ---------- */
(function () {
  const stage = document.getElementById('demo-quaternion');
  const panel = document.getElementById('demo-quaternion-panel');
  if (!stage || !panel) return;
  const d = createDemo(stage, { dist: 8 });
  const { scene, labeler } = d;

  addAxes(scene, 1.6, labeler);

  const A = new Vector3(1, 0, 0);
  const aArrow = arrow(A, 1.3, 0x328fb5);
  const apArrow = arrow(A, 1.3, 0xb46c9a);
  const vArrow = arrow(new Vector3(0, 0, 1), 1.8, 0x56996a);
  scene.add(aArrow, apArrow, vArrow);
  const lblA = labeler.add('a', '#287e9f');
  const lblAp = labeler.add("a′", '#995782');
  const lblV = labeler.add('v (转轴)', '#477f57');

  // 旋转圆弧轨迹
  const ARC_N = 48;
  const arcGeo = new BufferGeometry();
  arcGeo.setAttribute('position', new Float32BufferAttribute(new Float32Array((ARC_N + 1) * 3), 3));
  const arc = new Line(arcGeo, new LineBasicMaterial({ color: 0xb28c2a }));
  arc.frustumCulled = false;
  scene.add(arc);

  const spindle=measuringRod(0x56996a),pointer=measuringRod(0xb46c9a);scene.add(spindle,pointer);
  const state = { az: 45, el: 35, th: 120 };
  addSlider(panel, '转轴方位角', 0, 360, 1, 45, v => { state.az = v; update(); }, '°');
  addSlider(panel, '转轴仰角', -90, 90, 1, 35, v => { state.el = v; update(); }, '°');
  addSlider(panel, '转角 θ', 0, 360, 1, 120, v => { state.th = v; update(); }, '°');
  const out = addReadout(panel);

  // 罗德里格斯公式：a′ = a·cosθ + (v×a)·sinθ + v·(v·a)·(1−cosθ)
  const rodrigues=(a,v,theta)=>new Vector3(...rotateVector(a.toArray(),v.toArray(),theta));

  function update() {
    const az = state.az * Math.PI / 180, el = state.el * Math.PI / 180;
    const th = state.th * Math.PI / 180;
    const v = new Vector3(Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el));
    vArrow.setDirection(v);spindle.set(v.clone().multiplyScalar(1.8));
    lblV.pos.copy(v).multiplyScalar(2.0);

    const ap = rodrigues(A, v, th);
    apArrow.setDirection(ap.clone().normalize());pointer.set(ap.clone().multiplyScalar(1.3));
    lblA.pos.copy(A).multiplyScalar(1.45);
    lblAp.pos.copy(ap).multiplyScalar(1.45);

    const pos = arc.geometry.attributes.position;
    for (let i = 0; i <= ARC_N; i++) {
      const p = rodrigues(A, v, th * i / ARC_N);
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    pos.needsUpdate = true;

    const e0 = Math.cos(th / 2);
    stage.dataset.angle=fmt(state.th);stage.dataset.rotated=[ap.x,ap.y,ap.z].map(fmt).join(',');
    const es = v.clone().multiplyScalar(Math.sin(th / 2));
    out.innerHTML =
      '<div class="mrow"><span>e₀ = cos(θ/2) = ' + fmt(e0) + '</span></div>' +
      supsub('<div class="mrow"><span>(e_x, e_y, e_z) = v·sin(θ/2) = (') +
      fmt(es.x) + ', ' + fmt(es.y) + ', ' + fmt(es.z) + ')</span></div>' +
      '<div class="mrow"><span>a′ = (' + fmt(ap.x) + ', ' + fmt(ap.y) + ', ' + fmt(ap.z) + ')，|e| = ' +
      fmt(Math.sqrt(e0 * e0 + es.lengthSq())) + '</span></div>';
  }
  update();
})();

/* ---------- 示例 4：demo-vector（§7.1 点积、叉积与斜对称矩阵） ---------- */
(function () {
  const stage = document.getElementById('demo-vector');
  const panel = document.getElementById('demo-vector-panel');
  if (!stage || !panel) return;
  const d = createDemo(stage, { dist: 8 });
  const { scene, labeler } = d;

  addAxes(scene, 2.4, labeler);

  const aArrow = arrow(new Vector3(1, 0, 0), 1, 0x328fb5);
  const bArrow = arrow(new Vector3(0, 1, 0), 1, 0xbe912e);
  const cArrow = arrow(new Vector3(0, 0, 1), 1, 0xb46c9a);
  const projArrow = new ArrowHelper(new Vector3(0, 1, 0), new Vector3(), 1, 0x687d98, 0.12, 0.07);
  const projDash = makeDashed(0x687d98);
  scene.add(aArrow, bArrow, cArrow, projArrow, projDash);
  const lblA = labeler.add('a', '#287e9f');
  const lblB = labeler.add('b', '#996f22');
  const lblC = labeler.add('a×b', '#995782');

  // 平行四边形半透明面（两个三角形：0,a,a+b 与 0,a+b,b）
  const quadGeo = new BufferGeometry();
  quadGeo.setAttribute('position', new Float32BufferAttribute(new Float32Array(18), 3));
  const quad = new Mesh(quadGeo, new MeshBasicMaterial({
    color: 0x44aaaa, transparent: true, opacity: 0.25, side: DoubleSide, depthWrite: false
  }));
  quad.frustumCulled = false;
  scene.add(quad);

  const rodA=measuringRod(0x328fb5),rodB=measuringRod(0xbe912e);scene.add(rodA,rodB);
  const state = { ax: 1.4, ay: 0.6, az: 0.3, bx: -0.4, by: 1.2, bz: 0.5 };
  addSlider(panel, 'a_x', -2, 2, 0.1, 1.4, v => { state.ax = v; update(); });
  addSlider(panel, 'a_y', -2, 2, 0.1, 0.6, v => { state.ay = v; update(); });
  addSlider(panel, 'a_z', -2, 2, 0.1, 0.3, v => { state.az = v; update(); });
  addSlider(panel, 'b_x', -2, 2, 0.1, -0.4, v => { state.bx = v; update(); });
  addSlider(panel, 'b_y', -2, 2, 0.1, 1.2, v => { state.by = v; update(); });
  addSlider(panel, 'b_z', -2, 2, 0.1, 0.5, v => { state.bz = v; update(); });
  const out = addReadout(panel);

  function setArrow(a, v) {
    const len = v.length();
    if (len < 1e-9) { a.visible = false; return; }
    a.visible = true;
    a.setDirection(v.clone().normalize());
    a.setLength(len, Math.min(0.22, len * 0.2), Math.min(0.12, len * 0.11));
  }

  function update() {
    const a = new Vector3(state.ax, state.ay, state.az);
    const b = new Vector3(state.bx, state.by, state.bz);
    const c = new Vector3().crossVectors(a, b);
    setArrow(aArrow, a);rodA.set(a);rodB.set(b);
    stage.dataset.dot=fmt(a.dot(b));stage.dataset.area=fmt(c.length());
    setArrow(bArrow, b);
    setArrow(cArrow, c);
    lblA.pos.copy(a).multiplyScalar(1.1);lblA.el.style.visibility=a.length()>1e-8?'visible':'hidden';
    lblB.el.style.visibility=b.length()>1e-8?'visible':'hidden';
    lblB.pos.copy(b).multiplyScalar(1.1);
    lblC.pos.copy(c).multiplyScalar(1.12);
    lblC.el.style.display = c.length() < 1e-6 ? 'none' : '';

    // a 在 b 方向上的投影
    const b2 = b.lengthSq();
    const proj = b2 > 1e-9 ? b.clone().multiplyScalar(a.dot(b) / b2) : new Vector3();
    setArrow(projArrow, proj);
    setLine(projDash, proj, a);projDash.visible=b2>1e-9;

    // 平行四边形
    const ab = a.clone().add(b);d.fit(Math.max(2.6,a.length(),b.length(),c.length(),ab.length()));
    const p = quad.geometry.attributes.position;
    const tri = [new Vector3(), a, ab, new Vector3(), ab, b];
    for (let i = 0; i < 6; i++) p.setXYZ(i, tri[i].x, tri[i].y, tri[i].z);
    p.needsUpdate = true;
    quad.visible = c.length() > 1e-6;

    const skew = [
      [0, -a.z, a.y],
      [a.z, 0, -a.x],
      [-a.y, a.x, 0]
    ];
    out.innerHTML =
      '<div class="mrow"><span>a·b = ' + fmt(a.dot(b)) +
      '　|a×b| = ' + fmt(c.length()) + '（= 平行四边形面积）　a×b = (' +
      fmt(c.x) + ', ' + fmt(c.y) + ', ' + fmt(c.z) + ')</span></div>' +
      '<div class="mrow"><span>⌊a⌋× =</span>' + matHTML(skew) + '</div>'+ (b2<1e-9?'<div class="mrow">b = 0，投影方向未定义；点积、叉积与面积均为 0。</div>':'');
  }
  update();
})();

/* ---------- 示例 6：demo-frames（§2 坐标系链 F^i → F^v → F^v1 → F^v2 → F^b） ---------- */
(function () {
  const stage = document.getElementById('demo-frames');
  const panel = document.getElementById('demo-frames-panel');
  if (!stage || !panel) return;
  const d = createDemo(stage, { dist: 8, render: t => { animTick(t); } });
  const { scene, labeler } = d;

  const AX = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];
  const hex = c => '#' + c.toString(16).padStart(6, '0');

  function matMul3(A, B) {
    const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
      C[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
    return C;
  }

  // 五套坐标系：饱和度随链条递进，长度递减以区分嵌套层次
  const FRAME_DEFS = [
    { name: 'F^i',  sub: 'ᵢ',  len: 2.6,
      colors: [0x8f8f8f, 0x8f8f8f, 0x8f8f8f], namec: '#717b88' },
    { name: 'F^v',  sub: 'ᵥ',  len: 2.42,
      colors: [0xa7b1bd, 0xa7b1bd, 0xa7b1bd], namec: '#8993a1' },
    { name: 'F^v1', sub: 'ᵥ₁', len: 2.12,
      colors: [0x9c4a42, 0x5d8a49, 0x3e8ca0], namec: '#ad8128' },
    { name: 'F^v2', sub: 'ᵥ₂', len: 1.85,
      colors: [0xc9594f, 0x6fa456, 0x4aa3b8], namec: '#56996a' },
    { name: 'F^b',  sub: 'b',  len: 1.6,
      colors: [0xcd625b, 0x56996a, 0x3e88b6], namec: '#3e88b6' }
  ];
  const AXLBL = ['x', 'y', 'z'];
  const frames = FRAME_DEFS.map(f => {
    const group = new Group();
    scene.add(group);
    for (let i = 0; i < 3; i++) group.add(arrow(AX[i], f.len, f.colors[i]));
    const lblAxes = AXLBL.map((t, i) => labeler.add(t + f.sub, hex(f.colors[i])));
    const lblName = labeler.add(f.name, f.namec);
    return { def: f, group, lblAxes, lblName };
  });
  // 固定系（F^i / F^v）的标签位置：F^i 名称在 z 轴顶，F^v 名称在 y 轴顶，避免重合
  for (let k = 0; k < 2; k++) {
    const f = frames[k];
    for (let i = 0; i < 3; i++) f.lblAxes[i].pos.copy(AX[i]).multiplyScalar(f.def.len + 0.22);
  }
  frames[0].lblName.pos.set(0, 0, frames[0].def.len + 0.4);
  frames[1].lblName.pos.set(0, frames[1].def.len + 0.4, 0);

  function setFrameVisible(k, vis) {
    frames[k].group.visible = vis;
    const v = vis ? 'visible' : 'hidden';
    frames[k].lblName.el.style.visibility = v;
    for (const lb of frames[k].lblAxes) lb.el.style.visibility = v;
  }

  const body=buildQuad();scene.add(body);const updateNose=noseLabel(body,labeler);
  // 控制面板
  const state = { psi: 40, th: 20, phi: 30 };
  const sPsi = addSlider(panel, 'Yaw ψ', -180, 180, 1, 40, v => { state.psi = v; update(); }, '°');
  const sTh = addSlider(panel, 'Pitch θ', -180, 180, 1, 20, v => { state.th = v; update(); }, '°');
  const sPhi = addSlider(panel, 'Roll φ', -180, 180, 1, 30, v => { state.phi = v; update(); }, '°');

  // 中间系显示开关 + 「依次演示」按钮：收进一条独立整行工具条
  const toolRow = document.createElement('div');
  toolRow.className = 'tool-row';
  const cap = document.createElement('span');
  cap.className = 'cap';
  cap.textContent = '中间坐标系：';
  toolRow.appendChild(cap);

  function addCheck(label, k) {
    const row = document.createElement('label');
    row.className = 'chk';
    const inp = document.createElement('input');
    inp.type = 'checkbox';
    const txt = document.createElement('span');
    txt.innerHTML = supsub(label);
    inp.addEventListener('change', () => {
      setFrameVisible(k, inp.checked);
    });
    row.append(inp, txt);
    toolRow.appendChild(row);
  }
  addCheck('F^v', 1);
  addCheck('F^v1（yaw 后）', 2);
  addCheck('F^v2（pitch 后）', 3);

  // 「依次演示」：ψ、θ、φ 依次从 0 转到当前设定值，期间禁用滑块
  const btn = document.createElement('button');
  btn.textContent = '依次演示 ψ→θ→φ';
  btn.style.marginLeft = 'auto';
  toolRow.appendChild(btn);
  panel.appendChild(toolRow);
  const out = addReadout(panel);

  const sliders = [sPsi, sTh, sPhi];
  let anim = null;
  btn.addEventListener('click', () => {
    if (anim) return;
    anim = { t0: d.time, targets: [state.psi, state.th, state.phi] };
    for (const s of sliders) s.disabled = true;
    btn.disabled = true;
    btn.textContent = '演示中…';
  });

  stage.closest('figure').addEventListener('demo-reset',()=>{for(let k=1;k<=3;k++)setFrameVisible(k,false);toolRow.querySelectorAll('input[type=checkbox]').forEach(input=>input.checked=false);anim=null;sliders.forEach(s=>s.disabled=false);btn.disabled=false;btn.textContent='依次演示 ψ→θ→φ';});
  const ANIM_STEP = 900; // 每个角度的动画时长（ms）
  function animTick(t) {
    if (!anim) return;
    const el = stillness.matches?3*ANIM_STEP:t-anim.t0;
    for (let i = 0; i < 3; i++) {
      const s = Math.min(Math.max(el - i * ANIM_STEP, 0), ANIM_STEP) / ANIM_STEP;
      const e = s * s * (3 - 2 * s); // smoothstep 缓动
      sliders[i].value = Math.round(anim.targets[i] * e);
      const ctl=d.controls[i];ctl.current=ctl.target=+sliders[i].value;ctl.apply(ctl.current);
    }
    if (el >= 3 * ANIM_STEP) {
      for (let i = 0; i < 3; i++) {
        sliders[i].value = anim.targets[i];
        const ctl=d.controls[i];ctl.current=ctl.target=+sliders[i].value;ctl.apply(ctl.current);
        sliders[i].disabled = false;
      }
      btn.disabled = false;
      btn.textContent = '依次演示 ψ→θ→φ';
      anim = null;
    }
  }

  function update() {
    const psi = state.psi * Math.PI / 180;
    const th = state.th * Math.PI / 180;
    const phi = state.phi * Math.PI / 180;
    // 链条逐级复合：R_v^v1(ψ) → R_v^v2 = R_v1^v2(θ)·R_v^v1 → R_v^b（§2.5）
    const R1 = rotAxis('z', psi);
    const R2 = matMul3(rotAxis('y', th), R1);
    const Rb = Rvb(psi, th, phi);
    aircraftColor(body,[state.phi,state.th,state.psi]);
    const Rs = [null, null, R1, R2, Rb];
    for (let k = 2; k <= 4; k++) {
      const rows = Rs[k].map(r => new Vector3(r[0], r[1], r[2]));
      setBasisRows(frames[k].group, rows[0], rows[1], rows[2]);
      for (let i = 0; i < 3; i++)
        frames[k].lblAxes[i].pos.copy(rows[i]).multiplyScalar(frames[k].def.len + 0.22);
      frames[k].lblName.pos.copy(rows[0]).multiplyScalar(frames[k].def.len + 0.48);
    }
    // 机体姿态与示例 5 相同：R_v^b 的行向量（= 机体基轴在参考系下的坐标）
    setBasisRows(body,
      new Vector3(Rb[0][0], Rb[0][1], Rb[0][2]),
      new Vector3(Rb[1][0], Rb[1][1], Rb[1][2]),
      new Vector3(Rb[2][0], Rb[2][1], Rb[2][2]));
    updateNose();
    stage.dataset.pose=[state.phi,state.th,state.psi].map(fmt).join(',');
    out.innerHTML =
      supsub('<div class="mrow"><span>R_v^b(ψ,θ,φ) = R_v2^b(φ)·R_v1^v2(θ)·R_v^v1(ψ) =</span>') + matHTML(Rb) + '</div>';
  }
  update();
  setFrameVisible(1, false); // 默认只显示 F^i 与 F^b，中间系用复选框打开
  setFrameVisible(2, false);
  setFrameVisible(3, false);
})();

/* ---------- 示例 7–10：成对坐标系演示（§2.2–§2.5，每个演示只引入一个新参数） ---------- */

// 简化四旋翼机体（与示例 6 相同：中心体 + X 型 4 臂 + 4 旋翼盘 + 黄色机头标记，静态）
function buildQuad(){
  const body=new Group(),q=createQuadrotorBody();q.body.scale.setScalar(.85);body.add(q.body);
  q.motorParts.forEach(m=>{m.thrust.visible=m.tip.visible=false;});body.userData.aircraft=q;return body;
}

const IDENT3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

// 设置 group 姿态（R 的行 = 新系基在原系下的坐标，与 setBasisRows 约定一致）与可选平移
function setFramePose(group, R, pos) {
  setBasisRows(group,
    new Vector3(R[0][0], R[0][1], R[0][2]),
    new Vector3(R[1][0], R[1][1], R[1][2]),
    new Vector3(R[2][0], R[2][1], R[2][2]));
  if (pos) group.matrix.setPosition(pos.x, pos.y, pos.z);
}

// 各坐标系的统一视觉风格（与示例 6 相同：饱和度随链条递进）
const FRAME_STYLE = {
  i:  { sub: 'ᵢ',  colors: [0x8f8f8f, 0x8f8f8f, 0x8f8f8f], namec: '#717b88' },
  v:  { sub: 'ᵥ',  colors: [0xa7b1bd, 0xa7b1bd, 0xa7b1bd], namec: '#8993a1' },
  v1: { sub: 'ᵥ₁', colors: [0x9c4a42, 0x5d8a49, 0x3e8ca0], namec: '#ad8128' },
  v2: { sub: 'ᵥ₂', colors: [0xc9594f, 0x6fa456, 0x4aa3b8], namec: '#56996a' },
  b:  { sub: 'b',  colors: [0xcd625b, 0x56996a, 0x3e88b6], namec: '#3e88b6' }
};
function frameDef(key, name, len) {
  return Object.assign({ name, len }, FRAME_STYLE[key]);
}

// 成对坐标系演示脚手架：父系 + 新系（带下标标签的轴箭头）+ 四旋翼 + 滑块面板 + 读数
function framePairDemo(cfg) {
  const stage = document.getElementById(cfg.id);
  const panel = document.getElementById(cfg.id + '-panel');
  if (!stage || !panel) return;
  const d = createDemo(stage, { dist: cfg.dist || 8 });
  const { scene, labeler } = d;
  const AX = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];
  const AXLBL = ['x', 'y', 'z'];
  const hex = c => '#' + c.toString(16).padStart(6, '0');

  function makeFrame(def) {
    const group = new Group();
    scene.add(group);
    for (let i = 0; i < 3; i++) group.add(arrow(AX[i], def.len, def.colors[i]));
    return {
      def, group,
      lblAxes: AXLBL.map((t, i) => labeler.add(t + def.sub, hex(def.colors[i]))),
      lblName: labeler.add(def.name, def.namec)
    };
  }

  // 由 group.matrix 推标签位置：基向量 = matrix 各列，平移 = 第 4 列；系名标签放在 x 轴尖端外侧
  function placeLabels(f) {
    const e = f.group.matrix.elements;
    const ox = e[12], oy = e[13], oz = e[14];
    const la = f.def.len + 0.22;
    for (let i = 0; i < 3; i++)
      f.lblAxes[i].pos.set(ox + e[i * 4] * la, oy + e[i * 4 + 1] * la, oz + e[i * 4 + 2] * la);
    const ln = f.def.len + 0.48;
    f.lblName.pos.set(ox + e[0] * ln, oy + e[1] * ln, oz + e[2] * ln);
  }

  const parent = makeFrame(cfg.parent);
  const child = makeFrame(cfg.child);
  const body = buildQuad();
  scene.add(body);
  const updateNose=noseLabel(body,labeler);
  const ctx = { scene, labeler, parent, child, body };
  if (cfg.init) cfg.init(ctx);

  const state = {};
  for (const s of cfg.sliders) {
    state[s.key] = s.val;
    addSlider(panel, s.label, s.min, s.max, s.step, s.val, v => { state[s.key] = v; update(); }, s.unit);
  }
  const out = addReadout(panel);
  ctx.out = out;

  function update() {
    cfg.update(state, ctx);
    aircraftColor(body,[state.phi??0,state.th??0,state.psi??0]);updateNose();
    stage.dataset.pose=[state.phi??0,state.th??0,state.psi??0].map(fmt).join(',');
    stage.dataset.translation=[state.x??0,state.y??0,state.z??0].map(fmt).join(',');
    if(cfg.id==='demo-frame-v')d.fit(Math.max(2.6,Math.hypot(state.x,state.y,state.z)+2.1));
    stage.dataset.bodyColor=body.userData.aircraft.materials.deck.color.getHexString();
    placeLabels(parent);
    placeLabels(child);
  }
  update();
}

/* 示例 7：demo-frame-v（§2.2 vehicle 系随无人机平移，方向与惯性系平行） */
framePairDemo({
  id: 'demo-frame-v',
  dist: 8,
  parent: frameDef('i', 'F^i', 2.6),
  child: frameDef('v', 'F^v', 2.1),
  sliders: [
    { key: 'x', label: '位置 x', min: -2, max: 2, step: 0.1, val: 0.8 },
    { key: 'y', label: '位置 y', min: -2, max: 2, step: 0.1, val: 0.6 },
    { key: 'z', label: '位置 z', min: -2, max: 2, step: 0.1, val: 0.5 }
  ],
  init(ctx) {
    ctx.dash = makeDashed(0x727c88);   // 原点到无人机的位置矢量
    ctx.scene.add(ctx.dash);
    ctx.lblP = ctx.labeler.add('p', '#727c88');
  },
  update(state, ctx) {
    const p = new Vector3(state.x, state.y, state.z);
    setFramePose(ctx.child.group, IDENT3, p);
    setFramePose(ctx.body, IDENT3, p);
    setLine(ctx.dash, new Vector3(), p);
    ctx.lblP.pos.copy(p).multiplyScalar(0.5);
    ctx.out.innerHTML =
      '<div class="mrow"><span>位置 p = (' + fmt(state.x) + ', ' + fmt(state.y) + ', ' + fmt(state.z) +
      supsub(')ᵀ　——　F^v 只平移、不旋转，轴向始终与 F^i 平行</span></div>');
  }
});

/* 示例 8：demo-frame-v1（§2.3 偏航 ψ：F^v → F^v1） */
framePairDemo({
  id: 'demo-frame-v1',
  parent: frameDef('v', 'F^v', 2.6),
  child: frameDef('v1', 'F^v1', 2.1),
  sliders: [
    { key: 'psi', label: '偏航 ψ', min: -180, max: 180, step: 1, val: 40, unit: '°' }
  ],
  update(state, ctx) {
    const R = rotAxis('z', state.psi * Math.PI / 180);
    setFramePose(ctx.child.group, R);
    setFramePose(ctx.body, R);
    ctx.out.innerHTML =
      supsub('<div class="mrow"><span>R_v^v1(ψ) =</span>') + matHTML(R) + '</div>';
  }
});

/* 示例 9：demo-frame-v2（§2.4 俯仰 θ：F^v1 → F^v2，仰头为正） */
framePairDemo({
  id: 'demo-frame-v2',
  parent: frameDef('v1', 'F^v1', 2.6),
  child: frameDef('v2', 'F^v2', 2.1),
  sliders: [
    { key: 'th', label: '俯仰 θ', min: -180, max: 180, step: 1, val: 25, unit: '°' }
  ],
  update(state, ctx) {
    const R = rotAxis('y', state.th * Math.PI / 180);
    setFramePose(ctx.child.group, R);
    setFramePose(ctx.body, R);
    ctx.out.innerHTML =
      supsub('<div class="mrow"><span>R_v1^v2(θ) =</span>') + matHTML(R) + '</div>';
  }
});

/* 示例 10：demo-frame-b（§2.5 横滚 φ：F^v2 → F^b） */
framePairDemo({
  id: 'demo-frame-b',
  parent: frameDef('v2', 'F^v2', 2.6),
  child: frameDef('b', 'F^b', 2.1),
  sliders: [
    { key: 'phi', label: '横滚 φ', min: -180, max: 180, step: 1, val: 30, unit: '°' }
  ],
  update(state, ctx) {
    const R = rotAxis('x', state.phi * Math.PI / 180);
    setFramePose(ctx.child.group, R);
    setFramePose(ctx.body, R);
    ctx.out.innerHTML =
      supsub('<div class="mrow"><span>R_v2^b(φ) =</span>') + matHTML(R) + '</div>';
  }
});

/* ---------- 示例 11：demo-transport（§5.1 输运定理：dV/dt|ᵢ = dV/dt|ᵦ + ω×V） ---------- */
(function () {
  const stage = document.getElementById('demo-transport');
  const panel = document.getElementById('demo-transport-panel');
  if (!stage || !panel) return;

  const state = { mode: 'body', omDeg: 60, playing: !stillness.matches, th: 0, ts: 0 };
  let lastT = 0;
  const d = createDemo(stage, {
    dist: 8,
    render: t => {
      // 播放时积分 θ 与仿真时间（ω 滑块随时可调、不引起跳变）；暂停时冻结、画面静态刷新
      const dt = Math.min(0.05, (t - lastT) / 1000);
      lastT = t;
      if (state.playing && !stillness.matches) {
        state.th += state.omDeg * Math.PI / 180 * dt;
        state.ts += dt;
        if(state.mode==='grow'&&state.ts>=5){state.ts=5;state.playing=false;btn.textContent='播放';}
        update();
      }
    }
  });
  const { scene, labeler } = d;
  const ZERO = new Vector3();
  const AX = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];

  // F^i：灰色固定惯性系
  for (const a of AX) scene.add(arrow(a, 2.2, 0x777777));
  const lblFi = labeler.add('F^i', '#727c88');
  lblFi.pos.set(2.45, 0, 0);

  // F^b：彩色机体系，绕 z 轴以角速度 ω 持续旋转
  const body = new Group();
  scene.add(body);body.add(calibratedRing(1.65,'z',0x8795a7));
  const vectorRod=measuringRod(0xc18434);scene.add(vectorRod);
  const COLB = [0xcd625b, 0x56996a, 0x3e88b6];
  for (let i = 0; i < 3; i++) body.add(arrow(AX[i], 1.7, COLB[i]));
  const lblFb = labeler.add('F^b', '#327899');

  // 向量与各导数箭头
  const vArrow = arrow(AX[0], 1, 0xd58c23);    // V（橙）
  const omArrow = arrow(AX[2], 1, 0x56996a);   // ω（绿，沿 z，长度 ∝ ω）
  const dvbArrow = arrow(AX[0], 1, 0x3e88b6);  // dV/dt|ᵦ（青）
  const wxvArrow = arrow(AX[0], 1, 0xb46c9a);  // ω×V（品红，从青色箭头尖端接着画）
  const dviArrow = arrow(AX[0], 1, 0xad8128);  // dV/dt|ᵢ（黄）
  scene.add(vArrow, omArrow, dvbArrow, wxvArrow, dviArrow);
  const dashB = makeDashed(0x3e88b6);          // 原点 → 青色箭头尖
  const dashI = makeDashed(0xad8128);          // 原点 → 黄色箭头尖
  scene.add(dashB, dashI);
  const lblV = labeler.add('V', '#ad741c');
  const lblOm = labeler.add('ω', '#477f57');
  const lblDvb = labeler.add('dV/dt|_b', '#327899');
  const lblWxv = labeler.add('ω×V', '#995782');
  const lblDvi = labeler.add('dV/dt|_i', '#ad8128');

  // 控制面板：情景下拉 + ω 滑块 + 播放/暂停
  const selRow = document.createElement('div');
  selRow.className = 'ctl';
  const selLb = document.createElement('label');
  selLb.textContent = '情景';
  const sel = document.createElement('select');
  const MODES = [
    ['body', 'V 固定在机体系'],
    ['inertial', 'V 固定在惯性系'],
    ['grow', 'V 在机体系中匀速增长']
  ];
  for (const [val, txt] of MODES) {
    const o = document.createElement('option');
    o.value = val; o.textContent = txt;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => { state.mode = sel.value; state.ts = 0; update(); });
  const selVal = document.createElement('span');
  selVal.className = 'val';
  selRow.append(selLb, sel, selVal);
  panel.appendChild(selRow);
  addSlider(panel, '角速度 ω', 0, 120, 5, 60, v => { state.omDeg = v; update(); }, '°/s');
  const btnRow = document.createElement('div');
  btnRow.className = 'ctl';
  const btn = document.createElement('button');
  btn.textContent = state.playing?'暂停':'播放';
  btn.addEventListener('click', () => {
    if(state.ts>=5)state.ts=0;state.playing = !state.playing;
    btn.textContent = state.playing ? '暂停' : '播放';
  });
  btnRow.appendChild(btn);
  const stepButton=document.createElement('button');stepButton.type='button';stepButton.textContent='转动 30°';
  stepButton.addEventListener('click',()=>{state.playing=false;btn.textContent='播放';state.th+=Math.PI/6;update();});
  btnRow.appendChild(stepButton);
  panel.appendChild(btnRow);
  const out = addReadout(panel);
  stage.closest('figure').addEventListener('demo-reset',()=>{state.th=state.ts=0;state.playing=!stillness.matches;btn.textContent=state.playing?'暂停':'播放';update();});

  function setArrow(a, v, origin) {
    const len = v.length();
    if (len < 1e-9) { a.visible = false; return; }
    a.visible = true;
    a.position.copy(origin || ZERO);
    a.setDirection(v.clone().normalize());
    a.setLength(len, Math.min(0.18, len * 0.25), Math.min(0.1, len * 0.13));
  }

  function update() {
    const om = state.omDeg * Math.PI / 180;
    const c = Math.cos(state.th), s = Math.sin(state.th);

    const terms=transportTerms(state.mode,om,state.th,state.ts);
    const Vb=new Vector3(...terms.vector),dVb=new Vector3(...terms.relative);
    const wxVb=new Vector3(...terms.carried),dVi_b=new Vector3(...terms.absolute);

    // 显示用：R(θ)ᵀ 把机体系分量转到惯性系（R 的行 = 机体基轴在惯性系下的坐标）
    const toI = v => new Vector3(c * v.x - s * v.y, s * v.x + c * v.y, v.z);
    const Vi = toI(Vb), dvbI = toI(dVb), wxvI = toI(wxVb), dviI = toI(dVi_b);

    // F^b 姿态与标签
    setBasisRows(body, new Vector3(c, s, 0), new Vector3(-s, c, 0), new Vector3(0, 0, 1));
    lblFb.pos.set(1.95 * c, 1.95 * s, 0);

    // 箭头与 tip-to-tail 合成：品红从青色尖端接着画，终点与黄色箭头尖重合
    setArrow(vArrow, Vi);vectorRod.set(Vi);d.fit(Math.max(2.6,Vi.length(),dvbI.length(),dviI.length()));
    stage.dataset.mode=state.mode;stage.dataset.time=fmt(state.ts);stage.dataset.derivative=[dVi_b.x,dVi_b.y,dVi_b.z].map(fmt).join(',');
    setArrow(omArrow, new Vector3(0, 0, om * 1.2));
    setArrow(dvbArrow, dvbI);
    setArrow(wxvArrow, wxvI, dvbI);
    setArrow(dviArrow, dviI);
    setLine(dashB, ZERO, dvbI);
    dashB.visible = dvbArrow.visible;
    setLine(dashI, ZERO, dviI);
    dashI.visible = dviArrow.visible;
    lblV.pos.copy(Vi).multiplyScalar(1.1);
    lblOm.pos.set(0, 0, om * 1.2 + 0.28);
    lblDvb.pos.copy(dvbI).multiplyScalar(1.15);
    lblWxv.pos.copy(dvbI).addScaledVector(wxvI, 0.55);
    lblDvi.pos.copy(dviI).multiplyScalar(1.15);
    lblDvb.el.style.display = dvbArrow.visible ? '' : 'none';
    lblWxv.el.style.display = wxvArrow.visible ? '' : 'none';
    lblDvi.el.style.display = dviArrow.visible ? '' : 'none';

    // 读数：三个导数向量的机体系分量（输运定理所写的坐标系）
    out.innerHTML =
      supsub('<div class="mrow"><span style="color:#327899">dV/dt|_b = (') +
        fmt(dVb.x) + ', ' + fmt(dVb.y) + ', ' + fmt(dVb.z) + ')ᵀ</span></div>' +
      supsub('<div class="mrow"><span style="color:#995782">ω×V = (') +
        fmt(wxVb.x) + ', ' + fmt(wxVb.y) + ', ' + fmt(wxVb.z) + ')ᵀ</span></div>' +
      supsub('<div class="mrow"><span style="color:#ad8128">dV/dt|_i = dV/dt|_b + ω×V = (') +
        fmt(dVi_b.x) + ', ' + fmt(dVi_b.y) + ', ' + fmt(dVi_b.z) + ')ᵀ</span></div>' +
      supsub('<div class="mrow"><span>（分量均在 F^b 中给出；θ = ') +
        ((state.th * 180 / Math.PI) % 360).toFixed(0) + '°；t = '+state.ts.toFixed(2)+' s）</span></div>'+ (state.mode==='grow'?'<div class="mrow">观察区间 0–5 s；到终点暂停，点击播放从 t=0 重播。</div>':'');
  }
  update();
})();


for(const figure of document.querySelectorAll('.note-demo')){
  for(const event of ['input','change'])figure.addEventListener(event,()=>figure.querySelectorAll('[data-preset-values]').forEach(b=>b.setAttribute('aria-pressed','false')));
  figure.querySelector('[data-demo-reset]').addEventListener('click',()=>figure.querySelectorAll('[data-preset-values]').forEach(b=>b.setAttribute('aria-pressed','false')));
  for(const select of figure.querySelectorAll('select')){
    select.id=`note-control-${++controlCount}`;select.dataset.initial=select.value;
    select.closest('.ctl').querySelector('label').htmlFor=select.id;
  }
  for(const button of figure.querySelectorAll('[data-preset-values]'))button.addEventListener('click',()=>{
    figure.dispatchEvent(new Event('demo-reset'));
    const values=JSON.parse(button.dataset.presetValues);
    const select=figure.querySelector('select');
    if(select&&button.dataset.presetSelect){select.value=button.dataset.presetSelect;select.dispatchEvent(new Event('change',{bubbles:true}));}
    figure.querySelectorAll('input[type=range]').forEach((input,i)=>{input.value=values[i];input.dispatchEvent(new Event('input',{bubbles:true}));});
    figure.querySelectorAll('[data-preset-values]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  });
}
