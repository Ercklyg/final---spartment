import * as THREE from 'three';

// Concept based on Building 3's four ground-floor rooms (101–104), 14 m² each.
// Each room bay is 3.5 × 4 illustrative metres, with an open front veranda.
export function createBuildingThreeMiniature() {
  const model = new THREE.Group();
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const own = geometry => { geometries.add(geometry); return geometry; };
  const cube = own(new THREE.BoxGeometry(1, 1, 1));
  const cylinder = own(new THREE.CylinderGeometry(1, 1, 1, 16));
  const foliage = own(new THREE.IcosahedronGeometry(1, 1));
  const mat = (color, extra = {}) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
    materials.add(material);
    return material;
  };
  const orange = mat(0xf2b17d), cream = mat(0xf2e9db);
  const paving = mat(0xcac6bb), wood = mat(0x916747);
  const glass = mat(0x344d55, { metalness: 0.3, roughness: 0.25 });
  const metal = mat(0x656b6b, { metalness: 0.5, roughness: 0.4 });
  const roof = mat(0x738087, { metalness: 0.35, roughness: 0.56, side: THREE.DoubleSide });
  const seam = mat(0x59666d, { metalness: 0.35 });
  const soffit = mat(0xe4ded2, { side: THREE.DoubleSide });
  const gable = mat(0xf2b17d, { side: THREE.DoubleSide });
  const green = mat(0x678054), pot = mat(0xb67d60);
  const warmLight = mat(0xffe9bc, { emissive: 0xffdc98, emissiveIntensity: 0.4 });
  function mesh(geometry, size, position, material) {
    const item = new THREE.Mesh(geometry, material);
    item.scale.set(...size);
    item.position.set(...position);
    item.castShadow = true; item.receiveShadow = true;
    model.add(item);
    return item;
  }
  const box = (size, position, material) => mesh(cube, size, position, material);
  function beam(a, b, width, material) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const item = box([width, start.distanceTo(end), width], start.clone().add(end).multiplyScalar(0.5).toArray(), material);
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    return item;
  }
  function panel(points, material) {
    const geometry = own(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    geometry.setIndex(points.length === 3 ? [0, 1, 2] : [0, 1, 2, 0, 2, 3]);
    geometry.computeVertexNormals();
    return mesh(geometry, [1, 1, 1], [0, 0, 0], material);
  }
  function numberPlate(number, x) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 64;
    const context = canvas.getContext('2d');
    context.fillStyle = '#f2e9db'; context.fillRect(0, 0, 128, 64);
    context.fillStyle = '#574536'; context.font = '600 36px sans-serif';
    context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillText(String(number), 64, 33);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.add(texture);
    box([0.5, 0.25, 0.04], [x, 2.2, 2.18], mat(0xffffff, { map: texture }));
  }
  function plant(x, z) {
    mesh(cylinder, [0.24, 0.4, 0.24], [x, 0.28, z], pot);
    for (const dx of [-0.14, 0, 0.14]) mesh(foliage, [0.23, 0.43, 0.22], [x + dx, 0.75, z], green);
  }

  box([16.4, 0.3, 8.6], [0, -0.36, 0.55], mat(0xe0ddd5));
  box([16.05, 0.07, 8.25], [0, -0.18, 0.55], paving);
  box([14.4, 0.18, 5.5], [0, 0, 0.65], cream);
  for (let room = 0; room < 4; room++) {
    const x = (room - 1.5) * 3.5;
    box([3.5, 2.98, 4], [x, 1.61, 0], orange);
    box([1.04, 2.35, 0.12], [x - 1, 1.295, 2.06], cream);
    box([0.86, 2.19, 0.14], [x - 1, 1.255, 2.09], wood);
    box([0.045, 0.19, 0.05], [x - 0.7, 1.22, 2.18], metal);
    box([1.5, 1.38, 0.1], [x + 0.62, 1.76, 2.06], cream);
    box([1.32, 1.2, 0.12], [x + 0.62, 1.76, 2.08], glass);
    box([0.035, 1.2, 0.14], [x + 0.62, 1.76, 2.1], cream);
    box([1.6, 0.08, 0.23], [x + 0.62, 1.04, 2.14], cream);
    numberPlate(101 + room, x - 1);
    box([0.23, 0.14, 0.12], [x + 1.5, 2.58, 2.07], metal);
    box([0.17, 0.07, 0.13], [x + 1.5, 2.54, 2.09], warmLight);
    box([1.6, 1.3, 0.1], [x, 1.76, -2.05], cream);
    box([1.42, 1.12, 0.12], [x, 1.76, -2.07], glass);
    for (const z of [3.65, 4.17]) box([1.05, 0.05, 0.4], [x - 1, -0.1, z], cream);
  }

  // Low, open veranda with roof supports only; no balcony, railings or stairs.
  for (const x of [-7, -3.5, 0, 3.5, 7]) box([0.13, 3.06, 0.13], [x, 1.62, 3.25], cream);
  box([14.25, 0.15, 0.15], [0, 3.1, 3.25], cream);
  box([14.1, 0.09, 5.35], [0, 3.12, 0.65], soffit);
  // One continuous gable roof, with the ridge running above all four rooms.
  for (const x of [-7.05, 7.05]) panel([[x, 3.16, -2.08], [x, 3.16, 3.3], [x, 4.53, 0.35]], gable);
  for (const edgeZ of [-2.6, 3.85]) {
    panel([[-7.5, 3.2, edgeZ], [-7.5, 4.7, 0.35], [7.5, 4.7, 0.35], [7.5, 3.2, edgeZ]], roof);
    panel([[-7.5, 3.1, edgeZ], [-7.5, 4.6, 0.35], [7.5, 4.6, 0.35], [7.5, 3.1, edgeZ]], soffit);
    beam([-7.55, 3.15, edgeZ], [7.55, 3.15, edgeZ], 0.16, cream);
    for (const x of [-7.5, 7.5]) beam([x, 3.15, edgeZ], [x, 4.65, 0.35], 0.17, cream);
    for (let x = -7.35; x <= 7.35; x += 0.28) beam([x, 3.225, edgeZ], [x, 4.725, 0.35], 0.025, seam).castShadow = false;
  }
  beam([-7.55, 4.73, 0.35], [7.55, 4.73, 0.35], 0.14, roof);
  for (const x of [-7.08, 7.08]) box([0.075, 3.15, 0.075], [x, 1.55, -2.18], metal);
  for (const x of [-7.6, 7.6]) plant(x, 3.05);

  return { model, dispose() {
    geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); textures.forEach(item => item.dispose());
  } };
}
