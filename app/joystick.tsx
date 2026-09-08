'use client';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { joystickVector } from './controls';
export function Joystick({
  onMove,
  disabled,
}: {
  onMove: (x: number, y: number) => void;
  disabled: boolean;
}) {
  const active = useRef<number | null>(null),
    center = useRef({ x: 0, y: 0 }),
    move = useRef(onMove);
  const [stick, setStick] = useState({
    x: 0,
    y: 0,
    active: false,
    cx: 0,
    cy: 0,
  });
  useEffect(() => {
    move.current = onMove;
  }, [onMove]);
  function reset() {
    active.current = null;
    setStick({ x: 0, y: 0, active: false, cx: 0, cy: 0 });
    move.current(0, 0);
  }
  useEffect(() => {
    if (disabled) {
      active.current = null;
      move.current(0, 0);
    }
    const stop = () => {
      active.current = null;
      setStick({ x: 0, y: 0, active: false, cx: 0, cy: 0 });
      move.current(0, 0);
    };
    window.addEventListener('blur', stop);
    return () => {
      window.removeEventListener('blur', stop);
      move.current(0, 0);
    };
  }, [disabled]);
  const update = (e: PointerEvent<HTMLDivElement>) => {
    const v = joystickVector(
      e.clientX - center.current.x,
      e.clientY - center.current.y,
      44,
    );
    setStick({
      ...v,
      active: true,
      cx: center.current.x,
      cy: center.current.y,
    });
    move.current(v.x, v.y);
  };
  return (
    <div
      className="joystick-zone"
      aria-hidden="true"
      onPointerDown={(e) => {
        if (disabled || active.current !== null) return;
        e.preventDefault();
        active.current = e.pointerId;
        const rect = e.currentTarget.getBoundingClientRect();
        center.current = {
          x: Math.max(rect.left + 58, Math.min(rect.right - 58, e.clientX)),
          y: Math.max(rect.top + 58, Math.min(rect.bottom - 58, e.clientY)),
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => {
        if (active.current === e.pointerId) update(e);
      }}
      onPointerUp={(e) => {
        if (active.current === e.pointerId) reset();
      }}
      onPointerCancel={reset}
      onLostPointerCapture={reset}
    >
      <div
        className={
          'joystick-base ' + (!disabled && stick.active ? 'engaged' : '')
        }
        style={
          !disabled && stick.active
            ? {
                left: stick.cx,
                top: stick.cy,
                position: 'fixed',
              }
            : {}
        }
      >
        <span
          className="joystick-knob"
          style={{
            transform: `translate(${disabled ? 0 : stick.x * 44}px,${disabled ? 0 : stick.y * 44}px)`,
          }}
        />
      </div>
      <span className="joystick-label">드래그하여 이동</span>
    </div>
  );
}
