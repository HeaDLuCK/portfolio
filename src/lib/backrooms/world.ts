import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GRID, cellToWorld, FUSE_CELLS, EXIT_CELL } from './level';
import { CELL_SIZE, CEILING_HEIGHT, type HorrorWorld, type HollowVisual } from './types';

// All surfaces are original procedural assets. A small number of instanced
// batches keeps the maze inexpensive even when many rooms are visible at once.
export function createHorrorWorld(scene: THREE.Scene, lowQuality: boolean): HorrorWorld {
  const root = new THREE.Group();
  root.name = 'The rooms behind the walls';
  scene.add(root);
  let seed = 13847;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const textures = new Set<THREE.Texture>();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const plane = new THREE.PlaneGeometry(1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, lowQuality ? 6 : 10);
  const dummy = new THREE.Object3D();
  type Batch = { geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[]; colors: THREE.Color[] };
  const batches = new Map<string, Batch>();
  const material = (color: THREE.ColorRepresentation, opts: THREE.MeshStandardMaterialParameters = {}) => {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.94, ...opts });
    materials.add(mat);
    return mat;
  };
  const texture = (size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void, repeatX = 1, repeatY = 1) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    draw(canvas.getContext('2d')!, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = lowQuality ? 2 : 4;
    textures.add(tex);
    return tex;
  };
  const add = (geometry: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0, rx = 0, rz = 0, tint = 1) => {
    geometries.add(geometry);
    materials.add(mat);
    const key = `${geometry.uuid}:${mat.uuid}`;
    let batch = batches.get(key);
    if (!batch) { batch = { geometry, material: mat, matrices: [], colors: [] }; batches.set(key, batch); }
    dummy.position.set(x, y, z);
    dummy.rotation.set(rx, ry, rz);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    batch.matrices.push(dummy.matrix.clone());
    batch.colors.push(new THREE.Color(tint, tint, tint));
  };
  const cube = (mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0, tint = 1) => add(box, mat, x, y, z, sx, sy, sz, ry, 0, 0, tint);
  const single = (geometry: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Group, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0) => {
    geometries.add(geometry); materials.add(mat);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.rotation.y = ry;
    parent.add(mesh);
    return mesh;
  };

  const wallpaper = texture(512, (ctx, size) => {
    ctx.fillStyle = '#a99f6a'; ctx.fillRect(0, 0, size, size);
    const wash = ctx.createLinearGradient(0, 0, 0, size);
    wash.addColorStop(0, 'rgba(67,61,28,.22)'); wash.addColorStop(0.2, 'rgba(221,212,147,.12)'); wash.addColorStop(0.7, 'rgba(99,83,38,.08)'); wash.addColorStop(1, 'rgba(40,38,22,.55)');
    ctx.fillStyle = wash; ctx.fillRect(0, 0, size, size);
    // A faded, small damask pattern rather than a perfectly clean flat wall.
    for (let y = -24; y < size + 40; y += 42) {
      for (let x = -24; x < size + 40; x += 40) {
        const ox = x + ((Math.floor(y / 42) & 1) ? 20 : 0);
        ctx.strokeStyle = 'rgba(88,82,40,.20)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(ox, y - 14);
        ctx.bezierCurveTo(ox - 18, y - 2, ox - 9, y + 10, ox, y + 16);
        ctx.bezierCurveTo(ox + 9, y + 10, ox + 18, y - 2, ox, y - 14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ox, y - 9); ctx.lineTo(ox, y + 12); ctx.stroke();
        ctx.fillStyle = 'rgba(213,200,132,.18)'; ctx.fillRect(ox - 1, y - 1, 2, 2);
      }
    }
    for (let i = 0; i < 14000; i++) {
      const shade = random() > 0.5 ? 230 : 37;
      ctx.fillStyle = `rgba(${shade},${shade},${Math.round(shade * 0.7)},${random() * 0.045})`;
      ctx.fillRect(random() * size, random() * size, 1 + random() * 2, 1);
    }
    // Damp seams, water runs and a few lifted pieces of wallpaper.
    for (let i = 0; i < 34; i++) {
      const x = random() * size; const y = random() * size;
      ctx.strokeStyle = `rgba(46,42,23,${0.05 + random() * 0.12})`; ctx.lineWidth = 0.5 + random() * 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 5, Math.min(size, y + 15 + random() * 110)); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(38,36,20,.2)'; ctx.fillRect(0, 0, 2, size); ctx.fillRect(size - 2, 0, 2, size);
    for (let i = 0; i < 5; i++) {
      const x = 40 + random() * 430; const y = 80 + random() * 390;
      ctx.fillStyle = 'rgba(66,60,31,.4)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 5, y + 40); ctx.lineTo(x + 14, y + 12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(192,178,117,.6)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2, y + 27); ctx.lineTo(x + 11, y + 10); ctx.closePath(); ctx.fill();
    }
  });
  const floorMap = texture(256, (ctx, size) => {
    ctx.fillStyle = '#665c3c'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 18000; i++) {
      const light = random() > 0.55;
      ctx.fillStyle = light ? `rgba(170,151,100,${random() * 0.36})` : `rgba(21,23,16,${random() * 0.33})`;
      ctx.fillRect(random() * size, random() * size, 1, random() * 4 + 1);
    }
    ctx.fillStyle = 'rgba(22,21,14,.14)'; ctx.fillRect(0, 0, 1, size); ctx.fillRect(0, 0, size, 1);
  }, GRID[0].length * 2, GRID.length * 2);
  const ceilingMap = texture(256, (ctx, size) => {
    ctx.fillStyle = '#99977e'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4500; i++) {
      const v = random() * 70 + 55; ctx.fillStyle = `rgba(${v},${v},${v * 0.8},.25)`;
      ctx.fillRect(random() * size, random() * size, random() * 2, 1);
    }
    ctx.strokeStyle = '#57594c'; ctx.lineWidth = 3;
    ctx.strokeRect(1, 1, size - 2, size - 2); ctx.strokeRect(1, 1, size / 2 - 2, size - 2);
    for (let i = 0; i < 4; i++) {
      const x = random() * size; const y = random() * size;
      const stain = ctx.createRadialGradient(x, y, 4, x, y, 25 + random() * 38);
      stain.addColorStop(0, 'rgba(65,49,24,.19)'); stain.addColorStop(0.72, 'rgba(80,61,28,.13)'); stain.addColorStop(1, 'rgba(65,49,24,0)');
      ctx.fillStyle = stain; ctx.fillRect(0, 0, size, size);
    }
  }, GRID[0].length * 2, GRID.length * 2);
  const stainMap = texture(128, (ctx, size) => {
    ctx.clearRect(0, 0, size, size);
    for (let i = 0; i < 65; i++) {
      const x = size / 2 + (random() - 0.5) * 75; const y = size / 2 + (random() - 0.5) * 65;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 7 + random() * 25);
      gradient.addColorStop(0, 'rgba(26,25,16,.24)'); gradient.addColorStop(1, 'rgba(26,25,16,0)');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, size, size);
    }
  });
  const wallMat = material('#d3c99a', { map: wallpaper, bumpMap: wallpaper, bumpScale: 0.025 });
  const carpet = material('#b2a581', { map: floorMap, bumpMap: floorMap, bumpScale: 0.018 });
  const ceiling = material('#b4b4a1', { map: ceilingMap, bumpMap: ceilingMap, bumpScale: 0.024 });
  const skirting = material('#403d2c');
  const casing = material('#8f927c', { metalness: 0.35, roughness: 0.64 });
  const offTube = material('#595c4d');
  const tube = material('#dadcaf', { emissive: '#dfe5b3', emissiveIntensity: 1.25, roughness: 0.55 });
  const coldTube = material('#b6cdc5', { emissive: '#a9cec1', emissiveIntensity: 0.85 });
  const maintenance = material('#3e1c17', { map: wallpaper, bumpMap: wallpaper, bumpScale: 0.02 });
  const redTube = material('#7c2113', { emissive: '#c12711', emissiveIntensity: 1.45 });
  const rust = material('#554333', { metalness: 0.5, roughness: 0.82 });
  const scuff = material('#aaa386', { map: stainMap, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  const wood = material('#3e3627');
  const chairPad = material('#3c4236');
  const metal = material('#454b43', { roughness: 0.53, metalness: 0.6 });
  const black = material('#101511');
  const width = GRID[0].length * CELL_SIZE;
  const depth = GRID.length * CELL_SIZE;
  const origin = cellToWorld((GRID[0].length - 1) / 2, (GRID.length - 1) / 2);
  add(plane, carpet, origin.x, -0.006, origin.z, width, depth, 1, 0, -Math.PI / 2);
  add(plane, ceiling, origin.x, CEILING_HEIGHT, origin.z, width, depth, 1, 0, Math.PI / 2);
  const isOpen = (x: number, z: number) => z >= 0 && z < GRID.length && x >= 0 && x < GRID[z].length && GRID[z][x] !== '#';
  const fixtures: THREE.Vector3[] = [];
  const wallFaces: { x: number; z: number; nx: number; nz: number; cx: number; cz: number }[] = [];
  const redArea = (cx: number, cz: number) => cx > GRID[0].length * 0.68 && cz > GRID.length * 0.63;
  for (let z = 0; z < GRID.length; z++) {
    for (let x = 0; x < GRID[z].length; x++) {
      const p = cellToWorld(x, z);
      if (!isOpen(x, z)) {
        const isRed = redArea(x, z);
        cube(isRed ? maintenance : wallMat, p.x, CEILING_HEIGHT / 2, p.z, CELL_SIZE, CEILING_HEIGHT, CELL_SIZE, 0, 0.88 + random() * 0.12);
        for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (!isOpen(x + nx, z + nz)) continue;
          const fx = p.x + nx * (CELL_SIZE / 2 + 0.008); const fz = p.z + nz * (CELL_SIZE / 2 + 0.008);
          cube(skirting, fx, 0.065, fz, nz ? CELL_SIZE + 0.01 : 0.045, 0.13, nx ? CELL_SIZE + 0.01 : 0.045);
          cube(skirting, fx, CEILING_HEIGHT - 0.065, fz, nz ? CELL_SIZE : 0.04, 0.13, nx ? CELL_SIZE : 0.04);
          wallFaces.push({ x: fx, z: fz, nx, nz, cx: x, cz: z });
          if (random() < 0.12) {
            const stainY = 0.55 + random() * 1.8;
            add(plane, scuff, fx + nx * 0.015, stainY, fz + nz * 0.015, 1.1 + random() * 1.2, 1 + random() * 1.2, 1, Math.atan2(nx, nz));
          }
        }
      } else {
        const nearWalls = !isOpen(x - 1, z) || !isOpen(x + 1, z) || !isOpen(x, z - 1) || !isOpen(x, z + 1);
        const isRed = redArea(x, z);
        if ((x + z) % 3 === 0 || (x % 2 === 0 && z % 2 === 0)) {
          const rz = !isOpen(x + 1, z) && !isOpen(x - 1, z) ? Math.PI / 2 : 0;
          const isDead = (x * 7 + z * 3) % 11 === 0;
          cube(casing, p.x, CEILING_HEIGHT - 0.075, p.z, 1.22, 0.12, 0.36, rz);
          cube(black, p.x, CEILING_HEIGHT - 0.141, p.z, 1.13, 0.015, 0.29, rz);
          const glow = isDead ? offTube : isRed ? redTube : (x + z) % 7 === 0 ? coldTube : tube;
          for (const offset of [-0.075, 0.075]) {
            cube(glow, p.x + (rz ? offset : 0), CEILING_HEIGHT - 0.16, p.z + (rz ? 0 : offset), 1.02, 0.035, 0.037, rz);
          }
          if (!isDead) fixtures.push(new THREE.Vector3(p.x, CEILING_HEIGHT - 0.25, p.z));
        }
        if (random() < 0.17) add(plane, scuff, p.x + random() - 0.5, 0.004, p.z + random() - 0.5, 1.4 + random() * 1.5, 1.4 + random() * 1.8, 1, random() * Math.PI, -Math.PI / 2);
        // Service pipes live high above the player's collision volume.
        if ((x * 3 + z) % 17 === 0 && nearWalls) {
          add(cylinder, rust, p.x - 0.7, CEILING_HEIGHT - 0.3, p.z, 0.042, CELL_SIZE + 0.04, 0.042, 0, Math.PI / 2);
          cube(rust, p.x - 0.7, CEILING_HEIGHT - 0.15, p.z - 0.9, 0.10, 0.23, 0.08);
          cube(rust, p.x - 0.7, CEILING_HEIGHT - 0.15, p.z + 0.9, 0.10, 0.23, 0.08);
        }
        // A few disconnected ceiling panels expose a black recess, never sky.
        if (!lowQuality && (x * 11 + z * 13) % 43 === 0) {
          cube(black, p.x + 0.75, CEILING_HEIGHT - 0.012, p.z + 0.5, 0.56, 0.018, 0.56);
          cube(casing, p.x + 0.74, CEILING_HEIGHT - 0.13, p.z + 0.48, 0.53, 0.025, 0.53, 0.2);
        }
      }
    }
  }

  const label = (lines: string[], widthPx: number, heightPx: number, bg: string, ink: string, fontSize: number) => {
    const canvas = document.createElement('canvas'); canvas.width = widthPx; canvas.height = heightPx;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, widthPx, heightPx);
    for (let i = 0; i < 700; i++) { ctx.fillStyle = `rgba(20,17,10,${random() * 0.08})`; ctx.fillRect(random() * widthPx, random() * heightPx, 1 + random() * 6, 1); }
    ctx.strokeStyle = ink; ctx.globalAlpha = 0.32; ctx.strokeRect(7, 7, widthPx - 14, heightPx - 14); ctx.globalAlpha = 1;
    ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `600 ${fontSize}px monospace`;
    lines.forEach((line, index) => ctx.fillText(line, widthPx / 2, heightPx / 2 + (index - (lines.length - 1) / 2) * fontSize * 1.38));
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4; textures.add(map);
    return map;
  };
  const messages = [
    ['IF YOU HEAR YOUR NAME', 'DO NOT ANSWER.'],
    ['A. MERCER / FIELD LOG 04', '', 'THE EXIT HAS MOVED.', 'I HAVE BEEN HERE BEFORE.'],
    ['MAINTENANCE ACCESS', 'POWER FAILURE / LEVEL 0', 'RESTORE THREE CIRCUITS'],
    ['KEEP THE LIGHT ON.', '', 'SHE STOPS WHEN YOU LOOK.', 'SOMETIMES.'],
    ['YOU ARE STILL', 'ON THE SAME FLOOR.'],
  ];
  // Large instructions can be read without getting uncomfortably close to a wall.
  for (let index = 0; index < messages.length; index++) {
    const face = wallFaces[Math.floor((0.09 + index * 0.18) * wallFaces.length)];
    if (!face) continue;
    const mat = material('#d1c6a7', { map: label(messages[index], 512, 320, '#bcb090', '#302e22', index === 0 ? 24 : 21), side: THREE.DoubleSide });
    const paper = single(plane, mat, root, face.x + face.nx * 0.023, 1.6, face.z + face.nz * 0.023, 0.82, 0.52, 1, Math.atan2(face.nx, face.nz));
    paper.rotateZ((index % 2 ? 1 : -1) * 0.025);
  }

  // Forgotten furniture is embedded against wall faces, away from the cell
  // centers used for navigation; no invisible obstructions are introduced.
  for (let index = 0; index < wallFaces.length; index += 29) {
    const face = wallFaces[index];
    if (face.cx < 3 && face.cz < 3) continue;
    const angle = Math.atan2(face.nx, face.nz);
    const x = face.x - face.nx * 0.16; const z = face.z - face.nz * 0.16;
    if (index % 3 === 0) {
      // Small shallow filing cabinet, mostly inside the solid wall tile.
      cube(metal, x, 0.59, z, 0.55, 1.18, 0.37, angle);
      for (let drawer = 0; drawer < 3; drawer++) {
        const y = 0.22 + drawer * 0.36;
        cube(casing, x + face.nx * 0.195, y, z + face.nz * 0.195, 0.46, 0.30, 0.025, angle);
        cube(black, x + face.nx * 0.215, y + 0.06, z + face.nz * 0.215, 0.15, 0.025, 0.03, angle);
      }
    } else {
      const tx = Math.cos(angle); const tz = -Math.sin(angle);
      cube(chairPad, x, 0.46, z, 0.49, 0.07, 0.40, angle);
      cube(chairPad, x - face.nx * 0.14, 0.84, z - face.nz * 0.14, 0.49, 0.43, 0.065, angle);
      for (const side of [-1, 1]) {
        const lx = x + tx * side * 0.19; const lz = z + tz * side * 0.19;
        cube(metal, lx, 0.23, lz, 0.025, 0.46, 0.025, angle);
      }
      cube(wood, x, 0.24, z, 0.41, 0.025, 0.025, angle);
    }
  }

  const fuseModels: THREE.Group[] = [];
  const fuseBrass = material('#a08246', { metalness: 0.64, roughness: 0.39 });
  const fuseGlass = material('#6eaa9d', { emissive: '#7cbead', emissiveIntensity: 0.6, metalness: 0.18, roughness: 0.28 });
  const amber = material('#e9bc64', { emissive: '#d6a352', emissiveIntensity: 0.8 });
  const fuseLabel = material('#a7aaa0', { map: label(['CERAMIC', '250 V'], 128, 128, '#c4c4ac', '#2c392e', 20) });
  const fuseCylinder = new THREE.CylinderGeometry(0.075, 0.075, 0.25, 12);
  for (let i = 0; i < FUSE_CELLS.length; i++) {
    const p = cellToWorld(FUSE_CELLS[i].x, FUSE_CELLS[i].z);
    const group = new THREE.Group(); group.position.set(p.x, 0.95, p.z); group.name = `Circuit ${i + 1}`;
    root.add(group);
    single(box, black, group, 0, -0.18, 0, 0.31, 0.06, 0.25);
    const body = single(fuseCylinder, fuseLabel, group, 0, 0, 0, 1, 1, 1); body.rotation.z = Math.PI / 2;
    for (const sign of [-1, 1]) {
      const cap = single(cylinder, fuseBrass, group, sign * 0.16, 0, 0, 0.078, 0.07, 0.078); cap.rotation.z = Math.PI / 2;
    }
    single(box, fuseGlass, group, 0, 0, 0.077, 0.13, 0.055, 0.014);
    single(box, amber, group, 0, -0.142, 0.128, 0.085, 0.01, 0.013);
    // The diegetic tag makes a pickup visible without a floating arcade icon.
    const tag = material('#b6ad88', { map: label([`CIRCUIT 0${i + 1}`, 'POWER CELL'], 256, 128, '#aba17e', '#27312a', 22) });
    single(plane, tag, group, 0, 0.23, 0, 0.5, 0.25, 1);
    fuseModels.push(group);
  }

  const exitDoor = new THREE.Group();
  const exitP = cellToWorld(EXIT_CELL.x, EXIT_CELL.z);
  exitDoor.position.set(exitP.x, 0, exitP.z);
  exitDoor.name = 'Emergency exit — three circuits required';
  root.add(exitDoor);
  const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const facing = directions.find(([dx, dz]) => !isOpen(EXIT_CELL.x + dx, EXIT_CELL.z + dz)) ?? [0, -1];
  const nx = -facing[0]; const nz = -facing[1];
  exitDoor.rotation.y = Math.atan2(nx, nz);
  exitDoor.position.x += facing[0] * (CELL_SIZE / 2 - 0.12);
  exitDoor.position.z += facing[1] * (CELL_SIZE / 2 - 0.12);
  const doorMat = material('#303e38', { metalness: 0.35, roughness: 0.72 });
  const doorFrame = material('#242d28', { metalness: 0.65, roughness: 0.62 });
  single(box, doorMat, exitDoor, 0, 1.12, 0, 1.25, 2.24, 0.08);
  for (const x of [-0.68, 0.68]) single(box, doorFrame, exitDoor, x, 1.16, 0.045, 0.10, 2.32, 0.14);
  single(box, doorFrame, exitDoor, 0, 2.33, 0.045, 1.45, 0.11, 0.14);
  single(box, metal, exitDoor, 0, 1.05, 0.09, 0.91, 0.065, 0.075);
  single(box, black, exitDoor, 0.38, 0.94, 0.08, 0.09, 0.22, 0.025);
  const exitMap = label(['EXIT  →'], 384, 128, '#214a39', '#d7e1b7', 62);
  const exitSign = material('#d2e0bc', { map: exitMap, emissive: '#b3d9a0', emissiveMap: exitMap, emissiveIntensity: 0.75 });
  single(box, doorFrame, exitDoor, 0, 2.70, 0.055, 1.07, 0.37, 0.13);
  single(plane, exitSign, exitDoor, 0, 2.70, 0.126, 1.0, 0.31, 1);
  const cautionMap = label(['EMERGENCY RELEASE', 'RESTORE AUXILIARY POWER'], 512, 128, '#9c8f5b', '#262b20', 26);
  single(plane, material('#bbb6a0', { map: cautionMap }), exitDoor, 0, 1.76, 0.043, 0.93, 0.23, 1);

  for (const batch of batches.values()) {
    const mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
    batch.matrices.forEach((matrix, index) => { mesh.setMatrixAt(index, matrix); mesh.setColorAt(index, batch.colors[index]); });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.receiveShadow = true;
    mesh.castShadow = batch.material === wallMat || batch.material === maintenance || batch.material === chairPad || batch.material === metal;
    mesh.computeBoundingSphere();
    root.add(mesh);
  }
  let disposed = false;
  return { root, fixtures, fuseModels, exitDoor, dispose() {
    if (disposed) return;
    disposed = true;
    // Include anything parented by the engine (including The Hollow), and dispose
    // shared GPU allocations exactly once.
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      for (const mat of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(mat);
        for (const value of Object.values(mat)) if (value instanceof THREE.Texture) textures.add(value);
      }
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((mat) => mat.dispose());
    textures.forEach((tex) => tex.dispose());
    root.removeFromParent();
    root.clear();
  } };
}

export function createHollow(): HollowVisual {
  const group = new THREE.Group(); group.name = 'The Hollow';
  const head = new THREE.Group(); head.name = 'Head'; head.position.set(0, 2.61, 0.035); group.add(head);
  const arms: THREE.Group[] = [];
  const legs: THREE.Group[] = [];
  const eyes: THREE.Mesh[] = [];
  const skin = new THREE.MeshStandardMaterial({ color: '#a5aaa1', roughness: 0.95, metalness: 0.02 });
  const nails = new THREE.MeshStandardMaterial({ color: '#444b43', roughness: 0.95 });
  const cloth = new THREE.MeshStandardMaterial({ color: '#131a17', roughness: 1, side: THREE.DoubleSide });
  const clothEdge = new THREE.MeshStandardMaterial({ color: '#252c25', roughness: 1 });
  const hair = new THREE.MeshStandardMaterial({ color: '#080c0b', roughness: 0.88 });
  const hollow = new THREE.MeshStandardMaterial({ color: '#010202', roughness: 1 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#202c25', emissive: '#15251e', emissiveIntensity: 0.08, roughness: 0.8 });
  const sphere = new THREE.SphereGeometry(1, 16, 12);
  const capsule = new THREE.CapsuleGeometry(1, 1, 4, 8);
  const parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const collect = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0) => {
    const piece = geometry.clone();
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    piece.applyMatrix4(matrix);
    const list = parts.get(material) ?? []; list.push(piece); parts.set(material, list);
  };
  const flush = (parent: THREE.Group) => {
    for (const [material, geometries] of parts) {
      const merged = mergeGeometries(geometries, false);
      geometries.forEach((geometry) => geometry.dispose());
      if (merged) { const mesh = new THREE.Mesh(merged, material); mesh.castShadow = true; parent.add(mesh); }
    }
    parts.clear();
  };

  // Narrow shoulders, a bent spine and an uneven, almost floor-length dress.
  const dressPoints = [new THREE.Vector2(0.36, 0.43), new THREE.Vector2(0.35, 0.79), new THREE.Vector2(0.25, 1.20), new THREE.Vector2(0.18, 1.68), new THREE.Vector2(0.19, 1.86), new THREE.Vector2(0.285, 2.10), new THREE.Vector2(0.23, 2.23), new THREE.Vector2(0.09, 2.27)];
  const dress = new THREE.LatheGeometry(dressPoints, 24);
  const position = dress.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i); const y = position.getY(i); const z = position.getZ(i);
    const a = Math.atan2(z, x); const fold = 1 + Math.sin(a * 13 + y * 1.7) * (y < 1.4 ? 0.10 : 0.025);
    position.setXYZ(i, x * fold, y + (y < 0.5 ? Math.sin(a * 9) * 0.095 : 0), z * fold - (y > 1.7 ? (y - 1.7) * 0.12 : 0));
  }
  dress.computeVertexNormals(); group.add(new THREE.Mesh(dress, cloth));
  collect(capsule, skin, 0, 2.35, 0.01, 0.058, 0.12, 0.052, 0.1);
  // Loose strips interrupt the otherwise human silhouette.
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2;
    collect(capsule, i % 2 ? cloth : clothEdge, Math.sin(angle) * 0.31, 0.53 + (i % 3) * 0.06, Math.cos(angle) * 0.28, 0.018, 0.16 + (i % 2) * 0.07, 0.009, 0.13 * Math.cos(angle), 0, 0.12 * Math.sin(angle));
  }
  flush(group);

  collect(sphere, skin, 0, 0.015, 0.024, 0.155, 0.225, 0.137, -0.09);
  collect(sphere, skin, 0, -0.133, 0.045, 0.092, 0.11, 0.095, -0.09);
  collect(sphere, hair, 0, 0.07, -0.045, 0.177, 0.246, 0.147, -0.12);
  collect(sphere, hair, 0, 0.196, 0.018, 0.159, 0.073, 0.127, 0, 0, 0.1);
  // Almost no facial detail: only long recessed eye sockets and a small mouth.
  for (const sign of [-1, 1]) {
    collect(sphere, hollow, sign * 0.062, 0.03, 0.145, 0.032, 0.057, 0.017, 0.02, sign * 0.12, sign * -0.11);
    const eye = new THREE.Mesh(sphere, eyeMat); eye.position.set(sign * 0.062, 0.026, 0.160); eye.scale.set(0.008, 0.010, 0.004); eyes.push(eye); head.add(eye);
    collect(sphere, skin, sign * 0.092, -0.061, 0.115, 0.045, 0.061, 0.025, 0, sign * 0.16);
  }
  collect(sphere, hollow, 0, -0.128, 0.132, 0.021, 0.035, 0.008);
  collect(sphere, skin, 0, -0.024, 0.153, 0.019, 0.047, 0.016, -0.09);
  // Swept, stringy hair is actual 3D geometry, visible in the flashlight beam.
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2;
    if (Math.cos(angle) > 0.66 && i % 4 !== 0) continue;
    const x = Math.sin(angle) * 0.162; const z = Math.cos(angle) * 0.13 - 0.035;
    const length = 0.48 + ((i * 7) % 9) * 0.043;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x * 0.72, 0.21, z * 0.7),
      new THREE.Vector3(x * 1.08, 0.03, z * 1.08),
      new THREE.Vector3(x * 1.13 + Math.sin(i) * 0.03, -0.26, z * 1.15),
      new THREE.Vector3(x * 0.85 + Math.sin(i * 3) * 0.045, -length, z + 0.015),
    ]);
    const strand = new THREE.TubeGeometry(curve, 7, 0.009 + (i % 3) * 0.004, 4, false);
    // Sphere and tube geometries have compatible position/normal/uv attributes.
    collect(strand, hair, 0, 0, 0, 1, 1, 1); strand.dispose();
  }
  flush(head);

  for (const sign of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(sign * 0.245, 2.12, -0.035); arm.rotation.z = sign * 0.065; group.add(arm); arms.push(arm);
    collect(capsule, cloth, sign * 0.025, -0.17, 0, 0.076, 0.16, 0.068, 0, 0, sign * -0.12);
    collect(capsule, skin, sign * 0.07, -0.49, 0.015, 0.044, 0.24, 0.042, -0.12, 0, sign * -0.06);
    collect(sphere, skin, sign * 0.079, -0.84, 0.06, 0.049, 0.058, 0.044);
    collect(capsule, skin, sign * 0.056, -1.06, 0.09, 0.034, 0.19, 0.032, -0.15, 0, sign * 0.06);
    collect(sphere, skin, sign * 0.05, -1.37, 0.135, 0.048, 0.105, 0.025, -0.13);
    for (let finger = 0; finger < 4; finger++) {
      const fx = sign * 0.05 + (finger - 1.5) * 0.024;
      const length = 0.09 + (finger === 1 || finger === 2 ? 0.03 : 0);
      collect(capsule, skin, fx, -1.49 - length * 0.18, 0.146, 0.009, length * 0.48, 0.008, -0.14, 0, (finger - 1.5) * -0.07);
      collect(capsule, nails, fx, -1.57 - length * 0.20, 0.156, 0.006, 0.018, 0.005, -0.3);
    }
    collect(capsule, skin, sign * 0.093, -1.38, 0.15, 0.012, 0.057, 0.01, 0, 0, sign * -0.45);
    flush(arm);
    const leg = new THREE.Group(); leg.position.set(sign * 0.14, 0.83, -0.005); group.add(leg); legs.push(leg);
    collect(capsule, skin, 0, -0.26, 0.025, 0.044, 0.17, 0.041, 0.10);
    collect(capsule, skin, 0, -0.55, -0.015, 0.029, 0.12, 0.03, -0.13);
    collect(sphere, skin, 0, -0.77, 0.056, 0.045, 0.042, 0.095);
    flush(leg);
  }
  // The two eyes retain the shared sphere; the world's traversal disposes it.
  capsule.dispose();
  head.rotation.z = -0.085;
  return { group, head, arms, legs, eyes };
}
