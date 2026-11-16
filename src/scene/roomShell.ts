import * as THREE from 'three';
import type { NavMode, RoomConfig } from './types';
import { getFloorMaterialProps, getWallMaterialProps, type TextureBundle } from './textures';

export interface RoomShellHandle {
  group: THREE.Group;
  updateCutaway: (cameraPos: THREE.Vector3, navMode: NavMode, room: RoomConfig) => void;
  dispose: () => void;
}

export function buildRoomShell(room: RoomConfig, tex: TextureBundle): RoomShellHandle {
  const group = new THREE.Group();
  group.name = 'RoomShell';

  const W = room.widthCm / 100;
  const D = room.depthCm / 100;
  const H = room.heightCm / 100;
  const wallT = 0.14;

  const disposables: { dispose: () => void }[] = [];

  // 1. Exterior Architectural Plinth / Floor Slab
  const slabGeo = new THREE.BoxGeometry(W + 0.36, 0.12, D + 0.36);
  const slabMat = new THREE.MeshStandardMaterial({
    color: 0x20242c,
    roughness: 0.85,
    metalness: 0.1,
  });
  const slab = new THREE.Mesh(slabGeo, slabMat);
  slab.position.set(0, -0.062, 0);
  slab.receiveShadow = true;
  group.add(slab);
  disposables.push(slabGeo, slabMat);

  // 2. Interior Tiled Floor Surface (offset cleanly above slab)
  const floorProps = getFloorMaterialProps(room.floorStyle, tex, W / 1.2, D / 1.2);
  const floorGeo = new THREE.PlaneGeometry(W, D);
  const floorMat = new THREE.MeshStandardMaterial(floorProps);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.001;
  floor.receiveShadow = true;
  floor.name = 'FloorSurface';
  group.add(floor);
  disposables.push(floorGeo, floorMat);
  if (floorProps.map) disposables.push(floorProps.map);
  if (floorProps.bumpMap) disposables.push(floorProps.bumpMap);

  // Helper to create wall panels with properly scaled UVs
  function makeWall(
    name: string,
    w: number,
    h: number,
    d: number,
    px: number,
    py: number,
    pz: number,
    tileW: number,
    tileH: number
  ) {
    const props = getWallMaterialProps(room.wallStyle, tex, tileW / 0.85, tileH / 0.68);
    const mat = new THREE.MeshStandardMaterial(props);
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(px, py, pz);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.name = name;
    disposables.push(geo, mat);
    if (props.map) disposables.push(props.map);
    if (props.bumpMap) disposables.push(props.bumpMap);
    return mesh;
  }

  // 3. Four Room Walls
  const northWall = makeWall('NorthWall', W + wallT * 2, H, wallT, 0, H / 2, -D / 2 - wallT / 2, W, H);
  const southWall = makeWall('SouthWall', W + wallT * 2, H, wallT, 0, H / 2, D / 2 + wallT / 2, W, H);
  const westWall = makeWall('WestWall', wallT, H, D, -W / 2 - wallT / 2, H / 2, 0, D, H);
  const eastWall = makeWall('EastWall', wallT, H, D, W / 2 + wallT / 2, H / 2, 0, D, H);

  // Front-right structural column/pillar ('عمود') stopping the 370cm right bar (400 - 370 = 30cm deep)
  const pillarW = Math.min(0.65, W * 0.30);
  const pillarD = Math.min(0.30, D * 0.12);
  const eastPillar = makeWall(
    'EastPillar',
    pillarW,
    H,
    pillarD,
    W / 2 - pillarW / 2,
    H / 2,
    D / 2 - pillarD / 2,
    0.65,
    H
  );

  // Entrance frame cutout indication on South wall (open doorway arch on south entrance)
  southWall.material.transparent = true;
  southWall.material.opacity = 0.92;

  group.add(northWall, southWall, westWall, eastWall, eastPillar);

  // 4. Ceiling, Dropped Left Soffit Beam, Conduit & Round LED Fixture
  const ceilingGroup = new THREE.Group();
  ceilingGroup.name = 'CeilingGroup';

  const ceilGeo = new THREE.BoxGeometry(W + wallT * 2, 0.1, D + wallT * 2);
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0xf6f3ec,
    roughness: 0.85,
    metalness: 0.02,
  });
  const ceilMesh = new THREE.Mesh(ceilGeo, ceilMat);
  ceilMesh.position.set(0, H + 0.05, 0);
  ceilMesh.receiveShadow = true;
  ceilingGroup.add(ceilMesh);
  disposables.push(ceilGeo, ceilMat);

  // Hollow-backed concrete drop beam ('كمر مفرغ') hanging from ceiling above left zone
  // Leaves a ~50cm open ceiling pocket next to WestWall so upper shelves sit cleanly unobstructed
  const beamThick = Math.min(0.14, W * 0.08);
  const pocketClear = Math.min(0.50, W * 0.24);
  const beamH = 0.30;
  const beamGeo = new THREE.BoxGeometry(beamThick, beamH, D);
  const beamMesh = new THREE.Mesh(beamGeo, ceilMat);
  beamMesh.position.set(-W / 2 + pocketClear + beamThick / 2, H - beamH / 2, 0);
  beamMesh.castShadow = true;
  beamMesh.receiveShadow = true;
  ceilingGroup.add(beamMesh);
  disposables.push(beamGeo);

  // Back cross beam tucked cleanly high against North wall
  const crossGeo = new THREE.BoxGeometry(W, 0.16, 0.20);
  const crossBeam = new THREE.Mesh(crossGeo, ceilMat);
  crossBeam.position.set(0, H - 0.08, -D / 2 + 0.12);
  ceilingGroup.add(crossBeam);
  disposables.push(crossGeo);

  // Dual Round Flush LED Ceiling Lights (matching real ceiling corridor spacing, warm 3000K default)
  const isWarmCafe = (room.lightingMode ?? 'warm_3000k') === 'warm_3000k' && !room.cadMode;
  const ledRimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.028, 24);
  const ledRimMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.4, metalness: 0.2 });
  const ledGlowGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.02, 24);
  const ledGlowMat = new THREE.MeshStandardMaterial({
    color: isWarmCafe ? 0xffe4be : 0xf8fafc,
    emissive: isWarmCafe ? 0xffb866 : 0xfff8eb,
    emissiveIntensity: isWarmCafe ? 2.15 : 1.55,
    roughness: 0.2,
  });
  for (const lz of [-0.78, 0.72]) {
    const ledRim = new THREE.Mesh(ledRimGeo, ledRimMat);
    ledRim.position.set(0.10, H - 0.014, lz);
    const ledGlow = new THREE.Mesh(ledGlowGeo, ledGlowMat);
    ledGlow.position.set(0.10, H - 0.02, lz);
    ceilingGroup.add(ledRim, ledGlow);
  }
  disposables.push(ledRimGeo, ledRimMat, ledGlowGeo, ledGlowMat);

  // White ceiling conduit pipe
  const condGeo = new THREE.CylinderGeometry(0.012, 0.012, D * 0.72, 8);
  const condMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
  const conduit = new THREE.Mesh(condGeo, condMat);
  conduit.rotation.x = Math.PI / 2;
  conduit.position.set(0.15, H - 0.02, -0.2);
  ceilingGroup.add(conduit);
  disposables.push(condGeo, condMat);

  ceilingGroup.visible = room.showCeiling && !room.hideAllWalls;
  group.add(ceilingGroup);

  // Architectural AutoCAD Edge Lines when cadMode is active
  if (room.cadMode) {
    const cadLineMat = new THREE.LineBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.45,
    });
    disposables.push(cadLineMat);
    for (const m of [slab, northWall, southWall, westWall, eastWall, eastPillar]) {
      const edgesGeo = new THREE.EdgesGeometry(m.geometry, 25);
      const segs = new THREE.LineSegments(edgesGeo, cadLineMat);
      m.add(segs);
      disposables.push(edgesGeo);
    }
  }

  // 5. Optional Architectural Grid Overlay (outside/around room)
  if (room.showGrid) {
    const grid = new THREE.GridHelper(10, 40, 0x475569, 0x262b36);
    grid.position.y = -0.118;
    group.add(grid);
    disposables.push(grid.geometry, grid.material as THREE.Material);
  }

  // 6. Optional Room Dimension Lines & Door Swing Arcs on the Floor Perimeter
  if (room.showDimensions) {
    const lineMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.85 });
    const offset = 0.26;
    const ptsWidth = [
      new THREE.Vector3(-W / 2, 0.015, D / 2 + offset),
      new THREE.Vector3(W / 2, 0.015, D / 2 + offset),
      new THREE.Vector3(-W / 2, 0.015, D / 2 + offset - 0.08),
      new THREE.Vector3(-W / 2, 0.015, D / 2 + offset + 0.08),
      new THREE.Vector3(W / 2, 0.015, D / 2 + offset - 0.08),
      new THREE.Vector3(W / 2, 0.015, D / 2 + offset + 0.08),
    ];
    const widthLineGeo = new THREE.BufferGeometry().setFromPoints(ptsWidth);
    const widthSegs = new THREE.LineSegments(widthLineGeo, lineMat);

    const ptsDepth = [
      new THREE.Vector3(W / 2 + offset, 0.015, -D / 2),
      new THREE.Vector3(W / 2 + offset, 0.015, D / 2),
      new THREE.Vector3(W / 2 + offset - 0.08, 0.015, -D / 2),
      new THREE.Vector3(W / 2 + offset + 0.08, 0.015, -D / 2),
      new THREE.Vector3(W / 2 + offset - 0.08, 0.015, D / 2),
      new THREE.Vector3(W / 2 + offset + 0.08, 0.015, D / 2),
    ];
    const depthLineGeo = new THREE.BufferGeometry().setFromPoints(ptsDepth);
    const depthSegs = new THREE.LineSegments(depthLineGeo, lineMat);

    // Entrance door swing arc ('باب الدخول') on South floor
    const arcMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.72 });
    const doorR = 0.76;
    const hingeX = 0.30;
    const hingeZ = D / 2 - 0.04;
    const arcPts: THREE.Vector3[] = [
      new THREE.Vector3(hingeX, 0.01, hingeZ),
      new THREE.Vector3(hingeX, 0.01, hingeZ - doorR),
    ];
    for (let i = 0; i <= 14; i++) {
      const ang = (i / 14) * (Math.PI / 2);
      arcPts.push(new THREE.Vector3(hingeX - Math.sin(ang) * doorR, 0.01, hingeZ - Math.cos(ang) * doorR));
    }
    const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPts);
    const arcLine = new THREE.Line(arcGeo, arcMat);

    group.add(widthSegs, depthSegs, arcLine);
    disposables.push(lineMat, widthLineGeo, depthLineGeo, arcMat, arcGeo);
  }

  return {
    group,
    updateCutaway(cameraPos: THREE.Vector3, navMode: NavMode, cfg: RoomConfig) {
      if (cfg.hideAllWalls) {
        northWall.visible = false;
        southWall.visible = false;
        westWall.visible = false;
        eastWall.visible = false;
        eastPillar.visible = false;
        ceilingGroup.visible = false;
        return;
      }

      const walls = cfg.walls ?? { north: true, south: true, west: true, east: true, pillar: true };
      if (navMode === 'walk' || !cfg.cutawayWalls) {
        northWall.visible = walls.north;
        southWall.visible = walls.south;
        westWall.visible = walls.west;
        eastWall.visible = walls.east;
        eastPillar.visible = walls.pillar;
        ceilingGroup.visible = cfg.showCeiling;
        return;
      }

      const halfW = cfg.widthCm / 200;
      const halfD = cfg.depthCm / 200;
      const heightM = cfg.heightCm / 100;

      // Hide ceiling if camera is looking down from above
      ceilingGroup.visible = cfg.showCeiling && cameraPos.y < heightM - 0.08;

      // Respect explicit wall removal toggles AND hide outer walls blocking camera
      southWall.visible = walls.south && cameraPos.z < halfD + 0.02;
      northWall.visible = walls.north && cameraPos.z > -halfD - 0.02;
      westWall.visible = walls.west && cameraPos.x > -halfW - 0.02;
      eastWall.visible = walls.east && cameraPos.x < halfW + 0.02;
      eastPillar.visible = walls.pillar && (eastWall.visible || southWall.visible);
    },
    dispose() {
      for (const d of disposables) {
        d.dispose();
      }
    },
  };
}
