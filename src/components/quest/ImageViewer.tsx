"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import Icon from "./Icon";
import styles from "./quest.module.css";

const MAX_SCALE = 4;

/**
 * Картинка на весь экран поверх экрана квеста: тёмный полупрозрачный фон,
 * по ширине экрана. Приближение двумя пальцами, сдвиг одним, двойное нажатие — ×2.
 * Закрыть — крестиком или нажатием мимо картинки. Звук при этом не трогаем.
 */
export default function ImageViewer({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; mid: { x: number; y: number }; start: typeof view } | null>(null);
  const moved = useRef(false);

  const points = () => [...pointers.current.values()];
  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
  const middle = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  const beginGesture = () => {
    const [a, b] = points();
    gesture.current = b
      ? { dist: distance(a, b), mid: middle(a, b), start: view }
      : { dist: 0, mid: a, start: view };
  };

  const onDown = (e: PointerEvent) => {
    try {
      // Палец, ушедший за край картинки, всё равно продолжает жест
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Не во всех браузерах — жест работает и без этого
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    beginGesture();
  };

  const onMove = (e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const [a, b] = points();
    const g = gesture.current;
    if (b && g.dist) {
      const mid = middle(a, b);
      const scale = Math.min(MAX_SCALE, Math.max(1, (g.start.scale * distance(a, b)) / g.dist));
      setView({ scale, x: g.start.x + mid.x - g.mid.x, y: g.start.y + mid.y - g.mid.y });
      moved.current = true;
    } else if (!b && g.start.scale > 1) {
      setView({ ...g.start, x: g.start.x + a.x - g.mid.x, y: g.start.y + a.y - g.mid.y });
      moved.current = true;
    }
  };

  const onUp = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size) beginGesture();
    else {
      gesture.current = null;
      setView((v) => (v.scale <= 1.02 ? { scale: 1, x: 0, y: 0 } : v));
    }
  };

  return (
    <div
      className={styles.viewer}
      role="dialog"
      aria-modal="true"
      aria-label="Картинка на весь экран"
      onClick={(e) => {
        // Нажатие мимо картинки закрывает (но не после жеста приближения)
        if (e.target === e.currentTarget && !moved.current) onClose();
      }}
    >
      <button type="button" className={styles.viewerClose} onClick={onClose} aria-label="Закрыть">
        <Icon name="close" size={24} />
      </button>
      <div
        className={styles.viewerContent}
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={() => setView((v) => (v.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: 2, x: 0, y: 0 }))}
      >
        {children}
      </div>
    </div>
  );
}
