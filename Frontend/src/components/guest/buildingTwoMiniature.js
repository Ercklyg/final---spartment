import * as THREE from 'three';

// Concept exterior: six 13 m² rooms, three per floor. Each illustrative bay
// measures 3.6 × (13 / 3.6); shared access is outside those room footprints.
export function createBuildingTwoMiniature() {
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
  const blue = mat(0x244d76), darkBlue = mat(0x163553);
  const cream = mat(0xe4e2da), paving = mat(0xcac6bb), roof = mat(0x71808c);
  const metal = mat(0x969fa3, { metalness: 0.65, roughness: 0.35 });
  const glass = mat(0x172f40, { metalness: 0.38, roughness: 0.2 });
  const green = mat(0x637852), pot = mat(0xbb8061);
  const light = mat(0xffe9bc, { emissive: 0xffdc98, emissiveIntensity: 0.4 });
  function mesh(geometry, size, position, material) {
    const item = new THREE.Mesh(geometry, material);
    item.scale.set(...size);
    item.position.set(...position);
    item.castShadow = true;
    item.receiveShadow = true;
    model.add(item);
    return item;
  }
  const box = (size, position, material) => mesh(cube, size, position, material);
  function rail(x1, x2, z1, z2) {
    const length = Math.hypot(x2 - x1, z2 - z1);
    for (const y of [3.32, 4.2]) {
      const bar = box([length, 0.055, 0.055], [(x1 + x2) / 2, y, (z1 + z2) / 2], metal);
      bar.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    }
    const count = Math.ceil(length / 0.3);
    for (let i = 0; i <= count; i++) {
      box([i % 4 === 0 ? 0.06 : 0.025, 1, 0.045], [x1 + (x2 - x1) * i / count, 3.71, z1 + (z2 - z1) * i / count], metal).castShadow = false;
    }
  }
  function plant(x, z, y = 0.14) {
    mesh(cylinder, [0.25, 0.42, 0.25], [x, y + 0.21, z], pot);
    for (const dx of [-0.15, 0, 0.15]) mesh(foliage, [0.25, 0.48, 0.24], [x + dx, y + 0.7, z], green);
  }
  function numberPlate(number, x, y) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 64;
    const context = canvas.getContext('2d');
    context.fillStyle = '#e4e2da'; context.fillRect(0, 0, 128, 64);
    context.fillStyle = '#163553'; context.font = '600 36px sans-serif';
    context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillText(String(number), 64, 33);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.add(texture);
    const material = mat(0xffffff, { map: texture });
    box([0.48, 0.24, 0.04], [x, y, 1.92], material);
  }

  box([16, 0.3, 9], [-0.85, -0.36, 0.55], mat(0xe0ddd5));
  box([15.65, 0.07, 8.65], [-0.85, -0.18, 0.55], paving);
  box([13.25, 0.18, 5.35], [-1.025, 0, 0.68], cream);
  for (const floor of [0, 1]) {
    const base = floor * 3.1 + 0.12;
    for (let room = 0; room < 3; room++) {
      const x = (room - 1) * 3.6;
      box([3.6, 2.98, 13 / 3.6], [x, base + 1.49, 0], blue);
      box([1.04, 2.35, 0.12], [x - 1, base + 1.175, 1.86], cream);
      box([0.86, 2.19, 0.14], [x - 1, base + 1.135, 1.89], darkBlue);
      box([0.045, 0.19, 0.05], [x - 0.7, base + 1.1, 1.98], metal);
      box([1.48, 1.38, 0.1], [x + 0.65, base + 1.64, 1.86], cream);
      box([1.3, 1.2, 0.12], [x + 0.65, base + 1.64, 1.88], glass);
      box([0.035, 1.2, 0.14], [x + 0.65, base + 1.64, 1.9], cream);
      box([1.58, 0.08, 0.25], [x + 0.65, base + 0.92, 1.94], cream);
      numberPlate((floor + 1) * 100 + room + 1, x - 1, base + 2.57);
      box([0.24, 0.12, 0.12], [x + 1.55, base + 2.4, 1.91], metal);
      box([0.18, 0.07, 0.13], [x + 1.55, base + 2.37, 1.93], light);
      // Rear windows keep the concept consistent from every angle.
      box([1.6, 1.3, 0.1], [x, base + 1.65, -1.85], cream);
      box([1.42, 1.12, 0.12], [x, base + 1.65, -1.87], glass);
    }
  }
  // Enclosed shared stair hall at the left end, with a tall glazed side panel.
  box([2.05, 6.08, 3.61], [-6.425, 3.16, 0], blue);
  for (const y of [1.3, 4.4]) {
    box([1.08, 2.35, 0.12], [-6.42, y, 1.86], cream);
    box([0.9, 2.17, 0.14], [-6.42, y, 1.89], darkBlue);
  }
  box([0.1, 4.6, 1.05], [-7.49, 3.2, 0], cream);
  box([0.12, 4.4, 0.87], [-7.51, 3.2, 0], glass);
  for (const y of [2.1, 3.2, 4.3]) box([0.14, 0.05, 0.9], [-7.52, y, 0], cream);

  // Continuous front balcony and a flat roof with low parapets and cream coping.
  for (const y of [3.1, 6.25]) box([13.55, 0.2, 5.55], [-1.025, y, 0.68], cream);
  for (const x of [-7.65, -5.43, -1.8, 1.8, 5.6]) box([0.12, 6.1, 0.12], [x, 3.18, 3.27], cream);
  rail(-7.6, 5.55, 3.25, 3.25);
  rail(-7.6, -7.6, 1.85, 3.25);
  rail(5.55, 5.55, 1.85, 3.25);
  box([13.1, 0.09, 5.08], [-1.025, 6.39, 0.68], roof);
  for (const z of [-2.04, 3.4]) {
    box([13.55, 0.45, 0.15], [-1.025, 6.55, z], blue);
    box([13.7, 0.08, 0.24], [-1.025, 6.8, z], cream);
  }
  for (const x of [-7.73, 5.68]) {
    box([0.15, 0.45, 5.55], [x, 6.55, 0.68], blue);
    box([0.24, 0.08, 5.65], [x, 6.8, 0.68], cream);
  }
  box([0.08, 6.2, 0.08], [5.49, 3.16, -1.9], metal);
  for (const x of [-7.1, 5.05]) { plant(x, 3.92); plant(x, 2.75, 3.21); }
  for (const z of [3.65, 4.18]) box([2.3, 0.05, 0.4], [-6.42, -0.1, z], cream);

  return { model, dispose() {
    geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); textures.forEach(item => item.dispose());
  } };
}
