import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import "./TrueFocus.css";

// react-bits.dev — TrueFocus (JS+CSS oficial, portado a TS). Usa framer-motion
// (ya instalado en el proyecto) en vez del paquete "motion/react" del snippet
// original — misma API para lo que este componente necesita.

export interface TrueFocusProps {
  sentence?: string;
  separator?: string;
  manualMode?: boolean;
  blurAmount?: number;
  borderColor?: string;
  glowColor?: string;
  animationDuration?: number;
  pauseBetweenAnimations?: number;
  className?: string;
  onSettle?: () => void;
}

interface FocusRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function TrueFocus({
  sentence = "True Focus",
  separator = " ",
  manualMode = false,
  blurAmount = 5,
  borderColor = "#177E89",
  glowColor = "rgba(53, 215, 195, 0.6)",
  animationDuration = 0.5,
  pauseBetweenAnimations = 1,
  className = "",
  onSettle,
}: TrueFocusProps) {
  const CYCLES_BEFORE_SETTLE = 2;

  const words = sentence.split(separator);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastActiveIndex, setLastActiveIndex] = useState<number | null>(null);
  const [settled, setSettled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const tickRef = useRef(0);
  const [focusRect, setFocusRect] = useState<FocusRect>({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    if (manualMode || settled) return;

    const interval = setInterval(
      () => {
        tickRef.current += 1;
        if (tickRef.current >= words.length * CYCLES_BEFORE_SETTLE) {
          clearInterval(interval);
          setSettled(true);
          return;
        }
        setCurrentIndex((prev) => (prev + 1) % words.length);
      },
      (animationDuration + pauseBetweenAnimations) * 1000
    );

    return () => clearInterval(interval);
  }, [manualMode, settled, animationDuration, pauseBetweenAnimations, words.length]);

  useEffect(() => {
    if (settled) onSettle?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled]);

  useEffect(() => {
    if (currentIndex === null || currentIndex === -1) return;
    if (!wordRefs.current[currentIndex] || !containerRef.current) return;

    const parentRect = containerRef.current.getBoundingClientRect();
    const activeRect = wordRefs.current[currentIndex]!.getBoundingClientRect();

    setFocusRect({
      x: activeRect.left - parentRect.left,
      y: activeRect.top - parentRect.top,
      width: activeRect.width,
      height: activeRect.height,
    });
  }, [currentIndex, words.length]);

  const handleMouseEnter = (index: number) => {
    if (manualMode) {
      setLastActiveIndex(index);
      setCurrentIndex(index);
    }
  };

  const handleMouseLeave = () => {
    if (manualMode && lastActiveIndex !== null) {
      setCurrentIndex(lastActiveIndex);
    }
  };

  return (
    <div className={`focus-container${settled ? " settled" : ""}${className ? ` ${className}` : ""}`} ref={containerRef}>
      {words.map((word, index) => {
        const isActive = index === currentIndex;
        const sharp = settled || isActive;
        return (
          <span
            key={index}
            ref={(el) => { wordRefs.current[index] = el; }}
            className={`focus-word ${manualMode ? "manual" : ""} ${isActive && !manualMode ? "active" : ""}`}
            style={{
              filter: sharp ? "blur(0px)" : `blur(${blurAmount}px)`,
              transition: settled ? "filter 0.7s ease" : `filter ${animationDuration}s ease`,
            }}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
          >
            {word}
          </span>
        );
      })}

      <motion.div
        className="focus-frame"
        animate={{
          x: focusRect.x,
          y: focusRect.y,
          width: focusRect.width,
          height: focusRect.height,
          opacity: settled ? 0 : currentIndex >= 0 ? 1 : 0,
        }}
        transition={{ duration: settled ? 0.8 : animationDuration, ease: "easeInOut" }}
        style={{ "--border-color": borderColor, "--glow-color": glowColor } as React.CSSProperties}
      >
        <span className="corner top-left" />
        <span className="corner top-right" />
        <span className="corner bottom-left" />
        <span className="corner bottom-right" />
      </motion.div>
    </div>
  );
}
