import * as T from '../../vendor/three/three.module.js';
const metal=(color)=>new T.MeshStandardMaterial({color,roughness:.55,metalness:.3});
function solid(group,geometry,material,position=[0,0,0]){
  const mesh=new T.Mesh(geometry,material);mesh.position.set(...position);group.add(mesh);
  const edges=new T.LineSegments(new T.EdgesGeometry(geometry,32),new T.LineBasicMaterial({color:0x778492,transparent:true,opacity:.24}));mesh.add(edges);return mesh;
}
function cylinder(group,radius,height,material,position){
  const mesh=solid(group,new T.CylinderGeometry(radius,radius,height,48),material,position);mesh.rotation.x=Math.PI/2;return mesh;
}
// Plate, machined rim, feet, corner fasteners, inlaid scale, label recess and ventilation slots.
export function instrumentBase(z){
  const group=new T.Group(),paper=metal(0xf1f3f6),silver=metal(0xcbd3dd),dark=metal(0x798696);
  cylinder(group,2.48,.10,paper,[0,0,z]);
  const rim=solid(group,new T.TorusGeometry(2.42,.025,8,96),silver,[0,0,z-.055]);
  for(let i=0;i<48;i++){
    const angle=i*Math.PI/24,major=i%4===0;
    const tick=solid(group,new T.BoxGeometry(major?.13:.065,.014,.008),silver,[2.32*Math.cos(angle),2.32*Math.sin(angle),z-.058]);tick.rotation.z=angle;
  }
  for(const x of [-1.42,1.42])for(const y of [-1.42,1.42]){
    cylinder(group,.12,.14,dark,[x,y,z+.10]);cylinder(group,.046,.016,silver,[x,y,z-.061]);
    const slot=solid(group,new T.BoxGeometry(.06,.011,.007),dark,[x,y,z-.072]);
  }
  solid(group,new T.BoxGeometry(.52,.20,.018),silver,[0,-1.95,z-.065]);
  for(let i=0;i<3;i++)solid(group,new T.BoxGeometry(.35-i*.045,.012,.004),dark,[0,-2.00+i*.045,z-.078]);
  for(let i=0;i<6;i++)solid(group,new T.BoxGeometry(.014,.22,.006),silver,[-.20+i*.08,1.97,z-.058]);
  return group;
}
// Calibrated rotating ring: continuous rim, edge-attached ticks and two coaxial bearing housings.
export function calibratedRing(radius,axis,color){
  const group=new T.Group(),ring=new T.Group(),surface=metal(color),silver=metal(0xc3ccd8),dark=metal(0x617083);
  solid(ring,new T.TorusGeometry(radius,.043,12,96),surface);
  for(let i=0;i<48;i++){
    const angle=i*Math.PI/24,major=i%4===0;
    const tick=solid(ring,new T.BoxGeometry(major?.075:.037,.014,.012),silver,[radius*Math.cos(angle),radius*Math.sin(angle),-.046]);tick.rotation.z=angle;
  }
  // Bearings land on the ring at diametrically opposed points.
  for(const sign of [-1,1]){
    const bearing=solid(ring,new T.CylinderGeometry(.11,.11,.15,32),silver,[sign*radius,0,0]);bearing.rotation.z=Math.PI/2;
    const cap=solid(ring,new T.CylinderGeometry(.057,.057,.17,24),dark,[sign*radius,0,0]);cap.rotation.z=Math.PI/2;
  }
  if(axis==='x')ring.rotation.y=Math.PI/2;if(axis==='y')ring.rotation.x=Math.PI/2;
  group.add(ring);return group;
}
// A telescopic measurement rod with terminal joints and scale collars. Endpoint is the vector itself.
export function measuringRod(color){
  const group=new T.Group(),shaft=new T.Group();group.add(shaft);
  const material=metal(color),silver=metal(0xcbd3dd);
  const rod=solid(shaft,new T.CylinderGeometry(.029,.029,1,24),material,[0,.5,0]);
  const base=solid(shaft,new T.SphereGeometry(.074,24,16),silver);
  const tip=solid(shaft,new T.SphereGeometry(.050,24,16),material,[0,1,0]);
  const collars=[];for(let i=0;i<12;i++)collars.push(solid(shaft,new T.CylinderGeometry(.037,.037,.015,24),silver,[0,(i+1)/13,0]));
  group.set=v=>{
    const length=v.length();group.visible=length>1e-8;if(!group.visible)return;
    shaft.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize());
    rod.scale.y=length;rod.position.y=length/2;tip.position.y=length;
    collars.forEach((collar,i)=>collar.position.y=length*(i+1)/13);
  };
  return group;
}
