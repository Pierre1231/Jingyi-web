import * as k from '../../vendor/anatomy/iso-kit.mjs';
import { allocatedSpeeds, forces, rotationRows, ATTITUDE_LIMITS } from './quadrotor-model.js?v=2';
import { createQuadrotorScene } from './quadrotor-scene.js?v=4';

const root = document.querySelector('[data-quad-rig]');
if (root) mount(root);
function mount(root) {
  const {projection:P,motors,gauge}=JSON.parse(root.querySelector('#quad-rig-config').textContent);
  const q=selector=>root.querySelector(selector);
  const still=matchMedia('(prefers-reduced-motion: reduce)');
  const state={experiment:'attitude',mode:'thrust',amount:0,current:[8,8,8,8],target:[8,8,8,8],
    pose:[0,0,0],targetPose:[0,0,0],activeAxis:1,showAxes:true,
    angles:[0,0,0,0],paused:still.matches,touring:false,tourTime:0,tourIndex:0};
  const modes={
    thrust:{name:'总推力',key:'T',explain:'四个电机一起加速或减速。总推力改变，三个轴的合力矩保持为零。'},
    roll:{name:'横滚',key:'tx',explain:'右侧 M1、M2 减速，左侧 M3、M4 加速，产生正横滚力矩。总推力保持不变。'},
    pitch:{name:'俯仰',key:'ty',explain:'前侧 M1、M4 加速，后侧 M2、M3 减速，产生正俯仰力矩。总推力保持不变。'},
    yaw:{name:'偏航',key:'tz',explain:'逆时针旋翼 M1、M3 加速，顺时针旋翼 M2、M4 减速，产生正偏航力矩。总推力保持不变。'}
  };
  const axisNames=['横滚 φ','俯仰 θ','偏航 ψ'];
  const axisDescriptions=[
    ['绕机头方向的 xᵇ 轴旋转。正横滚：右侧下倾、左侧抬起。','绕机头方向的 xᵇ 轴旋转。负横滚：左侧下倾、右侧抬起。'],
    ['绕偏航后的 y 轴改变俯仰。正俯仰：橙色机头抬起。','绕偏航后的 y 轴改变俯仰。负俯仰：橙色机头低下。'],
    ['绕 vehicle 系向下的 z 轴改变朝向。正偏航：机头向右转，地面橙色箭头随之旋转。','绕 vehicle 系向下的 z 轴改变朝向。负偏航：机头向左转，地面橙色箭头随之旋转。']
  ];
  const modeButtons=[...root.querySelectorAll('[data-mode]')];
  const experimentButtons=[...root.querySelectorAll('[data-experiment]')];
  const metrics=[...root.querySelectorAll('[data-metric]')];
  const matrixCells=[...root.querySelectorAll('[data-matrix-value]')];
  const motorCards=[...root.querySelectorAll('[data-motor]')];
  const motorInputs=motorCards.map(card=>card.querySelector('input'));
  const poseInputs=[...root.querySelectorAll('[data-pose-input]')];
  const poseValues=[...root.querySelectorAll('[data-pose-input-value]')];
  const amount=q('#rig-amount'),status=q('[data-status]');
  const needle=q('[data-gauge-needle]');
  const blades=motors.map((_,i)=>{
    const solid=q(`[data-blade="${i}"] .iso-solid`);
    return Object.fromEntries(['fill','top','edge','crease','bevel'].map(key=>[key,solid.querySelector(`.iso-${key}`)]).concat([['shades',[...solid.querySelectorAll('.iso-shade')]]]));
  });
  let view=null,frame=0,last=0,visible=false;
  try {view=createQuadrotorScene(q('[data-scene]'));root.classList.add('rig-has-scene');}
  catch {q('[data-scene]').hidden=true;q('[data-scene-hint]').textContent='静态参考图；姿态角、矩阵和力矩仍可操作。';}
  const nice=(x,d=1)=>(Math.abs(x)<.5*10**-d?0:x).toFixed(d);
  const limit=x=>Math.max(-1,Math.min(1,x));
  const responsePose=f=>[limit(f.tx/(128*Math.SQRT1_2))*32,limit(f.ty/(128*Math.SQRT1_2))*32,limit(f.tz/12.8)*75];
  function draw() {
    const f=forces(state.current),direct=state.experiment==='attitude';
    const pose=direct?state.pose:responsePose(f);
    const selected=modes[state.mode]||modes.thrust;
    if(view)view.render({pose,lift:direct?.45:.15+limit((f.T-256)/128)*.3,forces:direct?forces([8,8,8,8]):f,angles:state.angles,
      activeAxis:direct?state.activeAxis:undefined,showAxes:state.showAxes});
    for(const [i,name] of ['roll','pitch','yaw'].entries()) {
      q(`[data-pose="${name}"]`).textContent=`${nice(pose[i])}°`;
      poseValues[i].textContent=`${nice(pose[i])}°`;
    }
    const rows=rotationRows(pose);
    matrixCells.forEach((cell,i)=>cell.textContent=nice(rows[Math.floor(i/3)][i%3],3));
    q('[data-nose-vector]').textContent=`(${rows[0].map(x=>nice(x,3)).join(', ')})`;
    q('[data-attitude-readout]').dataset.pose=pose.map(x=>nice(x,2)).join(',');
    metrics.forEach(metric=>metric.querySelector('strong').textContent=nice(f[metric.dataset.metric]));
    const share=selected.key==='T'?(f.T-256)/128:f[selected.key]/({tx:128*Math.SQRT1_2,ty:128*Math.SQRT1_2,tz:12.8}[selected.key]);
    const angle=limit(share)*2.2;
    needle.setAttribute('d',k.lineOnTop([gauge.x,gauge.y],[gauge.x+Math.sin(angle)*gauge.r,gauge.y-Math.cos(angle)*gauge.r],gauge.z,P));
    q('[data-dial-label]').textContent=direct?'机头沿 +xᵇ':`${selected.name} / ${share>=0?'+':''}${Math.round(share*100)}%${Math.abs(share)>1.001?' · 超量程':''}`;
    for(let i=0;i<4;i++) {
      if(!view){
        const m=motors[i],a=state.angles[i],c=Math.cos(a),s=Math.sin(a);
        const ring=[[-44,-3],[44,-3],[44,3],[-44,3]].map(([x,y])=>[m.x+x*c-y*s,m.y+x*s+y*c]);
        const paths=k.extrude(ring,m.z,1.2,P,{bevel:.3}),refs=blades[i];
        for(const [key,path] of [['fill','fill'],['top','top'],['edge','outline'],['crease','crease'],['bevel','bevel']])if(refs[key])refs[key].setAttribute('d',paths[path]||'');
        refs.shades.forEach(node=>node.setAttribute('d',paths.shades[+node.dataset.shade]||''));
      }
      const card=motorCards[i];card.querySelector('[data-speed]').textContent=nice(state.current[i]);
      card.querySelector('[data-force]').textContent=nice(f.thrusts[i]);
      card.querySelector('.rig-bar i').style.width=`${f.thrusts[i]/225*100}%`;
      card.toggleAttribute('data-boost',f.thrusts[i]>64.01);
      root.querySelectorAll(`[data-motor-assembly="${i}"]`).forEach(node=>node.toggleAttribute('data-boost',f.thrusts[i]>64.01));
    }
  }
  function updateControls() {
    const direct=state.experiment==='attitude';root.dataset.experiment=state.experiment;
    experimentButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.experiment===state.experiment)));
    q('[data-attitude-panel]').hidden=!direct;q('[data-allocation-panel]').hidden=direct;
    q('[data-attitude-readout]').hidden=!direct;q('[data-allocation-readout]').hidden=direct;
    q('[data-manual-controls]').hidden=direct;
    q('[data-allocation-formula]').hidden=direct;
    q('[data-allocation-assumptions]').hidden=direct;
    q('[data-scene-legend]').textContent=direct?'机身颜色：红横滚 · 绿俯仰 · 蓝偏航':'电机颜色：蓝色加速 · 灰蓝色减速';
    q('[data-model-note]').textContent=direct?'姿态与矩阵按 §2.5 的 ψ → θ → φ 顺序复合；三个滑块可组合调节。机头方向是 Rᵀ 的第一列。':
      '力矩按 §7.4 计算。姿态为限幅方向演示（横滚 / 俯仰 ±32°、偏航 ±75°），用于观察力矩作用方向。';
    modeButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===state.mode)));
    metrics.forEach(metric=>metric.toggleAttribute('data-active',metric.dataset.metric===(modes[state.mode]||modes.thrust).key));
    amount.value=state.amount;amount.disabled=state.mode==='manual';
    q('[data-amount-value]').textContent=state.mode==='manual'?'—':`${state.amount>0?'+':''}${state.amount}%`;
    q('[data-command-label]').textContent=state.mode==='manual'?'手动控制中':'控制输入';
    q('[data-explanation]').textContent=state.mode==='manual'?'单独调整电机转速，观察推力的平方关系和三个轴的耦合。':state.amount===0?
      '四个电机转速均为 8，推力相同，合力矩为零。':state.amount<0?modes[state.mode].explain.replace(/加速|减速|正(横滚|俯仰|偏航)/g,text=>text==='加速'?'减速':text==='减速'?'加速':text.replace('正','负')):modes[state.mode].explain;
    poseInputs.forEach((input,i)=>input.value=state.targetPose[i]);motorInputs.forEach((input,i)=>input.value=state.target[i]);
    q('[data-attitude-description]').textContent=state.targetPose.every(x=>x===0)?'先试俯仰 θ：向右拖动，橙色机头抬起；再调横滚 φ 和偏航 ψ，观察机体坐标轴一起旋转。':axisDescriptions[state.activeAxis][state.targetPose[state.activeAxis]<0?1:0];
    q('[data-axis-toggle]').checked=state.showAxes;
    q('[data-reset]').textContent=direct?'↺ 姿态归零':'↺ 回到平衡参考';
    status.textContent=direct?`${axisNames[state.activeAxis]} ${state.targetPose[state.activeAxis]} 度。`:state.mode==='manual'?'手动电机控制。':`${modes[state.mode].name}，控制输入 ${state.amount}%。`;
    q('[data-tour]').setAttribute('aria-pressed',String(state.touring));q('[data-tour]').textContent=state.touring?'停止演示':'自动演示';q('[data-tour]').disabled=still.matches;
    q('[data-pause]').setAttribute('aria-pressed',String(state.paused));q('[data-pause]').textContent=still.matches?'静态显示':state.paused?'播放桨叶':'暂停桨叶';q('[data-pause]').disabled=still.matches;
  }
  const stopTour=()=>{state.touring=false;state.tourTime=0;};
  function setExperiment(experiment) {
    if(state.experiment==='allocation'&&experiment==='attitude')state.pose=responsePose(forces(state.current));
    state.experiment=experiment;stopTour();updateControls();run();
  }
  function setPose(pose,axis=1) {
    state.targetPose=pose.map((x,i)=>Math.max(-ATTITUDE_LIMITS[i],Math.min(ATTITUDE_LIMITS[i],x)));
    state.activeAxis=axis;updateControls();run();
  }
  function setMode(mode,value=65) {state.mode=mode;state.amount=value;state.target=allocatedSpeeds(mode,value);updateControls();run();}
  function tick(now) {
    frame=0;if(!visible||document.hidden)return;
    const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    if(state.touring&&!still.matches) {
      state.tourTime+=dt;
      if(state.tourTime>4.2){
        state.tourTime=0;state.tourIndex=(state.tourIndex+1)%5;
        if(state.experiment==='attitude'){
          const tour=[[[0,0,0],1],[[0,25,0],1],[[25,0,0],0],[[0,0,65],2],[[20,20,45],2]];setPose(...tour[state.tourIndex]);
        }else setMode(...[['thrust',0],['thrust',65],['roll',65],['pitch',65],['yaw',65]][state.tourIndex]);
      }
    }
    let moving=false;
    for(let i=0;i<4;i++){
      const squared=state.current[i]**2,target=state.target[i]**2,diff=target-squared;
      state.current[i]=still.matches||Math.abs(diff)<.0001?state.target[i]:Math.sqrt(squared+diff*(1-Math.exp(-dt/.18)));
      moving||=state.current[i]!==state.target[i];
      if(!state.paused&&!still.matches)state.angles[i]=(state.angles[i]+motors[i].dir*(state.experiment==='attitude'?8:state.current[i])*.65*dt)%(Math.PI*2);
    }
    if(state.experiment==='attitude')for(let i=0;i<3;i++){
      let diff=state.targetPose[i]-state.pose[i];
      if(i===2){if(diff>180)diff-=360;if(diff< -180)diff+=360;}
      state.pose[i]=still.matches||Math.abs(diff)<.001?state.targetPose[i]:state.pose[i]+diff*(1-Math.exp(-dt/.22));
      moving||=state.pose[i]!==state.targetPose[i];
    }
    draw();
    if(moving||(!state.paused&&!still.matches)||(state.touring&&!still.matches))if(!frame)frame=requestAnimationFrame(tick);
  }
  function run(){if(visible&&!document.hidden&&!frame){last=0;frame=requestAnimationFrame(tick);}}
  experimentButtons.forEach(button=>button.addEventListener('click',()=>setExperiment(button.dataset.experiment)));
  poseInputs.forEach((input,i)=>input.addEventListener('input',()=>{stopTour();const pose=[...state.targetPose];pose[i]=+input.value;setPose(pose,i);}));
  root.querySelectorAll('[data-pose-preset]').forEach(button=>button.addEventListener('click',()=>{stopTour();setPose(button.dataset.posePreset.split(',').map(Number),+button.dataset.axis);}));
  modeButtons.forEach(button=>button.addEventListener('click',()=>{stopTour();setMode(button.dataset.mode);}));
  amount.addEventListener('input',()=>{stopTour();setMode(state.mode,+amount.value);});
  q('[data-reset]').addEventListener('click',()=>{stopTour();if(state.experiment==='attitude')setPose([0,0,0]);else setMode('thrust',0);});
  q('[data-reset-view]').addEventListener('click',()=>view?.resetCamera());
  q('[data-axis-toggle]').addEventListener('change',event=>{state.showAxes=event.target.checked;draw();});
  motorInputs.forEach(input=>input.addEventListener('input',()=>{stopTour();state.mode='manual';state.target=motorInputs.map(x=>+x.value);updateControls();run();}));
  q('[data-tour]').addEventListener('click',()=>{
    state.touring=!state.touring;state.tourTime=0;state.tourIndex=0;
    if(state.touring){state.paused=false;if(state.experiment==='attitude')setPose([0,0,0]);else setMode('thrust',0);}else updateControls();run();
  });
  q('[data-pause]').addEventListener('click',()=>{state.paused=!state.paused;if(state.paused)stopTour();updateControls();run();});
  document.querySelectorAll('[data-quad-open]').forEach(link=>link.addEventListener('click',()=>{
    setExperiment(link.dataset.quadOpen);if(link.dataset.posePreset)setPose(link.dataset.posePreset.split(',').map(Number),+link.dataset.axis);
  }));
  new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(!visible){cancelAnimationFrame(frame);frame=0;last=0;}else run();}).observe(root);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}else run();});
  still.addEventListener('change',()=>{if(still.matches){state.paused=true;stopTour();state.current=[...state.target];state.pose=[...state.targetPose];}updateControls();draw();run();});
  updateControls();draw();
}
