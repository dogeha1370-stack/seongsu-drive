export type Body={x:number;z:number;angle:number;vx:number;vz:number;spin:number;mass:number;stun:number};
const halfW=1.25,halfL=2.2;
export function body(x:number,z:number,angle=0,mass=1100):Body{return{x,z,angle,vx:0,vz:0,spin:0,mass,stun:0}}
export function collide(a:Body,b:Body):number{
 const axes=(p:Body)=>[{x:Math.cos(p.angle),z:-Math.sin(p.angle)},{x:Math.sin(p.angle),z:Math.cos(p.angle)}];
 const aa=axes(a),bb=axes(b),dx=b.x-a.x,dz=b.z-a.z;let depth=Infinity,nx=0,nz=0;
 for(const n of [...aa,...bb]){const radius=(ax:typeof aa)=>halfW*Math.abs(n.x*ax[0].x+n.z*ax[0].z)+halfL*Math.abs(n.x*ax[1].x+n.z*ax[1].z);const distance=dx*n.x+dz*n.z,overlap=radius(aa)+radius(bb)-Math.abs(distance);if(overlap<=0)return 0;if(overlap<depth){depth=overlap;const s=distance<0?-1:1;nx=n.x*s;nz=n.z*s}}
 const ia=1/a.mass,ib=1/b.mass;const correction=(depth+.002)/(ia+ib);a.x-=nx*correction*ia;a.z-=nz*correction*ia;b.x+=nx*correction*ib;b.z+=nz*correction*ib;
 // Midpoint contact with a bounded lever arm produces spin on glancing impacts.
 const tx=-nz,tz=nx,offset=Math.max(-1.4,Math.min(1.4,(dx*tx+dz*tz)*.5));const raX=nx*1.4+tx*offset,raZ=nz*1.4+tz*offset,rbX=-nx*1.4-tx*offset,rbZ=-nz*1.4-tz*offset;
 const cross=(x:number,z:number)=>z*nx-x*nz;const ca=cross(raX,raZ),cb=cross(rbX,rbZ),invInertiaA=ia/2.14,invInertiaB=ib/2.14;
 const rel=(b.vx+b.spin*rbZ-a.vx-a.spin*raZ)*nx+(b.vz-b.spin*rbX-a.vz+a.spin*raX)*nz;if(rel>=0)return 0;
 const j=-(1+.28)*rel/(ia+ib+ca*ca*invInertiaA+cb*cb*invInertiaB);a.vx-=j*nx*ia;a.vz-=j*nz*ia;b.vx+=j*nx*ib;b.vz+=j*nz*ib;a.spin-=j*ca*invInertiaA;b.spin+=j*cb*invInertiaB;
 if(-rel>1.5){a.stun=Math.max(a.stun,Math.min(3,-rel*.15));b.stun=Math.max(b.stun,Math.min(3,-rel*.15))}return -rel;
}
export function integrate(p:Body,dt:number,blocked:(x:number,z:number,r:number)=>boolean){let impact=0;p.stun=Math.max(0,p.stun-dt);const oldX=p.x,oldZ=p.z;const nx=p.x+p.vx*dt,nz=p.z+p.vz*dt;if(!blocked(nx,oldZ,2.3))p.x=nx;else{impact=Math.max(impact,Math.abs(p.vx));p.vx*=-.3;p.spin*=.6}if(!blocked(p.x,nz,2.3))p.z=nz;else{impact=Math.max(impact,Math.abs(p.vz));p.vz*=-.3;p.spin*=.6}p.angle+=p.spin*dt;p.spin*=Math.exp(-2.6*dt);const drag=Math.exp(-.32*dt);p.vx*=drag;p.vz*=drag;if(!Number.isFinite(p.x+p.z+p.angle)){p.x=oldX;p.z=oldZ;p.vx=p.vz=p.spin=0;p.angle=0}return impact}
