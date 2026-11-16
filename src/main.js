import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import robotB64 from './robot_glb.js';
import { forward, decodeInt16 } from './eegnet.js';
import d1 from './data_s1.js';
import d2 from './data_s2.js';

const USERS = { s1: d1, s2: d2 };
const CLS = ['Left hand', 'Right hand', 'Feet'];
const COL = ['#38bdf8', '#fbbf24', '#a78bfa'];
const $ = (id) => document.getElementById(id);

/* ---------- 3D scene ---------- */
const stage = $('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f1a);
scene.fog = new THREE.Fog(0x0a0f1a, 6, 14);
const pm = new THREE.PMREMGenerator(renderer);
scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
camera.position.set(0, 1.1, 4.5);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.95, 0);
controls.enablePan = false; controls.minDistance = 3; controls.maxDistance = 9;
controls.maxPolarAngle = Math.PI * 0.52; controls.update();

const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(2.5, 5, 3.5); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -1, near: 1, far: 12 });
sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias = -0.0004;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x4aa8ff, 1.6); rim.position.set(-3, 2.5, -3); scene.add(rim);

// floor
const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.35, metalness: 0.5 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const ring = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.1, 96), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
ring.rotation.x = -Math.PI / 2; ring.position.y = 0.005; scene.add(ring);

// materials
const shell = new THREE.MeshPhysicalMaterial({ color: 0xf2640f, roughness: 0.32, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.12 });
const white = new THREE.MeshPhysicalMaterial({ color: 0xf1f3f6, roughness: 0.3, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.15 });
const dark = new THREE.MeshStandardMaterial({ color: 0x1b2230, roughness: 0.45, metalness: 0.75 });
const steel = new THREE.MeshStandardMaterial({ color: 0x8e99a8, roughness: 0.25, metalness: 0.95 });
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x38d8ff, emissiveIntensity: 2.2 });
const lightMat = new THREE.MeshBasicMaterial({ color: 0xffb000, toneMapped: false });

const add = (parent, geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
const RB = (w, h, d, r = 0.03) => new RoundedBoxGeometry(w, h, d, 5, r);
const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 8, 20);
const sph = (r) => new THREE.SphereGeometry(r, 32, 24);


const robot = new THREE.Group(); scene.add(robot);
const chestLight = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 40), new THREE.MeshBasicMaterial({ color: 0xffb000, toneMapped: false }));
chestLight.rotation.x = Math.PI / 2; chestLight.position.set(0, 1.3, 0.14); robot.add(chestLight);
const bodyMat = new THREE.MeshPhysicalMaterial({ clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.4 });
const jointMat = new THREE.MeshStandardMaterial({ envMapIntensity: 1.2 });
const visorMat = new THREE.MeshBasicMaterial({ color: 0x38d8ff, toneMapped: false });
const accentMat = new THREE.MeshBasicMaterial({ color: 0xf2640f, toneMapped: false });
const VARIANTS = [
  { name: 'Arctic Chrome',  body: 0xf4f6f9, metal: 0.55, rough: 0.22, joint: 0x151b28, jmetal: 0.9, visor: 0x38d8ff, accent: 0xf2640f },
  { name: 'Solar Orange',   body: 0xf2640f, metal: 0.35, rough: 0.24, joint: 0x1b2230, jmetal: 0.9, visor: 0x7fe7ff, accent: 0xffffff },
  { name: 'Orange Joints',  body: 0xf1f3f6, metal: 0.30, rough: 0.25, joint: 0xf2640f, jmetal: 0.5, visor: 0x7fe7ff, accent: 0x151b28 },
  { name: 'Carbon Stealth', body: 0x12161d, metal: 0.80, rough: 0.20, joint: 0x3a4252, jmetal: 0.9, visor: 0xb36bff, accent: 0xb36bff },
  { name: 'Cobalt Blue',    body: 0x1d4ed8, metal: 0.60, rough: 0.20, joint: 0xe5e7eb, jmetal: 0.6, visor: 0xffffff, accent: 0xffffff },
  { name: 'Gold Edition',   body: 0xd4a017, metal: 1.00, rough: 0.22, joint: 0x1b2230, jmetal: 0.9, visor: 0xffffff, accent: 0x1b2230 },
];
let variantIdx = 0; // locked: Arctic Chrome
function setVariant(i) {
  variantIdx = (i + VARIANTS.length) % VARIANTS.length; const v = VARIANTS[variantIdx];
  bodyMat.color.set(v.body); bodyMat.metalness = v.metal; bodyMat.roughness = v.rough;
  jointMat.color.set(v.joint); jointMat.metalness = v.jmetal; jointMat.roughness = 0.35;
  visorMat.color.set(v.visor); accentMat.color.set(v.accent);
  document.querySelectorAll('.sw').forEach((b, k) => b.classList.toggle('on', k === variantIdx));
  const nm = document.getElementById('vname'); if (nm) nm.textContent = v.name;
  
}
const BONE = { UpperArmL: 'mixamorigLeftArm', LowerArmL: 'mixamorigLeftForeArm', UpperArmR: 'mixamorigRightArm', LowerArmR: 'mixamorigRightForeArm', UpperLegL: 'mixamorigLeftUpLeg', LowerLegL: 'mixamorigLeftLeg' };
const bones = {}, restW = {};
const Z = new THREE.Vector3(0, 0, 1), X = new THREE.Vector3(1, 0, 0);
const _q = new THREE.Quaternion(), _p = new THREE.Quaternion();
function bindBones(root) {
  for (const n of Object.keys(BONE)) {
    const b = root.getObjectByName(BONE[n]); if (!b) { console.warn('missing bone', n); continue; } bones[n] = b;
  }
  root.updateMatrixWorld(true);
  for (const n in bones) { const q = new THREE.Quaternion(); bones[n].getWorldQuaternion(q); restW[n] = q; }
}
function rotW(name, axis, ang) { // total world rotation from rest about axis
  const b = bones[name]; if (!b) return;
  _q.setFromAxisAngle(axis, ang).multiply(restW[name]);
  b.parent.updateWorldMatrix(true, false); b.parent.getWorldQuaternion(_p);
  b.quaternion.copy(_p.invert().multiply(_q)); b.updateMatrixWorld(true);
}
new GLTFLoader().parse(Uint8Array.from(atob(robotB64), (c) => c.charCodeAt(0)).buffer, '', (g) => {
  const m = g.scene; m.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; if (o.material) { o.material = o.material.name.includes('Joints') ? jointMat : bodyMat; } } });
  m.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(m); const h = bb.max.y - bb.min.y; console.log('model height', h);
  m.scale.setScalar(1.78 / h); m.updateMatrixWorld(true); const bb2 = new THREE.Box3().setFromObject(m); m.position.y -= bb2.min.y;
  robot.add(m); bindBones(m);
  const visor = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.045, 0.04, 4, 0.02), visorMat);
  visor.position.set(0, 1.605, 0.125); robot.add(visor);
  const rimA = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 12, 40), accentMat); rimA.position.set(0, 1.3, 0.13); robot.add(rimA); setVariant(variantIdx); window.__robotReady = true;
}, (e) => console.error(e));

/* ---------- pose control ---------- */
const rad = (d) => d * Math.PI / 180;
// angles in degrees, world-space rotations from the rest pose:
// aL/aR = [upper arm about Z, forearm about Z], lg = [thigh about X, shin about X]
const POSES = {
  idle: { aL: [-72, -72], aR: [72, 72], lg: [0, 0] },
  0: { aL: [12, 85], aR: [72, 72], lg: [0, 0] },    // left hand  -> robot's own left arm (viewer's right)
  1: { aL: [-72, -72], aR: [-12, -85], lg: [0, 0] },   // right hand -> robot's own right arm (viewer's left)
  2: { aL: [-72, -72], aR: [72, 72], lg: [-60, 70] },     // feet       -> robot's left leg lifts
};
const cur = { aL: [-72, -72], aR: [72, 72], lg: [0, 0] };
let pose = POSES.idle;
function poseStep(dt) {
  const k = 1 - Math.exp(-dt * 6);
  for (const j of ['aL', 'aR', 'lg']) for (let i = 0; i < 2; i++) cur[j][i] += (pose[j][i] - cur[j][i]) * k;
  if (!window.__robotReady) return;
  rotW('UpperArmL', Z, rad(cur.aL[0])); rotW('LowerArmL', Z, rad(cur.aL[1]));
  rotW('UpperArmR', Z, rad(cur.aR[0])); rotW('LowerArmR', Z, rad(cur.aR[1]));
  rotW('UpperLegL', X, rad(cur.lg[0])); rotW('LowerLegL', X, rad(cur.lg[1]));
}
const glow = new THREE.PointLight(0xffb000, 0, 2.2); glow.position.set(0, 1.4, 0.7); scene.add(glow);
let baseCol = new THREE.Color('#ffb000'), pulse = 0;
function setLight(hex, p = 0) { baseCol.set(hex); pulse = p; chestLight.material.color.copy(baseCol); glow.color.copy(baseCol); glow.intensity = 0.6; }

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

/* ---------- EEG wave canvas ---------- */
const wave = $('wave'), wctx = wave.getContext('2d');
function fitCanvas() { const r = wave.getBoundingClientRect(); wave.width = r.width * devicePixelRatio; wave.height = r.height * devicePixelRatio; }
addEventListener('resize', fitCanvas); fitCanvas();
const CH_COL = ['#38bdf8', '#e5e7eb', '#fbbf24'];
let show = null; // Float32Array of current trial 3 x T
function drawWave(progress) {
  const W = wave.width, H = wave.height; wctx.clearRect(0, 0, W, H);
  const lane = H / 3, pad = 54 * devicePixelRatio;
  wctx.font = `${12 * devicePixelRatio}px system-ui`; wctx.textBaseline = 'middle';
  for (let c = 0; c < 3; c++) {
    const y0 = lane * (c + 0.5);
    wctx.strokeStyle = 'rgba(148,163,184,.15)'; wctx.beginPath(); wctx.moveTo(pad, y0); wctx.lineTo(W, y0); wctx.stroke();
    wctx.fillStyle = CH_COL[c]; wctx.fillText(['C3', 'Cz', 'C4'][c], 8 * devicePixelRatio, y0);
    if (!show) continue;
    const T = 1001, n = Math.max(2, Math.floor(T * progress));
    let s = 0; for (let t = 0; t < T; t++) s += show[c * T + t] ** 2; const sd = Math.sqrt(s / T) || 1;
    wctx.strokeStyle = CH_COL[c]; wctx.lineWidth = 1.4 * devicePixelRatio; wctx.beginPath();
    for (let t = 0; t < n; t++) {
      const x = pad + (W - pad) * t / (T - 1), y = y0 - (show[c * T + t] / sd) * lane * 0.22;
      t ? wctx.lineTo(x, y) : wctx.moveTo(x, y);
    }
    wctx.stroke();
  }
  if (show && progress < 1) { const x = pad + (W - pad) * progress; wctx.strokeStyle = 'rgba(251,191,36,.7)'; wctx.beginPath(); wctx.moveTo(x, 0); wctx.lineTo(x, H); wctx.stroke(); }
}

/* ---------- demo logic ---------- */
let user = 's1', idx = 0, auto = false, state = 'idle', tState = 0, result = null, tally = { ok: 0, n: 0 };
const decoded = {};
function getTrial(u, i) {
  const d = USERS[u], t = d.trials, { cfg, ...P } = d.model;
  const key = u + i; if (decoded[key]) return decoded[key];
  decoded.X ??= {};
  decoded.X[u] ??= { m: decodeInt16(t.x_model_b64, t.x_model_scale), s: decodeInt16(t.x_show_b64, t.x_show_scale) };
  const [, C, T] = t.x_model_shape;
  const t0 = performance.now();
  const probs = forward(decoded.X[u].m.subarray(i * C * T, (i + 1) * C * T), cfg, P);
  const ms = performance.now() - t0;
  const pred = probs.indexOf(Math.max(...probs));
  return (decoded[key] = { probs, pred, truth: t.y[i], ms, show: decoded.X[u].s.subarray(i * 3 * T, (i + 1) * 3 * T) });
}
function updateStatic() {
  const m = USERS[user].meta;
  $('uname').textContent = user === 's1' ? 'Subject 1 · full test day' : 'Subject 2 · full test day';
  $('fullacc').textContent = (m.accuracy_session2_all * 100).toFixed(1) + '%';
  $('fullacc_n').textContent = `of ${m.n_session2_trials} trials, a different recording day. Chance = 33%.`;
  document.querySelectorAll('.utab').forEach((b) => b.classList.toggle('on', b.dataset.u === user));
  $('tally').textContent = `${tally.ok} / ${tally.n}`;
  $('trialno').textContent = `Trial ${idx + 1} of ${m.n_shown}`;
}
function setBars(p, finalise) {
  CLS.forEach((c, i) => {
    $('bar' + i).style.width = (p ? p[i] * 100 : 0) + '%';
    $('pct' + i).textContent = p ? (p[i] * 100).toFixed(0) + '%' : '';
  });
}
const ACTION = { idle: 'Waiting for a brain signal…', 0: 'Raising its LEFT arm', 1: 'Raising its RIGHT arm', 2: 'Lifting a LEG' };
function setAction(k, wrong) { const a = document.getElementById('action'); if (a) { a.textContent = ACTION[k]; a.className = 'chip' + (wrong ? ' bad' : ''); } }
function startTrial() {
  result = getTrial(user, idx); show = result.show;
  state = 'decoding'; tState = 0; pose = POSES.idle; setAction('idle'); setLight('#ffb000', 1);
  setBars(null); $('badge').className = 'badge'; $('badge').textContent = 'Reading brain signal…';
  $('truth').textContent = '?'; $('pred').textContent = '?'; $('pred').style.color = ''; $('truth').style.color = '';
  updateStatic();
}
function reveal() {
  state = 'shown'; tState = 0;
  const ok = result.pred === result.truth;
  tally.n++; if (ok) tally.ok++;
  setBars(result.probs);
  pose = POSES[result.pred]; setAction(result.pred, !ok); setLight(ok ? '#00ff3c' : '#ff0a1e');
  $('truth').textContent = CLS[result.truth]; $('truth').style.color = COL[result.truth];
  $('pred').textContent = CLS[result.pred]; $('pred').style.color = COL[result.pred];
  $('badge').className = 'badge ' + (ok ? 'ok' : 'bad');
  $('badge').textContent = ok ? 'Correct ✓' : 'Wrong ✗  (this happens, it is real data)';
  $('ms').textContent = `Decoded in ${result.ms.toFixed(0)} ms, in your browser`;
  updateStatic();
}
function next() { idx = (idx + 1) % USERS[user].meta.n_shown; startTrial(); }
function switchUser(u) { user = u; idx = 0; tally = { ok: 0, n: 0 }; startTrial(); }
$('next').onclick = next;
$('auto').onclick = () => { auto = !auto; $('auto').classList.toggle('on', auto); $('auto').textContent = auto ? 'Auto play: ON' : 'Auto play'; };
document.querySelectorAll('.utab').forEach((b) => (b.onclick = () => switchUser(b.dataset.u)));
addEventListener('keydown', (e) => { if (e.code === 'Space' || e.key === 'ArrowRight') { e.preventDefault(); next(); } if (e.key === '1') switchUser('s1'); if (e.key === '2') switchUser('s2'); });

/* ---------- loop ---------- */
const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  tState += dt;
  if (state === 'decoding') { const pr = Math.min(1, tState / 3); drawWave(pr); if (pr >= 1) reveal(); }
  else { drawWave(1); }
  if (state === 'shown' && tState > 3.5) { pose = POSES.idle; if (auto) next(); else { state = 'idle2'; setLight('#38bdf8'); } }
  if (pulse) { const k = 0.55 + 0.45 * Math.sin(t * 8); chestLight.material.color.copy(baseCol).multiplyScalar(k); glow.intensity = 0.3 + 0.5 * k; }
  poseStep(dt);
  robot.position.y = Math.sin(t * 1.6) * 0.004;
  ring.rotation.z = t * 0.2; ring.material.opacity = 0.35 + 0.2 * Math.sin(t * 2);
  controls.update(); renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
startTrial(); loop();
// swatches
const swBox = document.getElementById('swatches');
VARIANTS.forEach((v, k) => { const b = document.createElement('button'); b.className = 'sw'; b.title = v.name; b.style.background = '#' + v.body.toString(16).padStart(6, '0'); b.style.borderColor = '#' + v.joint.toString(16).padStart(6, '0'); b.onclick = () => { setVariant(k); noteInput(); }; if (swBox) swBox.appendChild(b); });
if (window.__robotReady) setVariant(variantIdx);
// help overlay, fullscreen, attract mode
const ov = document.getElementById('overlay');
const toggleHelp = (on) => { ov.classList.toggle('show', on ?? !ov.classList.contains('show')); };
document.getElementById('helpbtn').onclick = () => toggleHelp(); ov.onclick = (e) => { if (e.target === ov || e.target.id === 'closehelp') toggleHelp(false); };
const toggleFS = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); };
document.getElementById('fsbtn').onclick = toggleFS;
let lastInput = performance.now(); let attract = false;
function noteInput() { lastInput = performance.now(); if (attract) { attract = false; auto = false; syncAuto(); } }
function syncAuto() { $('auto').classList.toggle('on', auto); $('auto').textContent = auto ? 'Auto play: ON' : 'Auto play'; }
addEventListener('pointerdown', noteInput);
addEventListener('keydown', (e) => { noteInput(); if (e.key === 'h' || e.key === 'H' || e.key === '?') toggleHelp(); if (e.key === 'Escape') toggleHelp(false); if (e.key === 'f' || e.key === 'F') toggleFS(); });
setInterval(() => { if (!auto && performance.now() - lastInput > 30000) { auto = true; attract = true; syncAuto(); if (state === 'idle2') next(); } }, 1000);
$('auto').onclick = () => { auto = !auto; attract = false; syncAuto(); noteInput(); };
window.__demo = { next, switchUser, setVariant, forcePose: (k) => { pose = POSES[k]; setAction(k); }, get state() { return state; }, VARIANTS };
