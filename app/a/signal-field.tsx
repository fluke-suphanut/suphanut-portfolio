"use client";
/* eslint-disable react-hooks/immutability -- three.js uniforms, camera and the wrapper style are mutated
   every frame inside useFrame; that is how react-three-fiber animates without re-rendering. */
// A's hero: a particle network drawn with react-three-fiber (design/a-signal-field.md sections 4.2, 5, 6).
// - intro: nodes gather from random spots into the network (1,400 ms) while the canvas fades in (800 ms, CSS)
// - idle: each node drifts about ±4 px
// - phones: 260 nodes / 320 links, DPR 1 (design value 400 was a starting point, tuned for AC5)
// - pointer (fine pointers only): nodes within 120 px of the cursor are pushed up to 12 px; camera tilts ±3°
// - scroll: camera z 10 → 14, network tilts 0 → 12° on x, links 0.15 → 0.35 opacity, canvas 1 → 0.2
// Loaded only after idle, never under reduced motion; the parent stops the frame loop off screen.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { buildNetwork, rng } from "./network";

const ACCENT = new THREE.Color("#5EEAD4");
const ACCENT_2 = new THREE.Color("#A78BFA");
const INTRO_MS = 1400;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

const SHARED_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uIntro;
  uniform vec2 uScale;
  uniform vec2 uMouse;
  uniform float uMouseOn;
  uniform float uRadius;
  uniform float uPush;
  uniform float uDrift;
  attribute vec3 aStart;
  attribute float aSeed;
  vec4 placeNode(vec3 target) {
    vec3 p = vec3(target.xy * uScale, target.z * uScale.y);
    p = mix(aStart, p, uIntro);
    float ph = aSeed * 6.2831;
    p.xy += vec2(sin(uTime * 0.785 + ph), cos(uTime * 0.7 + ph * 1.7)) * uDrift;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vec2 d = world.xy - uMouse;
    float dist = length(d);
    world.xy += (d / max(dist, 1e-4)) * uPush * (1.0 - smoothstep(0.0, uRadius, dist)) * uMouseOn;
    return world;
  }
`;

function Field({
  count,
  maxEdges,
  wrapper,
  onCompiled,
}: {
  count: number;
  maxEdges: number;
  wrapper: RefObject<HTMLDivElement | null>;
  onCompiled: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const { camera, size, gl, scene } = useThree();
  const t0 = useRef<number | null>(null);
  const tilt = useRef({ x: 0, y: 0, mx: 0, my: 0, on: 0 });

  const { pointsGeo, linesGeo, uniforms, lineUniforms } = useMemo(() => {
    const net = buildNetwork(count, maxEdges);
    const random = rng(count + 101); // seeded: same scatter on every load, and pure during render
    const start = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = random() * Math.PI * 2;
      const r = 6 + random() * 8;
      start.set([Math.cos(a) * r, Math.sin(a) * r, (random() - 0.5) * 8], i * 3);
      seeds[i] = random();
      (random() < 0.1 ? ACCENT_2 : ACCENT).toArray(colors, i * 3);
    }
    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute("position", new THREE.BufferAttribute(net.nodes, 3));
    pointsGeo.setAttribute("aStart", new THREE.BufferAttribute(start, 3));
    pointsGeo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    pointsGeo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));

    const n = net.edges.length;
    const lp = new Float32Array(n * 3), ls = new Float32Array(n * 3), lseed = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const i = net.edges[k];
      lp.set(net.nodes.subarray(i * 3, i * 3 + 3), k * 3);
      ls.set(start.subarray(i * 3, i * 3 + 3), k * 3);
      lseed[k] = seeds[i];
    }
    const linesGeo = new THREE.BufferGeometry();
    linesGeo.setAttribute("position", new THREE.BufferAttribute(lp, 3));
    linesGeo.setAttribute("aStart", new THREE.BufferAttribute(ls, 3));
    linesGeo.setAttribute("aSeed", new THREE.BufferAttribute(lseed, 1));

    const base = () => ({
      uTime: { value: 0 },
      uIntro: { value: 0 },
      uScale: { value: new THREE.Vector2(8, 4.5) },
      uMouse: { value: new THREE.Vector2(999, 999) },
      uMouseOn: { value: 0 },
      uRadius: { value: 1 },
      uPush: { value: 0.1 },
      uDrift: { value: 0.04 },
    });
    const uniforms = { ...base(), uSize: { value: 2.5 } };
    const lineUniforms = { ...base(), uOpacity: { value: 0.15 }, uColor: { value: ACCENT } };
    return { pointsGeo, linesGeo, uniforms, lineUniforms };
  }, [count, maxEdges]);

  const pointsMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `${SHARED_VERTEX}
          uniform float uSize;
          attribute vec3 aColor;
          varying vec3 vColor;
          void main() {
            vColor = aColor;
            vec4 mv = viewMatrix * placeNode(position);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = uSize * (10.0 / -mv.z);
          }`,
        fragmentShader: `
          varying vec3 vColor;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.1, d);
            gl_FragColor = vec4(vColor, a * 0.9);
          }`,
      }),
    [uniforms],
  );
  const linesMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: lineUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `${SHARED_VERTEX}
          void main() { gl_Position = projectionMatrix * viewMatrix * placeNode(position); }`,
        fragmentShader: `
          uniform float uOpacity;
          uniform vec3 uColor;
          void main() { gl_FragColor = vec4(uColor, uOpacity); }`,
      }),
    [lineUniforms],
  );

  const finePointer = useMemo(() => window.matchMedia("(pointer: fine)").matches, []);
  useEffect(() => {
    if (!finePointer) return; // touch screens: no pointer reaction
    const onMove = (e: PointerEvent) => {
      tilt.current.mx = (e.clientX / window.innerWidth) * 2 - 1;
      tilt.current.my = -((e.clientY / window.innerHeight) * 2 - 1);
      tilt.current.on = 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [finePointer]);

  useEffect(() => {
    let live = true;
    gl.compileAsync(scene, camera).then(() => live && onCompiled());
    return () => {
      live = false;
    };
    // run once per mounted field
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state) => {
    const now = performance.now();
    t0.current ??= now;
    const intro = easeOut(Math.min(1, (now - t0.current) / INTRO_MS));
    const cam = camera as THREE.PerspectiveCamera;
    const el = wrapper.current;
    const hero = el?.parentElement;
    const p = hero ? Math.min(1, Math.max(0, window.scrollY / Math.max(1, hero.offsetHeight))) : 0;

    // world units per CSS pixel at z = 0
    const visH = 2 * 10 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const upp = visH / size.height;
    const scale = new THREE.Vector2((visH * cam.aspect) / 2, visH / 2);

    // pointer: lerp 0.08 per frame toward the target tilt and repel point
    const tl = tilt.current;
    tl.x += (tl.my * THREE.MathUtils.degToRad(3) - tl.x) * 0.08;
    tl.y += (tl.mx * THREE.MathUtils.degToRad(3) - tl.y) * 0.08;
    const mouse = new THREE.Vector2(tl.mx * scale.x, tl.my * scale.y);

    for (const u of [uniforms, lineUniforms]) {
      u.uTime.value = state.clock.elapsedTime;
      u.uIntro.value = intro;
      u.uScale.value.copy(scale);
      u.uMouse.value.lerp(mouse, 0.08);
      u.uMouseOn.value = tl.on;
      u.uRadius.value = 120 * upp;
      u.uPush.value = 12 * upp;
      u.uDrift.value = 4 * upp;
    }
    uniforms.uSize.value = 2.5 * state.viewport.dpr;
    lineUniforms.uOpacity.value = 0.15 + 0.2 * p;

    cam.position.z = 10 + 4 * p;
    if (group.current) {
      group.current.rotation.x = THREE.MathUtils.degToRad(12) * p + tl.x;
      group.current.rotation.y = tl.y;
    }
    if (el) el.style.opacity = String(1 - 0.8 * p);
  });

  return (
    <group ref={group}>
      <lineSegments geometry={linesGeo} material={linesMat} />
      <points geometry={pointsGeo} material={pointsMat} />
    </group>
  );
}

export default function SignalField({
  active,
  wrapper,
  onReady,
  onLost,
}: {
  active: boolean;
  wrapper: RefObject<HTMLDivElement | null>;
  onReady: () => void;
  onLost: () => void;
}) {
  // Client-only module (loaded with ssr: false), so window is available here.
  // Phones get fewer nodes and DPR 1: Lighthouse mobile (AC5) runs on a 4x slower CPU.
  const [mobile] = useState(() => window.matchMedia("(max-width: 767px), (pointer: coarse)").matches);
  // No frame is drawn until the shaders finish compiling off the main thread (compileAsync),
  // so the first render never stalls on a synchronous program link.
  const [compiled, setCompiled] = useState(false);
  return (
    <Canvas
      dpr={mobile ? 1 : [1, 1.5]}
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      camera={{ position: [0, 0, 10], fov: 50, near: 0.1, far: 100 }}
      frameloop={active && compiled ? "always" : "never"}
      onCreated={({ gl }) => {
        gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
        gl.domElement.addEventListener("webglcontextlost", onLost);
      }}
      aria-hidden="true"
    >
      <Field
        count={mobile ? 260 : 1200}
        maxEdges={mobile ? 320 : 1800}
        wrapper={wrapper}
        onCompiled={() => {
          setCompiled(true);
          requestAnimationFrame(onReady);
        }}
      />
    </Canvas>
  );
}
