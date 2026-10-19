import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ROAD_CENTERS, type CarVisual, type CityWorld, type Collider } from './types';

// Everything in the district is generated locally. Repeated city details share
// geometry and are combined into instanced meshes to keep the chase lightweight.
export function createWorld(scene: THREE.Scene, lowQuality: boolean): CityWorld {
  const root = new THREE.Group();
  root.name = 'Sunset District';
  scene.add(root);
  const colliders: Collider[] = [];
  const textures = new Set<THREE.Texture>();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, lowQuality ? 6 : 10);
  const cone = new THREE.ConeGeometry(1, 1, lowQuality ? 6 : 9);
  const foliage = new THREE.IcosahedronGeometry(1, lowQuality ? 0 : 1);
  const dummy = new THREE.Object3D();
  type Batch = { geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[]; matrices: THREE.Matrix4[]; shadow: boolean };
  const batches = new Map<string, Batch>();
  let randomState = 72641;
  const random = () => { randomState = (randomState * 16807) % 2147483647; return (randomState - 1) / 2147483646; };
  const material = (color: THREE.ColorRepresentation, roughness = 0.8, metalness = 0) => {
    const result = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    materials.add(result);
    return result;
  };
  const add = (geometry: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0, shadow = true, rx = 0, rz = 0) => {
    geometries.add(geometry);
    (Array.isArray(mat) ? mat : [mat]).forEach((m) => materials.add(m));
    const key = `${geometry.uuid}:${(Array.isArray(mat) ? mat : [mat]).map((m) => m.uuid).join(',')}:${shadow}`;
    let batch = batches.get(key);
    if (!batch) { batch = { geometry, material: mat, matrices: [], shadow }; batches.set(key, batch); }
    dummy.position.set(x, y, z);
    dummy.rotation.set(rx, ry, rz);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    batch.matrices.push(dummy.matrix.clone());
  };
  const cube = (mat: THREE.Material | THREE.Material[], x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0, shadow = true, rx = 0, rz = 0) => add(box, mat, x, y, z, sx, sy, sz, ry, shadow, rx, rz);

  const asphalt = material('#343f48');
  const curb = material('#d0c4b2');
  const sand = material('#b4a08a');
  const grass = material('#75886a');
  const path = material('#d0b995');
  const line = material('#e4dbbf');
  const yellowLine = material('#d2ae6e');
  const roof = material('#8e938a');
  const roofTrim = material('#e5d4b9');
  const dark = material('#263940');
  const metal = material('#697c7b', 0.55, 0.35);
  const orange = material('#e37c49');
  const teal = material('#40938b');
  const trunks = material('#88745c');
  const leafDark = material('#426c57');
  const leafLight = material('#69846a');
  const water = material('#498e98', 0.25, 0.35);
  const tank = material('#8b6250');

  // A subtle large-scale texture gives the roads a little grit without assets.
  const pavementCanvas = document.createElement('canvas');
  pavementCanvas.width = pavementCanvas.height = 128;
  const pc = pavementCanvas.getContext('2d')!;
  pc.fillStyle = '#bdb5a6'; pc.fillRect(0, 0, 128, 128);
  pc.strokeStyle = '#aaa496'; pc.lineWidth = 1;
  for (let i = 0; i <= 128; i += 32) { pc.beginPath(); pc.moveTo(i, 0); pc.lineTo(i, 128); pc.stroke(); pc.beginPath(); pc.moveTo(0, i); pc.lineTo(128, i); pc.stroke(); }
  const pavementTexture = new THREE.CanvasTexture(pavementCanvas);
  pavementTexture.colorSpace = THREE.SRGBColorSpace;
  pavementTexture.wrapS = pavementTexture.wrapT = THREE.RepeatWrapping;
  pavementTexture.repeat.set(8, 8);
  textures.add(pavementTexture);
  const pavement = new THREE.MeshStandardMaterial({ map: pavementTexture, roughness: 1 });
  materials.add(pavement);

  cube(sand, 0, -0.3, 0, 1600, 0.5, 1600, 0, false);
  cube(asphalt, 0, -0.03, 0, 448, 0.06, 448, 0, false);
  // Full blocks leave a clean, twenty-unit street network between them.
  const centers = [-160, -96, -32, 32, 96, 160];
  for (const x of centers) for (const z of centers) {
    cube(pavement, x, 0.13, z, 44, 0.26, 44, 0, false);
    for (const s of [-1, 1]) {
      cube(curb, x + s * 21.8, 0.23, z, 0.35, 0.2, 44, 0, false);
      cube(curb, x, 0.23, z + s * 21.8, 44, 0.2, 0.35, 0, false);
    }
  }
  for (const road of ROAD_CENTERS) {
    for (let p = -222; p < 222; p += 7) {
      if (!ROAD_CENTERS.some((c) => Math.abs(c - p) < 12)) {
        cube(yellowLine, road, 0.02, p, 0.16, 0.035, 3.2, 0, false);
        cube(yellowLine, p, 0.02, road, 3.2, 0.035, 0.16, 0, false);
      }
    }
    for (let segment = -1; segment < ROAD_CENTERS.length; segment++) {
      const start = segment < 0 ? -224 : ROAD_CENTERS[segment] + 11;
      const end = segment + 1 >= ROAD_CENTERS.length ? 224 : ROAD_CENTERS[segment + 1] - 11;
      if (end <= start) continue;
      for (const side of [-7.8, 7.8]) {
        cube(line, road + side, 0.019, (start + end) / 2, 0.12, 0.03, end - start, 0, false);
        cube(line, (start + end) / 2, 0.019, road + side, end - start, 0.03, 0.12, 0, false);
      }
    }
    for (const crossing of ROAD_CENTERS) {
      for (const side of [-1, 1]) for (let stripe = -6.6; stripe <= 6.7; stripe += 2.2) {
        cube(line, road + stripe, 0.023, crossing + side * 12.3, 1.1, 0.035, 3.7, 0, false);
        cube(line, road + side * 12.3, 0.023, crossing + stripe, 3.7, 0.035, 1.1, 0, false);
      }
    }
  }

  // The window grid is baked into facade textures. Geometry remains one box
  // per building, with a separate roof face and instanced architectural trim.
  const facadePalettes = [
    ['#d8c6ab', '#415d65'], ['#c68c6c', '#425c62'], ['#c4c7b8', '#405c61'],
    ['#aaa99c', '#375461'], ['#e4d6bc', '#53757a'], ['#c9a88c', '#435a62'],
  ];
  const facadeMaterials: THREE.Material[][][] = [];
  for (const floors of [3, 6, 10]) facadeMaterials.push(facadePalettes.map(([wall, window], index) => {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = wall; ctx.fillRect(0, 0, 256, 512);
    const floorHeight = 512 / floors;
    for (let floor = 0; floor < floors; floor++) {
      const y = floor * floorHeight;
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(0, y + floorHeight - 4, 256, 3);
      ctx.fillStyle = 'rgba(45,47,43,0.13)'; ctx.fillRect(0, y + floorHeight - 1, 256, 1);
      for (let col = 0; col < 5; col++) {
        const x = col * 50 + 12;
        ctx.fillStyle = 'rgba(50,48,42,.25)'; ctx.fillRect(x - 2, y + floorHeight * 0.18, 30, floorHeight * 0.68);
        ctx.fillStyle = random() > 0.9 ? '#d5b477' : window; ctx.fillRect(x, y + floorHeight * 0.2, 26, floorHeight * 0.58);
        ctx.fillStyle = 'rgba(170,206,204,.2)'; ctx.fillRect(x + 2, y + floorHeight * 0.23, 22, floorHeight * 0.14);
        ctx.fillStyle = 'rgba(20,34,38,.45)'; ctx.fillRect(x + 12, y + floorHeight * 0.2, 2, floorHeight * 0.58);
        ctx.fillStyle = 'rgba(255,242,207,.35)'; ctx.fillRect(x - 2, y + floorHeight * 0.8, 30, 3);
      }
    }
    if (index % 2 === 0) { ctx.fillStyle = 'rgba(236,222,192,.35)'; ctx.fillRect(0, 0, 6, 512); ctx.fillRect(250, 0, 6, 512); }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = lowQuality ? 2 : 4;
    textures.add(texture);
    const side = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.88 }); materials.add(side);
    return [side, side, roof, roof, side, side];
  }));
  const facades = facadeMaterials[2];
  const awnings = [orange, teal, material('#dfbd69'), material('#b66d62')];

  const makePalm = (x: number, z: number, height = 8, angle = 0) => {
    add(cylinder, trunks, x, height / 2 + 0.3, z, 0.23, height, 0.23, 0, true, 0, 0.035);
    add(foliage, leafDark, x + 0.1, height + 0.3, z, 0.8, 0.65, 0.8);
    for (let leaf = 0; leaf < (lowQuality ? 5 : 7); leaf++) {
      const a = angle + leaf * Math.PI * 2 / (lowQuality ? 5 : 7);
      // Long flattened leaves have a recognizable palm silhouette at any range.
      add(foliage, leaf % 2 ? leafLight : leafDark, x + Math.sin(a) * 1.9, height + 0.1, z + Math.cos(a) * 1.9, 0.55, 0.23, 2.7, a, true, 0.19);
    }
  };
  const makeTree = (x: number, z: number, scale = 1) => {
    add(cylinder, trunks, x, 1.7 * scale, z, 0.23 * scale, 3 * scale, 0.23 * scale);
    add(foliage, leafDark, x, 4.4 * scale, z, 2.2 * scale, 2.8 * scale, 2.2 * scale);
    add(foliage, leafLight, x + 0.8 * scale, 5 * scale, z - 0.45 * scale, 1.8 * scale, 2 * scale, 1.8 * scale);
  };
  const makeBuilding = (x: number, z: number, width: number, depth: number, height: number, palette: number, shop = false) => {
    const floorClass = height < 15 ? 0 : height < 29 ? 1 : 2;
    cube(facadeMaterials[floorClass][palette % facadePalettes.length], x, height / 2 + 0.27, z, width, height, depth);
    colliders.push({ x, z, halfX: width / 2 + 0.15, halfZ: depth / 2 + 0.15 });
    cube(roofTrim, x, height + 0.28, z, width + 0.55, 0.45, depth + 0.55);
    cube(roof, x, height + 0.53, z, width - 0.5, 0.12, depth - 0.5);
    // Projecting ledges catch the low afternoon light.
    if (height > 22) cube(roofTrim, x, 3.7, z, width + 0.24, 0.24, depth + 0.24);
    const acCount = lowQuality ? 1 : 2;
    for (let i = 0; i < acCount; i++) {
      const ax = x + (i === 0 ? -0.2 : 0.25) * width;
      cube(metal, ax, height + 1.15, z + depth * 0.17, 2.2, 1.1, 2.1);
      cube(dark, ax, height + 1.72, z + depth * 0.17, 1.6, 0.08, 1.5);
    }
    if (!lowQuality && height > 18 && random() > 0.55) {
      const tx = x + width * 0.21, tz = z - depth * 0.2;
      for (const dx of [-0.65, 0.65]) for (const dz of [-0.65, 0.65]) cube(metal, tx + dx, height + 1.3, tz + dz, 0.12, 1.7, 0.12);
      add(cylinder, tank, tx, height + 2.7, tz, 1.25, 2.2, 1.25);
      add(cone, dark, tx, height + 4, tz, 1.45, 0.65, 1.45);
    }
    if (shop) {
      const awning = awnings[palette % awnings.length];
      // Street-facing shopfronts sit below the residential facade.
      const outwardZ = z % 64 < 0 ? -1 : 1;
      const shopZ = z + outwardZ * (depth / 2 + 0.06);
      cube(dark, x, 1.75, shopZ, width * 0.84, 2.7, 0.13);
      for (const side of [-1, 1]) cube(roofTrim, x + side * width * 0.24, 1.75, shopZ + outwardZ * 0.09, 0.14, 2.7, 0.12);
      cube(awning, x, 3.3, shopZ + outwardZ * 0.85, width * 0.96, 0.14, 1.9, 0, true, outwardZ * 0.13);
      cube(awning, x, 3.08, shopZ + outwardZ * 1.76, width * 0.96, 0.45, 0.12);
    }
  };

  const parkBlocks = new Set(['-32,-32', '96,96', '-160,96', '96,-160']);
  for (let ix = 0; ix < centers.length; ix++) for (let iz = 0; iz < centers.length; iz++) {
    const x = centers[ix], z = centers[iz];
    if (parkBlocks.has(`${x},${z}`)) {
      cube(grass, x, 0.33, z, 38, 0.18, 38, 0, false);
      cube(path, x, 0.43, z, 4.5, 0.08, 38, 0, false);
      cube(path, x, 0.43, z, 38, 0.08, 4.5, 0, false);
      add(cylinder, curb, x, 0.73, z, 4.1, 0.6, 4.1, 0, false);
      add(cylinder, water, x, 1.05, z, 3.7, 0.12, 3.7, 0, false);
      add(cylinder, roofTrim, x, 1.8, z, 0.7, 1.8, 0.7);
      add(cylinder, water, x, 2.6, z, 1.7, 0.15, 1.7);
      colliders.push({ x, z, halfX: 4.1, halfZ: 4.1 });
      for (const dx of [-12, 12]) for (const dz of [-12, 12]) {
        if ((ix + iz) % 2) makeTree(x + dx, z + dz, 1.1);
        else makePalm(x + dx, z + dz, 8 + random() * 2, random() * 6);
      }
      for (const dx of [-7, 7]) {
        cube(trunks, x + dx, 0.97, z + 7, 3.2, 0.2, 0.85);
        cube(trunks, x + dx, 1.4, z + 7.4, 3.2, 0.7, 0.12);
        for (const side of [-1, 1]) cube(metal, x + dx + side * 1.2, 0.62, z + 7, 0.15, 0.6, 0.6);
      }
      continue;
    }
    const downtown = Math.abs(x) < 100 && Math.abs(z) < 100;
    if ((ix + iz * 3) % 7 === 0) {
      const h = downtown ? 49 + random() * 15 : 25 + random() * 14;
      makeBuilding(x, z, 31, 29, h, ix + iz);
      cube(facades[(ix + iz + 2) % facades.length], x, h + 4.5, z, 21, 8, 20);
      cube(roofTrim, x, h + 8.5, z, 21.5, 0.5, 20.5);
      cube(metal, x, h + 12, z, 0.25, 7, 0.25);
      makePalm(x - 17, z - 16, 8);
      makePalm(x + 17, z + 16, 9);
    } else {
      for (const dx of [-10, 10]) for (const dz of [-10, 10]) {
        const height = downtown ? 17 + random() * 24 : 9 + random() * 19;
        makeBuilding(x + dx, z + dz, 15 + random() * 2, 15 + random() * 2, height, Math.floor(random() * facades.length), true);
      }
    }
  }

  // Street furniture is intentionally non-solid; driving close to it feels fair.
  const lampHead = new THREE.MeshStandardMaterial({ color: '#fff0cf', emissive: '#ffcd83', emissiveIntensity: 1.1 }); materials.add(lampHead);
  for (let i = 0; i < ROAD_CENTERS.length - 1; i++) for (let j = 0; j < ROAD_CENTERS.length; j++) {
    const x = ROAD_CENTERS[j] + 11.2, z = ROAD_CENTERS[i] + 29;
    add(cylinder, dark, x, 4.25, z, 0.13, 8.5, 0.13);
    cube(dark, x - 1.2, 8.45, z, 2.4, 0.16, 0.16);
    cube(lampHead, x - 2.1, 8.35, z, 1.1, 0.12, 0.48);
    if ((i + j) % 3 === 0) makePalm(ROAD_CENTERS[i] + 30, ROAD_CENTERS[j] - 11.6, 7.4 + random() * 2, random() * 6);
    if (!lowQuality && (i + j) % 2 === 0) {
      cube(teal, x + 1, 0.8, z + 5, 0.8, 1.2, 0.8);
      cube(dark, x + 1, 1.44, z + 5, 0.88, 0.12, 0.88);
    }
  }

  const signs = ['MIRAGE', 'SUNSET', 'OASIS', 'COASTLINE', 'HOTEL', 'ARCADE'];
  for (let i = 0; i < signs.length; i++) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = i % 2 ? '#b9613f' : '#2d6464'; ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#e5ca91'; ctx.lineWidth = 5; ctx.strokeRect(8, 8, 496, 112);
    ctx.font = 'bold 56px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff0c8'; ctx.fillText(signs[i], 256, 68);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture);
    const signMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.65, emissive: '#c79562', emissiveMap: texture, emissiveIntensity: 0.15 }); materials.add(signMaterial);
    const signX = [-96, 96, -160, 160, 32, -32][i], signZ = [-181, -53, 139, 11, 139, -117][i];
    for (const side of [-1, 1]) cube(dark, signX + side * 4.2, 3.7, signZ + 0.2, 0.18, 7.4, 0.18);
    cube(dark, signX, 7.5, signZ + 0.06, 10.5, 2.8, 0.25);
    cube(signMaterial, signX, 7.5, signZ - 0.1, 10, 2.5, 0.06);
  }

  // The waterfront and ring-road barriers make the playable district boundary
  // visible while leaving fourteen units of shoulder beyond the outside roads.
  for (const side of [-1, 1]) {
    cube(pavement, side * 209, 0.1, 0, 14, 0.2, 432, 0, false);
    cube(pavement, 0, 0.1, side * 209, 432, 0.2, 14, 0, false);
    cube(curb, side * 216, 0.27, 0, 0.55, 0.55, 432, 0, false);
    cube(curb, 0, 0.27, side * 216, 432, 0.55, 0.55, 0, false);
    cube(metal, side * 216, 0.96, 0, 0.12, 0.29, 432, 0, false);
    cube(metal, 0, 0.96, side * 216, 432, 0.29, 0.12, 0, false);
    for (let p = -210; p <= 210; p += 7) {
      cube(dark, side * 216, 0.66, p, 0.16, 1.1, 0.16, 0, false);
      cube(dark, p, 0.66, side * 216, 0.16, 1.1, 0.16, 0, false);
    }
  }

  // Promenade, ocean and port surround the playable grid, giving the district a
  // destination and a strong silhouette without loading another environment.
  cube(path, 0, 0.12, -235, 520, 0.25, 16, 0, false);
  cube(water, 0, -0.14, -560, 1300, 0.13, 610, 0, false);
  const seaStripe = material('#83aaa4', 0.45);
  for (let i = 0; i < 28; i++) cube(seaStripe, -430 + random() * 860, -0.045, -270 - random() * 290, 15 + random() * 75, 0.02, 0.18, 0, false);
  for (let x = -210; x <= 210; x += 20) {
    makePalm(x, -232, 8 + random() * 1.8, random() * 6);
    cube(roofTrim, x, 0.8, -244, 0.22, 1.4, 0.22);
    cube(roofTrim, x + 10, 1.25, -244, 20, 0.12, 0.12);
  }
  const harbor = material('#63767c');
  for (let i = 0; i < 5; i++) {
    const x = -280 + i * 42, z = -295 - (i % 2) * 30;
    cube(harbor, x, 18, z, 2.2, 36, 2.2);
    cube(harbor, x + 11, 35, z, 55, 1.6, 1.6);
    cube(harbor, x - 12, 40, z, 0.4, 15, 0.4, 0, true, 0, -0.6);
    cube(harbor, x + 25, 27, z, 0.18, 16, 0.18);
    cube(harbor, x, 4, z, 20, 8, 10);
  }
  const distant = material('#8d9290');
  for (let i = 0; i < 48; i++) {
    const side = i % 3;
    const along = -320 + Math.floor(i / 3) * 43;
    const h = 14 + random() * 43;
    cube(distant, side === 0 ? -280 - random() * 70 : side === 1 ? 280 + random() * 70 : along, h / 2, side === 2 ? 290 + random() * 60 : along, 16 + random() * 17, h, 16 + random() * 17, 0, false);
  }

  const skyGeometry = new THREE.SphereGeometry(350, 32, 16);
  geometries.add(skyGeometry);
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { topColor: { value: new THREE.Color('#638eab') }, horizonColor: { value: new THREE.Color('#ebc6a0') } },
    vertexShader: 'varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform vec3 topColor; uniform vec3 horizonColor; varying vec3 vPosition; void main(){float h=normalize(vPosition).y;float t=pow(max(h,0.0),0.55);gl_FragColor=vec4(mix(horizonColor,topColor,t),1.0);#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  });
  // Keep preprocessor directives on their own line for WebGL shader compilers.
  skyMaterial.fragmentShader = skyMaterial.fragmentShader.replace(';#include', ';\n#include');
  materials.add(skyMaterial);
  const sky = new THREE.Mesh(skyGeometry, skyMaterial); sky.frustumCulled = false; root.add(sky);
  const sunMaterial = new THREE.MeshBasicMaterial({ color: '#fff0c3', fog: false }); materials.add(sunMaterial);
  const sunGeometry = new THREE.SphereGeometry(20, 24, 16); geometries.add(sunGeometry);
  const sun = new THREE.Mesh(sunGeometry, sunMaterial); sun.position.set(-260, 90, -460); root.add(sun);

  for (const batch of batches.values()) {
    const mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
    batch.matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = batch.shadow;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    root.add(mesh);
  }
  return {
    colliders,
    dispose() {
      scene.remove(root);
      root.traverse((object) => { if (object instanceof THREE.InstancedMesh) object.dispose(); });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((mat) => mat.dispose());
      textures.forEach((texture) => texture.dispose());
      root.clear();
    },
  };
}

export function createCar(color: number, police = false, lowDetail = false): CarVisual {
  const group = new THREE.Group();
  const wheels: THREE.Group[] = [];
  const brakeLights: THREE.Mesh[] = [];
  const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.28 });
  const black = new THREE.MeshStandardMaterial({ color: '#172329', roughness: 0.62 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#172024', roughness: 0.94 });
  const rim = new THREE.MeshStandardMaterial({ color: '#bbc5c6', roughness: 0.3, metalness: 0.75 });
  const glass = new THREE.MeshStandardMaterial({ color: '#294b59', metalness: 0.45, roughness: 0.16 });
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const part = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  };
  const block = (material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => part(unitBox, material, x, y, z, sx, sy, sz);
  const shape = new THREE.Shape();
  shape.moveTo(-2.25, 0.56); shape.lineTo(-2.25, 1.02); shape.lineTo(-1.95, 1.18);
  shape.lineTo(-0.95, 1.19); shape.lineTo(0.9, 1.14); shape.lineTo(1.85, 1.08);
  shape.lineTo(2.2, 0.92); shape.lineTo(2.23, 0.59); shape.lineTo(1.9, 0.47); shape.lineTo(-1.9, 0.47); shape.closePath();
  const bodyGeometry = new THREE.ExtrudeGeometry(shape, { depth: 1.96, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.07, bevelSegments: 2, steps: 1 });
  bodyGeometry.rotateY(-Math.PI / 2); bodyGeometry.translate(0.98, 0, 0); bodyGeometry.computeVertexNormals();
  part(bodyGeometry, paint, 0, 0, 0);
  block(black, 0, 0.46, 0, 1.95, 0.18, 3.8);

  const cabinGeometry = new THREE.BufferGeometry();
  cabinGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.94, 1.13, -1.35, 0.94, 1.13, -1.35, 0.94, 1.13, 1.04, -0.94, 1.13, 1.04,
    -0.77, 1.86, -0.86, 0.77, 1.86, -0.86, 0.77, 1.86, 0.43, -0.77, 1.86, 0.43,
  ], 3));
  cabinGeometry.setIndex([0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0, 4, 7, 6, 4, 6, 5]);
  cabinGeometry.computeVertexNormals();
  part(cabinGeometry, glass, 0, 0, 0);
  block(police ? black : paint, 0, 1.88, -0.22, 1.58, 0.08, 1.38);
  for (const side of [-1, 1]) {
    const pillar = block(police ? black : paint, side * 0.855, 1.5, -0.22, 0.1, 0.7, 0.12); pillar.rotation.z = side * 0.2;
    block(black, side * 1.015, 0.92, 0.05, 0.045, 0.045, 2.9);
    block(rim, side * 1.045, 1.04, -0.2, 0.04, 0.055, 0.27);
    block(police ? black : paint, side * 1.12, 1.22, 0.6, 0.3, 0.16, 0.33);
    block(black, side * 0.94, 1.13, 0.6, 0.18, 0.09, 0.12);
  }
  block(black, 0, 0.65, 2.235, 1.8, 0.17, 0.12);
  block(black, 0, 0.64, -2.25, 1.85, 0.18, 0.14);
  block(black, 0, 0.89, 2.225, 0.85, 0.19, 0.08);
  block(rim, 0, 0.62, 2.31, 0.65, 0.1, 0.025);
  const headlight = new THREE.MeshStandardMaterial({ color: '#fff0cb', emissive: '#ffe5a7', emissiveIntensity: 0.8, roughness: 0.25 });
  const taillightMaterial = new THREE.MeshStandardMaterial({ color: '#b42024', emissive: '#ff1f15', emissiveIntensity: 0.45 });
  for (const side of [-1, 1]) {
    block(headlight, side * 0.75, 0.94, 2.21, 0.44, 0.19, 0.09);
    brakeLights.push(block(taillightMaterial, side * 0.72, 0.96, -2.265, 0.49, 0.16, 0.075));
  }
  block(rim, 0, 0.82, -2.29, 0.5, 0.17, 0.03);
  // Twin racing stripes, a modest rear spoiler and inset alloy wheels.
  for (const side of [-1, 1]) {
    const stripe = block(black, side * 0.23, 1.134, 1.45, 0.14, 0.018, 0.96); stripe.rotation.x = 0.065;
    block(black, side * 0.66, 1.28, -1.92, 0.1, 0.27, 0.13);
  }
  block(police ? black : paint, 0, 1.42, -1.96, 2.08, 0.09, 0.35);
  const tireGeometry = new THREE.CylinderGeometry(0.46, 0.46, 0.31, 18); tireGeometry.rotateZ(Math.PI / 2);
  const rimGeometry = new THREE.CylinderGeometry(0.29, 0.29, 0.325, 12); rimGeometry.rotateZ(Math.PI / 2);
  const hubGeometry = new THREE.CylinderGeometry(0.11, 0.11, 0.34, 10); hubGeometry.rotateZ(Math.PI / 2);
  for (const side of [-1, 1]) for (const z of [-1.43, 1.42]) {
    const wheel = new THREE.Group(); wheel.position.set(side * 1.065, 0.47, z);
    const tire = new THREE.Mesh(tireGeometry, rubber); tire.castShadow = true; wheel.add(tire);
    const alloy = new THREE.Mesh(rimGeometry, rim); alloy.castShadow = true; wheel.add(alloy);
    const hub = new THREE.Mesh(hubGeometry, black); wheel.add(hub);
    for (let spoke = 0; spoke < (lowDetail ? 0 : 5); spoke++) {
      const angle = spoke * Math.PI * 2 / 5;
      const mesh = new THREE.Mesh(unitBox, black);
      mesh.position.set(side * 0.167, Math.sin(angle) * 0.18, Math.cos(angle) * 0.18);
      mesh.scale.set(0.015, 0.055, 0.18); mesh.rotation.x = -angle; wheel.add(mesh);
    }
    group.add(wheel); wheels.push(wheel);
  }

  if (police) {
    block(black, 0, 1.14, 1.5, 1.8, 0.04, 1.0);
    for (const side of [-1, 1]) {
      block(black, side * 1.035, 0.88, 0, 0.035, 0.47, 1.5);
      if (!lowDetail) {
        const badge = new THREE.Mesh(new THREE.CircleGeometry(0.19, 6), new THREE.MeshStandardMaterial({ color: '#d7ba73', metalness: 0.5 }));
        badge.position.set(side * 1.06, 0.9, 0.1); badge.rotation.y = side * Math.PI / 2; group.add(badge);
      }
    }
    block(black, 0, 2, -0.18, 1.4, 0.12, 0.34);
    const red = new THREE.MeshStandardMaterial({ color: '#f4474c', emissive: '#ff192d', emissiveIntensity: 2 });
    const blue = new THREE.MeshStandardMaterial({ color: '#4a9dff', emissive: '#176bff', emissiveIntensity: 2 });
    block(red, -0.45, 2.14, -0.18, 0.44, 0.2, 0.33);
    block(blue, 0.45, 2.14, -0.18, 0.44, 0.2, 0.33);
  }

  const exhaust = new THREE.Group(); exhaust.position.set(0, 0.57, -2.25); exhaust.visible = false;
  const flame = new THREE.MeshBasicMaterial({ color: '#2bdaff', transparent: true, opacity: 0.8, depthWrite: false });
  const flameCore = new THREE.MeshBasicMaterial({ color: '#d0fbff', transparent: true, opacity: 0.95, depthWrite: false });
  const flameGeometry = new THREE.ConeGeometry(0.15, 1.1, 7);
  const coreGeometry = new THREE.ConeGeometry(0.08, 0.72, 7);
  for (const side of [-1, 1]) {
    const outer = new THREE.Mesh(flameGeometry, flame); outer.position.set(side * 0.66, 0, -0.47); outer.rotation.x = -Math.PI / 2; exhaust.add(outer);
    const inner = new THREE.Mesh(coreGeometry, flameCore); inner.position.set(side * 0.66, 0, -0.3); inner.rotation.x = -Math.PI / 2; exhaust.add(inner);
    block(rim, side * 0.66, 0.57, -2.28, 0.24, 0.14, 0.14);
  }
  group.add(exhaust);

  // Small independent details make authoring the body straightforward; merge
  // them before rendering so a full traffic fleet stays affordable on laptops.
  const normalizedClone = (mesh: THREE.Mesh) => {
    mesh.updateMatrix();
    let geometry = mesh.geometry.clone().applyMatrix4(mesh.matrix);
    if (geometry.index) { const flat = geometry.toNonIndexed(); geometry.dispose(); geometry = flat; }
    return geometry;
  };
  const mergeByMaterial = (parent: THREE.Group) => {
    const groups = new Map<THREE.Material, THREE.Mesh[]>();
    for (const child of parent.children) if (child instanceof THREE.Mesh && !Array.isArray(child.material)) {
      const parts = groups.get(child.material) ?? []; parts.push(child); groups.set(child.material, parts);
    }
    for (const [mat, parts] of groups) {
      if (parts.length < 2) continue;
      const geometries = parts.map(normalizedClone);
      const merged = mergeGeometries(geometries, false);
      geometries.forEach((geometry) => geometry.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat); mesh.castShadow = true; mesh.receiveShadow = true;
      const isBrake = parts.some((part) => brakeLights.includes(part));
      parts.forEach((part) => parent.remove(part)); parent.add(mesh);
      if (isBrake) brakeLights.splice(0, brakeLights.length, mesh);
    }
  };
  mergeByMaterial(group);
  if (lowDetail) {
    const wheelMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65, metalness: 0.2 });
    for (const wheel of wheels) {
      const geometries: THREE.BufferGeometry[] = [];
      for (const child of wheel.children) if (child instanceof THREE.Mesh) {
        const geometry = normalizedClone(child);
        const color = (child.material as THREE.MeshStandardMaterial).color;
        const colors = new Float32Array(geometry.attributes.position.count * 3);
        for (let i = 0; i < colors.length; i += 3) { colors[i] = color.r; colors[i + 1] = color.g; colors[i + 2] = color.b; }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geometries.push(geometry);
      }
      const merged = mergeGeometries(geometries, false);
      geometries.forEach((geometry) => geometry.dispose());
      if (merged) { wheel.clear(); const mesh = new THREE.Mesh(merged, wheelMaterial); mesh.castShadow = true; wheel.add(mesh); }
    }
  } else wheels.forEach(mergeByMaterial);
  return { group, wheels, brakeLights, exhaust };
}
