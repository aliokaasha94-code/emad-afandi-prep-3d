import * as THREE from 'three';
import type { BracketStyle, FinishPreset, SceneItem, WallStyle } from './types';
import { getWallMaterialProps, type TextureBundle } from './textures';

export interface BuiltItemHandle {
  group: THREE.Group;
  dispose: () => void;
}

interface Palette {
  steel: THREE.MeshStandardMaterial;
  stainless: THREE.MeshStandardMaterial;
  oak: THREE.MeshStandardMaterial;
  whiteTop: THREE.MeshStandardMaterial;
  granite: THREE.MeshStandardMaterial;
  matteBlack: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  whitePlastic: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  cyanGlow: THREE.MeshStandardMaterial;
  primaryFinish: THREE.MeshStandardMaterial;
  secondaryFinish: THREE.MeshStandardMaterial;
}

function resolveFinishColor(finish: FinishPreset): { color: number; roughness: number; metalness: number; useOak?: boolean } | null {
  switch (finish) {
    case 'original':
      return null;
    case 'matte_black':
      return { color: 0x1b1d22, roughness: 0.72, metalness: 0.12 };
    case 'warm_oak':
      return { color: 0xffffff, roughness: 0.48, metalness: 0.04, useOak: true };
    case 'stainless':
      return { color: 0xf1f5f9, roughness: 0.22, metalness: 0.94 };
    case 'white_marble':
      return { color: 0xf4f2ed, roughness: 0.25, metalness: 0.04 };
    case 'charcoal':
      return { color: 0x3b424d, roughness: 0.62, metalness: 0.18 };
  }
}

export interface BuildItemOptions {
  showShelfProps?: boolean;
  cadMode?: boolean;
  bracketStyle?: BracketStyle;
}

export function buildSceneItemGroup(
  item: SceneItem,
  tex: TextureBundle,
  isSoftwareGl: boolean,
  wallStyle: WallStyle = 'subway_white',
  options: BuildItemOptions = {}
): BuiltItemHandle {
  const showProps = options.showShelfProps ?? true;
  const isCad = options.cadMode ?? false;
  const bracketStyle: BracketStyle = options.bracketStyle ?? 'gusset_plate';
  const root = new THREE.Group();
  root.name = `Item_${item.id}`;
  root.userData.itemId = item.id;

  const inner = new THREE.Group();
  root.add(inner);

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(d: T): T => {
    disposables.push(d);
    return d;
  };

  const makeMat = (params: THREE.MeshStandardMaterialParameters) =>
    track(new THREE.MeshStandardMaterial(params));

  const finishOverride = resolveFinishColor(item.finish);

  const pal: Palette = {
    steel: makeMat({ color: 0x1a1c20, roughness: 0.58, metalness: 0.65 }),
    stainless: makeMat({
      color: 0xf8fafc,
      map: tex.brushedStainlessColor,
      roughness: 0.22,
      metalness: 0.94,
      bumpMap: tex.brushedMetalBump,
      bumpScale: 0.0035,
      envMapIntensity: 1.55,
    }),
    oak: makeMat({
      color: 0xffffff,
      map: tex.oakColor,
      bumpMap: tex.oakBump,
      bumpScale: 0.006,
      roughness: 0.52,
      metalness: 0.02,
    }),
    whiteTop: makeMat({ color: 0xf4f3ef, roughness: 0.26, metalness: 0.03 }),
    granite: makeMat({ color: 0x1e2024, roughness: 0.22, metalness: 0.08 }),
    matteBlack: makeMat({ color: 0x16171a, roughness: 0.78, metalness: 0.08 }),
    brass: makeMat({ color: 0xc99c4a, roughness: 0.22, metalness: 0.9 }),
    whitePlastic: makeMat({ color: 0xf0efeb, roughness: 0.35, metalness: 0.04 }),
    glass: track(
      new THREE.MeshPhysicalMaterial({
        color: 0xdff6ff,
        roughness: 0.08,
        metalness: 0.05,
        transparent: true,
        opacity: isSoftwareGl ? 0.32 : 0.28,
        transmission: isSoftwareGl ? 0 : 0.65,
        ior: 1.5,
        depthWrite: false,
      })
    ),
    cyanGlow: makeMat({
      color: 0xa5f3fc,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    }),
    primaryFinish: finishOverride
      ? makeMat({
          color: finishOverride.color,
          roughness: finishOverride.roughness,
          metalness: finishOverride.metalness,
          ...(finishOverride.useOak ? { map: tex.oakColor } : {}),
        })
      : makeMat({ color: 0x24262b, roughness: 0.62, metalness: 0.25 }),
    secondaryFinish: finishOverride
      ? makeMat({
          color: finishOverride.color,
          roughness: finishOverride.roughness,
          metalness: finishOverride.metalness,
          ...(finishOverride.useOak ? { map: tex.oakColor } : {}),
        })
      : makeMat({
          color: 0xffffff,
          map: tex.oakColor,
          bumpMap: tex.oakBump,
          bumpScale: 0.006,
          roughness: 0.52,
          metalness: 0.02,
        }),
  };

  const addBox = (
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = inner
  ) => {
    const geo = track(new THREE.BoxGeometry(w, h, d));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const addCyl = (
    rt: number,
    rb: number,
    h: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    seg = 16,
    parent: THREE.Object3D = inner
  ) => {
    const geo = track(new THREE.CylinderGeometry(rt, rb, h, seg));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const addUnderBrackets = (
    positions: number[],
    shelfWidth: number,
    shelfDepth: number,
    shelfBottomY: number,
    dropH: number,
    mat: THREE.Material,
    wallBackZ = -shelfDepth / 2
  ) => {
    const armD = Math.max(0.18, shelfDepth * 0.86);
    if (bracketStyle === 'hidden_rod') {
      // Minimalist rear stainless ledger channel & concealed-pin collars directly under rear shelf lip
      addBox(shelfWidth * 0.96, 0.024, 0.012, mat, 0, shelfBottomY - 0.012, wallBackZ + 0.006);
      for (const bx of positions) {
        addBox(0.032, 0.020, 0.044, mat, bx, shelfBottomY - 0.010, wallBackZ + 0.022);
      }
      return;
    }

    if (bracketStyle === 'gusset_plate' || bracketStyle === 'curved_arch') {
      const shape = new THREE.Shape();
      shape.moveTo(0.008, 0);
      shape.lineTo(0.008, -dropH);
      shape.lineTo(0.028, -dropH);
      if (bracketStyle === 'curved_arch') {
        shape.quadraticCurveTo(armD * 0.34, -dropH * 0.24, armD, -0.020);
      } else {
        shape.lineTo(armD, -0.020);
      }
      shape.lineTo(armD, 0);
      shape.closePath();

      const gussetGeo = track(
        new THREE.ExtrudeGeometry(shape, {
          depth: 0.012,
          bevelEnabled: false,
          curveSegments: 14,
        })
      );
      gussetGeo.translate(0, 0, -0.006);

      for (const bx of positions) {
        // Wall mounting flange + top shelf-bearing flange
        addBox(0.046, dropH, 0.008, mat, bx, shelfBottomY - dropH / 2, wallBackZ + 0.004);
        addBox(0.042, 0.008, armD, mat, bx, shelfBottomY - 0.004, wallBackZ + armD / 2);

        // Solid laser-cut gusset web
        const web = new THREE.Mesh(gussetGeo, mat);
        web.rotation.y = -Math.PI / 2;
        web.position.set(bx, shelfBottomY, wallBackZ);
        web.castShadow = true;
        web.receiveShadow = true;
        inner.add(web);

        // Twin stainless mounting bolts on wall flange
        for (const ox of [-0.014, 0.014]) {
          const bolt = addCyl(0.0045, 0.0045, 0.006, pal.steel, bx + ox, shelfBottomY - dropH * 0.72, wallBackZ + 0.010, 8);
          bolt.rotation.x = Math.PI / 2;
        }
      }
      return;
    }

    // 'diagonal_tube': clean mitered commercial square-tube L-frame with diagonal brace
    const dy = Math.max(0.05, dropH - 0.036);
    const dz = Math.max(0.10, armD * 0.78 - 0.020);
    const diagLen = Math.hypot(dy, dz);
    for (const bx of positions) {
      addBox(0.028, dropH, 0.024, mat, bx, shelfBottomY - dropH / 2, wallBackZ + 0.012);
      addBox(0.028, 0.022, armD, mat, bx, shelfBottomY - 0.011, wallBackZ + armD / 2);
      const strut = addBox(
        0.020,
        0.020,
        diagLen,
        mat,
        bx,
        shelfBottomY - 0.018 - dy / 2,
        wallBackZ + 0.020 + dz / 2
      );
      strut.rotation.x = -Math.atan2(dy, dz);
    }
  };

  // Contact shadow disc for floor-standing items (skipped in clean CAD drafting mode)
  if (!item.wallMounted && item.yCm < 5 && !isCad) {
    const shW = Math.max(0.4, item.baseW / 100);
    const shD = Math.max(0.4, item.baseD / 100);
    const shGeo = track(new THREE.PlaneGeometry(shW * 1.15, shD * 1.15));
    const shMat = track(
      new THREE.MeshBasicMaterial({
        map: tex.contactShadow,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      })
    );
    const shMesh = new THREE.Mesh(shGeo, shMat);
    shMesh.rotation.x = -Math.PI / 2;
    shMesh.position.y = 0.004;
    inner.add(shMesh);
  }

  const w = item.baseW / 100;
  const d = item.baseD / 100;
  const h = item.baseH / 100;

  switch (item.kind) {
    case 'back_door': {
      const frameMat = finishOverride ? pal.primaryFinish : pal.matteBlack;
      // Outer door jambs & lintel
      addBox(0.06, h, d, frameMat, -w / 2 + 0.03, h / 2, 0);
      addBox(0.06, h, d, frameMat, w / 2 - 0.03, h / 2, 0);
      addBox(w, 0.07, d, frameMat, 0, h - 0.035, 0);
      // Door leaf
      addBox(w - 0.12, h - 0.07, 0.045, frameMat, 0, (h - 0.07) / 2, 0.01);
      // Vertical recessed trim molding (two panels)
      const trimMat = makeMat({ color: 0x262930, roughness: 0.48, metalness: 0.15 });
      addBox(w * 0.56, h * 0.36, 0.014, trimMat, 0, h * 0.68, 0.035);
      addBox(w * 0.56, h * 0.28, 0.014, trimMat, 0, h * 0.26, 0.035);
      // Brass lever handle & keyhole plate
      addBox(0.035, 0.14, 0.012, pal.brass, -w * 0.33, 1.0, 0.04);
      addBox(0.11, 0.02, 0.022, pal.brass, -w * 0.29, 1.02, 0.068);
      // White Samsung AC remote holder mounted on upper right door jamb (matching photo 10.57.00)
      addBox(0.044, 0.115, 0.024, pal.whitePlastic, w / 2 - 0.028, 1.56, 0.056);
      addBox(0.032, 0.095, 0.016, pal.whiteTop, w / 2 - 0.028, 1.58, 0.062);
      // Compact black mini dome security camera mounted just above door header (cleanly under 217cm U-shelf)
      addCyl(0.032, 0.04, 0.034, pal.matteBlack, 0.0, h + 0.018, 0.055, 14);
      // Two stacked white wall outlets on narrow tiled strip to the left of bathroom door (x = -50..-37cm)
      const outletPlate = pal.whitePlastic;
      const outletSlot = pal.matteBlack;
      for (const oy of [1.18, 1.08]) {
        addBox(0.072, 0.068, 0.016, outletPlate, -w / 2 - 0.072, oy, 0.048);
        addBox(0.014, 0.014, 0.006, outletSlot, -w / 2 - 0.072, oy, 0.056);
      }
      // Subtle power cord running flush along tiled wall beside door jamb
      const cordMat = makeMat({ color: 0x18181b, roughness: 0.7 });
      const cordCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-w / 2 - 0.14, 1.98, 0.012),
        new THREE.Vector3(-w / 2 - 0.06, 1.88, 0.012),
        new THREE.Vector3(-w / 2 + 0.02, 1.96, 0.014),
      ]);
      const cordMesh = new THREE.Mesh(track(new THREE.TubeGeometry(cordCurve, 12, 0.004, 6, false)), cordMat);
      inner.add(cordMesh);
      // Cardboard protective floor mat in front of door
      if (showProps) {
        const matColor = makeMat({ color: 0x9b6b3b, roughness: 0.92, metalness: 0.0 });
        addBox(w * 1.05, 0.006, 0.65, matColor, 0.04, 0.008, 0.42);
      }
      break;
    }

    case 'entrance_door': {
      const frameMat = finishOverride ? pal.primaryFinish : pal.matteBlack;
      // Matte black perimeter jambs & header lintel
      addBox(0.06, h, d, frameMat, -w / 2 + 0.03, h / 2, 0);
      addBox(0.06, h, d, frameMat, w / 2 - 0.03, h / 2, 0);
      addBox(w, 0.07, d, frameMat, 0, h - 0.035, 0);
      // Black door leaf
      addBox(w - 0.12, h - 0.07, 0.048, frameMat, 0, (h - 0.07) / 2, 0.01);
      // Two recessed panel moldings matching real entrance photo
      const trimMat = makeMat({ color: 0x262a32, roughness: 0.46, metalness: 0.16 });
      addBox(w * 0.58, h * 0.36, 0.016, trimMat, 0, h * 0.68, 0.036);
      addBox(w * 0.58, h * 0.28, 0.016, trimMat, 0, h * 0.26, 0.036);
      // Lever handle & lock backplate on inner side (+z in local coords since rotY=180 faces interior)
      addBox(0.038, 0.14, 0.014, pal.brass, w * 0.33, 1.0, 0.04);
      addBox(0.11, 0.022, 0.024, pal.brass, w * 0.29, 1.02, 0.068);
      // Overhead door closer bar
      addBox(0.22, 0.045, 0.04, pal.steel, -w * 0.2, h - 0.12, 0.055);
      // White wall-mounted dome security camera above door
      addCyl(0.042, 0.055, 0.042, pal.whitePlastic, w * 0.38, h + 0.22, 0.075, 16);
      const lensGeo = track(new THREE.SphereGeometry(0.034, 14, 10));
      const lens = new THREE.Mesh(lensGeo, pal.matteBlack);
      lens.position.set(w * 0.38, h + 0.205, 0.082);
      inner.add(lens);
      break;
    }

    case 'electrical_rack': {
      // Lower grey ABB breaker box mounted flush on South wall + upper black glass-door network rack on West corner
      const abbMat = makeMat({ color: 0xc4c7cc, roughness: 0.44, metalness: 0.32 });
      const redSw = makeMat({ color: 0xdc2626, emissive: 0x7f1d1d, emissiveIntensity: 0.5 });
      const greenLed = makeMat({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.6 });
      // ABB Breaker Cabinet (bottom half, flush at local z = -d/2 + 0.06)
      addBox(0.38, 0.56, 0.11, abbMat, -0.06, 0.28, -d / 2 + 0.06);
      addBox(0.35, 0.52, 0.015, abbMat, -0.06, 0.28, -d / 2 + 0.12);
      // Two red breaker switches & tiny red ABB badge
      addBox(0.025, 0.045, 0.02, redSw, -0.18, 0.41, -d / 2 + 0.13);
      addBox(0.025, 0.045, 0.02, redSw, -0.18, 0.15, -d / 2 + 0.13);
      addBox(0.055, 0.018, 0.008, redSw, -0.18, 0.535, -d / 2 + 0.125);

      // Upper Black Network / DVR Rack Cabinet (compact corner enclosure against West wall)
      const rackMat = finishOverride ? pal.primaryFinish : pal.matteBlack;
      addBox(0.28, 0.34, 0.32, rackMat, w / 2 - 0.16, h - 0.22, 0.02);
      addBox(0.016, 0.28, 0.26, pal.glass, w / 2 - 0.305, h - 0.22, 0.02);
      // Internal white router & NVR box with green LEDs
      addBox(0.18, 0.07, 0.22, pal.whitePlastic, w / 2 - 0.16, h - 0.26, 0.02);
      addBox(0.035, 0.012, 0.012, greenLed, w / 2 - 0.25, h - 0.25, 0.07);
      addBox(0.035, 0.012, 0.012, pal.cyanGlow, w / 2 - 0.25, h - 0.25, 0.02);

      // Two corrugated grey conduits curving from top of ABB panel over toward entrance door & rack
      const condMat = makeMat({ color: 0x9ca3af, roughness: 0.65 });
      const curve1 = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.14, 0.56, -d / 2 + 0.06),
        new THREE.Vector3(-0.18, 0.68, -d / 2 + 0.06),
        new THREE.Vector3(-0.34, 0.72, -d / 2 + 0.06),
      ]);
      const t1 = new THREE.Mesh(track(new THREE.TubeGeometry(curve1, 14, 0.016, 8, false)), condMat);
      inner.add(t1);
      const curve2 = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.08, 0.56, -d / 2 + 0.06),
        new THREE.Vector3(-0.11, 0.64, -d / 2 + 0.06),
        new THREE.Vector3(-0.34, 0.67, -d / 2 + 0.06),
      ]);
      const t2 = new THREE.Mesh(track(new THREE.TubeGeometry(curve2, 14, 0.015, 8, false)), condMat);
      inner.add(t2);
      break;
    }

    case 'side_door': {
      const frameMat = finishOverride ? pal.primaryFinish : pal.matteBlack;
      // Sleek matte black door frame + flush leaf + brass handle
      addBox(0.055, h, d, frameMat, -w / 2 + 0.028, h / 2, 0);
      addBox(0.055, h, d, frameMat, w / 2 - 0.028, h / 2, 0);
      addBox(w, 0.06, d, frameMat, 0, h - 0.03, 0);
      addBox(w - 0.11, h - 0.06, 0.04, frameMat, 0, (h - 0.06) / 2, 0.005);
      const trimMat = makeMat({ color: 0x262a32, roughness: 0.5, metalness: 0.15 });
      addBox(w * 0.54, h * 0.36, 0.014, trimMat, 0, h * 0.66, 0.028);
      addBox(w * 0.54, h * 0.28, 0.014, trimMat, 0, h * 0.25, 0.028);
      addBox(0.03, 0.13, 0.012, pal.brass, -w * 0.32, 1.0, 0.034);
      addBox(0.10, 0.02, 0.02, pal.brass, -w * 0.28, 1.02, 0.06);
      // Inward floor swing arc indicator
      const arcPts: THREE.Vector3[] = [];
      const r = w - 0.12;
      const hx = w / 2 - 0.06;
      arcPts.push(new THREE.Vector3(hx, 0.008, 0.05), new THREE.Vector3(hx, 0.008, r));
      for (let i = 0; i <= 12; i++) {
        const a = (i / 12) * (Math.PI / 2);
        arcPts.push(new THREE.Vector3(hx - Math.sin(a) * r, 0.008, Math.cos(a) * r));
      }
      const arcGeo = track(new THREE.BufferGeometry().setFromPoints(arcPts));
      const arcMat = track(new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.72 }));
      inner.add(new THREE.Line(arcGeo, arcMat));
      break;
    }

    case 'split_ac': {
      // Samsung Split AC directly mounted on the North tiled wall above the 220cm stainless U-bridge shelf (wooden shelf removed)
      const acMat = finishOverride ? pal.primaryFinish : pal.whitePlastic;
      const acTrim = makeMat({ color: 0x334155, roughness: 0.42, metalness: 0.25 });
      const acFrontMat = makeMat({
        color: 0xe6ebf2,
        map: tex.samsungAcColor,
        roughness: 0.34,
        metalness: 0.06,
      });

      // Wall-mounting steel cleat & rear vertical black upper strap flush within AC height
      addBox(0.92, h * 0.88, 0.02, acTrim, 0, h * 0.48, -d / 2 + 0.012);
      addBox(0.034, h * 0.96, 0.014, pal.steel, 0.02, h * 0.48, -d / 2 + 0.010);

      // White Samsung Split AC indoor unit chassis (fits cleanly between 220cm & 247cm shelves)
      addBox(0.96, h, 0.20, acMat, 0, h * 0.50, -d / 2 + 0.11);
      addBox(0.94, 0.04, 0.19, acMat, 0, h - 0.022, -d / 2 + 0.105);

      // Branded Samsung front fascia & bottom black air louver
      addBox(0.94, h * 0.78, 0.014, acFrontMat, 0, h * 0.52, -d / 2 + 0.212);
      addBox(0.88, 0.045, 0.024, pal.matteBlack, 0, 0.042, -d / 2 + 0.205);
      addBox(0.84, 0.012, 0.026, pal.stainless, 0, 0.048, -d / 2 + 0.212);

      // White PVC AC drain / refrigerant pipe tucked cleanly behind rear side without piercing upper shelf
      addCyl(0.014, 0.014, h * 0.78, pal.whitePlastic, 0.43, h * 0.60, -d / 2 + 0.036, 10);
      break;
    }

    case 'sink_cabinet': {
      const cabMat = finishOverride ? pal.primaryFinish : pal.matteBlack;
      const topMat = finishOverride ? pal.secondaryFinish : pal.granite;
      // Cabinet frame + white right side panel
      addBox(w - 0.04, h - 0.04, d - 0.04, cabMat, 0, (h - 0.04) / 2, 0);
      addBox(0.025, h - 0.04, d - 0.04, pal.whiteTop, w / 2 - 0.02, (h - 0.04) / 2, 0);
      // Granite countertop + backsplash
      addBox(w, 0.038, d, topMat, 0, h - 0.019, 0);
      addBox(w, 0.08, 0.025, topMat, 0, h + 0.04, -d / 2 + 0.013);
      // Recessed stainless sink basin
      addBox(w * 0.56, 0.025, d * 0.68, pal.stainless, -w * 0.08, h - 0.002, 0.02);
      addBox(w * 0.48, 0.012, d * 0.58, pal.matteBlack, -w * 0.08, h + 0.008, 0.02);
      // Chrome swan-neck faucet
      addCyl(0.018, 0.022, 0.18, pal.stainless, -w * 0.08, h + 0.09, -d * 0.28, 12);
      addBox(0.022, 0.022, 0.14, pal.stainless, -w * 0.08, h + 0.18, -d * 0.21);
      // Cabinet door handle
      addBox(0.015, 0.14, 0.022, pal.stainless, 0.16, h * 0.58, d / 2 - 0.005);
      // Small silver recessed wall pass-through hatch / window above sink (seen in photo 10.09.41_PM_ef5de4cb)
      const hatchFrame = makeMat({ color: 0xb8bec6, roughness: 0.42, metalness: 0.45 });
      const hatchInner = makeMat({ color: 0x3b4048, roughness: 0.65 });
      addBox(0.44, 0.40, 0.028, hatchFrame, 0.04, h + 0.58, -d / 2 + 0.015);
      addBox(0.34, 0.30, 0.016, hatchInner, 0.04, h + 0.58, -d / 2 + 0.026);
      addBox(0.44, 0.018, 0.06, pal.whitePlastic, 0.04, h + 0.37, -d / 2 + 0.03);
      break;
    }

    case 'display_fridge': {
      const bodyMat = finishOverride ? pal.primaryFinish : pal.stainless;
      // Main insulated side walls, back, and top
      addBox(w, h - 0.34, 0.05, bodyMat, 0, (h - 0.34) / 2 + 0.34, -d / 2 + 0.025);
      addBox(0.045, h - 0.34, d, bodyMat, -w / 2 + 0.022, (h - 0.34) / 2 + 0.34, 0);
      addBox(0.045, h - 0.34, d, bodyMat, w / 2 - 0.022, (h - 0.34) / 2 + 0.34, 0);
      addBox(w, 0.06, d, bodyMat, 0, h - 0.03, 0);
      // Cyan-lit hygienic interior lining (matches signature cyan LED fridge glow)
      const innerCyan = makeMat({
        color: 0xbfefff,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.58,
        roughness: 0.3,
      });
      addBox(w - 0.09, h - 0.42, 0.02, innerCyan, 0, (h - 0.34) / 2 + 0.34, -d / 2 + 0.055);
      addBox(0.015, h - 0.42, d - 0.12, innerCyan, -w / 2 + 0.052, (h - 0.34) / 2 + 0.34, 0);
      addBox(0.015, h - 0.42, d - 0.12, innerCyan, w / 2 - 0.052, (h - 0.34) / 2 + 0.34, 0);
      // Vertical & top cyan LED light strips inside frame
      addBox(0.028, h - 0.44, 0.028, pal.cyanGlow, -w / 2 + 0.068, (h - 0.34) / 2 + 0.34, d / 2 - 0.075);
      addBox(0.028, h - 0.44, 0.028, pal.cyanGlow, w / 2 - 0.068, (h - 0.34) / 2 + 0.34, d / 2 - 0.075);
      addBox(w - 0.14, 0.026, 0.026, pal.cyanGlow, 0, h - 0.075, d / 2 - 0.075);
      // 4 interior wire shelves + colorful RPI ice-cream tubs & plated cakes
      const tubWhite = makeMat({ color: 0xfefefe, roughness: 0.3 });
      const lidYellow = makeMat({ color: 0xfacc15, roughness: 0.4 });
      const lidPink = makeMat({ color: 0xfb7185, roughness: 0.4 });
      const cakeTan = makeMat({ color: 0xc28f52, roughness: 0.6 });
      for (let s = 0; s < 4; s++) {
        const sy = 0.56 + s * 0.33;
        addBox(w - 0.12, 0.012, d - 0.14, pal.stainless, 0, sy, 0);
        if (showProps) {
          if (s >= 2) {
            addCyl(0.058, 0.052, 0.11, tubWhite, -0.12, sy + 0.06, 0.04, 12);
            addCyl(0.06, 0.06, 0.016, lidYellow, -0.12, sy + 0.12, 0.04, 12);
            addCyl(0.058, 0.052, 0.11, tubWhite, 0.04, sy + 0.06, 0.04, 12);
            addCyl(0.06, 0.06, 0.016, lidPink, 0.04, sy + 0.12, 0.04, 12);
          } else {
            addCyl(0.09, 0.09, 0.014, tubWhite, -0.05, sy + 0.012, 0.02, 16);
            addBox(0.11, 0.06, 0.09, cakeTan, -0.05, sy + 0.05, 0.02);
          }
        }
      }
      // Glass door flush at front with silver frame, RPI top corner badge & vertical handle
      addBox(w, 0.045, 0.032, bodyMat, 0, h - 0.025, d / 2 - 0.01);
      addBox(w, 0.045, 0.032, bodyMat, 0, 0.36, d / 2 - 0.01);
      addBox(0.045, h - 0.34, 0.032, bodyMat, -w / 2 + 0.022, (h - 0.34) / 2 + 0.34, d / 2 - 0.01);
      addBox(0.045, h - 0.34, 0.032, bodyMat, w / 2 - 0.022, (h - 0.34) / 2 + 0.34, d / 2 - 0.01);
      addBox(w - 0.09, h - 0.43, 0.012, pal.glass, 0, (h - 0.34) / 2 + 0.34, d / 2 - 0.01);
      addBox(0.11, 0.042, 0.014, pal.whitePlastic, -w / 2 + 0.11, h - 0.09, d / 2 + 0.002);
      addBox(0.022, 0.52, 0.035, pal.stainless, w / 2 - 0.035, h * 0.56, d / 2 + 0.02);
      // Bottom compressor grille + red LED readout
      addBox(w, 0.34, d, bodyMat, 0, 0.17, 0);
      addBox(w * 0.78, 0.18, 0.02, pal.matteBlack, 0, 0.14, d / 2 + 0.005);
      const redLed = makeMat({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.8 });
      addBox(0.05, 0.025, 0.01, redLed, 0.04, 0.27, d / 2 + 0.01);
      // Folded cloth/mat resting on top of fridge
      if (showProps) {
        const clothMat = makeMat({ color: 0xc2ab8e, roughness: 0.9 });
        addBox(0.42, 0.07, 0.45, clothMat, 0, h + 0.035, 0.02);
      }
      break;
    }

    case 'microwave_station': {
      const counterH = 0.84;
      const frameMat = finishOverride ? pal.primaryFinish : pal.steel;
      const topMat = finishOverride ? pal.secondaryFinish : pal.oak;
      // 6 steel legs + lower shelf rails
      for (const lx of [-w / 2 + 0.03, 0, w / 2 - 0.03]) {
        for (const lz of [-d / 2 + 0.03, d / 2 - 0.03]) {
          addBox(0.032, counterH - 0.035, 0.032, frameMat, lx, (counterH - 0.035) / 2, lz);
        }
      }
      addBox(w - 0.04, 0.02, d - 0.04, pal.matteBlack, 0, 0.12, 0);
      addBox(w - 0.04, 0.02, d - 0.04, pal.matteBlack, 0, 0.48, 0);
      // Warm oak tabletop
      addBox(w, 0.038, d, topMat, 0, counterH - 0.019, 0);
      if (showProps) {
        // Lower blue-lidded storage tubs + stacked wooden boards
        const tubMat = makeMat({ color: 0xd1d5db, roughness: 0.4, transparent: true, opacity: 0.75 });
        const blueLid = makeMat({ color: 0x3b6ea5, roughness: 0.45 });
        addBox(0.32, 0.24, 0.36, tubMat, 0.35, 0.25, 0);
        addBox(0.34, 0.025, 0.38, blueLid, 0.35, 0.38, 0);
        addBox(0.28, 0.12, 0.34, topMat, -0.05, 0.55, 0);
        // Black & silver microwave on right side (near fridge)
        addBox(0.50, 0.30, 0.38, pal.matteBlack, w * 0.24, counterH + 0.15, -0.03);
        addBox(0.36, 0.24, 0.015, pal.glass, w * 0.20, counterH + 0.15, 0.162);
        const blueClock = makeMat({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 1.5 });
        addBox(0.04, 0.02, 0.01, blueClock, w * 0.39, counterH + 0.22, 0.162);
        // White plastic prep tray on top of microwave
        addBox(0.46, 0.05, 0.34, pal.whitePlastic, w * 0.24, counterH + 0.325, -0.02);
        // Stainless foil/wrap dispenser rack on left side
        addBox(0.42, 0.14, 0.22, pal.stainless, -w * 0.24, counterH + 0.07, -0.04);
        const filmBox = makeMat({ color: 0xeab308, roughness: 0.5 });
        addBox(0.36, 0.07, 0.14, filmBox, -w * 0.24, counterH + 0.055, -0.03);
      }
      // Wall-mounted black steel bracket + sticker roll
      addBox(0.03, 0.42, 0.03, pal.steel, w * 0.12, counterH + 0.45, -d / 2 + 0.04);
      addBox(0.03, 0.03, 0.34, pal.steel, w * 0.12, counterH + 0.52, -d / 2 + 0.19);
      if (showProps) {
        const roll = addCyl(0.068, 0.068, 0.82, pal.whitePlastic, -0.05, counterH + 0.49, -d / 2 + 0.22, 18);
        roll.rotation.z = Math.PI / 2;
        const coreMat = makeMat({ color: 0x7c5836, roughness: 0.85 });
        const core = addCyl(0.028, 0.028, 0.86, coreMat, -0.05, counterH + 0.49, -d / 2 + 0.22, 14);
        core.rotation.z = Math.PI / 2;
        const sheetMat = makeMat({
          color: 0xffffff,
          map: tex.stickerRollColor,
          roughness: 0.6,
          side: THREE.DoubleSide,
        });
        const sheet = addBox(0.76, 0.24, 0.005, sheetMat, -0.05, counterH + 0.36, -d / 2 + 0.17);
        sheet.rotation.x = 0.28;
      }
      break;
    }

    case 'prep_counter_white': {
      const counterH = 0.88;
      const cabMat = finishOverride ? pal.primaryFinish : pal.matteBlack;
      const topMat = finishOverride ? pal.secondaryFinish : pal.whiteTop;
      // Closed black under-cabinets with recessed door seams
      addBox(w - 0.02, counterH - 0.04, d - 0.04, cabMat, 0, (counterH - 0.04) / 2, -0.01);
      addBox(w * 0.45, counterH - 0.12, 0.02, pal.steel, -w * 0.24, (counterH - 0.04) / 2, d / 2 - 0.02);
      addBox(w * 0.45, counterH - 0.12, 0.02, pal.steel, w * 0.24, (counterH - 0.04) / 2, d / 2 - 0.02);
      // Crisp white quartz countertop
      addBox(w, 0.04, d, topMat, 0, counterH - 0.02, 0);
      if (showProps) {
        // Blendtec-style Blender (black base + clear square pitcher + green smoothie!)
        addBox(0.18, 0.15, 0.19, pal.matteBlack, -w * 0.22, counterH + 0.075, 0.02);
        addBox(0.14, 0.22, 0.14, pal.glass, -w * 0.22, counterH + 0.26, 0.02);
        const matcha = makeMat({ color: 0x84cc16, roughness: 0.35 });
        addBox(0.11, 0.11, 0.11, matcha, -w * 0.22, counterH + 0.21, 0.02);
        // Stacked clear prep containers + paper towel roll
        const clearBox = makeMat({ color: 0xe2e8f0, roughness: 0.25, transparent: true, opacity: 0.65 });
        addBox(0.24, 0.08, 0.18, clearBox, 0.15, counterH + 0.04, -0.05);
        addBox(0.24, 0.08, 0.18, clearBox, 0.15, counterH + 0.12, -0.05);
        addCyl(0.065, 0.065, 0.23, pal.whitePlastic, 0.48, counterH + 0.115, 0.08, 16);
      }
      break;
    }

    case 'prep_counter_wood': {
      const counterH = 0.88;
      const frameMat = finishOverride ? pal.primaryFinish : pal.steel;
      const topMat = finishOverride ? pal.secondaryFinish : pal.oak;
      // Steel open frame + lower shelf
      for (const lx of [-w / 2 + 0.03, 0, w / 2 - 0.03]) {
        for (const lz of [-d / 2 + 0.03, d / 2 - 0.03]) {
          addBox(0.035, counterH - 0.04, 0.035, frameMat, lx, (counterH - 0.04) / 2, lz);
        }
      }
      addBox(w - 0.04, 0.02, d - 0.04, pal.matteBlack, 0, 0.14, 0);
      addBox(w - 0.04, 0.02, d - 0.04, pal.matteBlack, 0, 0.50, 0);
      // Thick honey-oak wood countertop
      addBox(w, 0.042, d, topMat, 0, counterH - 0.021, 0);
      if (showProps) {
        // Cup sleeve stacks underneath
        const cupClear = makeMat({ color: 0xf1f5f9, roughness: 0.3, transparent: true, opacity: 0.72 });
        for (let i = 0; i < 4; i++) {
          const cyl = addCyl(0.048, 0.044, 0.36, cupClear, -0.45 + i * 0.24, 0.24, 0.04, 12);
          cyl.rotation.x = Math.PI / 2;
        }
        // Double Round Stainless Waffle Maker
        const wx = w * 0.26;
        addBox(0.48, 0.10, 0.36, pal.stainless, wx, counterH + 0.05, 0.02);
        addBox(0.46, 0.08, 0.02, pal.matteBlack, wx, counterH + 0.045, 0.20);
        const redSw = makeMat({ color: 0xdc2626, emissive: 0x991b1b, emissiveIntensity: 0.8 });
        addBox(0.025, 0.025, 0.015, redSw, wx - 0.12, counterH + 0.045, 0.212);
        addCyl(0.095, 0.095, 0.10, pal.stainless, wx - 0.11, counterH + 0.15, -0.01, 18);
        addCyl(0.095, 0.095, 0.10, pal.stainless, wx + 0.11, counterH + 0.15, -0.01, 18);
        const h1 = addCyl(0.014, 0.014, 0.14, pal.stainless, wx - 0.11, counterH + 0.16, 0.14, 10);
        h1.rotation.x = Math.PI / 2;
        const h2 = addCyl(0.014, 0.014, 0.14, pal.stainless, wx + 0.11, counterH + 0.16, 0.14, 10);
        h2.rotation.x = Math.PI / 2;
        // Black POS printer + Syrup bottles at opposite end
        addBox(0.16, 0.17, 0.20, pal.matteBlack, -w * 0.30, counterH + 0.085, -0.05);
        const amberSyrup = makeMat({ color: 0xb45309, roughness: 0.2 });
        const redSyrup = makeMat({ color: 0x9f1239, roughness: 0.2 });
        addCyl(0.036, 0.038, 0.26, amberSyrup, -w * 0.12, counterH + 0.13, -0.10, 12);
        addCyl(0.036, 0.038, 0.26, redSyrup, -w * 0.03, counterH + 0.13, -0.10, 12);
      }
      break;
    }

    case 'stainless_bar': {
      // Heavy-duty commercial brushed stainless steel bar counter (370x65cm right OR 153x58cm left)
      const metalMat = finishOverride ? pal.primaryFinish : pal.stainless;
      const topMat = finishOverride ? pal.secondaryFinish : pal.stainless;
      const legCount = Math.max(2, Math.round(w / 1.15) + 1);
      // Tubular stainless legs with adjustable feet
      for (let i = 0; i < legCount; i++) {
        const lx = -w / 2 + 0.05 + (i * (w - 0.10)) / (legCount - 1);
        for (const lz of [-d / 2 + 0.05, d / 2 - 0.05]) {
          addCyl(0.022, 0.022, h - 0.04, metalMat, lx, (h - 0.04) / 2, lz, 12);
          addCyl(0.028, 0.028, 0.025, pal.matteBlack, lx, 0.012, lz, 12);
        }
      }
      // Two full-length brushed stainless undershelves (16cm & 50cm)
      addBox(w - 0.04, 0.024, d - 0.05, metalMat, 0, 0.16, 0);
      addBox(w - 0.04, 0.024, d - 0.05, metalMat, 0, 0.50, 0);
      // Thick rolled-edge stainless worktop + 6cm rear stainless upstand backsplash
      addBox(w, 0.042, d, topMat, 0, h - 0.021, 0);
      addBox(w, 0.065, 0.022, topMat, 0, h + 0.032, -d / 2 + 0.011);
      // Under-apron structural rail
      addBox(w - 0.04, 0.045, 0.02, metalMat, 0, h - 0.065, d / 2 - 0.02);

      if (showProps) {
        if (w >= 2.6) {
          // Full 370cm Right Bar equipment layout (Dual Blendtec w/ open sound hood + Prep bins + POS + Monin Pumps + Double Waffle Maker)
          const bx = -w * 0.35;
          const lcdBlue = makeMat({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 1.5 });
          addBox(0.20, 0.17, 0.20, pal.matteBlack, bx, h + 0.085, 0.02);
          addBox(0.05, 0.025, 0.01, lcdBlue, bx, h + 0.11, 0.125);
          addBox(0.15, 0.22, 0.15, pal.glass, bx, h + 0.28, 0.02);
          const openHood = addBox(0.22, 0.24, 0.18, pal.glass, bx, h + 0.32, -0.06);
          openHood.rotation.x = -0.45;
          const matcha = makeMat({ color: 0x84cc16, roughness: 0.35 });
          addBox(0.11, 0.11, 0.11, matcha, bx, h + 0.23, 0.02);
          addBox(0.18, 0.11, 0.19, pal.matteBlack, bx + 0.26, h + 0.055, 0.04);
          addBox(0.045, 0.02, 0.01, lcdBlue, bx + 0.26, h + 0.08, 0.14);

          const clearBox = makeMat({ color: 0xe2e8f0, roughness: 0.25, transparent: true, opacity: 0.68 });
          addBox(0.24, 0.08, 0.18, clearBox, -w * 0.16, h + 0.04, -0.05);
          addBox(0.24, 0.08, 0.18, clearBox, -w * 0.16, h + 0.12, -0.05);
          addCyl(0.065, 0.065, 0.23, pal.whitePlastic, -w * 0.06, h + 0.115, 0.08, 16);

          addBox(0.16, 0.17, 0.20, pal.matteBlack, w * 0.05, h + 0.085, -0.05);
          const amberSyrup = makeMat({ color: 0xb45309, roughness: 0.2 });
          const redSyrup = makeMat({ color: 0x9f1239, roughness: 0.2 });
          const greenSyrup = makeMat({ color: 0x15803d, roughness: 0.2 });
          for (const [ox, mat] of [
            [0.13, amberSyrup],
            [0.18, redSyrup],
            [0.23, greenSyrup],
          ] as const) {
            addCyl(0.036, 0.038, 0.24, mat, w * ox, h + 0.12, -0.10, 12);
            addCyl(0.01, 0.01, 0.07, pal.whitePlastic, w * ox, h + 0.26, -0.10, 8);
          }

          const wx = w * 0.34;
          addBox(0.48, 0.10, 0.36, pal.stainless, wx, h + 0.05, 0.02);
          addBox(0.46, 0.08, 0.02, pal.matteBlack, wx, h + 0.045, 0.20);
          const redSw = makeMat({ color: 0xdc2626, emissive: 0x991b1b, emissiveIntensity: 0.8 });
          addBox(0.025, 0.025, 0.015, redSw, wx - 0.12, h + 0.045, 0.212);
          addCyl(0.095, 0.095, 0.10, pal.stainless, wx - 0.11, h + 0.15, -0.01, 18);
          addCyl(0.095, 0.095, 0.10, pal.stainless, wx + 0.11, h + 0.15, -0.01, 18);
          const h1 = addCyl(0.014, 0.014, 0.14, pal.stainless, wx - 0.11, h + 0.16, 0.14, 10);
          h1.rotation.x = Math.PI / 2;
          const h2 = addCyl(0.014, 0.014, 0.14, pal.stainless, wx + 0.11, h + 0.16, 0.14, 10);
          h2.rotation.x = Math.PI / 2;

          const cupClear = makeMat({ color: 0xf1f5f9, roughness: 0.3, transparent: true, opacity: 0.72 });
          for (let c = 0; c < 4; c++) {
            const cyl = addCyl(0.048, 0.044, 0.36, cupClear, w * 0.16 + c * 0.22, 0.26, 0.04, 12);
            cyl.rotation.x = Math.PI / 2;
          }
        } else {
          // 153cm Left Stainless Bar equipment layout (Microwave near fridge + Foil rack + Front-left Dish Rack w/ White Plates + Wall Sticker Roll)
          const tubMat = makeMat({ color: 0xd1d5db, roughness: 0.4, transparent: true, opacity: 0.75 });
          const blueLid = makeMat({ color: 0x3b6ea5, roughness: 0.45 });
          addBox(0.32, 0.24, 0.36, tubMat, 0.24, 0.29, 0);
          addBox(0.34, 0.025, 0.38, blueLid, 0.24, 0.42, 0);

          // Microwave positioned toward north/fridge side (+w local when rotY=90)
          addBox(0.50, 0.30, 0.38, pal.matteBlack, w * 0.22, h + 0.15, -0.03);
          addBox(0.36, 0.24, 0.015, pal.glass, w * 0.18, h + 0.15, 0.162);
          const blueClock = makeMat({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 1.5 });
          addBox(0.04, 0.02, 0.01, blueClock, w * 0.37, h + 0.22, 0.162);
          addBox(0.46, 0.05, 0.34, pal.whitePlastic, w * 0.22, h + 0.325, -0.02);

          // Stainless foil dispenser rack mid-bar
          addBox(0.34, 0.13, 0.22, pal.stainless, -w * 0.09, h + 0.065, -0.04);
          const filmBox = makeMat({ color: 0xeab308, roughness: 0.5 });
          addBox(0.28, 0.065, 0.14, filmBox, -w * 0.09, h + 0.05, -0.03);

          // Front-left black Dish Drying Rack with Stacked White Ceramic Plates (matching photo 10.56.59_PM_3b918361)
          const rx = -w * 0.35;
          addBox(0.34, 0.02, 0.36, pal.matteBlack, rx, h + 0.01, 0.03);
          addBox(0.34, 0.13, 0.018, pal.matteBlack, rx, h + 0.075, -0.14);
          addBox(0.34, 0.13, 0.018, pal.matteBlack, rx, h + 0.075, 0.20);
          for (let p = 0; p < 5; p++) {
            const plate = addCyl(0.11, 0.095, 0.016, pal.whiteTop, rx - 0.10 + p * 0.05, h + 0.13, 0.03, 16);
            plate.rotation.z = Math.PI / 2 - 0.08;
          }

          // Wall-mounted black steel bracket + sticker roll above bar
          addBox(0.03, 0.42, 0.03, pal.steel, w * 0.05, h + 0.45, -d / 2 + 0.04);
          addBox(0.03, 0.03, 0.34, pal.steel, w * 0.05, h + 0.52, -d / 2 + 0.19);
          const roll = addCyl(0.068, 0.068, 0.82, pal.whitePlastic, 0.02, h + 0.49, -d / 2 + 0.22, 18);
          roll.rotation.z = Math.PI / 2;
          const coreMat = makeMat({ color: 0x7c5836, roughness: 0.85 });
          const core = addCyl(0.028, 0.028, 0.86, coreMat, 0.02, h + 0.49, -d / 2 + 0.22, 14);
          core.rotation.z = Math.PI / 2;
          const sheetMat = makeMat({
            color: 0xffffff,
            map: tex.stickerRollColor,
            roughness: 0.6,
            side: THREE.DoubleSide,
          });
          const sheet = addBox(0.76, 0.24, 0.005, sheetMat, 0.02, h + 0.36, -d / 2 + 0.17);
          sheet.rotation.x = 0.28;
        }
      }
      break;
    }

    case 'stainless_single_shelf': {
      // Standalone single-piece brushed stainless wall shelf supported strictly from underneath (no front vertical bars/dividers)
      const shelfMat = finishOverride ? pal.secondaryFinish : pal.stainless;
      const bracketMat = finishOverride ? pal.primaryFinish : pal.stainless;

      // Single continuous unbroken horizontal slab + folded front nose + thin rear wall turn-up
      addBox(w, h, d, shelfMat, 0, h / 2, 0);
      addBox(w, h + 0.004, 0.010, bracketMat, 0, h / 2 - 0.002, d / 2 - 0.005);
      addBox(w, 0.018, 0.008, bracketMat, 0, h + 0.006, -d / 2 + 0.004);

      let bracketXs: number[];
      let dropH: number;
      if (item.id === 'shelf_back_u') {
        // Place brackets cleanly on tiled wall piers outside the 80cm back_door jambs (-37..+43cm)
        bracketXs = [-w * 0.37, w * 0.42];
        dropH = 0.095;
      } else if (item.id === 'shelf_back_u_2') {
        // Brackets placed cleanly outside split_ac housing (world X -50..+46cm -> local -0.68..+0.28)
        bracketXs = [-0.80, 0.40, 0.82];
        dropH = 0.13;
      } else if (item.id === 'shelf_left_u' || item.id === 'shelf_left_upper') {
        // 6 heavy-duty brackets across the 353cm span, strictly avoiding the side_door opening (world z -111..-29cm)
        bracketXs = [1.60, 1.02, -0.05, -0.58, -1.12, -1.65];
        dropH = 0.14;
      } else {
        const count = Math.max(2, Math.round(w / 0.9) + 1);
        bracketXs = Array.from({ length: count }, (_, i) => -w * 0.46 + (i * (w * 0.92)) / (count - 1));
        dropH = d <= 0.35 ? 0.13 : 0.15;
      }
      addUnderBrackets(bracketXs, w, d, 0, dropH, bracketMat);

      if (showProps && item.id === 'shelf_back_u_2') {
        const cartonMat = makeMat({ color: 0xc98845, roughness: 0.84 });
        const kraftMat = makeMat({ color: 0xd9c29c, roughness: 0.82 });
        addBox(0.32, 0.104, 0.20, cartonMat, -0.14, h + 0.052, 0.03);
        addBox(0.26, 0.095, 0.18, kraftMat, 0.42, h + 0.048, 0.03);
      } else if (showProps && item.id !== 'shelf_back_u') {
        if (d <= 0.35) {
          const sauceColors = [0xd6b88d, 0x84a96c, 0x7c4a2d, 0xd9a05b, 0x5c3a21, 0x991b1b, 0xd97706];
          const bottleCount = Math.max(4, Math.floor(w / 0.24));
          const tallBottles = item.yCm >= 165;
          for (let i = 0; i < bottleCount; i++) {
            const sx = -w * 0.43 + (i * (w * 0.86)) / Math.max(1, bottleCount - 1);
            const c = makeMat({
              color: sauceColors[(i + (tallBottles ? 3 : 0)) % sauceColors.length],
              roughness: tallBottles ? 0.25 : 0.35,
            });
            addCyl(0.03, 0.032, tallBottles ? 0.18 : 0.15, c, sx, h + (tallBottles ? 0.09 : 0.075), 0.02, 12);
          }
        } else if (item.yCm >= 240) {
          const bagMat = makeMat({ color: 0xe5e7eb, roughness: 0.78 });
          addBox(0.45, 0.24, 0.26, bagMat, -w * 0.25, h + 0.12, 0);
          addBox(0.38, 0.20, 0.24, bagMat, w * 0.26, h + 0.10, 0);
        } else {
          const tubBody = makeMat({ color: 0xf1f5f9, roughness: 0.35, transparent: true, opacity: 0.8 });
          const pinkLid = makeMat({ color: 0xf4c2c2, roughness: 0.45 });
          const yellowLid = makeMat({ color: 0xfacc15, roughness: 0.4 });
          if (item.yCm >= 210) {
            const tubCount = Math.max(2, Math.floor(w / 0.60));
            for (let i = 0; i < tubCount; i++) {
              const tx = -w * 0.36 + (i * (w * 0.72)) / Math.max(1, tubCount - 1);
              addCyl(0.11, 0.095, 0.20, tubBody, tx, h + 0.10, 0.02, 16);
              addCyl(0.115, 0.115, 0.022, pinkLid, tx, h + 0.21, 0.02, 16);
            }
          } else {
            addBox(0.36, 0.15, 0.28, tubBody, w * 0.26, h + 0.075, 0.02);
            addBox(0.38, 0.024, 0.30, yellowLid, w * 0.26, h + 0.16, 0.02);
            addBox(0.30, 0.14, 0.26, pal.matteBlack, -w * 0.24, h + 0.07, 0.02);
            addBox(0.30, 0.14, 0.26, pal.matteBlack, 0, h + 0.07, 0.02);
          }
        }
      }
      break;
    }

    case 'stainless_shelves': {
      // Stepped brushed stainless steel wall tiers supported from underneath (no front vertical divider bars)
      const shelfMat = finishOverride ? pal.secondaryFinish : pal.stainless;
      const bracketMat = finishOverride ? pal.primaryFinish : pal.stainless;

      const sauceDepth = Math.min(d, 0.30);
      const sauceOffsetZ = -d / 2 + sauceDepth / 2;
      const sauceY1 = 0.015;
      const sauceY2 = h * 0.33;
      const largeY1 = h * 0.66;
      const largeY2 = h - 0.015;

      for (const sy of [sauceY1, sauceY2]) {
        addBox(w, 0.028, sauceDepth, shelfMat, 0, sy, sauceOffsetZ);
      }
      for (const ly of [largeY1, largeY2]) {
        addBox(w, 0.030, d, shelfMat, 0, ly, 0);
      }

      const colCount = Math.max(2, Math.round(w / 0.9) + 1);
      const colXs = Array.from({ length: colCount }, (_, i) => -w * 0.46 + (i * (w * 0.92)) / (colCount - 1));
      for (const [tierY, tierD] of [
        [sauceY1 - 0.014, sauceDepth],
        [sauceY2 - 0.014, sauceDepth],
        [largeY1 - 0.015, d],
        [largeY2 - 0.015, d],
      ] as const) {
        addUnderBrackets(colXs, w, tierD, tierY, 0.12, bracketMat, -d / 2);
      }

      if (showProps) {
        const sauceColors = [0xd6b88d, 0x84a96c, 0x7c4a2d, 0xd9a05b, 0x5c3a21, 0x991b1b, 0xd97706];
        const bottleCount = Math.max(4, Math.floor(w / 0.24));
        for (let i = 0; i < bottleCount; i++) {
          const sx = -w * 0.43 + (i * (w * 0.86)) / Math.max(1, bottleCount - 1);
          const c1 = makeMat({ color: sauceColors[i % sauceColors.length], roughness: 0.35 });
          const c2 = makeMat({ color: sauceColors[(i + 3) % sauceColors.length], roughness: 0.25 });
          addCyl(0.03, 0.032, 0.16, c1, sx, sauceY1 + 0.095, sauceOffsetZ + 0.02, 12);
          addCyl(0.03, 0.032, 0.16, c2, sx, sauceY2 + 0.095, sauceOffsetZ + 0.02, 12);
        }

        const tubBody = makeMat({ color: 0xf1f5f9, roughness: 0.35, transparent: true, opacity: 0.8 });
        const pinkLid = makeMat({ color: 0xf4c2c2, roughness: 0.45 });
        const yellowLid = makeMat({ color: 0xfacc15, roughness: 0.4 });
        const tubCount = Math.max(2, Math.floor(w / 0.55));
        for (let i = 0; i < tubCount; i++) {
          const tx = -w * 0.40 + (i * (w * 0.80)) / Math.max(1, tubCount - 1);
          addCyl(0.115, 0.10, 0.22, tubBody, tx, largeY2 + 0.125, 0.04, 16);
          addCyl(0.12, 0.12, 0.024, pinkLid, tx, largeY2 + 0.245, 0.04, 16);
        }
        addBox(0.36, 0.16, 0.30, tubBody, w * 0.26, largeY1 + 0.095, 0.03);
        addBox(0.38, 0.025, 0.32, yellowLid, w * 0.26, largeY1 + 0.185, 0.03);
        addBox(0.30, 0.15, 0.28, pal.matteBlack, -w * 0.24, largeY1 + 0.09, 0.03);
        addBox(0.30, 0.15, 0.28, pal.matteBlack, 0, largeY1 + 0.09, 0.03);
      }
      break;
    }

    case 'wall_shelf_right': {
      const bracketMat = finishOverride ? pal.primaryFinish : pal.steel;
      const plankMat = finishOverride ? pal.secondaryFinish : pal.oak;
      const tierY = [0.02, 0.48, 0.98];
      for (const y of tierY) {
        addBox(w, 0.032, d, plankMat, 0, y, 0);
      }
      // 4 Industrial U-brackets connecting shelves to wall
      for (const bx of [-w * 0.44, -w * 0.15, w * 0.15, w * 0.44]) {
        addBox(0.03, 1.38, 0.03, bracketMat, bx, 0.69, d / 2 - 0.015);
        addBox(0.03, 1.38, 0.03, bracketMat, bx, 0.69, -d / 2 + 0.015);
        addBox(0.03, 0.03, d, bracketMat, bx, 0.01, 0);
        addBox(0.03, 0.03, d, bracketMat, bx, 0.97, 0);
      }
      if (showProps) {
        const tubBody = makeMat({ color: 0xf1f5f9, roughness: 0.35, transparent: true, opacity: 0.78 });
        const pinkLid = makeMat({ color: 0xf4c2c2, roughness: 0.45 });
        const yellowLid = makeMat({ color: 0xfacc15, roughness: 0.4 });
        for (let i = 0; i < 6; i++) {
          const tx = -w * 0.40 + i * 0.36;
          addCyl(0.11, 0.095, 0.24, tubBody, tx, tierY[2] + 0.135, 0.02, 16);
          addCyl(0.115, 0.115, 0.025, pinkLid, tx, tierY[2] + 0.265, 0.02, 16);
        }
        addBox(0.38, 0.22, 0.26, tubBody, w * 0.22, tierY[2] + 0.125, 0.02);
        addBox(0.40, 0.03, 0.28, yellowLid, w * 0.22, tierY[2] + 0.245, 0.02);
        const bottleColors = [0x991b1b, 0x92400e, 0x166534, 0x78350f, 0xd97706];
        for (let i = 0; i < 8; i++) {
          const bMat = makeMat({ color: bottleColors[i % bottleColors.length], roughness: 0.22 });
          addCyl(0.034, 0.036, 0.25, bMat, -w * 0.42 + i * 0.14, tierY[1] + 0.14, 0.02, 12);
        }
        for (let s = 0; s < 3; s++) {
          addBox(0.26, 0.20, 0.24, pal.matteBlack, w * 0.12 + s * 0.32, tierY[1] + 0.115, 0.02);
        }
        const fezRed = makeMat({ color: 0xb91c1c, roughness: 0.72 });
        addCyl(0.07, 0.085, 0.11, fezRed, w * 0.26, tierY[1] + 0.27, 0.02, 16);
        const sauceColors = [0xd6b88d, 0x84a96c, 0x7c4a2d, 0xd9a05b, 0x5c3a21];
        for (let i = 0; i < 6; i++) {
          const sMat = makeMat({ color: sauceColors[i % sauceColors.length], roughness: 0.4 });
          addCyl(0.032, 0.032, 0.22, sMat, -w * 0.24 + i * 0.10, tierY[0] + 0.125, 0.02, 12);
        }
        const basketMat = makeMat({ color: 0x5c3824, roughness: 0.85 });
        addBox(0.32, 0.12, 0.24, basketMat, w * 0.26, tierY[0] + 0.075, 0.02);
        addBox(0.16, 0.07, 0.18, pal.matteBlack, w * 0.42, tierY[0] + 0.05, 0.04);
      }
      break;
    }

    case 'wall_shelf_left': {
      const bracketMat = finishOverride ? pal.primaryFinish : pal.stainless;
      const plankMat = finishOverride ? pal.secondaryFinish : pal.stainless;
      addBox(w, 0.030, d, plankMat, 0, 0.015, 0);
      addBox(w, 0.030, d, plankMat, 0, 0.315, 0);
      const leftXs = [-w * 0.44, 0, w * 0.44];
      addUnderBrackets(leftXs, w, d, 0, 0.13, bracketMat);
      addUnderBrackets(leftXs, w, d, 0.30, 0.13, bracketMat);
      if (showProps) {
        const bagMat = makeMat({ color: 0xe5e7eb, roughness: 0.78 });
        addBox(0.45, 0.24, 0.26, bagMat, -w * 0.22, 0.15, 0);
        addBox(0.38, 0.20, 0.24, bagMat, w * 0.25, 0.13, 0);
      }
      break;
    }

    case 'exhaust_duct': {
      const ductMat = finishOverride ? pal.primaryFinish : pal.matteBlack;
      // Horizontal matte-black exhaust pipe from left wall toward center
      const pipe = addCyl(0.13, 0.13, w * 0.82, ductMat, -w * 0.08, h * 0.68, 0, 20);
      pipe.rotation.z = Math.PI / 2;
      // Flanged collar joint
      const collar = addCyl(0.145, 0.145, 0.04, pal.steel, w * 0.30, h * 0.68, 0, 20);
      collar.rotation.z = Math.PI / 2;
      // 90° downward elbow + vertical exhaust mouth
      const sphereMat = ductMat;
      const elbowGeo = track(new THREE.SphereGeometry(0.132, 18, 14));
      const elbow = new THREE.Mesh(elbowGeo, sphereMat);
      elbow.position.set(w * 0.35, h * 0.68, 0);
      elbow.castShadow = true;
      inner.add(elbow);
      addCyl(0.13, 0.13, 0.24, ductMat, w * 0.35, h * 0.42, 0, 20);
      break;
    }

    case 'step_ladder': {
      const ladMat = finishOverride ? pal.primaryFinish : pal.whitePlastic;
      // Two folded vertical ladder rails
      addBox(0.045, h, 0.045, ladMat, -w * 0.38, h / 2, 0);
      addBox(0.045, h, 0.045, ladMat, w * 0.38, h / 2, 0);
      addBox(0.045, h * 0.94, 0.04, ladMat, -w * 0.38, h * 0.47, 0.055);
      addBox(0.045, h * 0.94, 0.04, ladMat, w * 0.38, h * 0.47, 0.055);
      for (let s = 0; s < 4; s++) {
        addBox(w * 0.82, 0.025, 0.08, ladMat, 0, 0.32 + s * 0.30, 0.025);
      }
      // Coiled white corrugated drain hoses next to ladder
      const hoseMat = makeMat({ color: 0xd6d3cd, roughness: 0.65 });
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.18, h * 0.82, -0.06),
        new THREE.Vector3(-0.08, h * 0.45, 0.02),
        new THREE.Vector3(0.08, 0.08, 0.04),
        new THREE.Vector3(0.18, 0.04, -0.05),
      ]);
      const tubeGeo = track(new THREE.TubeGeometry(curve, 24, 0.026, 10, false));
      const tube = new THREE.Mesh(tubeGeo, hoseMat);
      tube.castShadow = true;
      inner.add(tube);
      break;
    }

    case 'custom_counter': {
      const bodyMat = finishOverride ? pal.primaryFinish : pal.steel;
      const topMat = finishOverride ? pal.secondaryFinish : pal.oak;
      addBox(w - 0.04, h - 0.04, d - 0.04, bodyMat, 0, (h - 0.04) / 2, 0);
      addBox(w, 0.045, d, topMat, 0, h - 0.0225, 0);
      addBox(w * 0.42, 0.018, 0.025, pal.stainless, -w * 0.22, h * 0.72, d / 2 - 0.005);
      addBox(w * 0.42, 0.018, 0.025, pal.stainless, w * 0.22, h * 0.72, d / 2 - 0.005);
      break;
    }

    case 'custom_fridge': {
      const bodyMat = finishOverride ? pal.primaryFinish : pal.stainless;
      addBox(w, h - 0.24, d - 0.04, bodyMat, 0, (h + 0.24) / 2, -0.02);
      addBox(w - 0.08, h - 0.34, 0.015, pal.glass, 0, (h + 0.24) / 2, d / 2 - 0.02);
      addBox(0.02, h - 0.38, 0.02, pal.cyanGlow, -w / 2 + 0.06, (h + 0.24) / 2, d / 2 - 0.06);
      addBox(w, 0.24, d, pal.matteBlack, 0, 0.12, 0);
      addBox(0.02, 0.48, 0.03, pal.stainless, w / 2 - 0.04, h * 0.55, d / 2 + 0.015);
      break;
    }

    case 'custom_shelf': {
      const bracketMat = finishOverride ? pal.primaryFinish : pal.steel;
      const plankMat = finishOverride ? pal.secondaryFinish : pal.oak;
      addBox(w, 0.032, d, plankMat, 0, 0.02, 0);
      addBox(w, 0.032, d, plankMat, 0, h - 0.02, 0);
      addBox(0.03, h, d, bracketMat, -w * 0.44, h / 2, 0);
      addBox(0.03, h, d, bracketMat, w * 0.44, h / 2, 0);
      break;
    }

    case 'custom_espresso': {
      const bodyMat = finishOverride ? pal.primaryFinish : pal.stainless;
      // Espresso machine chassis + drip tray + 2 group heads + cup warmer rail + grinder
      addBox(w * 0.7, h * 0.75, d * 0.85, bodyMat, -w * 0.12, h * 0.375, -0.02);
      addBox(w * 0.7, 0.06, d * 0.22, pal.matteBlack, -w * 0.12, 0.03, d * 0.36);
      addCyl(0.045, 0.045, 0.07, pal.brass, -w * 0.24, h * 0.45, d * 0.32, 14);
      addCyl(0.045, 0.045, 0.07, pal.brass, 0.0, h * 0.45, d * 0.32, 14);
      addBox(w * 0.66, 0.03, d * 0.75, pal.stainless, -w * 0.12, h * 0.80, -0.02);
      // Coffee grinder next to machine
      addBox(0.16, h * 0.55, 0.20, pal.matteBlack, w * 0.36, h * 0.275, 0);
      addCyl(0.08, 0.035, h * 0.35, pal.glass, w * 0.36, h * 0.74, 0, 14);
      break;
    }

    case 'custom_partition': {
      const frameMat = finishOverride ? pal.primaryFinish : pal.steel;
      const slatMat = finishOverride ? pal.secondaryFinish : pal.oak;
      addBox(w, 0.05, d, frameMat, 0, 0.025, 0);
      addBox(w, 0.05, d, frameMat, 0, h - 0.025, 0);
      addBox(0.04, h, d, frameMat, -w / 2 + 0.02, h / 2, 0);
      addBox(0.04, h, d, frameMat, w / 2 - 0.02, h / 2, 0);
      const count = 6;
      for (let i = 0; i < count; i++) {
        const sx = -w * 0.38 + (i * (w * 0.76)) / (count - 1);
        addBox(0.045, h - 0.08, d * 0.6, slatMat, sx, h / 2, 0);
      }
      break;
    }

    case 'custom_wall': {
      const wallProps = getWallMaterialProps(wallStyle, tex, w / 0.85, h / 0.68);
      if (wallProps.map) track(wallProps.map);
      if (wallProps.bumpMap) track(wallProps.bumpMap);
      const wallMat = finishOverride ? pal.primaryFinish : makeMat(wallProps);
      // Main wall body + dark baseboard skirting + top cap trim
      addBox(w, h - 0.12, d, wallMat, 0, (h + 0.08) / 2, 0);
      addBox(w + 0.006, 0.10, d + 0.014, pal.matteBlack, 0, 0.05, 0);
      addBox(w + 0.006, 0.04, d + 0.012, pal.steel, 0, h - 0.02, 0);
      break;
    }

    case 'custom_wall_door': {
      const wallProps = getWallMaterialProps(wallStyle, tex, w / 0.85, h / 0.68);
      if (wallProps.map) track(wallProps.map);
      if (wallProps.bumpMap) track(wallProps.bumpMap);
      const wallMat = finishOverride ? pal.primaryFinish : makeMat(wallProps);
      const doorW = Math.min(0.86, w * 0.48);
      const doorH = Math.min(2.1, h * 0.74);
      const sideW = Math.max(0.18, (w - doorW) / 2);
      // Left wall pier, right wall pier, top header lintel
      addBox(sideW, h, d, wallMat, -w / 2 + sideW / 2, h / 2, 0);
      addBox(sideW, h, d, wallMat, w / 2 - sideW / 2, h / 2, 0);
      addBox(doorW, h - doorH, d, wallMat, 0, doorH + (h - doorH) / 2, 0);
      // Door frame + black paneled door leaf + brass lever handle
      addBox(0.05, doorH, d + 0.018, pal.matteBlack, -doorW / 2 + 0.025, doorH / 2, 0);
      addBox(0.05, doorH, d + 0.018, pal.matteBlack, doorW / 2 - 0.025, doorH / 2, 0);
      addBox(doorW, 0.05, d + 0.018, pal.matteBlack, 0, doorH - 0.025, 0);
      addBox(doorW - 0.09, doorH - 0.05, 0.04, pal.steel, 0, (doorH - 0.05) / 2, 0);
      addBox(0.09, 0.022, 0.09, pal.brass, -doorW * 0.34, 1.0, 0);
      break;
    }

    case 'custom_table': {
      const legMat = finishOverride ? pal.primaryFinish : pal.steel;
      const topMat = finishOverride ? pal.secondaryFinish : pal.oak;
      // 4 legs + under-apron frame + thick butcher-block top
      for (const lx of [-w / 2 + 0.04, w / 2 - 0.04]) {
        for (const lz of [-d / 2 + 0.04, d / 2 - 0.04]) {
          addBox(0.04, h - 0.04, 0.04, legMat, lx, (h - 0.04) / 2, lz);
        }
      }
      addBox(w - 0.08, 0.04, d - 0.08, legMat, 0, h - 0.06, 0);
      addBox(w, 0.042, d, topMat, 0, h - 0.021, 0);
      break;
    }

    case 'custom_stool': {
      const legMat = finishOverride ? pal.primaryFinish : pal.steel;
      const seatMat = finishOverride ? pal.secondaryFinish : pal.oak;
      // Pedestal / 4 splayed legs + footrest ring + cushioned/oak seat
      addCyl(0.026, 0.032, h - 0.06, legMat, 0, (h - 0.06) / 2, 0, 12);
      addCyl(w * 0.44, w * 0.48, 0.025, legMat, 0, 0.012, 0, 18);
      const ringGeo = track(new THREE.TorusGeometry(w * 0.34, 0.012, 8, 20));
      const ring = new THREE.Mesh(ringGeo, pal.stainless);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = h * 0.32;
      inner.add(ring);
      addCyl(w * 0.46, w * 0.44, 0.055, seatMat, 0, h - 0.028, 0, 20);
      break;
    }

    case 'custom_sink': {
      const cabMat = finishOverride ? pal.primaryFinish : pal.matteBlack;
      const topMat = finishOverride ? pal.secondaryFinish : pal.stainless;
      addBox(w - 0.04, h - 0.04, d - 0.04, cabMat, 0, (h - 0.04) / 2, 0);
      addBox(w, 0.04, d, topMat, 0, h - 0.02, 0);
      addBox(w * 0.62, 0.015, d * 0.68, pal.matteBlack, 0, h + 0.005, 0.02);
      addCyl(0.018, 0.022, 0.18, pal.stainless, 0, h + 0.09, -d * 0.28, 12);
      addBox(0.022, 0.022, 0.13, pal.stainless, 0, h + 0.18, -d * 0.22);
      break;
    }
  }

  // Apply user scale cleanly relative to nominal base dimensions
  const sx = item.widthCm / item.baseW;
  const sy = item.heightCm / item.baseH;
  const sz = item.depthCm / item.baseD;
  inner.scale.set(sx, sy, sz);

  // Architectural AutoCAD edge overlay when cadMode is active
  if (isCad) {
    const darkEdgeMat = track(
      new THREE.LineBasicMaterial({
        color: 0x0f172a,
        transparent: true,
        opacity: 0.68,
      })
    );
    const lightEdgeMat = track(
      new THREE.LineBasicMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.72,
      })
    );
    const meshesToEdge: THREE.Mesh[] = [];
    inner.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (mesh.material !== pal.glass) {
          meshesToEdge.push(mesh);
        }
      }
    });
    for (const mesh of meshesToEdge) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const lum = mat?.color ? 0.299 * mat.color.r + 0.587 * mat.color.g + 0.114 * mat.color.b : 1;
      const edgeGeo = track(new THREE.EdgesGeometry(mesh.geometry, 28));
      const segs = new THREE.LineSegments(edgeGeo, lum < 0.24 ? lightEdgeMat : darkEdgeMat);
      mesh.add(segs);
    }
  }

  // Tag all child meshes for raycasting back to this SceneItem
  root.traverse((obj) => {
    obj.userData.itemId = item.id;
  });

  root.position.set(item.xCm / 100, item.yCm / 100, item.zCm / 100);
  root.rotation.y = (item.rotYDeg * Math.PI) / 180;
  root.visible = item.visible;

  return {
    group: root,
    dispose() {
      for (const d of disposables) {
        d.dispose();
      }
    },
  };
}
