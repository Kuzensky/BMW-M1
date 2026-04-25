import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { animate, createTimeline, stagger } from 'animejs';

// ── Renderer ──────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// ── Scene ─────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060606);
scene.fog = new THREE.FogExp2(0x060606, 0.045);

// ── Camera ────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 8, 18); // intro start: high & far

// ── Lights ────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.3));

const keyLight = new THREE.DirectionalLight(0xfff5e0, 3.5);
keyLight.position.set(5, 8, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.1;
keyLight.shadow.camera.far = 30;
keyLight.shadow.camera.left = keyLight.shadow.camera.bottom = -8;
keyLight.shadow.camera.right = keyLight.shadow.camera.top = 8;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xaad4ff, 2);
rimLight.position.set(-6, 4, -6);
scene.add(rimLight);

const fillLight = new THREE.DirectionalLight(0xc8a96e, 0.5);
fillLight.position.set(0, -3, 0);
scene.add(fillLight);

const underLight = new THREE.PointLight(0xc8a96e, 0.8, 8);
underLight.position.set(0, -0.8, 0);
scene.add(underLight);

// ── Ground ────────────────────────────────────────────────
const shadowGround = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.ShadowMaterial({ opacity: 0.4 })
);
shadowGround.rotation.x = -Math.PI / 2;
shadowGround.position.y = -0.01;
shadowGround.receiveShadow = true;
scene.add(shadowGround);

const disc = new THREE.Mesh(
  new THREE.CircleGeometry(3.5, 64),
  new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.3 })
);
disc.rotation.x = -Math.PI / 2;
disc.position.y = -0.005;
disc.receiveShadow = true;
scene.add(disc);

// ── Camera waypoints per section ──────────────────────────
// [x, y, z] position, [x, y, z] lookAt target
const waypoints = [
  { pos: [5,  2.2,  7  ], look: [0, 0.8, 0] }, // S0 Hero    — 3/4 front
  { pos: [0,  1.8,  4.5], look: [0, 1.2, 0] }, // S1 Engine  — front face
  { pos: [8,  1.0,  0.5], look: [0, 0.8, 0] }, // S2 Design  — side profile
  { pos: [-5, 2.0, -5  ], look: [0, 0.7, 0] }, // S3 Perf    — rear 3/4
  { pos: [3,  5.5,  10 ], look: [0, 0.5, 0] }, // S4 Legacy  — elevated wide
];

// Live interpolated camera state
const camPos    = new THREE.Vector3(...waypoints[0].pos);
const camLook   = new THREE.Vector3(...waypoints[0].look);
const wantPos   = camPos.clone();
const wantLook  = camLook.clone();

// ── Scroll state ──────────────────────────────────────────
let currentSection = 0;
const sections = ['s0','s1','s2','s3','s4'].map(id => document.getElementById(id));
const contentEls = ['sc1','sc2','sc3','sc4'].map(id => document.getElementById(id));
const dots = document.querySelectorAll('.dot');
let contentAnimated = [false, false, false, false];

function setWaypoint(index) {
  const w = waypoints[index];
  wantPos.set(...w.pos);
  wantLook.set(...w.look);

  // Update dots
  dots.forEach((d, i) => d.classList.toggle('active', i === index));


  // Hide all section content first
  contentEls.forEach((el) => {
    if (el) el.style.visibility = 'hidden';
  });

  // Show & animate the active section's content
  if (index > 0) {
    const el = contentEls[index - 1];
    if (el) {
      el.style.visibility = 'visible';
      if (!contentAnimated[index - 1]) {
        contentAnimated[index - 1] = true;
        animate(el, { opacity: [0, 1], translateY: [40, 0], duration: 900, easing: 'easeOutExpo' });
        animate(el.querySelectorAll('.section-tag, .section-title, .section-desc, .stat-item, .legacy-years'), {
          opacity: [0, 1],
          translateY: [20, 0],
          duration: 700,
          delay: stagger(100),
          easing: 'easeOutExpo',
        });
      }
    }
  }
}

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  const winH    = window.innerHeight;
  const total   = waypoints.length;

  // Continuous scroll progress: 0 → (total-1) across all sections
  const progress    = scrollY / winH;
  const fromIdx     = Math.min(Math.floor(progress), total - 2);
  const toIdx       = fromIdx + 1;
  const t           = progress - fromIdx; // 0→1 within this pair

  // Smoothstep for nicer easing between waypoints
  const ease = t * t * (3 - 2 * t);

  wantPos.set(
    THREE.MathUtils.lerp(waypoints[fromIdx].pos[0], waypoints[toIdx].pos[0], ease),
    THREE.MathUtils.lerp(waypoints[fromIdx].pos[1], waypoints[toIdx].pos[1], ease),
    THREE.MathUtils.lerp(waypoints[fromIdx].pos[2], waypoints[toIdx].pos[2], ease),
  );
  wantLook.set(
    THREE.MathUtils.lerp(waypoints[fromIdx].look[0], waypoints[toIdx].look[0], ease),
    THREE.MathUtils.lerp(waypoints[fromIdx].look[1], waypoints[toIdx].look[1], ease),
    THREE.MathUtils.lerp(waypoints[fromIdx].look[2], waypoints[toIdx].look[2], ease),
  );

  // Fade specs bar & hero content out based on raw scroll progress
  const heroFade = Math.max(0, 1 - progress * 4); // gone by 25% scroll
  const specsBar = document.querySelector('.specs-bar');
  const heroTop  = document.querySelector('.hero-top');
  if (specsBar) specsBar.style.opacity = heroFade;
  if (heroTop)  heroTop.style.opacity  = heroFade;

  // Active section for UI (dots, content)
  const active = Math.min(Math.round(progress), total - 1);
  if (active !== currentSection) {
    currentSection = active;
    setWaypoint(active);
  }
}, { passive: true });

// Dot click navigation
dots.forEach((dot) => {
  dot.addEventListener('click', () => {
    const idx = parseInt(dot.dataset.section);
    sections[idx].scrollIntoView({ behavior: 'smooth' });
  });
});

// CTA scroll down
document.getElementById('scroll-cta').addEventListener('click', () => {
  sections[1].scrollIntoView({ behavior: 'smooth' });
});

// Nav link click
document.querySelectorAll('.nav-links a').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// ── Loader (plain CSS — no anime.js dependency) ───────────
const loaderEl  = document.getElementById('loader');
const loaderBar = document.getElementById('loader-bar');

// Pulse the bar with CSS transition
loaderBar.style.transition = 'width 2.5s ease-in-out';
requestAnimationFrame(() => { loaderBar.style.width = '75%'; });

function dismissLoader(model) {
  loaderBar.style.transition = 'width 0.3s ease';
  loaderBar.style.width = '100%';
  setTimeout(() => {
    loaderEl.style.transition = 'opacity 0.7s ease';
    loaderEl.style.opacity = '0';
    setTimeout(() => {
      loaderEl.style.display = 'none';
      runIntro(model);
    }, 700);
  }, 300);
}

// ── Load Model ────────────────────────────────────────────
new GLTFLoader().load(
  '/assets/1979_bmw_m1.glb',
  (gltf) => {
    const model = gltf.scene;

    model.traverse((child) => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });

    // Auto-scale to 4 units wide
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scale = 4 / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(scale);

    // Center on ground
    box.setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const scaledSize = box.getSize(new THREE.Vector3());
    model.position.sub(center);
    model.position.y += scaledSize.y / 2;

    scene.add(model);
    dismissLoader(model);
  },
  (xhr) => {
    if (xhr.lengthComputable) {
      const pct = (xhr.loaded / xhr.total) * 75;
      loaderBar.style.transition = 'width 0.2s ease';
      loaderBar.style.width = `${pct}%`;
    }
  },
  (err) => {
    console.error('GLB load error:', err);
  }
);

// ── Intro sequence ────────────────────────────────────────
function runIntro(model) {
  // Model rises from below
  model.position.y -= 1.8;
  animate(model.position, { y: model.position.y + 1.8, duration: 1400, easing: 'easeOutExpo' });

  // Camera sweeps to hero waypoint
  const heroW = waypoints[0];
  animate(camera.position, {
    x: heroW.pos[0], y: heroW.pos[1], z: heroW.pos[2],
    duration: 2400,
    easing: 'easeInOutQuart',
  }).then(() => {
    camPos.set(...heroW.pos);
    camLook.set(...heroW.look);
    wantPos.copy(camPos);
    wantLook.copy(camLook);
  });

  // UI stagger in
  const tl = createTimeline({ defaults: { easing: 'easeOutExpo' } });
  tl.add('nav',         { opacity: [0, 1], translateY: [-10, 0], duration: 600 }, 600)
    .add('#progress-dots', { opacity: [0, 1], duration: 500 }, 900)
    .add('.hero-top',   { opacity: [0, 1], duration: 500 }, 900)
    .add('.hero-title', { opacity: [0, 1], translateY: [40, 0], duration: 900 }, 1000)
    .add('.hero-sub',   { opacity: [0, 1], duration: 600 }, 1700)
    .add('.hero-cta',   { opacity: [0, 1], translateY: [10, 0], duration: 600 }, 2000)
    .add('.specs-bar',  { opacity: [0, 1], translateY: [20, 0], duration: 600 }, 2200);
}

// ── Mouse parallax ────────────────────────────────────────
let mx = 0, my = 0;
document.addEventListener('mousemove', (e) => {
  mx = (e.clientX / window.innerWidth  - 0.5) * 2;
  my = (e.clientY / window.innerHeight - 0.5) * 2;
});

// ── Resize ────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Render loop ───────────────────────────────────────────
const clock = new THREE.Clock();

(function tick() {
  requestAnimationFrame(tick);

  const t = clock.getElapsedTime();

  // Smooth cinematic camera glide
  camPos.lerp(wantPos, 0.018);
  camLook.lerp(wantLook, 0.022);

  // Subtle mouse parallax offset on top of waypoint
  camera.position.set(
    camPos.x + mx * 0.12,
    camPos.y + my * -0.08,
    camPos.z
  );
  camera.lookAt(camLook);

  // Pulse under-glow
  underLight.intensity = 0.55 + Math.sin(t * 1.1) * 0.2;

  renderer.render(scene, camera);
})();
