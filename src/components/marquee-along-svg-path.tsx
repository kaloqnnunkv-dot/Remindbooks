"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
  type SpringOptions,
} from "motion/react";

import { cn } from "./ui";

/**
 * Лента с елементи, движещи се по SVG крива.
 *
 * Позиционирането използва CSS `offset-path` — браузърът сам изчислява точката
 * върху кривата, което е далеч по-евтино от ръчно смятане на координати на
 * всеки кадър.
 *
 * Забележка към оригиналния образец: там hooks се извикваха вътре в `.map()`,
 * което нарушава правилата на React — при промяна в броя елементи (а тук той
 * зависи от заредените продукти) редът на hooks се разминава и React се
 * счупва. Затова всеки елемент е изнесен в собствен компонент.
 */

type PreserveAspectRatio = string;

interface CSSVariableInterpolation {
  property: string;
  from: number | string;
  to: number | string;
}

interface MarqueeAlongSvgPathProps {
  children: React.ReactNode;
  className?: string;

  path: string;
  pathId?: string;
  preserveAspectRatio?: PreserveAspectRatio;
  showPath?: boolean;

  width?: string | number;
  height?: string | number;
  viewBox?: string;

  baseVelocity?: number;
  direction?: "normal" | "reverse";
  easing?: (value: number) => number;
  slowdownOnHover?: boolean;
  slowDownFactor?: number;
  slowDownSpringConfig?: SpringOptions;

  useScrollVelocity?: boolean;
  scrollAwareDirection?: boolean;
  scrollSpringConfig?: SpringOptions;

  repeat?: number;

  draggable?: boolean;
  dragSensitivity?: number;
  dragVelocityDecay?: number;
  dragAwareDirection?: boolean;
  grabCursor?: boolean;

  enableRollingZIndex?: boolean;
  zIndexBase?: number;
  zIndexRange?: number;

  cssVariableInterpolation?: CSSVariableInterpolation[];

  responsive?: boolean;
}

/** Свежда стойност в интервала [min, max) с обхождане. */
function wrap(min: number, max: number, value: number): number {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

/**
 * Един елемент от лентата.
 *
 * Изнесен е отделно именно за да са hooks на фиксиран ред — вътре в `.map()`
 * броят им би се менял заедно с броя продукти.
 */
function MarqueeItem({
  child,
  itemIndex,
  totalItems,
  baseOffset,
  path,
  easing,
  zIndexOf,
  cssVariableInterpolation,
  hoverRef,
  draggable,
  grabCursor,
  ariaHidden,
}: {
  child: React.ReactNode;
  itemIndex: number;
  totalItems: number;
  baseOffset: MotionValue<number>;
  path: string;
  easing?: (value: number) => number;
  zIndexOf: (offsetDistance: number) => number | undefined;
  cssVariableInterpolation: CSSVariableInterpolation[];
  hoverRef: React.MutableRefObject<boolean>;
  draggable: boolean;
  grabCursor: boolean;
  ariaHidden: boolean;
}) {
  const offsetDistance = useTransform(baseOffset, (v) => {
    const position = (itemIndex * 100) / totalItems;
    const wrapped = wrap(0, 100, v + position);
    return `${easing ? easing(wrapped / 100) * 100 : wrapped}%`;
  });

  const numericDistance = useMotionValue(0);
  const zIndex = useTransform(numericDistance, (value) => zIndexOf(value) ?? 1);

  useEffect(() => {
    return offsetDistance.on("change", (value: string) => {
      const match = /^([\d.]+)%$/.exec(value);
      if (match?.[1]) numericDistance.set(parseFloat(match[1]));
    });
  }, [offsetDistance, numericDistance]);

  // Броят интерполации е константа за целия живот на компонента, затова
  // извикването на hooks в този map е безопасно.
  const first = cssVariableInterpolation[0];
  const second = cssVariableInterpolation[1];
  const var1 = useTransform(
    numericDistance,
    [0, 100],
    [first?.from ?? 0, first?.to ?? 0],
  );
  const var2 = useTransform(
    numericDistance,
    [0, 100],
    [second?.from ?? 0, second?.to ?? 0],
  );

  const cssVars: Record<string, MotionValue<string | number>> = {};
  if (first) cssVars[first.property] = var1;
  if (second) cssVars[second.property] = var2;

  return (
    <motion.div
      className={cn(
        "absolute left-0 top-0",
        draggable && grabCursor && "cursor-grab",
      )}
      style={{
        offsetPath: `path('${path}')`,
        offsetDistance,
        offsetRotate: "0deg",
        zIndex,
        willChange: "offset-distance",
        backfaceVisibility: "hidden",
        ...cssVars,
      }}
      aria-hidden={ariaHidden}
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
    >
      {child}
    </motion.div>
  );
}

export default function MarqueeAlongSvgPath({
  children,
  className,
  path,
  pathId,
  preserveAspectRatio = "xMidYMid meet",
  showPath = false,
  width = "100%",
  height = "100%",
  viewBox = "0 0 100 100",
  baseVelocity = 5,
  direction = "normal",
  easing,
  slowdownOnHover = false,
  slowDownFactor = 0.3,
  slowDownSpringConfig = { damping: 50, stiffness: 400 },
  useScrollVelocity = false,
  scrollAwareDirection = false,
  scrollSpringConfig = { damping: 50, stiffness: 400 },
  repeat = 3,
  draggable = false,
  dragSensitivity = 0.2,
  dragVelocityDecay = 0.96,
  dragAwareDirection = false,
  grabCursor = false,
  enableRollingZIndex = true,
  zIndexBase = 1,
  zIndexRange = 10,
  cssVariableInterpolation = [],
  responsive = false,
}: MarqueeAlongSvgPathProps) {
  const container = useRef<HTMLDivElement>(null);
  const marqueeContainerRef = useRef<HTMLDivElement>(null);
  const baseOffset = useMotionValue(0);

  // Уважаваме системната настройка за намалено движение.
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Мащабиране през DOM, а не през state — иначе всяко движение на прозореца
  // би предизвикало пререндериране на всички елементи.
  useEffect(() => {
    if (!responsive) return;
    const [, , vbW, vbH] = viewBox.split(" ").map(Number);
    const originalWidth = vbW || 100;
    const originalHeight = vbH || 100;

    const updateScale = () => {
      const wrapper = container.current;
      const inner = marqueeContainerRef.current;
      if (!wrapper || !inner) return;

      const scale = Math.min(
        wrapper.clientWidth / originalWidth,
        wrapper.clientHeight / originalHeight,
      );
      const offsetX = (wrapper.clientWidth - originalWidth * scale) / 2;
      const offsetY = (wrapper.clientHeight - originalHeight * scale) / 2;

      inner.style.width = `${originalWidth}px`;
      inner.style.height = `${originalHeight}px`;
      inner.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
      inner.style.transformOrigin = "top left";
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [responsive, viewBox]);

  const items = useMemo(() => {
    const arr = React.Children.toArray(children);
    return arr.flatMap((child, childIndex) =>
      Array.from({ length: repeat }, (_, repeatIndex) => ({
        child,
        repeatIndex,
        itemIndex: repeatIndex * arr.length + childIndex,
        key: `${childIndex}-${repeatIndex}`,
      })),
    );
  }, [children, repeat]);

  const zIndexOf = useCallback(
    (offsetDistance: number) =>
      enableRollingZIndex
        ? Math.floor(zIndexBase + (offsetDistance / 100) * zIndexRange)
        : undefined,
    [enableRollingZIndex, zIndexBase, zIndexRange],
  );

  const generatedId = useMemo(
    () => pathId ?? `marquee-path-${Math.random().toString(36).slice(2, 9)}`,
    [pathId],
  );

  const { scrollY } = useScroll({ container });
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, scrollSpringConfig);

  const isHovered = useRef(false);
  const isDragging = useRef(false);
  const dragVelocity = useRef(0);
  const directionFactor = useRef(direction === "normal" ? 1 : -1);

  const hoverFactorValue = useMotionValue(1);
  const defaultVelocity = useMotionValue(1);
  const smoothHoverFactor = useSpring(hoverFactorValue, slowDownSpringConfig);

  const velocityFactor = useTransform(
    useScrollVelocity ? smoothVelocity : defaultVelocity,
    [0, 1000],
    [0, 5],
    { clamp: false },
  );

  useAnimationFrame((_, delta) => {
    if (reducedMotion) return;

    if (isDragging.current && draggable) {
      baseOffset.set(baseOffset.get() + dragVelocity.current);
      dragVelocity.current *= 0.9;
      if (Math.abs(dragVelocity.current) < 0.01) dragVelocity.current = 0;
      return;
    }

    hoverFactorValue.set(
      isHovered.current && slowdownOnHover ? slowDownFactor : 1,
    );

    let moveBy =
      directionFactor.current *
      baseVelocity *
      (delta / 1000) *
      smoothHoverFactor.get();

    if (scrollAwareDirection && !isDragging.current) {
      if (velocityFactor.get() < 0) directionFactor.current = -1;
      else if (velocityFactor.get() > 0) directionFactor.current = 1;
    }

    moveBy += directionFactor.current * moveBy * velocityFactor.get();

    if (draggable) {
      moveBy += dragVelocity.current;
      if (dragAwareDirection && Math.abs(dragVelocity.current) > 0.1) {
        directionFactor.current = Math.sign(dragVelocity.current);
      }
      if (!isDragging.current && Math.abs(dragVelocity.current) > 0.01) {
        dragVelocity.current *= dragVelocityDecay;
      } else if (!isDragging.current) {
        dragVelocity.current = 0;
      }
    }

    baseOffset.set(baseOffset.get() + moveBy);
  });

  const lastPointer = useRef({ x: 0, y: 0 });

  return (
    <div
      ref={container}
      onPointerDown={(e) => {
        if (!draggable) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        if (grabCursor) e.currentTarget.style.cursor = "grabbing";
        isDragging.current = true;
        lastPointer.current = { x: e.clientX, y: e.clientY };
        dragVelocity.current = 0;
      }}
      onPointerMove={(e) => {
        if (!draggable || !isDragging.current) return;
        const dx = e.clientX - lastPointer.current.x;
        const dy = e.clientY - lastPointer.current.y;
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        dragVelocity.current = (dx > 0 ? magnitude : -magnitude) * dragSensitivity;
        lastPointer.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        if (!draggable) return;
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        isDragging.current = false;
        if (grabCursor) e.currentTarget.style.cursor = "grab";
      }}
      onPointerCancel={() => {
        isDragging.current = false;
      }}
      className={cn("relative", className)}
    >
      <div
        ref={marqueeContainerRef}
        className="relative"
        style={{ contain: "layout style" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={width}
          height={height}
          viewBox={viewBox}
          preserveAspectRatio={preserveAspectRatio}
          className="h-full w-full"
          aria-hidden="true"
        >
          <path
            id={generatedId}
            d={path}
            stroke={showPath ? "currentColor" : "none"}
            fill="none"
          />
        </svg>

        {items.map(({ child, repeatIndex, itemIndex, key }) => (
          <MarqueeItem
            key={key}
            child={child}
            itemIndex={itemIndex}
            totalItems={items.length}
            baseOffset={baseOffset}
            path={path}
            easing={easing}
            zIndexOf={zIndexOf}
            cssVariableInterpolation={cssVariableInterpolation}
            hoverRef={isHovered}
            draggable={draggable}
            grabCursor={grabCursor}
            ariaHidden={repeatIndex > 0}
          />
        ))}
      </div>
    </div>
  );
}
