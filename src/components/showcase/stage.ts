import * as THREE from "three";

/**
 * One full-screen WebGL canvas for the dashboard showcase:
 *  - the hero: fog, a car's headlights sweeping a circuit-board floor, a
 *    hooded figure walking through the beams, drifting embers and grain
 *    (a single fragment shader);
 *  - the city: tens of thousands of thin red vertical lines grouped into
 *    blocks that grow out of the ground, with a route traced through the
 *    streets (one draw call for the city, one for the route).
 * The page writes scroll progress into `state`; the stage only reads it.
 */

export type StageState = {
  /** Headlights power-on after the user enters (0–1). */
  intro: number;
  /** Hero scroll progress (0–1): the drive. */
  drive: number;
  /** Hero darkening as it hands over to the city (0–1). */
  heroFade: number;
  /** City visibility (0–1). */
  city: number;
  /** City camera path (0–1). */
  cityProgress: number;
  /** Pointer position in −1…1, both axes (y up). */
  pointerX: number;
  pointerY: number;
};

export type Stage = {
  state: StageState;
  start(): void;
  stop(): void;
  dispose(): void;
};

const BACKGROUND = new THREE.Color(0x05060a);

/* ------------------------------------------------------------------ */
/* Hero shader                                                          */
/* ------------------------------------------------------------------ */

const heroVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const heroFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 uRes;
  uniform float uTime;
  uniform float uIntro;
  uniform float uDrive;
  uniform float uFade;
  uniform vec2 uPointer;
  uniform float uOctaves;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 6; i++) {
      if (float(i) >= uOctaves) break;
      value += amplitude * noise(p);
      p = p * 2.03 + vec2(1.7, 9.2);
      amplitude *= 0.5;
    }
    return value;
  }

  float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
  }

  // A hooded figure seen from a high angle; feet at the origin, y up.
  float figure(vec2 p, float stride) {
    float hood = length((p - vec2(0.0, 0.062)) * vec2(1.0, 0.9)) - 0.017;
    float body = sdCapsule(p, vec2(0.0, 0.044), vec2(0.0, 0.012), 0.019);
    float legL = sdCapsule(p, vec2(-0.006, 0.012), vec2(-0.008 + stride, -0.026), 0.0062);
    float legR = sdCapsule(p, vec2(0.006, 0.012), vec2(0.008 - stride, -0.026), 0.0062);
    return min(min(hood, body), min(legL, legR));
  }

  // Circuit-board traces and vias on the floor.
  float circuit(vec2 g) {
    vec2 cell = floor(g);
    vec2 f = fract(g);
    float h = hash(cell);
    float trace = 0.0;
    if (h < 0.42) trace = 1.0 - smoothstep(0.025, 0.06, abs(f.y - 0.5));
    else if (h < 0.78) trace = 1.0 - smoothstep(0.025, 0.06, abs(f.x - 0.5));
    if (hash(cell + 7.13) > 0.72) trace = max(trace, 1.0 - smoothstep(0.07, 0.12, length(f - 0.5)));
    return trace;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uRes.x / uRes.y;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
    float t = uTime;
    float intro = 1.0 - pow(1.0 - clamp(uIntro, 0.0, 1.0), 3.0);

    // Fog: two warped fbm layers drifting slowly, nudged by the pointer.
    vec2 fp = p * 1.5 + vec2(t * 0.018 + uPointer.x * 0.04, t * 0.008 - uDrive * 0.4);
    float fog = fbm(fp + fbm(fp * 1.6 + vec2(0.0, t * 0.025)));
    vec3 col = vec3(0.019, 0.021, 0.032);
    col += vec3(0.085, 0.09, 0.105) * fog * fog * 1.6;

    // The car arrives from the top edge and creeps forward as you scroll.
    vec2 car = vec2(uPointer.x * 0.012, mix(0.78, 0.43, intro) - uDrive * 0.2);
    float beam = 0.0;
    float lamps = 0.0;
    for (int i = 0; i < 2; i++) {
      vec2 lamp = car + vec2(i == 0 ? -0.052 : 0.052, 0.0);
      vec2 d = p - lamp;
      float along = -d.y;
      float spread = 0.05 + max(along, 0.0) * 0.36;
      float lateral = abs(d.x + along * uPointer.x * 0.05) / spread;
      float cone = smoothstep(1.0, 0.1, lateral) * smoothstep(-0.01, 0.03, along);
      beam += cone * exp(-max(along, 0.0) * 1.9);
      lamps += exp(-length(d * vec2(1.0, 1.6)) * 70.0);
    }
    beam *= intro;
    lamps *= intro;

    // The floor the light falls on: grit plus circuit traces.
    vec2 g = (p + vec2(0.0, -uDrive * 0.32)) * 15.0;
    float grit = pow(fbm(g * 1.6), 1.5);
    float traces = circuit(g);
    float floorTone = 0.18 + 1.05 * grit;
    floorTone = mix(floorTone, 0.95, traces * 0.22);
    vec3 lit = vec3(0.58, 0.66, 0.78) * floorTone;

    // A figure walks down the road through the beams and casts a long shadow.
    vec2 walker = vec2(0.03 + sin(uDrive * 3.0) * 0.01, mix(0.24, -0.36, smoothstep(0.04, 0.96, uDrive)));
    const float FIGURE_SCALE = 0.58;
    vec2 fq = (p - walker) / FIGURE_SCALE;
    float stride = sin(uDrive * 70.0) * 0.006;
    float body = figure(fq, stride) * FIGURE_SCALE;
    float shadow = 0.0;
    if (fq.y < 0.0) {
      vec2 sq = vec2(fq.x / (1.0 + (-fq.y) * 1.4), -fq.y * 0.3);
      shadow = 1.0 - smoothstep(-0.002, 0.014, figure(sq, stride));
    }

    float light = beam * (1.0 - shadow * 0.85);
    col += lit * light;
    col += vec3(0.5, 0.55, 0.66) * beam * fog * 0.2;
    col += vec3(0.8, 0.85, 0.95) * lamps * 0.8;
    float silhouette = 1.0 - smoothstep(0.0, 0.0035, body);
    col = mix(col, vec3(0.012, 0.013, 0.02), silhouette * smoothstep(0.02, 0.2, beam + 0.04));

    // Red haze behind the title.
    float haze = exp(-pow(length((p - vec2(0.0, -0.03)) * vec2(0.85, 1.7)), 2.0) * 7.0);
    col += vec3(0.42, 0.04, 0.025) * haze * 0.55 * (0.4 + 0.6 * intro);

    // Embers drifting through the fog; they shy away from the pointer.
    vec2 pointer = uPointer * vec2(aspect, 1.0) * 0.5;
    for (int i = 0; i < 3; i++) {
      float layer = float(i);
      vec2 q = p * (5.0 + layer * 3.5);
      vec2 away = p - pointer;
      q += normalize(away + 1e-4) * exp(-length(away) * 7.0) * (0.5 + layer * 0.3);
      q.y += t * (0.06 + layer * 0.035) + uDrive * (1.0 + layer);
      q.x += sin(q.y * 0.6 + layer * 2.1) * 0.25;
      vec2 cell = floor(q);
      vec2 f = fract(q) - 0.5;
      float h = hash(cell + layer * 13.1);
      if (h > 0.88) {
        vec2 offset = vec2(hash(cell + 3.1), hash(cell + 5.7)) - 0.5;
        float d = length(f - offset * 0.6);
        float flicker = 0.55 + 0.45 * sin(t * (2.0 + h * 3.0) + h * 40.0);
        col += vec3(1.0, 0.13, 0.07) * smoothstep(0.07, 0.0, d) * flicker * (0.5 - layer * 0.12);
      }
    }

    // Faint vertical scratches, as on old film.
    float scratch = step(0.9965, hash(vec2(floor(uv.x * uRes.x / 3.0), floor(t * 6.0))));
    col += vec3(0.5, 0.08, 0.06) * scratch * 0.12;

    // Vignette, hand-over fade, grain.
    col *= smoothstep(1.2, 0.2, length(p * vec2(0.85, 1.15)));
    col = mix(col, vec3(0.0196, 0.0235, 0.039), clamp(uFade, 0.0, 1.0));
    col += (hash(uv * uRes + fract(t) * 91.7) - 0.5) * 0.045;

    gl_FragColor = vec4(pow(max(col, 0.0), vec3(0.92)), 1.0);
  }
`;

/* ------------------------------------------------------------------ */
/* City                                                                 */
/* ------------------------------------------------------------------ */

const cityVertex = /* glsl */ `
  attribute float aTop;
  attribute float aHeight;
  attribute float aDelay;
  uniform float uGrow;
  varying float vTop;
  varying float vDepth;
  varying float vHeight;

  void main() {
    float g = clamp(uGrow * 1.7 - aDelay * 0.7, 0.0, 1.0);
    g = 1.0 - pow(1.0 - g, 3.0);
    vec3 p = position;
    p.y = aTop * aHeight * g;
    vTop = aTop;
    vHeight = aHeight;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const cityFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uAlpha;
  uniform float uFogNear;
  uniform float uFogFar;
  varying float vTop;
  varying float vDepth;
  varying float vHeight;

  void main() {
    float fog = 1.0 - smoothstep(uFogNear, uFogFar, vDepth);
    float near = smoothstep(2.5, 10.0, vDepth);
    float body = mix(1.0, 0.15, vTop);
    float a = uAlpha * fog * near * body * 0.42;
    gl_FragColor = vec4(uColor, a);
  }
`;

const routeVertex = /* glsl */ `
  attribute float aProgress;
  varying float vProgress;
  void main() {
    vProgress = aProgress;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const routeFragment = /* glsl */ `
  precision highp float;
  uniform float uRoute;
  uniform float uAlpha;
  varying float vProgress;
  void main() {
    if (vProgress > uRoute) discard;
    float head = smoothstep(uRoute - 0.06, uRoute, vProgress);
    vec3 col = mix(vec3(1.0, 0.2, 0.12), vec3(1.0, 0.75, 0.6), head);
    gl_FragColor = vec4(col, uAlpha * (0.75 + head * 0.25));
  }
`;

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function valueNoise(x: number, z: number) {
  const n = Math.sin(x * 0.31 + z * 0.17) * 0.5 + Math.sin(x * 0.11 - z * 0.27 + 1.7) * 0.35 + Math.sin((x + z) * 0.53) * 0.15;
  return n * 0.5 + 0.5;
}

function buildCity(lite: boolean) {
  const random = seeded(4171);
  const blocks = lite ? 16 : 26;
  const spacing = 1.4;
  const half = (blocks * spacing) / 2;
  const linesPerSide = lite ? 4 : 6;

  const positions: number[] = [];
  const tops: number[] = [];
  const heights: number[] = [];
  const delays: number[] = [];

  const push = (x: number, z: number, top: number, height: number, delay: number) => {
    positions.push(x, 0, z);
    tops.push(top);
    heights.push(height);
    delays.push(delay);
  };

  for (let i = 0; i < blocks; i++) {
    for (let j = 0; j < blocks; j++) {
      const cx = -half + spacing * (i + 0.5);
      const cz = -half + spacing * (j + 0.5);
      const distance = Math.hypot(cx, cz) / half;

      // Downtown is taller; a few towers break the skyline.
      let height = 0.35 + Math.pow(valueNoise(i, j), 1.8) * 3.4 * (1.2 - distance * 0.7);
      if (random() > 0.93) height += 3 + random() * 6;
      height = Math.max(0.22, height);

      const w = 0.42 + random() * 0.12;
      const d = 0.42 + random() * 0.12;
      const delay = Math.min(1, distance * 0.75 + random() * 0.25);

      // Vertical lines along the four faces.
      for (let k = 0; k <= linesPerSide; k++) {
        const s = -1 + (2 * k) / linesPerSide;
        const edges: [number, number][] = [
          [cx + s * w, cz - d],
          [cx + s * w, cz + d],
          [cx - w, cz + s * d],
          [cx + w, cz + s * d],
        ];
        for (const [x, z] of edges) {
          push(x, z, 0, height, delay);
          push(x, z, 1, height, delay);
        }
      }

      // Roof and footprint outlines.
      const corners: [number, number][] = [
        [cx - w, cz - d],
        [cx + w, cz - d],
        [cx + w, cz + d],
        [cx - w, cz + d],
      ];
      for (let c = 0; c < 4; c++) {
        const [ax, az] = corners[c];
        const [bx, bz] = corners[(c + 1) % 4];
        push(ax, az, 1, height, delay);
        push(bx, bz, 1, height, delay);
        push(ax, az, 0, height, delay);
        push(bx, bz, 0, height, delay);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aTop", new THREE.Float32BufferAttribute(tops, 1));
  geometry.setAttribute("aHeight", new THREE.Float32BufferAttribute(heights, 1));
  geometry.setAttribute("aDelay", new THREE.Float32BufferAttribute(delays, 1));

  // Route through the streets: street lines sit between blocks.
  const street = (n: number) => -half + spacing * n;
  const waypoints: [number, number][] = [
    [street(1), street(blocks - 1)],
    [street(1), street(Math.round(blocks * 0.62))],
    [street(Math.round(blocks * 0.38)), street(Math.round(blocks * 0.62))],
    [street(Math.round(blocks * 0.38)), street(Math.round(blocks * 0.42))],
    [street(Math.round(blocks * 0.62)), street(Math.round(blocks * 0.42))],
    [street(Math.round(blocks * 0.62)), street(Math.round(blocks * 0.18))],
  ];

  const routePositions: number[] = [];
  const routeProgress: number[] = [];
  let total = 0;
  const lengths: number[] = [];
  for (let w = 1; w < waypoints.length; w++) {
    const length = Math.hypot(waypoints[w][0] - waypoints[w - 1][0], waypoints[w][1] - waypoints[w - 1][1]);
    lengths.push(length);
    total += length;
  }
  let travelled = 0;
  for (let w = 1; w < waypoints.length; w++) {
    const [ax, az] = waypoints[w - 1];
    const [bx, bz] = waypoints[w];
    // Split each leg so the reveal moves smoothly along it.
    const steps = 24;
    for (let s = 0; s < steps; s++) {
      const t0 = s / steps;
      const t1 = (s + 1) / steps;
      routePositions.push(ax + (bx - ax) * t0, 0.03, az + (bz - az) * t0);
      routePositions.push(ax + (bx - ax) * t1, 0.03, az + (bz - az) * t1);
      routeProgress.push((travelled + lengths[w - 1] * t0) / total, (travelled + lengths[w - 1] * t1) / total);
    }
    travelled += lengths[w - 1];
  }

  const route = new THREE.BufferGeometry();
  route.setAttribute("position", new THREE.Float32BufferAttribute(routePositions, 3));
  route.setAttribute("aProgress", new THREE.Float32BufferAttribute(routeProgress, 1));

  return { geometry, route, half };
}

/* Camera keyframes: high over the grid, then down to street level looking up. */
const CAMERA_POSITIONS = [
  new THREE.Vector3(0, 30, 33),
  new THREE.Vector3(-4.5, 15, 19),
  new THREE.Vector3(-3.6, 4.2, 9.5),
  new THREE.Vector3(-2.8, 0.75, 5.2),
];
const CAMERA_TARGETS = [
  new THREE.Vector3(0, 0, -3),
  new THREE.Vector3(1.5, 0.5, -8),
  new THREE.Vector3(1.5, 2.8, -14),
  new THREE.Vector3(0.6, 6.4, -17),
];

const smooth = (value: number) => value * value * (3 - 2 * value);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function createStage(
  canvas: HTMLCanvasElement,
  state: StageState,
  options: { lite: boolean; reduced: boolean },
): Stage {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.autoClear = false;
  renderer.setClearColor(BACKGROUND, 1);

  // Hero: a single triangle-pair covering the screen.
  const heroScene = new THREE.Scene();
  const heroCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const heroMaterial = new THREE.ShaderMaterial({
    vertexShader: heroVertex,
    fragmentShader: heroFragment,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uIntro: { value: 0 },
      uDrive: { value: 0 },
      uFade: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uOctaves: { value: options.lite ? 4 : 6 },
    },
  });
  const heroGeometry = new THREE.PlaneGeometry(2, 2);
  heroScene.add(new THREE.Mesh(heroGeometry, heroMaterial));

  // City.
  const city = buildCity(options.lite);
  const cityScene = new THREE.Scene();
  const cityCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
  const cityMaterial = new THREE.ShaderMaterial({
    vertexShader: cityVertex,
    fragmentShader: cityFragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uGrow: { value: 0 },
      uColor: { value: new THREE.Color(0xff3524) },
      uAlpha: { value: 0 },
      uFogNear: { value: 6 },
      uFogFar: { value: 46 },
    },
  });
  cityScene.add(new THREE.LineSegments(city.geometry, cityMaterial));

  const routeMaterial = new THREE.ShaderMaterial({
    vertexShader: routeVertex,
    fragmentShader: routeFragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uRoute: { value: 0 },
      uAlpha: { value: 0 },
    },
  });
  cityScene.add(new THREE.LineSegments(city.route, routeMaterial));

  const positionCurve = new THREE.CatmullRomCurve3(CAMERA_POSITIONS);
  const targetCurve = new THREE.CatmullRomCurve3(CAMERA_TARGETS);
  const cameraPosition = new THREE.Vector3();
  const cameraTarget = new THREE.Vector3();

  let width = 1;
  let height = 1;
  const resize = () => {
    width = Math.max(1, canvas.clientWidth);
    height = Math.max(1, canvas.clientHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, options.lite ? 1 : 1.5);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    heroMaterial.uniforms.uRes.value.set(width * ratio, height * ratio);
    cityCamera.aspect = width / height;
    cityCamera.updateProjectionMatrix();
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  // Pointer, eased toward the target every frame.
  let pointerX = 0;
  let pointerY = 0;

  let frame = 0;
  let running = false;
  const startedAt = performance.now();

  const render = () => {
    const time = options.reduced ? 12 : (performance.now() - startedAt) / 1000;
    pointerX += (state.pointerX - pointerX) * 0.06;
    pointerY += (state.pointerY - pointerY) * 0.06;

    renderer.clear();

    if (state.heroFade < 0.999) {
      const u = heroMaterial.uniforms;
      u.uTime.value = time;
      u.uIntro.value = state.intro;
      u.uDrive.value = state.drive;
      u.uFade.value = state.heroFade;
      u.uPointer.value.set(pointerX, pointerY);
      renderer.render(heroScene, heroCamera);
    }

    if (state.city > 0.001) {
      const p = clamp01(state.cityProgress);
      const eased = smooth(p);
      positionCurve.getPoint(eased, cameraPosition);
      targetCurve.getPoint(eased, cameraTarget);
      cameraPosition.x += Math.sin(time * 0.12) * 0.35 + pointerX * 0.9;
      cameraPosition.y += pointerY * 0.45;
      cameraTarget.x += pointerX * 0.4;
      cityCamera.position.copy(cameraPosition);
      cityCamera.lookAt(cameraTarget);

      cityMaterial.uniforms.uGrow.value = smooth(clamp01(p / 0.5));
      cityMaterial.uniforms.uAlpha.value = state.city;
      routeMaterial.uniforms.uRoute.value = smooth(clamp01((p - 0.28) / 0.6));
      routeMaterial.uniforms.uAlpha.value = state.city;
      renderer.render(cityScene, cityCamera);
    }
  };

  const loop = () => {
    render();
    frame = requestAnimationFrame(loop);
  };

  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
    } else if (running) {
      frame = requestAnimationFrame(loop);
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  return {
    state,
    start() {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
    },
    dispose() {
      running = false;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      heroGeometry.dispose();
      heroMaterial.dispose();
      city.geometry.dispose();
      city.route.dispose();
      cityMaterial.dispose();
      routeMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
