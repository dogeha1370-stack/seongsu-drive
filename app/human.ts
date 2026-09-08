import * as T from 'three';
export type HumanRig={root:T.Group;hips:T.Bone;head:T.Bone;arms:T.Bone[];elbows:T.Bone[];legs:T.Bone[];knees:T.Bone[];pose:(time:number,speed:number,punch:number,down?:boolean)=>void};
export function createHuman(shirt:string,skin='#cda17e',hair='#302923'):HumanRig{
 const root=new T.Group();const materials=new Map<string,T.MeshStandardMaterial>();const material=(c:string)=>{if(!materials.has(c))materials.set(c,new T.MeshStandardMaterial({color:c,roughness:.85}));return materials.get(c)!};
 function mesh(geo:T.BufferGeometry,c:string,parent:T.Object3D,x=0,y=0,z=0){const m=new T.Mesh(geo,material(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
 function oval(x:number,y:number,z:number,c:string,parent:T.Object3D,px=0,py=0,pz=0){const m=mesh(new T.SphereGeometry(1,12,10),c,parent,px,py,pz);m.scale.set(x,y,z);return m}
 function bone(name:string,parent:T.Object3D,x:number,y:number,z=0){const b=new T.Bone();b.name=name;b.position.set(x,y,z);parent.add(b);return b}
 const hips=bone('hips',root,0,.92),spine=bone('spine',hips,0,.25),chest=bone('chest',spine,0,.3),neck=bone('neck',chest,0,.22),head=bone('head',neck,0,.29);
 oval(.29,.2,.19,'#34465b',hips);const torso=mesh(new T.CylinderGeometry(.32,.25,.55,12),shirt,spine,0,.08);torso.scale.z=.65;
 oval(.34,.16,.21,shirt,chest,0,-.03);mesh(new T.CylinderGeometry(.105,.12,.19,10),skin,neck,0,.015);
 oval(.235,.29,.215,skin,head);oval(.23,.12,.215,hair,head,0,.225,-.025);oval(.225,.21,.095,hair,head,0,.07,-.15);
 for(const side of [-1,1]){oval(.045,.075,.04,skin,head,side*.235,-.01);oval(.07,.045,.025,'#fff5e9',head,side*.09,.055,.19);oval(.026,.029,.015,'#292c30',head,side*.09,.054,.215);const brow=mesh(new T.BoxGeometry(.115,.023,.026),hair,head,side*.09,.12,.203);brow.rotation.z=side*-.08}
 oval(.044,.06,.07,skin,head,0,-.015,.216);oval(.072,.018,.018,'#875448',head,0,-.12,.19);
 // Front-only collar, zipper, and nose make facing direction unambiguous.
 mesh(new T.BoxGeometry(.025,.4,.02),'#c7c6b9',spine,0,.07,.216);mesh(new T.TorusGeometry(.105,.025,5,12,Math.PI),'#e8ded0',chest,0,.08,.16);
 const arms:T.Bone[]=[],elbows:T.Bone[]=[],legs:T.Bone[]=[],knees:T.Bone[]=[];
 for(const side of [-1,1]){const shoulder=bone(side<0?'left_shoulder':'right_shoulder',chest,side*.37,-.025),elbow=bone('elbow',shoulder,0,-.32),wrist=bone('wrist',elbow,0,-.3);mesh(new T.CapsuleGeometry(.105,.18,4,10),shirt,shoulder,0,-.16);oval(.1,.1,.1,shirt,elbow);mesh(new T.CapsuleGeometry(.082,.17,4,10),skin,elbow,0,-.15);oval(.09,.105,.07,skin,wrist,0,-.05,.018);oval(.035,.065,.035,skin,wrist,-side*.07,-.035,.06);arms.push(shoulder);elbows.push(elbow);
 const thigh=bone(side<0?'left_hip':'right_hip',hips,side*.16,-.035),knee=bone('knee',thigh,0,-.39),ankle=bone('ankle',knee,0,-.38);mesh(new T.CapsuleGeometry(.12,.23,4,10),'#34465b',thigh,0,-.19);oval(.108,.105,.105,'#34465b',knee);mesh(new T.CapsuleGeometry(.095,.22,4,10),'#34465b',knee,0,-.18);oval(.12,.085,.21,'#e6e5db',ankle,0,-.02,.09);legs.push(thigh);knees.push(knee)}
 const pose=(time:number,speed:number,punch:number,down=false)=>{const amount=down?0:Math.min(speed/5,1),cycle=time*(speed>6?13:9);hips.position.y=.92+Math.abs(Math.sin(cycle))*.025*amount;for(let i=0;i<2;i++){const phase=cycle+i*Math.PI;legs[i].rotation.x=Math.sin(phase)*.65*amount;knees[i].rotation.x=Math.max(0,-Math.sin(phase))*.7*amount;arms[i].rotation.set(-Math.sin(phase)*.42*amount,0,(i===0?1:-1)*.08);elbows[i].rotation.x=-.12-Math.max(0,Math.sin(phase))*.25*amount}if(punch>0&&!down){arms[1].rotation.x=-1.7*punch;elbows[1].rotation.x=-.7*(1-punch);spine.rotation.y=-.18*punch}else spine.rotation.y=0;head.rotation.y=0};pose(0,0,0);
 return{root,hips,head,arms,elbows,legs,knees,pose};
}
