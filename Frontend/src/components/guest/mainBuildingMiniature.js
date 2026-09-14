import * as THREE from 'three';

// Exterior miniature based on the supplied front/side photos and two-column,
// five-row floor sketch. Dimensions are illustrative; interior stairs stay hidden.
export function createMainBuildingMiniature() {
  const model = new THREE.Group();
  const geometries = new Set();
  const materials = new Set();
  const own = geometry => { geometries.add(geometry); return geometry; };
  const cube = own(new THREE.BoxGeometry(1, 1, 1));
  const cylinder = own(new THREE.CylinderGeometry(1, 1, 1, 16));
  const leaves = own(new THREE.IcosahedronGeometry(1, 1));
  const mat = (color, extra = {}) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.78, ...extra });
    materials.add(material);
    return material;
  };
  const blue = mat(0x244d76);
  const darkBlue = mat(0x163553);
  const ivory = mat(0xe4e2da);
  const concrete = mat(0x9da5aa);
  const slab = mat(0xc1c4c2);
  const roof = mat(0x71808c, { metalness: 0.35, roughness: 0.56, side: THREE.DoubleSide });
  const roofSeam = mat(0x586b7c, { metalness: 0.35 });
  const soffit = mat(0xcfcfc6, { side: THREE.DoubleSide });
  const metal = mat(0x969fa3, { metalness: 0.65, roughness: 0.35 });
  const windowGlass = mat(0x172f40, { metalness: 0.38, roughness: 0.2 });
  const wood = mat(0x9b714c);
  const black = mat(0x232d34);
  const red = mat(0x712f2c);
  const warmLight = mat(0xffe1a0, { emissive: 0xffc773, emissiveIntensity: 0.65 });
  const green = mat(0x436a37), paleGreen = mat(0x718447);
  const potMaterial = mat(0x6e675b);

  function mesh(geometry, surface, size, position, parent = model) {
    const result = new THREE.Mesh(geometry, surface);
    result.scale.set(...size);
    result.position.set(...position);
    result.castShadow = true;
    result.receiveShadow = true;
    parent.add(result);
    return result;
  }
  const box = (size, position, surface, parent) => mesh(cube, surface, size, position, parent);
  const round = (size, position, surface, parent) => mesh(cylinder, surface, size, position, parent);
  function beam(a, b, width, surface, parent = model) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const result = box([width, start.distanceTo(end), width], start.clone().add(end).multiplyScalar(0.5).toArray(), surface, parent);
    result.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    return result;
  }
  function panel(points, surface) {
    const geometry = own(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    geometry.setIndex(points.length === 3 ? [0, 1, 2] : [0, 1, 2, 0, 2, 3]);
    geometry.computeVertexNormals();
    return mesh(geometry, surface, [1, 1, 1], [0, 0, 0]);
  }
  function rail(a, b, base, height = 1.05) {
    for (const y of [base + 0.12, base + 0.86, base + height]) beam([a[0], y, a[1]], [b[0], y, b[1]], y === base + height ? 0.065 : 0.045, metal);
    const count = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.31);
    for (let i = 0; i <= count; i++) {
      const x = a[0] + (b[0] - a[0]) * i / count;
      const z = a[1] + (b[1] - a[1]) * i / count;
      beam([x, base, z], [x, base + height, z], i % 4 === 0 ? 0.065 : 0.027, metal).castShadow = false;
    }
  }
  function sideWindow(x, y, z, width = 1.1, height = 1.2) {
    const side = Math.sign(x);
    box([0.1, height + 0.14, width + 0.14], [x, y, z], ivory);
    box([0.12, height, width], [x + side * 0.02, y, z], windowGlass);
    box([0.14, height, 0.035], [x + side * 0.035, y, z], metal);
  }
  function plant(x, y, z, scale = 1) {
    round([0.19 * scale, 0.3 * scale, 0.19 * scale], [x, y + 0.15 * scale, z], potMaterial);
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5;
      const leaf = mesh(leaves, i % 2 ? green : paleGreen, [0.13 * scale, 0.36 * scale, 0.11 * scale], [x + Math.cos(angle) * 0.14 * scale, y + 0.5 * scale, z + Math.sin(angle) * 0.14 * scale]);
      leaf.rotation.z = Math.sin(angle) * 0.38;
      leaf.rotation.x = Math.cos(angle) * 0.38;
    }
  }

  // A solid display plinth and paved forecourt replace the structural grid.
  box([12, 0.3, 23.4], [-0.1, -0.36, 0.25], mat(0xe0ddd5));
  box([11.65, 0.07, 23.05], [-0.1, -0.18, 0.25], mat(0xcecec6));
  box([9.85, 0.18, 20], [-0.1, 0, 0], concrete);
  for (const y of [3.1, 6.12]) box([9.85, 0.21, 20], [-0.1, y, 0], slab);
  // Two back-to-back rows of five rooms per floor. Each row opens outward
  // onto its own side walkway; the front bay stays open above the parking.
  const roomBays = [-8.1, -4.8, -1.5, 1.8, 5.1];
  for (const y of [1.65, 4.73]) for (const x of [-1.8, 1.6]) {
    for (const z of roomBays) box([3.4, 2.88, 3.3], [x, y, z], blue);
  }
  for (const y of [0.25, 3.05, 6.02]) {
    box([0.16, 0.14, 16.55], [-3.53, y, -1.55], ivory);
    box([0.16, 0.14, 16.55], [3.34, y, -1.55], ivory);
  }
  for (const y of [0.17, 3.25]) {
    // Matching doors and windows on both long sides, facing away from the center.
    for (const side of [-1, 1]) for (const z of roomBays) {
      const wallX = -0.1 + side * 3.4;
      box([0.13, 2.25, 0.97], [wallX + side * 0.06, y + 1.12, z - 0.73], ivory);
      box([0.15, 2.08, 0.8], [wallX + side * 0.09, y + 1.08, z - 0.73], darkBlue);
      round([0.035, 0.1, 0.035], [wallX + side * 0.19, y + 1.02, z - 0.43], metal).rotation.z = Math.PI / 2;
      sideWindow(wallX + side * 0.09, y + 1.53, z + 0.76, 1.03, 1.15);
    }
  }
  // The front veranda stays open, with plain recessed walls on both floors.
  // Room doors and windows face the side walkways only.
  // Rear elevation is enclosed; the staircase is inside, with no exterior stair.
  for (const y of [1.65, 4.73]) for (const x of [-1.8, 1.6]) {
    box([1.36, 1.22, 0.1], [x, y, -9.81], ivory);
    box([1.2, 1.06, 0.12], [x, y, -9.83], windowGlass);
  }

  // Silver balcony rails, slender white posts, fascia and drainpipe.
  rail([-4.85, 9.86], [4.65, 9.86], 3.23);
  for (const side of [-1, 1]) {
    const edgeX = -0.1 + side * 4.75;
    rail([edgeX, -9.75], [edgeX, 9.86], 3.23);
    rail([-0.1 + side * 3.42, -9.8], [edgeX, -9.8], 3.23);
    for (const z of [-9.7, -6.4, -3.1, 0.2, 3.5, 6.8, 9.8]) {
      box([0.12, 6, 0.12], [edgeX, 3.08, z], ivory);
      box([1.4, 0.25, 0.17], [-0.1 + side * 4.08, 2.99, z], concrete);
    }
    box([0.14, 0.18, 20], [edgeX + side * 0.04, 6.07, 0], ivory);
  }
  box([9.65, 0.16, 0.16], [-0.1, 6.06, 9.68], ivory);
  box([10.05, 0.24, 0.2], [-0.1, 3.04, 10.02], ivory);
  beam([4.86, 0.05, 9.65], [4.86, 6.5, 9.65], 0.085, concrete);

  // Closed gables, deep white eaves and a finished corrugated metal roof.
  for (const z of [-9.94, 9.98]) panel([[-4.92, 6.18, z], [4.72, 6.18, z], [-0.1, 7.97, z]], mat(0x21476b, { side: THREE.DoubleSide }));
  for (const [edgeX, ridgeX] of [[-5.35, -0.1], [5.15, -0.1]]) {
    panel([[edgeX, 6.39, -10.55], [ridgeX, 8.15, -10.55], [ridgeX, 8.15, 10.6], [edgeX, 6.39, 10.6]], roof);
    panel([[edgeX, 6.27, -10.55], [ridgeX, 8.03, -10.55], [ridgeX, 8.03, 10.6], [edgeX, 6.27, 10.6]], soffit);
    for (const z of [-10.55, 10.6]) beam([edgeX, 6.34, z], [ridgeX, 8.1, z], 0.18, ivory);
    beam([edgeX, 6.35, -10.6], [edgeX, 6.35, 10.65], 0.16, ivory);
    for (let z = -10.4; z <= 10.4; z += 0.32) beam([edgeX, 6.413, z], [ridgeX, 8.173, z], 0.024, roofSeam).castShadow = false;
  }
  beam([-0.1, 8.18, -10.65], [-0.1, 8.18, 10.7], 0.15, roof);
  // Porch ceiling, subtle warm fixtures and a small table as in the photograph.
  box([9.4, 0.07, 3.0], [-0.1, 5.97, 8.15], soffit);
  for (const [x, y, z] of [[1.5, 5.91, 8.25], [0, 2.93, 8.0], [4, 5.98, 2.8], [4, 5.98, -3.5]]) round([0.1, 0.025, 0.1], [x, y, z], warmLight);
  box([1.45, 0.1, 0.72], [1.25, 4.05, 8.55], wood);
  for (const x of [0.64, 1.86]) for (const z of [8.3, 8.8]) box([0.07, 0.77, 0.07], [x, 3.62, z], wood);
  for (const x of [0.15, 2.35]) {
    box([0.45, 0.07, 0.48], [x, 3.68, 8.5], wood);
    box([0.45, 0.48, 0.05], [x, 3.96, 8.27], wood);
    for (const dx of [-0.16, 0.16]) for (const dz of [-0.16, 0.16]) box([0.045, 0.44, 0.045], [x + dx, 3.45, 8.5 + dz], wood);
  }
  for (const [x, y, z, scale] of [[-4.38, 3.22, 9.1, 1], [4.18, 3.22, 9.15, 1.15], [-4.35, 3.22, 1.5, 0.8], [-4.35, 3.22, -5.1, 0.8], [4.15, 3.22, 1.5, 0.8], [4.15, 3.22, -5.1, 0.8], [4.25, 0.12, 10.2, 1.25]]) plant(x, y, z, scale);

  // Front sliding parking gate with its upper open bands and lower pickets.
  for (const x of [-4.92, -2.51, -0.1, 2.31, 4.72]) box([0.09, 2.76, 0.1], [x, 1.47, 10.12], metal);
  for (const y of [0.16, 1.2, 2.03, 2.4, 2.82]) beam([-4.92, y, 10.12], [4.72, y, 10.12], 0.075, metal);
  for (let x = -4.8; x < 4.7; x += 0.27) beam([x, 0.17, 10.12], [x, 2.03, 10.12], 0.027, metal).castShadow = false;
  // Low forecourt side walls frame the entrance without hiding the miniature.
  for (const x of [-5.14, 4.94]) {
    box([0.2, 2.93, 3.38], [x, 1.48, 8.51], concrete);
    box([0.28, 0.1, 3.48], [x, 2.98, 8.51], slab);
  }

  const car = new THREE.Group();
  car.position.set(2.25, 0.1, 8.12);
  model.add(car);
  const carPaint = mat(0xd8dddc, { metalness: 0.25, roughness: 0.35 });
  box([1.62, 0.6, 3.28], [0, 0.59, 0], carPaint, car);
  box([1.44, 0.63, 1.56], [0, 1.17, -0.15], windowGlass, car);
  box([1.52, 0.08, 1.62], [0, 1.52, -0.15], carPaint, car);
  box([1.48, 0.16, 0.06], [0, 0.51, 1.66], black, car);
  for (const x of [-0.82, 0.82]) for (const z of [-1.03, 1.03]) {
    const wheel = round([0.29, 0.15, 0.29], [x, 0.33, z], black, car);
    wheel.rotation.z = Math.PI / 2;
    const hub = round([0.16, 0.16, 0.16], [x, 0.33, z], metal, car);
    hub.rotation.z = Math.PI / 2;
  }
  for (const x of [-0.57, 0.57]) box([0.38, 0.17, 0.05], [x, 0.78, 1.66], ivory, car);
  for (const x of [-0.48, 0.48]) box([0.065, 0.65, 1.59], [x, 1.17, -0.15], carPaint, car);

  for (const x of [-1.3, -0.25]) {
    const bike = new THREE.Group();
    bike.position.set(x, 0.14, 8.68);
    bike.rotation.y = -0.18;
    model.add(bike);
    for (const z of [-0.58, 0.58]) {
      const wheel = round([0.29, 0.13, 0.29], [0, 0.31, z], black, bike);
      wheel.rotation.z = Math.PI / 2;
    }
    beam([0, 0.35, -0.55], [0, 0.82, 0.25], 0.1, black, bike);
    beam([0, 0.31, 0.58], [0, 1.04, 0.35], 0.045, metal, bike);
    box([0.34, 0.13, 0.83], [0, 0.87, -0.16], black, bike);
    box([0.39, 0.26, 0.44], [0, 0.69, 0.13], red, bike);
    beam([-0.3, 1.07, 0.32], [0.3, 1.07, 0.32], 0.045, metal, bike);
  }

  return {
    model,
    dispose() { geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); },
  };
}
