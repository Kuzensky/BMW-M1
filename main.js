import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { animate, createTimeline, stagger } from 'animejs';

// ── Renderer ──────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// ── Scene ─────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060606);
scene.fog = new THREE.Fog(0x060606, 18, 35);

// ── Camera ────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 6, 18); // start: high & far back for intro

// ── Lights ────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

// Key light (warm front-left)
const keyLight = new THREE.DirectionalLight(0xfff5e0, 3.5);
keyLight.position.set(5, 8, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.1;
keyLight.shadow.camera.far = 30;
keyLight.shadow.camera.left = -8;
keyLight.shadow.camera.right = 8;
keyLight.shadow.camera.top = 8;
keyLight.shadow.camera.bottom = -8;
scene.add(keyLight);

// Rim light (cool back-right)
const rimLight = new THREE.DirectionalLight(0xaad4ff, 2);
rimLight.position.set(-6, 4, -6);
scene.add(rimLight);

// Ground bounce
const fillLight = new THREE.DirectionalLight(0xc8a96e, 0.6);
fillLight.position.set(0, -3, 0);
scene.add(fillLight);

// Accent point light under car
const underLight = new THREE.PointLight(0xc8a96e, 0.8, 8);
underLight.position.set(0, -0.8, 0);
scene.add(underLight);

// ── Ground plane (receives shadow) ────────────────────────
const groundGeo = new THREE.PlaneGeometry(40, 40);
const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.01;
ground.receiveShadow = true;
scene.add(ground);

// Reflective ground disc
const discGeo = new THREE.CircleGeometry(3.5, 64);
const discMat = new THREE.MeshStandardMaterial({
  color: 0x111111,
  metalness: 0.9,
  roughness: 0.3,
});
const disc = new THREE.Mesh(discGeo, discMat);
disc.rotation.x = -Math.PI / 2;
disc.position.y = -0.005;
disc.receiveShadow = true;
scene.add(disc);

// ── Controls ──────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.04;
controls.enablePan = false;
controls.minPolarAngle = Math.PI * 0.25;
controls.maxPolarAngle = Math.PI * 0.55;
controls.minDistance = 3;
controls.maxDistance = 12;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.6;
controls.enabled = false; // disabled during intro

// ── Loader UI ─────────────────────────────────────────────
const loaderEl = document.getElementById('loader');
const loaderBar = document.getElementById('loader-bar');

// Animate loader bar indeterminate pulse
animate(loaderBar, { width: ['0%', '80%'], duration: 2500, easing: 'easeInOutQuart' });

// ── Load Model ────────────────────────────────────────────
const gltfLoader = new GLTFLoader();

gltfLoader.load(
  '/assets/1979_bmw_m1.glb',
  (gltf) => {
    const model = gltf.scene;

    // Enable shadows on all meshes
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Auto-scale: normalize model to ~4 units wide
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 4;
    const scaleFactor = targetSize / maxDim;
    model.scale.setScalar(scaleFactor);

    // Re-compute box after scaling, then center
    box.setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const scaledSize = box.getSize(new THREE.Vector3());
    model.position.sub(center);
    model.position.y += scaledSize.y / 2; // sit on ground

    scene.add(model);

    // Complete loader bar
    animate(loaderBar, { width: '100%', duration: 400, easing: 'easeOutExpo' });

    // Fade out loader then run intro
    setTimeout(() => {
      animate(loaderEl, {
        opacity: 0,
        duration: 600,
        easing: 'easeOutQuad',
        onComplete: () => {
          loaderEl.style.display = 'none';
          runIntro(model);
        },
      });
    }, 500);
  },
  (xhr) => {
    // Progress
    if (xhr.lengthComputable) {
      const pct = (xhr.loaded / xhr.total) * 80;
      animate(loaderBar, { width: `${pct}%`, duration: 300, easing: 'easeOutQuad' });
    }
  }
);

// ── Intro Sequence ────────────────────────────────────────
function runIntro(model) {
  // 1. Model rises up
  const startY = model.position.y - 1.5;
  model.position.y = startY;

  animate(model.position, {
    y: model.position.y + 1.5,
    duration: 1400,
    easing: 'easeOutExpo',
  });

  // 2. Camera swoops to final position
  animate(camera.position, {
    x: 5,
    y: 2.2,
    z: 7,
    duration: 2200,
    easing: 'easeInOutQuart',
    onComplete: () => {
      controls.enabled = true;
    },
  });

  // 3. UI reveal timeline
  const tl = createTimeline({ defaults: { easing: 'easeOutExpo' } });

  tl.add('nav', { opacity: [0, 1], translateY: [-10, 0], duration: 700 }, 400)
    .add('.hero-label', { opacity: [0, 1], translateY: [10, 0], duration: 600 }, 800)
    .add('.hero-title', { opacity: [0, 1], translateY: [40, 0], duration: 900 }, 1000)
    .add('.hero-sub', { opacity: [0, 1], duration: 600 }, 1600)
    .add('.hero-cta', { opacity: [0, 1], translateY: [10, 0], duration: 600 }, 1900)
    .add('.spec', {
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 500,
      delay: stagger(80),
    }, 2000)
    .add('.scroll-hint', { opacity: [0, 0.5], duration: 600 }, 2600);
}

// ── Mouse parallax on hero text ───────────────────────────
const hero = document.querySelector('.hero');
let mouseX = 0, mouseY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

// ── CTA button: camera spin ───────────────────────────────
document.querySelector('.hero-cta').addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
});

// ── Resize ────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Render Loop ───────────────────────────────────────────
const clock = new THREE.Clock();

function tick() {
  requestAnimationFrame(tick);

  const elapsed = clock.getElapsedTime();

  // Subtle under-light pulse
  underLight.intensity = 0.6 + Math.sin(elapsed * 1.2) * 0.2;

  // Parallax hero text
  if (hero) {
    hero.style.transform = `translate(${mouseX * -6}px, ${mouseY * -4}px)`;
  }

  controls.update();
  renderer.render(scene, camera);
}

tick();
