import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { createMainBuildingMiniature } from './mainBuildingMiniature.js';
import { createBuildingTwoMiniature } from './buildingTwoMiniature.js';
import { createBuildingThreeMiniature } from './buildingThreeMiniature.js';

const modelSettings = {
  main: { create: createMainBuildingMiniature, target: [0.4, 3.4, 0], radius: 12, minDistance: 16 },
  building2: { create: createBuildingTwoMiniature, target: [-0.85, 2.9, 0.55], radius: 8.6, minDistance: 11 },
  building3: { create: createBuildingThreeMiniature, target: [0, 1.9, 0.55], radius: 8.8, minDistance: 11 },
};
export function createBuildingViewer(host, onInteraction, onFailure, { building = 'main', name = 'Main Building', helpId = 'building-model-help' } = {}) {
  const settings = modelSettings[building] || modelSettings.main;
  const { target, radius: framingRadius } = settings;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0xf1f0ec);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-label', `Rotatable exterior miniature of ${name}`);
  canvas.setAttribute('aria-describedby', helpId);
  canvas.tabIndex = 0;
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf1f0ec, 60, 150);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 250);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI / 2 - 0.025;
  controls.rotateSpeed = 0.65;
  controls.minDistance = settings.minDistance;
  controls.maxDistance = 110;
  controls.target.set(...target);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xabb2ba, 1.8));
  const light = new THREE.DirectionalLight(0xfff5e8, 3);
  light.position.set(8, 18, 12);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 0.5, far: 70 });
  light.shadow.normalBias = 0.04;
  light.shadow.bias = -0.0002;
  scene.add(light);

  const miniature = settings.create();
  scene.add(miniature.model);
  const groundGeometry = new THREE.PlaneGeometry(200, 200);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xf1f0ec, roughness: 1 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.52;
  ground.receiveShadow = true;
  scene.add(ground);

  let disposed = false;
  let frameId = 0;
  const render = () => {
    if (disposed || frameId) return;
    frameId = requestAnimationFrame(() => {
      frameId = 0;
      if (!disposed) renderer.render(scene, camera);
    });
  };
  const viewDirections = { overview: [1, 0.6, 1.6], front: [0, 0.23, 1], side: [1, 0.22, 0], rear: [-0.6, 0.4, -1], top: [0.01, 1, 0.01] };
  function setView(name = 'overview') {
    const direction = new THREE.Vector3(...(viewDirections[name] || viewDirections.overview)).normalize();
    const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
    const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
    const distance = Math.min(100, framingRadius / Math.sin(Math.min(vertical, horizontal)));
    controls.target.set(...target);
    camera.position.copy(controls.target).addScaledVector(direction, distance);
    controls.update();
    render();
  }
  function rotate(horizontal, vertical = 0) {
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += horizontal;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi + vertical, controls.minPolarAngle, controls.maxPolarAngle);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    controls.update();
    render();
  }
  function zoom(factor) {
    const offset = camera.position.clone().sub(controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
    camera.position.copy(controls.target).add(offset);
    controls.update();
    render();
  }
  function keydown(event) {
    const moves = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] };
    if (moves[event.key]) { event.preventDefault(); rotate(...moves[event.key]); onInteraction(); }
    else if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(0.85); }
    else if (event.key === '-') { event.preventDefault(); zoom(1.15); }
  }
  const contextLost = event => { event.preventDefault(); onFailure(); };
  canvas.addEventListener('keydown', keydown);
  canvas.addEventListener('webglcontextlost', contextLost);
  controls.addEventListener('change', render);
  controls.addEventListener('start', onInteraction);
  let previousWidth = 0;
  const resize = () => {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    const oldAspect = camera.aspect;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    if (!previousWidth) setView();
    else if (Math.abs(oldAspect - camera.aspect) > 0.05) zoom(Math.min(oldAspect, 1) / Math.min(camera.aspect, 1));
    previousWidth = width;
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  return {
    setView, rotate, zoom,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      canvas.removeEventListener('keydown', keydown);
      canvas.removeEventListener('webglcontextlost', contextLost);
      controls.removeEventListener('change', render);
      controls.removeEventListener('start', onInteraction);
      controls.dispose();
      miniature.dispose();
      groundGeometry.dispose();
      groundMaterial.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
