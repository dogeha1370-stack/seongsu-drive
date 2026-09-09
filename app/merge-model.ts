import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export function mergeModel(g: T.Group) {
  const byMaterial = new Map<T.Material,T.BufferGeometry[]>();
  g.updateMatrixWorld(true);
  for(const o of g.children.slice()) if(o instanceof T.Mesh && !Array.isArray(o.material)) {
    const geometry=o.geometry.clone().applyMatrix4(o.matrix);
    const list=byMaterial.get(o.material)||[];list.push(geometry);byMaterial.set(o.material,list);
    g.remove(o);o.geometry.dispose();
  }
  for(const [m,geometries] of byMaterial) {
    const merged=mergeGeometries(geometries,false);
    if(merged){const mesh=new T.Mesh(merged,m);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);}
    geometries.forEach(x=>x.dispose());
  }
  return g;
}
