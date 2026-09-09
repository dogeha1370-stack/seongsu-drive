import * as T from 'three';
export const WEAPONS = [
  { name: '권총', damage: 35, cooldown: .3, range: 65, magazine: 12, reload: 2 },
  { name: 'AK-47', damage: 28, cooldown: .12, range: 75, magazine: 30, reload: 2.5 },
  { name: 'SCAR', damage: 32, cooldown: .16, range: 85, magazine: 30, reload: 2.3 },
  { name: '저격소총', damage: 85, cooldown: 1.2, range: 110, magazine: 5, reload: 3 },
] as const;
export function weaponModel(id: number) {
  const g = new T.Group();
  const part=(w:number,h:number,d:number,c:string,x:number,y:number,z:number)=>{
    const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color:c,metalness:.3,roughness:.55}));m.position.set(x,y,z);g.add(m);return m;
  };
  const c=id===2?'#b9a17b':'#35404a';
  part(.14,.15,id?.65:.48,c,0,0,0);part(.12,.25,.14,'#222a30',0,-.16,-.11);
  if(id){
    part(.07,.07,id===3?.65:.38,'#242b2e',0,.015,.48);
    part(.12,.16,.4,id===1?'#875839':c,0,-.01,-.5);
    const mag=part(.1,.32,.17,'#22282b',0,-.21,.1);mag.rotation.x=id===1?-.22:0;
    part(.14,.14,.28,id===1?'#875839':c,0,0,.28);
    if(id===3){part(.1,.13,.1,c,0,.13,-.06);part(.13,.13,.38,'#101c22',0,.23,.02);part(.09,.09,.02,'#437b8b',0,.23,.22);}
    else part(.04,.06,.05,'#151b20',0,.12,.3);
  }
  return g;
}
