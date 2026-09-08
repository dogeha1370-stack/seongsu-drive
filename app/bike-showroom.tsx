'use client';
import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { createMotorcycle } from './motorcycle';
import { BIKES, won } from './life';
const colors = ['#81b6a8', '#e5cd83', '#abc8dc', '#de684d', '#8295eb'];
export function BikeShowroom({
  owned,
  cash,
  buy,
}: {
  owned: number;
  cash: number;
  buy: (tier: number) => void;
}) {
  const [selected, setSelected] = useState(Math.min(4, Math.max(0, owned + 1)));
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!host.current) return;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return;
    }
    const el = host.current,
      scene = new T.Scene(),
      camera = new T.PerspectiveCamera(35, 1, 0.1, 30);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(el.clientWidth, 220);
    camera.aspect = el.clientWidth / 220;
    camera.updateProjectionMatrix();
    camera.position.set(3, 2, 3.6);
    camera.lookAt(0, 0.85, 0);
    el.appendChild(renderer.domElement);
    const model = createMotorcycle(colors[selected], selected);
    scene.add(model, new T.HemisphereLight('#ffffff', '#778495', 3));
    const light = new T.DirectionalLight('#fff4d6', 3);
    light.position.set(3, 5, 2);
    scene.add(light);
    let frame = 0,
      last = performance.now();
    const draw = (now: number) => {
      model.rotation.y += Math.min(0.05, (now - last) / 1000) * 0.32;
      last = now;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    const resize = () => {
      renderer.setSize(el.clientWidth, 220);
      camera.aspect = el.clientWidth / 220;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      model.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.geometry.dispose();
          (o.material as T.Material).dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [selected]);
  const b = BIKES[selected];
  return (
    <section className="bike-showroom">
      <header>
        <small>SEONGSU MOTORS</small>
        <h3>내 다음 바이크</h3>
      </header>
      <div ref={host} className="bike-view" aria-label={b.name + ' 3D 모델'} />
      <div className="bike-options">
        {BIKES.map((v, i) => (
          <button
            key={v.name}
            aria-pressed={selected === i}
            onClick={() => setSelected(i)}
          >
            <span style={{ background: colors[i] }} />
            {v.name}
          </button>
        ))}
      </div>
      <h3>{b.name}</h3>
      <p>{Math.round(b.speed * 3.6)} km/h · 단계별 가속 · 디스크 브레이크</p>
      <strong>{won(b.price)}</strong>
      <button
        className="primary"
        disabled={selected <= owned || cash < b.price}
        onClick={() => buy(selected)}
      >
        {selected === owned
          ? '보유 중'
          : selected < owned
            ? '상위 모델 보유'
            : cash < b.price
              ? won(b.price - cash) + ' 더 필요'
              : '구매하고 출고하기'}
      </button>
    </section>
  );
}
