"use client";

import { useEffect, useRef } from "react";

type P = {
  x: number; y: number; size: number;
  vy: number; vx: number; opacity: number;
  rotation: number; rotSpeed: number;
  shape: 0 | 1 | 2 | 3; color: string;
};

const COLORS = [
  "rgba(255,255,255,0.9)",
  "rgba(255,240,180,0.85)",
  "rgba(255,210,100,0.75)",
  "rgba(255,255,200,0.8)",
];

function flower5(ctx: CanvasRenderingContext2D, r: number) {
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.65, r * 0.28, r * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

function flower6(ctx: CanvasRenderingContext2D, r: number) {
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI * 2) / 6);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.6, r * 0.22, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function petal(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.3, r, 0, 0, Math.PI * 2);
  ctx.fill();
}

function diamond(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.5, 0);
  ctx.lineTo(0, r);
  ctx.lineTo(-r * 0.5, 0);
  ctx.closePath();
  ctx.fill();
}

function spawn(w: number, h: number, fromTop?: boolean): P {
  return {
    x: Math.random() * w,
    y: fromTop ? -20 : Math.random() * h,
    size: Math.random() * 15 + 5,
    vy: Math.random() * 0.6 + 0.25,
    vx: (Math.random() - 0.5) * 0.5,
    opacity: Math.random() * 0.55 + 0.1,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.022,
    shape: (Math.floor(Math.random() * 4)) as 0 | 1 | 2 | 3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}

export function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0;
    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const COUNT = 50;
    const particles: P[] = Array.from({ length: COUNT }, () => spawn(w || 800, h || 400));

    let animId: number;

    function draw() {
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === 0) flower5(ctx, p.size);
        else if (p.shape === 1) flower6(ctx, p.size);
        else if (p.shape === 2) petal(ctx, p.size);
        else diamond(ctx, p.size);

        ctx.restore();

        // Gentle swaying via slow sinusoidal drift
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.y * 0.012) * 0.25;
        p.rotation += p.rotSpeed;

        if (p.y > h + p.size * 3) {
          Object.assign(p, spawn(w, h, true));
        }
      }

      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
