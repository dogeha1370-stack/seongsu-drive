import * as T from 'three';
import { mergeModel } from './merge-model';
export function sportsCar(kind: number, color: string) {
  const g = new T.Group();
  g.name = ['Ferrari 296-inspired', 'Lamborghini Revuelto-inspired', 'Porsche 911-inspired'][kind % 3];
  const body = new T.MeshStandardMaterial({ color, roughness: .3, metalness: .45, flatShading: true });
  const material = (c: string) => new T.MeshStandardMaterial({ color: c, roughness: .4 });
  const dark = material('#14222c'), rubber = material('#121518'), alloy = material('#b9c3cd');
  const part = (w: number, h: number, d: number, x: number, y: number, z: number, m: T.Material = body) => {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), m); mesh.position.set(x,y,z); g.add(mesh); return mesh;
  };
  const oval = (x: number,y: number,z: number,sx: number,sy: number,sz: number,m: T.Material) => {
    const mesh = new T.Mesh(new T.SphereGeometry(1,12,8),m); mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);g.add(mesh);return mesh;
  };
  part(2.22,.38,4.25,0,.64,0); part(2.3,.1,4.35,0,.4,0,dark);
  if (kind % 3 === 2) {
    oval(0,1,-.3,1.02,.67,1.45,body); oval(0,1.13,-.25,.9,.48,1.05,dark);
    part(.8,.08,1.6,0,1.58,-.35); oval(0,.79,1.2,1.08,.24,.94,body);
    for(const s of [-1,1]) oval(s*.78,.94,1.8,.24,.24,.12,material('#fff2c9'));
  } else {
    const hood = part(2.15,.25,1.4,0,.79,1.28); hood.rotation.x=-.12;
    const glass = part(1.72,.58,1.7,0,1.13,-.27,dark); glass.rotation.x=.12;
    part(1.56,.12,1.0,0,1.45,-.4); part(2.05,.27,1.15,0,.94,-1.45);
    for(const s of [-1,1]) {
      part(.09,.44,1.7,s*.86,1.1,-.25); part(.14,.23,1.1,s*1.07,.65,-.25,dark);
      const lamp=part(.65,.07,.1,s*.69,.85,2.08,material('#fff3cf')); lamp.rotation.z=s*.12;
      if(kind%3===1) { const slash=part(.07,.28,.11,s*.55,.76,2.09,material('#fff3cf'));slash.rotation.z=s*.5; }
    }
  }
  for(const s of [-1,1]) {
    part(.3,.12,.32,s*1.12,1.16,.3,dark);
    for(const z of [-1.35,1.35]) {
      const wheel=new T.Mesh(new T.CylinderGeometry(.46,.46,.28,16),rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(s*1.1,.49,z);g.add(wheel);
      const rim=new T.Mesh(new T.CylinderGeometry(.32,.32,.29,10),alloy);rim.rotation.z=Math.PI/2;rim.position.copy(wheel.position);g.add(rim);
      for(let i=0;i<5;i++){const spoke=part(.3,.035,.6,s*1.11,.49,z,dark);spoke.rotation.x=i*Math.PI/5;}
    }
    part(.72,.1,.1,s*.67,.86,-2.15,material('#ef3434'));
    part(.3,.16,.24,s*.7,.49,-2.2,dark);
  }
  part(1.3,.2,.1,0,.6,2.18,dark);
  if(kind%3===1) {part(2,.12,.5,0,1.13,-1.85,dark);for(const s of [-1,1])part(.1,.25,.1,s*.7,.97,-1.8,dark);}
  g.userData.model = kind%3;
  return mergeModel(g);
}
