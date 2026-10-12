import {createQuadrotorBody} from './quadrotor-body.js';
// Reuse the exact Three.js r160 already used by the other notes examples.
import * as T from '../../vendor/three/three.module.js';
import { rotationRows, ATTITUDE_LIMITS } from './quadrotor-model.js?v=2';

// Body-NED attitude to world pose. R_v^b from §2.5 is transposed;
// then NED is mapped to the renderer's y-up world: (x, y, z) → (x, −z, y).
export function attitudeMatrix(roll, pitch, yaw) {
  const axes=rotationRows([roll,pitch,yaw]).map(([x,y,z])=>new T.Vector3(x,-z,y));
  return new T.Matrix4().makeBasis(...axes);
}

export function createQuadrotorScene(stage) {
  const renderer=new T.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden','true');
  stage.appendChild(renderer.domElement);
  const scene=new T.Scene();
  scene.add(new T.HemisphereLight(0xffffff,0x9199a7,2.4));
  const key=new T.DirectionalLight(0xffffff,3);key.position.set(4,8,3);scene.add(key);
  const camera=new T.OrthographicCamera(-3.5,3.5,3,-3,.1,50);
  const target=new T.Vector3(0,.35,0);
  const {body,materials,motorParts,noseMarker}=createQuadrotorBody(stage);
  body.matrixAutoUpdate=false;scene.add(body);
  const mesh=(geometry,material,parent,pos)=>{const item=new T.Mesh(geometry,material);item.position.set(...pos);parent.add(item);return item;};
  // Stationary reference plane, kept separate from the moving body frame.
  const reference=new T.Group();reference.position.y=-1.3;scene.add(reference);
  mesh(new T.CylinderGeometry(2.02,2.02,.035,80),new T.MeshStandardMaterial({color:0xf0f2f5,roughness:.9}),reference,[0,0,0]);
  const ring=new T.Mesh(new T.RingGeometry(1.92,1.93,96),new T.MeshBasicMaterial({color:0xc8d1dc,side:T.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.02;reference.add(ring);
  const axis=new T.ArrowHelper(new T.Vector3(1,0,0),new T.Vector3(-.6,.027,0),2.2,0xc5ccd5,.12,.07);reference.add(axis);
  const heading=new T.ArrowHelper(new T.Vector3(1,0,0),new T.Vector3(0,-1.23,0),1.6,0xf0a11a,.15,.09);scene.add(heading);
  const noseLabel=document.createElement('span');noseLabel.className='rig-scene-label rig-nose-label';noseLabel.textContent='机头 · +xᵇ';stage.appendChild(noseLabel);
  const bodyAxes=new T.Group();bodyAxes.position.set(0,0,-.25);body.add(bodyAxes);
  const axisLabels=[];
  for(const [direction,color,name] of [[new T.Vector3(1,0,0),0xcd625b,'xᵇ'],[new T.Vector3(0,1,0),0x56996a,'yᵇ'],[new T.Vector3(0,0,1),0x3e88b6,'zᵇ']]){
    bodyAxes.add(new T.ArrowHelper(direction,new T.Vector3(),.73,color,.08,.04));
    const anchor=new T.Object3D();anchor.position.copy(direction).multiplyScalar(.87);bodyAxes.add(anchor);
    const label=document.createElement('span');label.className='rig-scene-label rig-axis-label';label.textContent=name;label.style.color=`#${color.toString(16)}`;stage.appendChild(label);axisLabels.push({anchor,label});
  }
  let az=-.65,el=.78,drag=null,currentState=null;
  const v=new T.Vector3();
  function resize(){
    const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
    renderer.setSize(w,h,false);const half=Math.max(2.15,3.0*h/w);
    camera.left=-half*w/h;camera.right=half*w/h;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();
    if(currentState)render(currentState);
  }
  function positionLabel(label,anchor){
    anchor.getWorldPosition(v);v.project(camera);
    const pad=label.offsetWidth/2+8;
    label.style.left=`${Math.max(pad,Math.min(stage.clientWidth-pad,(v.x+1)*.5*stage.clientWidth))}px`;
    label.style.top=`${Math.max(12,Math.min(stage.clientHeight-12,(1-v.y)*.5*stage.clientHeight))}px`;
  }
  const neutral=new T.Color(0xf5f6f7),up=new T.Color(0x4b93e2),down=new T.Color(0xa2b2c5);
  const armNeutral=new T.Color(0xcbd2db);
  const poseColors=[new T.Color(0xdb716b),new T.Color(0x64ab76),new T.Color(0x569fcb)];
  function render(state){
    currentState=state;
    body.matrix.copy(attitudeMatrix(...state.pose));body.matrix.setPosition(0,state.lift??.45,0);body.matrixWorldNeedsUpdate=true;
    const shares=state.pose.map((angle,i)=>Math.abs(angle)/ATTITUDE_LIMITS[i]);
    const active=state.activeAxis??shares.indexOf(Math.max(...shares));
    materials.deck.color.copy(neutral).lerp(poseColors[active],Math.min(1,shares[active]*1.6));
    materials.arm.color.copy(armNeutral).lerp(poseColors[active],Math.min(1,shares[active])*.3);
    bodyAxes.visible=state.showAxes;
    axisLabels.forEach(a=>a.label.hidden=!state.showAxes);
    for(let i=0;i<4;i++){
      const m=motorParts[i],f=state.forces.thrusts[i],share=Math.min(1,Math.abs(f-64)/32);
      m.housingMaterial.color.copy(neutral).lerp(f>64?up:down,share);
      m.label.style.color=f>64.05?'#0066cc':f<63.95?'#687d98':'#606975';
      // Body z points down: viewed from above, CCW is a negative z rotation.
      m.propeller.rotation.z=-state.angles[i];
      const length=.12+f*.006;m.thrust.visible=m.tip.visible=f>.01;
      m.thrust.scale.y=length;m.thrust.position.z=-.41-length/2;
      m.tip.position.z=-.46-length;m.thrustMaterial.color.set(f>64?0x0066cc:0x99a7b9);
    }
    const yaw=state.pose[2]*Math.PI/180;
    heading.setDirection(new T.Vector3(Math.cos(yaw),0,Math.sin(yaw)));
    camera.position.set(7*Math.cos(el)*Math.cos(az),7*Math.sin(el),7*Math.cos(el)*Math.sin(az));camera.lookAt(target);
    renderer.render(scene,camera);
    positionLabel(noseLabel,noseMarker);motorParts.forEach(m=>positionLabel(m.label,m.labelAnchor));
    axisLabels.forEach(a=>positionLabel(a.label,a.anchor));
    stage.dataset.pose=state.pose.map(x=>x.toFixed(2)).join(',');
    stage.dataset.bodyColor=materials.deck.color.getHexString();
    stage.dataset.heading=rotationRows(state.pose)[0].map(x=>x.toFixed(3)).join(',');
  }
  const ro=new ResizeObserver(resize);ro.observe(stage);resize();
  renderer.domElement.style.touchAction='pan-y';
  renderer.domElement.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});
  renderer.domElement.addEventListener('pointermove',e=>{
    if(!drag)return;az+=(e.clientX-drag.x)*.007;el=Math.max(.15,Math.min(1.1,el+(e.clientY-drag.y)*.005));drag={x:e.clientX,y:e.clientY};if(currentState)render(currentState);
  });
  for(const name of ['pointerup','pointercancel'])renderer.domElement.addEventListener(name,()=>drag=null);
  return {render,resetCamera(){az=-.65;el=.78;if(currentState)render(currentState);}};
}
