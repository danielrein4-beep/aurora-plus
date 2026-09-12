import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/**
 * Botón que se "acerca" un poco al cursor cuando pasa cerca — efecto sutil de
 * sitios premium. Se desactiva solo con prefers-reduced-motion (el usuario del
 * sistema pidió menos animación) delegando en el spring de Framer Motion, que
 * ya respeta esa preferencia a nivel de reduced-motion global del navegador.
 */
export default function MagneticButton({
  children,
  onClick,
  className = "",
  strength = 0.35,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 15, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 200, damping: 15, mass: 0.4 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set(relX * strength);
    y.set(relY * strength);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className={className}
    >
      {children}
    </motion.button>
  );
}
