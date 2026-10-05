"use client";

import { useEffect, useRef } from "react";

type Node = { x: number; y: number; z: number; vx: number; vy: number; phase: number };
type Packet = { lane: number; t: number; speed: number };

const NODE_COUNT = 96;
const LINK_DISTANCE = 150;
const CURSOR_REACH = 220;

/**
 * Background layer behind every page except the dashboard showcase.
 * A perspective grid floor you fly over as you scroll, a constellation of
 * nodes that wakes up and links to the cursor, packets running along the
 * grid, and a soft aura that follows the pointer. 2D canvas, paused when
 * the tab is hidden; a single still frame when motion is reduced.
 */
export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let ratio = 1;

    let random = 1;
    const rand = () => (random = (random * 16807) % 2147483647) / 2147483647;

    let nodes: Node[] = [];
    const packets: Packet[] = Array.from({ length: 7 }, () => ({ lane: 0, t: 0, speed: 0 }));
    const resetPacket = (packet: Packet, initial = false) => {
      packet.lane = Math.floor(rand() * 15) - 7;
      packet.t = initial ? rand() : 0;
      packet.speed = 0.08 + rand() * 0.12;
    };

    const resize = () => {
      ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      random = 4171;
      const count = width < 700 ? Math.round(NODE_COUNT * 0.55) : NODE_COUNT;
      nodes = Array.from({ length: count }, () => ({
        x: rand() * width,
        y: rand() * height,
        z: 0.3 + rand() * 0.7,
        vx: (rand() - 0.5) * 0.12,
        vy: (rand() - 0.5) * 0.08,
        phase: rand() * Math.PI * 2,
      }));
      packets.forEach((packet) => resetPacket(packet, true));
    };
    resize();

    // Pointer (eased) and scroll (with velocity).
    const pointer = { x: width * 0.5, y: height * 0.35, tx: width * 0.5, ty: height * 0.35, active: false };
    let scrollY = window.scrollY;
    let lastScroll = scrollY;
    let velocity = 0;

    const onPointer = (event: PointerEvent) => {
      pointer.tx = event.clientX;
      pointer.ty = event.clientY;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    const onScroll = () => {
      scrollY = window.scrollY;
    };

    const drawAura = () => {
      const gradient = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 540);
      gradient.addColorStop(0, "rgba(124, 58, 237, 0.24)");
      gradient.addColorStop(0.45, "rgba(162, 28, 175, 0.08)");
      gradient.addColorStop(1, "rgba(0, 1, 32, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    };

    const drawGrid = (time: number) => {
      const horizon = height * 0.58;
      const vanishX = width / 2 + (pointer.x - width / 2) * 0.08;
      const depthLines = 18;
      const spread = width * 1.6;
      const travel = (scrollY * 0.0016 + time * 0.03) % 1;

      context.lineWidth = 1;

      // Lines running toward the horizon.
      for (let i = -14; i <= 14; i++) {
        const xBottom = width / 2 + (i / 14) * spread;
        const near = 1 - Math.min(1, Math.abs(xBottom - pointer.x) / (width * 0.6));
        const alpha = 0.08 + near * 0.14 + Math.min(0.08, Math.abs(velocity) * 0.003);
        const gradient = context.createLinearGradient(0, horizon, 0, height);
        gradient.addColorStop(0, "rgba(167, 139, 250, 0)");
        gradient.addColorStop(1, `rgba(167, 139, 250, ${alpha})`);
        context.strokeStyle = gradient;
        context.beginPath();
        context.moveTo(vanishX, horizon);
        context.lineTo(xBottom, height);
        context.stroke();
      }

      // Cross lines, spaced in perspective, sliding toward you as you scroll.
      for (let j = 0; j < depthLines; j++) {
        const z = (j + 1 - travel) / depthLines; // 0 near horizon … 1 at the viewer
        const y = horizon + (height - horizon) * Math.pow(z, 2.2);
        const distance = Math.abs(y - pointer.y);
        const glow = Math.max(0, 1 - distance / 260);
        const alpha = Math.pow(z, 1.3) * (0.14 + glow * 0.22);
        context.strokeStyle = `rgba(196, 181, 253, ${alpha})`;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      // Packets running down the grid lanes.
      for (const packet of packets) {
        const xBottom = width / 2 + (packet.lane / 14) * spread;
        const z = packet.t;
        const y = horizon + (height - horizon) * Math.pow(z, 2.2);
        const x = vanishX + (xBottom - vanishX) * Math.pow(z, 2.2);
        const size = 1 + z * 2.5;
        context.fillStyle = `rgba(240, 171, 252, ${0.15 + z * 0.55})`;
        context.fillRect(x - size / 2, y - size * 2.5, size, size * 5);
      }
    };

    const drawNodes = (time: number) => {
      const links: [Node, number, number][] = [];

      for (const node of nodes) {
        if (!reduced) {
          node.x += node.vx;
          node.y += node.vy;
          if (node.x < -20) node.x = width + 20;
          if (node.x > width + 20) node.x = -20;
          if (node.y < -20) node.y = height + 20;
          if (node.y > height + 20) node.y = -20;
        }
        // Deeper nodes move less with the page.
        let y = (node.y - scrollY * 0.12 * node.z) % (height + 40);
        if (y < -20) y += height + 40;
        let x = node.x;

        // Nodes lean toward the cursor when it is close.
        const dx = pointer.x - x;
        const dy = pointer.y - y;
        const distance = Math.hypot(dx, dy);
        if (pointer.active && distance < CURSOR_REACH) {
          const pull = (1 - distance / CURSOR_REACH) * 14 * node.z;
          x += (dx / (distance || 1)) * pull;
          y += (dy / (distance || 1)) * pull;
        }
        links.push([node, x, y]);
      }

      // Links between neighbours, brighter near the cursor.
      context.lineWidth = 1;
      for (let a = 0; a < links.length; a++) {
        const [, ax, ay] = links[a];
        for (let b = a + 1; b < links.length; b++) {
          const [, bx, by] = links[b];
          const d = Math.hypot(ax - bx, ay - by);
          if (d > LINK_DISTANCE) continue;
          const mid = Math.hypot((ax + bx) / 2 - pointer.x, (ay + by) / 2 - pointer.y);
          const near = pointer.active ? Math.max(0, 1 - mid / CURSOR_REACH) : 0;
          const alpha = (1 - d / LINK_DISTANCE) * (0.08 + near * 0.5);
          if (alpha < 0.01) continue;
          context.strokeStyle = `rgba(167, 139, 250, ${alpha})`;
          context.beginPath();
          context.moveTo(ax, ay);
          context.lineTo(bx, by);
          context.stroke();
        }
      }

      for (const [node, x, y] of links) {
        const d = Math.hypot(x - pointer.x, y - pointer.y);
        const near = pointer.active ? Math.max(0, 1 - d / CURSOR_REACH) : 0;
        const pulse = 0.5 + 0.5 * Math.sin(time * 1.4 + node.phase);
        const size = 1 + node.z * 1.4 + near * 1.6;
        context.fillStyle = `rgba(${near > 0.2 ? "240, 171, 252" : "196, 181, 253"}, ${0.18 + node.z * 0.3 * pulse + near * 0.5})`;
        context.fillRect(x - size / 2, y - size / 2, size, size);

        if (near > 0.35) {
          context.strokeStyle = `rgba(240, 171, 252, ${(near - 0.35) * 0.5})`;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(pointer.x, pointer.y);
          context.stroke();
        }
      }
    };

    let frame = 0;
    let last = performance.now();
    const draw = (now: number) => {
      const time = now / 1000;
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;

      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;
      velocity += (scrollY - lastScroll - velocity) * 0.2;
      lastScroll = scrollY;

      if (!reduced) {
        for (const packet of packets) {
          packet.t += packet.speed * delta * (1 + Math.min(4, Math.abs(velocity) * 0.05));
          if (packet.t > 1) resetPacket(packet);
        }
      }

      context.clearRect(0, 0, width, height);
      drawAura();
      drawGrid(reduced ? 0 : time);
      drawNodes(reduced ? 0 : time);
    };

    const loop = (now: number) => {
      draw(now);
      frame = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !reduced) frame = requestAnimationFrame(loop);
    };

    const onResize = () => {
      resize();
      if (reduced) draw(performance.now());
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    if (!reduced) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      frame = requestAnimationFrame(loop);
    } else {
      draw(performance.now());
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="ui-ambient" aria-hidden="true" />;
}
