import * as T from 'three';
import { mergeModel } from './merge-model';
export const LANDMARKS: Record<number, {name:string; style:number}> = {
  0:{name:'ADERERROR',style:0},3:{name:'PRADA',style:1},7:{name:'MUSINSA',style:2},10:{name:'Aēsop',style:3},11:{name:'韓貞仙 · HANJUNGSUN',style:4},
};
export function landmark(style:number,name:string) {
  const g=new T.Group();g.name='landmark-'+name;
  const mats=new Map<string,T.MeshStandardMaterial>();
  const mat=(c:string)=>{if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,roughness:.85}));return mats.get(c)!;};
  const box=(w:number,h:number,d:number,c:string,x:number,y:number,z:number)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(c));m.position.set(x,y,z);g.add(m);return m;};
  const label=(text:string,w:number,y:number,z:number,bg:string,fg='#ffffff',x=0)=>{
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle=bg;ctx.fillRect(0,0,1024,256);ctx.fillStyle=fg;ctx.font='bold 100px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,128,980);
    const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
    const m=new T.Mesh(new T.PlaneGeometry(w,w/4),new T.MeshStandardMaterial({map:tex,roughness:.8}));m.position.set(x,y,z);g.add(m);
  };
  const h=style===0?10:style===2?8:6;
  const wall=['#704235','#d9e8bc','#894f3e','#686953','#a46d42'][style];
  box(30,h,34,wall,0,h/2,0);
  if(style===0 || style===2 || style===3) {
    for(let y=.4;y<h;y+=.48) box(30,.025,.04,'#b49b80',0,y,17.03);
    for(let y=.6;y<h;y+=.96) for(let x=-14;x<15;x+=2) box(.025,.46,.05,'#b49b80',x+(Math.round(y*10)%2),y,17.04);
  }
  if(style===0){
    for(const x of [-11,-4,4,11]) {box(4,1.7,.12,'#263938',x,7,17.12);box(4.2,.12,.15,'#c2c4b7',x,6.1,17.15);}
    label(name,15,9,17.22,wall);
  } else if(style===1) {
    for(let x=-14;x<=14;x+=1) for(let y=.5;y<6;y+=.85) {
      const tri=new T.Mesh(new T.CircleGeometry(.42,3),mat('#fafce9'));tri.position.set(x+(Math.round(y/.85)%2)*.4,y,17.12);g.add(tri);
    }
    box(15,4.4,.18,'#fafce9',0,2.2,17.2);box(13.8,3.8,.2,'#182524',0,1.9,17.31);
    label('PRADA',11,5.1,17.35,'#d9e8bc','#151d19');
  } else if(style===2) {
    for(const x of [-7.5,7.5]) {
      const roof=new T.Mesh(new T.CylinderGeometry(0,10.6,3,4),mat('#343c3d'));roof.rotation.y=Math.PI/4;roof.scale.z=2.3;roof.position.set(x,9,0);g.add(roof);
      label(name,11,6.8,17.4,wall,undefined,x);
    }
    for(const x of [-10,10]) {box(6,4.8,.15,'#dedab5',x,2.7,17.25);label('POP-UP',5,3.5,17.4,'#dedab5','#4b5960',x);label('SEONGSU',5,2.1,17.4,'#dedab5','#735064',x);}
  } else if(style===3) {
    const awning=box(29,.18,3,'#827068',0,4.5,18.2);awning.rotation.x=.12;
    box(29,.45,.1,'#66564e',0,4.15,19.7);label('Aēsop',8,5.3,17.3,wall);
  } else {
    for(let x=-14;x<=14;x+=.45) box(.025,6,.05,'#704529',x,3,17.04);
    box(29,.2,2.8,'#f4eddf',0,3.6,18.1);label(name,18,5,17.2,wall);
    for(const x of [-2.3,2.3])box(.4,3.2,1.1,'#774b31',x,1.6,18.2);
    box(5, .35,1.3,'#774b31',0,3.3,18.2);
  }
  if(style!==1) {
    box(style===2?12:27,3.1,.18,'#243a3e',0,1.7,17.15);
    for(let x=style===2?-5:-12;x<= (style===2?5:12);x+=3)box(.12,3.15,.24,'#c0bbaa',x,1.7,17.3);
  }
  box(4,.12,1.4,'#9b9b90',0,.1,17.8);
  return mergeModel(g);
}
