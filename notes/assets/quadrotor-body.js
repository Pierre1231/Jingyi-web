import * as T from '../../vendor/three/three.module.js';

// Detailed X-layout aircraft, authored in body NED, shared by every notes figure.
export function createQuadrotorBody(stage) {
  const materials={
    shell:new T.MeshStandardMaterial({color:0xf5f6f7,roughness:.55,metalness:.22}),
    arm:new T.MeshStandardMaterial({color:0xcbd2db,roughness:.4,metalness:.42}),
    dark:new T.MeshStandardMaterial({color:0x384453,roughness:.5,metalness:.35}),
    nose:new T.MeshStandardMaterial({color:0xf5a623,roughness:.42,metalness:.15}),
    blade:new T.MeshStandardMaterial({color:0x596675,roughness:.52,metalness:.18}),
    blue:new T.MeshStandardMaterial({color:0x0066cc,roughness:.45,metalness:.2})
  };
  materials.deck=materials.shell.clone();
  const body=new T.Group();
  function mesh(geometry,material,parent=body,pos=[0,0,0],outline=true) {
    const item=new T.Mesh(geometry,material);item.position.set(...pos);parent.add(item);
    if(outline){const edges=new T.LineSegments(new T.EdgesGeometry(geometry,26),new T.LineBasicMaterial({color:0x687585,transparent:true,opacity:.32}));item.add(edges);}
    return item;
  }
  const box=(dimensions,material,parent,pos)=>mesh(new T.BoxGeometry(...dimensions),material,parent,pos);
  // Geometry is authored in body NED: cylinders' axes are turned onto body z.
  const cylinder=(r,h,material,parent,pos)=>{
    const m=mesh(new T.CylinderGeometry(r,r,h,40),material,parent,pos);m.rotation.x=Math.PI/2;return m;
  };
  box([.72,.58,.1],materials.deck,body,[0,0,0]);
  box([.5,.4,.12],materials.dark,body,[0,0,-.11]);
  box([.42,.32,.04],materials.deck,body,[0,0,-.19]);
  for(let i=-2;i<=2;i++)box([.33,.015,.008],materials.arm,body,[0,i*.05,-.215]);
  for(const x of [-.3,.3])for(const y of [-.23,.23])cylinder(.026,.018,materials.dark,body,[x,y,-.065]);
  // A large amber nose and two front arm strips remain visible through yaw.
  const nose=mesh(new T.ConeGeometry(.19,.48,3),materials.nose,body,[.59,0,-.045]);
  nose.rotation.z=-Math.PI/2;
  const noseMarker=new T.Object3D();noseMarker.position.set(1.18,0,-.06);body.add(noseMarker);
  const motorParts=[];
  for(let i=0;i<4;i++) {
    const phi=(45+i*90)*Math.PI/180,x=1.22*Math.cos(phi),y=1.22*Math.sin(phi);
    const arm=box([1.05,.12,.065],materials.arm,body,[x*.61,y*.61,.015]);arm.rotation.z=phi;
    if(x>0){const trim=box([.48,.055,.012],materials.nose,body,[x*.57,y*.57,-.026]);trim.rotation.z=phi;}
    const housingMaterial=materials.shell.clone();
    cylinder(.19,.055,materials.arm,body,[x,y,-.04]);
    const housing=cylinder(.145,.21,housingMaterial,body,[x,y,-.16]);
    cylinder(.16,.04,materials.dark,body,[x,y,-.285]);
    for(let j=0;j<8;j++){
      const angle=j*Math.PI/4;
      cylinder(.011,.21,materials.arm,body,[x+.146*Math.cos(angle),y+.146*Math.sin(angle),-.16]);
    }
    cylinder(.035,.1,materials.arm,body,[x,y,-.35]);
    const propeller=new T.Group();propeller.position.set(x,y,-.385);body.add(propeller);
    box([1.01,.085,.014],materials.blade,propeller,[0,0,0]);
    cylinder(.062,.045,materials.shell,propeller,[0,0,-.015]);
    const thrustMaterial=new T.MeshBasicMaterial({color:0x99a7b9,transparent:true,opacity:.48,depthWrite:false});
    const thrust=mesh(new T.CylinderGeometry(.006,.006,1,8),thrustMaterial,body,[x,y,-.75],false);
    thrust.rotation.x=Math.PI/2;
    const tip=mesh(new T.ConeGeometry(.035,.1,12),thrustMaterial,body,[x,y,-1.25],false);tip.rotation.x=-Math.PI/2;
    const labelAnchor=new T.Object3D();labelAnchor.position.set(x*1.12,y*1.12,.12);body.add(labelAnchor);
    const label=document.createElement('span');label.className='rig-scene-label rig-motor-label';label.textContent=`M${i+1}`;if(stage)stage.appendChild(label);
    motorParts.push({housingMaterial,propeller,thrust,tip,thrustMaterial,labelAnchor,label});
  }
  return {body,materials,motorParts,noseMarker};
}
