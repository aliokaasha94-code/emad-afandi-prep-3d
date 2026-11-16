import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildSceneItemGroup, type BuiltItemHandle } from '../scene/builders';
import {
  clampItemToRoom,
  computeDistanceCm,
  computeWalkStep,
  getCameraPresetPose,
  snapValue,
  type WalkKeysState,
} from '../scene/layoutMath';
import { getLightingRigConfig } from '../scene/lighting';
import { buildRoomShell, type RoomShellHandle } from '../scene/roomShell';
import { createProceduralTextures, type TextureBundle } from '../scene/textures';
import type {
  CameraPresetId,
  Measurement,
  NavMode,
  Point3D,
  RoomConfig,
  SceneItem,
  ToolMode,
} from '../scene/types';

export interface SceneViewportProps {
  room: RoomConfig;
  items: SceneItem[];
  selectedId: string | null;
  navMode: NavMode;
  toolMode: ToolMode;
  gridSnapCm: number;
  cameraPresetTrigger: { id: CameraPresetId; seq: number } | null;
  measurements: Measurement[];
  pendingMeasureStart: Point3D | null;
  walkPadRef: React.MutableRefObject<WalkKeysState>;
  onSelectItem: (id: string | null) => void;
  onUpdateItem: (item: SceneItem, recordHistory?: boolean) => void;
  onMeasureClick: (ptCm: Point3D) => void;
  onPlaceAtPoint: (ptCm: Point3D) => void;
  onRegisterCapture?: (fn: (() => string | null) | null) => void;
}

const _vec3 = new THREE.Vector3();
const _targetVec = new THREE.Vector3();
const _floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _planeHit = new THREE.Vector3();

function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createDimensionSprite(
  text: string,
  cadMode: boolean,
  disposables: { dispose: () => void }[]
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 80;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Compact architectural callout badge
  ctx.fillStyle = cadMode ? 'rgba(15, 23, 42, 0.92)' : 'rgba(17, 21, 29, 0.88)';
  ctx.strokeStyle = cadMode ? '#0284c7' : '#f59e0b';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.roundRect(8, 10, canvas.width - 16, canvas.height - 20, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = cadMode ? '#f8fafc' : '#fef3c7';
  ctx.font = 'bold 26px "IBM Plex Sans Arabic", "Cairo", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  disposables.push(tex, mat);
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.68, 0.114, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function createItemSpecBadgeSprite(
  code: string | undefined,
  nameAr: string,
  widthCm: number,
  depthCm: number,
  heightCm: number,
  yCm: number,
  disposables: { dispose: () => void }[]
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 680;
  canvas.height = 140;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background rounded card with glowing amber border
  ctx.fillStyle = 'rgba(12, 16, 24, 0.94)';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 16);
  ctx.fill();
  ctx.stroke();

  // Item code & name
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 21px "Cairo", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const title = code ? `[${code}]  ${nameAr}` : nameAr;
  ctx.fillText(title, canvas.width / 2, 20);

  // Divider line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(24, 58);
  ctx.lineTo(canvas.width - 24, 58);
  ctx.stroke();

  // Dimensions & Elevation line
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 22px "Cairo", monospace, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const dimsText = `${widthCm} × ${depthCm} × ${heightCm} سم  ·  منسوب الأرض: ${yCm} سم`;
  ctx.fillText(dimsText, canvas.width / 2, canvas.height - 18);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  disposables.push(tex, mat);
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.08, 0.22, 1);
  sprite.renderOrder = 30;
  return sprite;
}

export function SceneViewport({
  room,
  items,
  selectedId,
  navMode,
  toolMode,
  gridSnapCm,
  cameraPresetTrigger,
  measurements,
  pendingMeasureStart,
  walkPadRef,
  onSelectItem,
  onUpdateItem,
  onMeasureClick,
  onPlaceAtPoint,
  onRegisterCapture,
}: SceneViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  // Latest props in refs so WebGL scene mounts once and never tears down on UI updates
  const propsRef = useRef({
    room,
    items,
    selectedId,
    navMode,
    toolMode,
    gridSnapCm,
    measurements,
    pendingMeasureStart,
    onSelectItem,
    onUpdateItem,
    onMeasureClick,
    onPlaceAtPoint,
    onRegisterCapture,
  });
  propsRef.current = {
    room,
    items,
    selectedId,
    navMode,
    toolMode,
    gridSnapCm,
    measurements,
    pendingMeasureStart,
    onSelectItem,
    onUpdateItem,
    onMeasureClick,
    onPlaceAtPoint,
    onRegisterCapture,
  };

  // Internal imperative triggers exposed from React prop changes to the WebGL manager
  const syncRoomRef = useRef<(() => void) | null>(null);
  const syncItemsRef = useRef<(() => void) | null>(null);
  const syncSelectionRef = useRef<(() => void) | null>(null);
  const syncMeasuresRef = useRef<(() => void) | null>(null);
  const applyPresetRef = useRef<((preset: CameraPresetId) => void) | null>(null);
  const syncNavModeRef = useRef<((mode: NavMode) => void) | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();

    const initialRig = getLightingRigConfig(
      propsRef.current.room.lightingMode ?? 'warm_3000k',
      Boolean(propsRef.current.room.cadMode)
    );
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(initialRig.bgColor);
    scene.fog = new THREE.FogExp2(initialRig.bgColor, initialRig.fogDensity);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(56, width / height, 0.05, 60);
    const initialPose = getCameraPresetPose('entrance', propsRef.current.room);
    camera.position.set(
      initialPose.positionCm.x / 100,
      initialPose.positionCm.y / 100,
      initialPose.positionCm.z / 100
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: isSoftwareGl,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    // Studio IBL Reflections balanced warm so brushed steel & glossy tiles stay crisp without overexposing
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = initialRig.envIntensity;
    pmrem.dispose();

    // Warm 3000K Cafe Interior Ambient + Directional + Ceiling Practical Lighting Rig
    const ambientLight = new THREE.AmbientLight(initialRig.ambientColor, initialRig.ambientIntensity);
    scene.add(ambientLight);

    const hemi = new THREE.HemisphereLight(
      initialRig.hemiSkyColor,
      initialRig.hemiGroundColor,
      initialRig.hemiIntensity
    );
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(initialRig.keyColor, initialRig.keyIntensity);
    keyLight.position.set(2.4, 5.2, 3.6);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 16;
    const dShadow = 3.8;
    keyLight.shadow.camera.left = -dShadow;
    keyLight.shadow.camera.right = dShadow;
    keyLight.shadow.camera.top = dShadow;
    keyLight.shadow.camera.bottom = -dShadow;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    // Warm 3000K practical ceiling LED downlights + cool cyan display fridge LED accent
    const ceilingBulb = new THREE.PointLight(
      initialRig.bulbColor,
      initialRig.ceilingBulbIntensity,
      8.5,
      1.45
    );
    ceilingBulb.position.set(0.10, 2.58, 0.72);
    scene.add(ceilingBulb);

    const backBulb = new THREE.PointLight(
      initialRig.bulbColor,
      initialRig.backBulbIntensity,
      7.2,
      1.45
    );
    backBulb.position.set(0.10, 2.56, -0.78);
    scene.add(backBulb);

    const fridgeCyanLight = new THREE.PointLight(0x38bdf8, 1.35, 2.8, 1.8);
    fridgeCyanLight.position.set(-0.45, 1.1, 0.12);
    scene.add(fridgeCyanLight);

    // Procedural Textures
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const textures: TextureBundle = createProceduralTextures(maxAniso);

    // Controls
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = !isSoftwareGl;
    orbit.dampingFactor = 0.08;
    orbit.minDistance = 0.45;
    orbit.maxDistance = 14;
    orbit.maxPolarAngle = Math.PI * 0.49;
    orbit.target.set(
      initialPose.targetCm.x / 100,
      initialPose.targetCm.y / 100,
      initialPose.targetCm.z / 100
    );
    orbit.update();

    const transform = new TransformControls(camera, renderer.domElement);
    transform.setSize(0.75);
    scene.add(transform.getHelper());

    // Selection Outline Helper
    const selBoxHelper = new THREE.BoxHelper(new THREE.Object3D(), 0xf59e0b);
    selBoxHelper.visible = false;
    scene.add(selBoxHelper);

    // Groups
    let roomHandle: RoomShellHandle | null = null;
    const itemsGroup = new THREE.Group();
    itemsGroup.name = 'SceneItemsGroup';
    scene.add(itemsGroup);

    const measureGroup = new THREE.Group();
    measureGroup.name = 'MeasurementsGroup';
    scene.add(measureGroup);

    const dimLabelsGroup = new THREE.Group();
    dimLabelsGroup.name = 'DimLabelsGroup';
    scene.add(dimLabelsGroup);
    let dimLabelDisposables: { dispose: () => void }[] = [];

    const selectedOverlayGroup = new THREE.Group();
    selectedOverlayGroup.name = 'SelectedOverlayGroup';
    scene.add(selectedOverlayGroup);
    let selectedDisposables: { dispose: () => void }[] = [];

    const builtItems = new Map<string, BuiltItemHandle>();

    // Camera transition state
    let transitionTargetPos: THREE.Vector3 | null = null;
    let transitionTargetLook: THREE.Vector3 | null = null;

    // Walk mode state
    let walkYaw = 0;
    let walkPitch = -0.06;
    let isWalkLooking = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    const walkKeys: WalkKeysState = { forward: false, backward: false, left: false, right: false };

    // Pacing & On-Demand Render Loop (Software WebGL safe!)
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;
    let lastTickMs = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function hasActiveWalkInput(): boolean {
      const p = walkPadRef.current;
      return (
        propsRef.current.navMode === 'walk' &&
        (walkKeys.forward ||
          walkKeys.backward ||
          walkKeys.left ||
          walkKeys.right ||
          p.forward ||
          p.backward ||
          p.left ||
          p.right)
      );
    }

    function stepFrame(nowMs: number) {
      const dt = Math.min(0.05, Math.max(0.001, (nowMs - lastTickMs) / 1000));
      lastTickMs = nowMs;

      let needsMoreFrames = false;

      if (propsRef.current.navMode === 'orbit') {
        if (transitionTargetPos && transitionTargetLook) {
          const alpha = 1 - Math.exp(-8 * dt);
          camera.position.lerp(transitionTargetPos, alpha);
          orbit.target.lerp(transitionTargetLook, alpha);
          if (
            camera.position.distanceTo(transitionTargetPos) < 0.015 &&
            orbit.target.distanceTo(transitionTargetLook) < 0.015
          ) {
            camera.position.copy(transitionTargetPos);
            orbit.target.copy(transitionTargetLook);
            transitionTargetPos = null;
            transitionTargetLook = null;
          } else {
            needsMoreFrames = true;
          }
        }
        orbit.update();
      } else {
        // Walk mode movement
        const p = walkPadRef.current;
        const combined: WalkKeysState = {
          forward: walkKeys.forward || p.forward,
          backward: walkKeys.backward || p.backward,
          left: walkKeys.left || p.left,
          right: walkKeys.right || p.right,
        };
        if (combined.forward || combined.backward || combined.left || combined.right) {
          const curCm = {
            x: camera.position.x * 100,
            y: camera.position.y * 100,
            z: camera.position.z * 100,
          };
          const nextCm = computeWalkStep(curCm, walkYaw, combined, dt, propsRef.current.room);
          camera.position.set(nextCm.x / 100, nextCm.y / 100, nextCm.z / 100);
          needsMoreFrames = true;
        }
        const euler = new THREE.Euler(walkPitch, walkYaw, 0, 'YXZ');
        camera.quaternion.setFromEuler(euler);
      }

      if (roomHandle) {
        roomHandle.updateCutaway(camera.position, propsRef.current.navMode, propsRef.current.room);
      }

      // Auto-hide front entrance door when camera orbits outside South wall in cutaway mode so entrance preset isn't blocked
      const entranceDoorItem = propsRef.current.items.find((i) => i.id === 'entrance_door');
      const entranceDoorHandle = builtItems.get('entrance_door');
      if (entranceDoorHandle && entranceDoorItem) {
        const southCut =
          propsRef.current.navMode === 'orbit' &&
          propsRef.current.room.cutawayWalls &&
          camera.position.z > propsRef.current.room.depthCm / 200 + 0.02;
        entranceDoorHandle.group.visible = entranceDoorItem.visible && !southCut;
      }

      if (selBoxHelper.visible) {
        selBoxHelper.update();
      }

      renderer.render(scene, camera);

      if (needsMoreFrames || hasActiveWalkInput()) {
        if (isSoftwareGl) {
          afterDraw(() => {
            if (!disposed) requestRender();
          });
        } else {
          requestRender();
        }
      }
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((nowMs) => {
        if (disposed) return;
        renderDirty = false;
        stepFrame(nowMs);
        const done = () => {
          renderBusy = false;
          if (renderDirty && !disposed) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    // Track orbit & transform states to prevent accidental selection misclicks
    let isOrbiting = false;
    let orbitEndTimer: ReturnType<typeof setTimeout> | null = null;
    let isTransformActive = false;
    let transformEndTimer: ReturnType<typeof setTimeout> | null = null;

    // Cancel camera transitions if user grabs OrbitControls
    orbit.addEventListener('start', () => {
      transitionTargetPos = null;
      transitionTargetLook = null;
      if (orbitEndTimer) clearTimeout(orbitEndTimer);
      isOrbiting = true;
    });
    orbit.addEventListener('end', () => {
      if (orbitEndTimer) clearTimeout(orbitEndTimer);
      orbitEndTimer = setTimeout(() => {
        isOrbiting = false;
      }, 100);
    });
    orbit.addEventListener('change', () => {
      requestRender();
    });

    // TransformControls Events
    transform.addEventListener('dragging-changed', (event) => {
      orbit.enabled = !event.value && propsRef.current.navMode === 'orbit';
      if (event.value) {
        if (transformEndTimer) clearTimeout(transformEndTimer);
        isTransformActive = true;
      } else {
        // Finished drag: commit snapped transform to React state with history
        commitTransformToState(true);
        if (transformEndTimer) clearTimeout(transformEndTimer);
        transformEndTimer = setTimeout(() => {
          isTransformActive = false;
        }, 120);
      }
      requestRender();
    });

    transform.addEventListener('objectChange', () => {
      const obj = transform.object;
      if (!obj) return;
      const snap = propsRef.current.gridSnapCm;
      if (transform.getMode() === 'translate' && snap > 0) {
        obj.position.x = snapValue(obj.position.x * 100, snap) / 100;
        obj.position.z = snapValue(obj.position.z * 100, snap) / 100;
        const item = propsRef.current.items.find((i) => i.id === obj.userData.itemId);
        if (item?.wallMounted) {
          obj.position.y = snapValue(obj.position.y * 100, snap) / 100;
        } else {
          obj.position.y = Math.max(0, snapValue(obj.position.y * 100, snap) / 100);
        }
      }
      if (transform.getMode() === 'rotate') {
        const deg = THREE.MathUtils.radToDeg(obj.rotation.y);
        const snappedDeg = Math.round(deg / 15) * 15;
        obj.rotation.set(0, THREE.MathUtils.degToRad(snappedDeg), 0);
      }
      if (selBoxHelper.visible) selBoxHelper.update();
      requestRender();
    });

    function commitTransformToState(recordHistory: boolean) {
      const obj = transform.object;
      if (!obj) return;
      const itemId = obj.userData.itemId as string | undefined;
      if (!itemId) return;
      const existing = propsRef.current.items.find((i) => i.id === itemId);
      if (!existing) return;

      const updated: SceneItem = clampItemToRoom(
        {
          ...existing,
          xCm: Math.round(obj.position.x * 100),
          yCm: Math.max(0, Math.round(obj.position.y * 100)),
          zCm: Math.round(obj.position.z * 100),
          rotYDeg: Math.round(THREE.MathUtils.radToDeg(obj.rotation.y)),
          widthCm: Math.max(15, Math.round(existing.widthCm * obj.scale.x)),
          heightCm: Math.max(15, Math.round(existing.heightCm * obj.scale.y)),
          depthCm: Math.max(10, Math.round(existing.depthCm * obj.scale.z)),
        },
        propsRef.current.room
      );
      obj.scale.set(1, 1, 1);
      propsRef.current.onUpdateItem(updated, recordHistory);
    }

    // Rebuild functions
    function applyLighting(cfg: RoomConfig) {
      const rig = getLightingRigConfig(cfg.lightingMode ?? 'warm_3000k', Boolean(cfg.cadMode));
      scene.background = new THREE.Color(rig.bgColor);
      scene.fog = new THREE.FogExp2(rig.bgColor, rig.fogDensity);
      scene.environmentIntensity = rig.envIntensity;

      ambientLight.color.setHex(rig.ambientColor);
      ambientLight.intensity = rig.ambientIntensity;

      hemi.color.setHex(rig.hemiSkyColor);
      hemi.groundColor.setHex(rig.hemiGroundColor);
      hemi.intensity = rig.hemiIntensity;

      keyLight.color.setHex(rig.keyColor);
      keyLight.intensity = rig.keyIntensity;

      ceilingBulb.color.setHex(rig.bulbColor);
      ceilingBulb.intensity = rig.ceilingBulbIntensity;
      backBulb.color.setHex(rig.bulbColor);
      backBulb.intensity = rig.backBulbIntensity;
    }

    function rebuildDimLabels() {
      while (dimLabelsGroup.children.length > 0) {
        dimLabelsGroup.remove(dimLabelsGroup.children[0]);
      }
      for (const d of dimLabelDisposables) d.dispose();
      dimLabelDisposables = [];

      const cfg = propsRef.current.room;
      if (!cfg.showDimensions) return;

      const W = cfg.widthCm / 100;
      const D = cfg.depthCm / 100;
      const H = cfg.heightCm / 100;
      const cad = Boolean(cfg.cadMode);

      const addLabel = (text: string, x: number, y: number, z: number, scaleMult = 1) => {
        const sp = createDimensionSprite(text, cad, dimLabelDisposables);
        sp.position.set(x, y, z);
        sp.scale.multiplyScalar(scaleMult);
        dimLabelsGroup.add(sp);
      };

      addLabel(`عرض الغرفة ${cfg.widthCm} سم`, 0, 0.10, D / 2 + 0.34, 0.92);
      addLabel(`طول الغرفة ${cfg.depthCm} سم`, W / 2 + 0.36, 0.10, 0, 0.92);
      addLabel(`ارتفاع ${cfg.heightCm} سم`, W / 2 + 0.16, H - 0.14, -D / 2 - 0.14, 0.88);
      addLabel('البار اليمين 370 × 65 سم', W / 2 - 0.22, 0.98, -0.35, 0.92);
      addLabel('أرفف حرف U (150→220 سم) · خلوص 60', W / 2 - 0.24, 2.34, -0.78, 0.96);
      addLabel('أرفف شمال ممتدة 353 سم (خلوص 5 سم عن البوكس)', -W / 2 + 0.30, 2.62, 0.15, 0.94);
      addLabel('بار شمال 153×58 سم + ثلاجة 60', -W / 2 + 0.22, 0.96, 0.65, 0.86);
      addLabel('حوض 80 × 60 سم', -W / 2 + 0.28, 1.00, -D / 2 + 0.45, 0.86);
    }

    function rebuildRoom() {
      if (roomHandle) {
        scene.remove(roomHandle.group);
        roomHandle.dispose();
      }
      const cfg = propsRef.current.room;
      applyLighting(cfg);
      roomHandle = buildRoomShell(cfg, textures);
      scene.add(roomHandle.group);
      ceilingBulb.position.set(0.10, cfg.heightCm / 100 - 0.22, 0.72);
      backBulb.position.set(0.10, cfg.heightCm / 100 - 0.24, -0.78);
      rebuildDimLabels();
      requestRender();
    }

    function rebuildItems() {
      transform.detach();
      for (const [, handle] of builtItems) {
        itemsGroup.remove(handle.group);
        handle.dispose();
      }
      builtItems.clear();

      const cfg = propsRef.current.room;
      for (const item of propsRef.current.items) {
        const handle = buildSceneItemGroup(
          item,
          textures,
          isSoftwareGl,
          cfg.wallStyle,
          {
            showShelfProps: cfg.showShelfProps,
            cadMode: cfg.cadMode,
            bracketStyle: cfg.bracketStyle,
          }
        );
        builtItems.set(item.id, handle);
        itemsGroup.add(handle.group);
      }

      // Sync fridge accent light with display_fridge position if present
      const fridge = propsRef.current.items.find((i) => i.kind === 'display_fridge');
      if (fridge && fridge.visible) {
        fridgeCyanLight.visible = true;
        fridgeCyanLight.position.set(fridge.xCm / 100 + 0.35, fridge.yCm / 100 + 1.05, fridge.zCm / 100);
      } else {
        fridgeCyanLight.visible = false;
      }

      syncSelection();
      requestRender();
    }

    function syncSelection() {
      while (selectedOverlayGroup.children.length > 0) {
        selectedOverlayGroup.remove(selectedOverlayGroup.children[0]);
      }
      for (const d of selectedDisposables) d.dispose();
      selectedDisposables = [];

      const { selectedId: sid, toolMode: tMode, items: list } = propsRef.current;
      const item = sid ? list.find((i) => i.id === sid) : undefined;
      const handle = sid ? builtItems.get(sid) : undefined;

      if (handle && item && item.visible) {
        selBoxHelper.setFromObject(handle.group);
        selBoxHelper.visible = true;

        // Dynamic 3D Spec Callout Badge directly over the item (above transform controls)
        const badgeY = (item.yCm + item.heightCm) / 100 + 0.32;
        const badge = createItemSpecBadgeSprite(
          item.code,
          item.nameAr,
          item.widthCm,
          item.depthCm,
          item.heightCm,
          item.yCm,
          selectedDisposables
        );
        badge.position.set(item.xCm / 100, badgeY, item.zCm / 100);
        selectedOverlayGroup.add(badge);

        // Vertical Elevation dashed drop line to floor if elevated
        if (item.yCm > 5) {
          const lineMat = new THREE.LineDashedMaterial({
            color: 0xf59e0b,
            dashSize: 0.05,
            gapSize: 0.03,
          });
          const geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(item.xCm / 100, item.yCm / 100, item.zCm / 100),
            new THREE.Vector3(item.xCm / 100, 0.005, item.zCm / 100),
          ]);
          const line = new THREE.Line(geo, lineMat);
          line.computeLineDistances();
          selectedOverlayGroup.add(line);
          selectedDisposables.push(lineMat, geo);

          // Floor target disc marker
          const discGeo = new THREE.RingGeometry(0.04, 0.08, 20);
          const discMat = new THREE.MeshBasicMaterial({
            color: 0xf59e0b,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
          });
          const disc = new THREE.Mesh(discGeo, discMat);
          disc.rotation.x = -Math.PI / 2;
          disc.position.set(item.xCm / 100, 0.006, item.zCm / 100);
          selectedOverlayGroup.add(disc);
          selectedDisposables.push(discGeo, discMat);
        }

        // Visual 5cm clearance indicator when Left Shelf is selected
        if (item.id === 'shelf_left_u' || item.id === 'shelf_left_upper') {
          const shelfZEnd = item.zCm / 100 + item.widthCm / 200; // +1.525 to +1.53m
          const boxZStart = 1.58; // black box front face
          const gapMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
          const gapGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(item.xCm / 100 + 0.12, item.yCm / 100 + 0.05, shelfZEnd),
            new THREE.Vector3(item.xCm / 100 + 0.12, item.yCm / 100 + 0.05, boxZStart),
          ]);
          const gapLine = new THREE.Line(gapGeo, gapMat);
          selectedOverlayGroup.add(gapLine);
          selectedDisposables.push(gapMat, gapGeo);

          const gapBadge = createDimensionSprite('خلوص 5 سم عن البوكس', false, selectedDisposables);
          gapBadge.position.set(item.xCm / 100 + 0.18, item.yCm / 100 + 0.14, (shelfZEnd + boxZStart) / 2);
          gapBadge.scale.set(0.68, 0.11, 1);
          selectedOverlayGroup.add(gapBadge);
        }

        if (!item.locked && (tMode === 'translate' || tMode === 'rotate' || tMode === 'scale')) {
          transform.attach(handle.group);
          transform.setMode(tMode);
          transform.showY = tMode === 'translate' ? Boolean(item.wallMounted) || item.yCm > 0 : tMode !== 'rotate';
          transform.showX = tMode !== 'rotate';
          transform.showZ = tMode !== 'rotate';
        } else {
          transform.detach();
        }
      } else {
        selBoxHelper.visible = false;
        transform.detach();
      }
      requestRender();
    }

    function rebuildMeasurements() {
      while (measureGroup.children.length > 0) {
        const child = measureGroup.children[0] as THREE.Mesh | THREE.Line;
        measureGroup.remove(child);
        if (child.geometry) child.geometry.dispose();
        if (child.material && !Array.isArray(child.material)) child.material.dispose();
      }

      const lineMat = new THREE.LineBasicMaterial({ color: 0xf59e0b });
      const dotGeo = new THREE.SphereGeometry(0.025, 10, 10);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

      const addPt = (pt: Point3D) => {
        const m = new THREE.Mesh(dotGeo.clone(), dotMat.clone());
        m.position.set(pt.x / 100, pt.y / 100 + 0.01, pt.z / 100);
        measureGroup.add(m);
      };

      for (const m of propsRef.current.measurements) {
        addPt(m.startCm);
        addPt(m.endCm);
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(m.startCm.x / 100, m.startCm.y / 100 + 0.01, m.startCm.z / 100),
          new THREE.Vector3(m.endCm.x / 100, m.endCm.y / 100 + 0.01, m.endCm.z / 100),
        ]);
        measureGroup.add(new THREE.Line(geo, lineMat.clone()));
      }

      if (propsRef.current.pendingMeasureStart) {
        addPt(propsRef.current.pendingMeasureStart);
      }

      dotGeo.dispose();
      dotMat.dispose();
      lineMat.dispose();
      requestRender();
    }

    syncRoomRef.current = rebuildRoom;
    syncItemsRef.current = rebuildItems;
    syncSelectionRef.current = syncSelection;
    syncMeasuresRef.current = rebuildMeasurements;

    applyPresetRef.current = (preset: CameraPresetId) => {
      const pose = getCameraPresetPose(preset, propsRef.current.room);
      transitionTargetPos = new THREE.Vector3(
        pose.positionCm.x / 100,
        pose.positionCm.y / 100,
        pose.positionCm.z / 100
      );
      transitionTargetLook = new THREE.Vector3(
        pose.targetCm.x / 100,
        pose.targetCm.y / 100,
        pose.targetCm.z / 100
      );
      if (isSoftwareGl) {
        camera.position.copy(transitionTargetPos);
        orbit.target.copy(transitionTargetLook);
        transitionTargetPos = null;
        transitionTargetLook = null;
        orbit.update();
      }
      requestRender();
    };

    syncNavModeRef.current = (mode: NavMode) => {
      if (mode === 'walk') {
        orbit.enabled = false;
        transitionTargetPos = null;
        transitionTargetLook = null;
        const halfD = propsRef.current.room.depthCm / 200;
        // Spawn inside open corridor facing the back door
        camera.position.set(0, 1.62, Math.max(0.6, halfD - 0.55));
        walkYaw = 0;
        walkPitch = -0.05;
        camera.quaternion.setFromEuler(new THREE.Euler(walkPitch, walkYaw, 0, 'YXZ'));
      } else {
        orbit.enabled = true;
        // Place orbit target ahead of camera
        _vec3.set(0, 0, -1.6).applyQuaternion(camera.quaternion);
        _targetVec.copy(camera.position).add(_vec3);
        orbit.target.copy(_targetVec);
        orbit.update();
      }
      requestRender();
    };

    // Initial Scene Build
    rebuildRoom();
    rebuildItems();
    rebuildMeasurements();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting with strict mesh filtering & room occlusion testing
    const raycaster = new THREE.Raycaster();
    raycaster.params.Line = { threshold: 0.01 };
    raycaster.params.Points = { threshold: 0.01 };
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    let downTime = 0;
    let downButton = 0;

    // Helper to gather only solid visible meshes (ignoring 2D line helpers & hidden occluders)
    const getSelectableTargets = () => {
      const itemMeshes: THREE.Mesh[] = [];
      const roomMeshes: THREE.Mesh[] = [];

      itemsGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh && obj.visible) {
          let p: THREE.Object3D | null = obj.parent;
          let visible = true;
          while (p && p !== itemsGroup) {
            if (!p.visible) {
              visible = false;
              break;
            }
            p = p.parent;
          }
          if (visible) {
            itemMeshes.push(obj as THREE.Mesh);
          }
        }
      });

      if (roomHandle) {
        roomHandle.group.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh && obj.visible) {
            let p: THREE.Object3D | null = obj.parent;
            let visible = true;
            while (p && p !== roomHandle.group) {
              if (!p.visible) {
                visible = false;
                break;
              }
              p = p.parent;
            }
            if (visible) {
              roomMeshes.push(obj as THREE.Mesh);
            }
          }
        });
      }

      return { itemMeshes, roomMeshes };
    };

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
      downTime = performance.now();
      downButton = e.button;
      if (propsRef.current.navMode === 'walk' && e.button === 0) {
        isWalkLooking = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isWalkLooking && propsRef.current.navMode === 'walk') {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        walkYaw -= dx * 0.0045;
        walkPitch = THREE.MathUtils.clamp(walkPitch - dy * 0.0035, -1.1, 1.1);
        requestRender();
        return;
      }

      // Hover pointer feedback when orbiting: only indicate selectable 3D items directly in view
      if (propsRef.current.navMode === 'orbit' && !transform.dragging && !isTransformActive) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);

        const { itemMeshes, roomMeshes } = getSelectableTargets();
        const hits = raycaster.intersectObjects([...itemMeshes, ...roomMeshes], false);
        if (hits.length > 0 && hits[0].object.userData.itemId) {
          renderer.domElement.style.cursor = 'pointer';
        } else {
          renderer.domElement.style.cursor = 'default';
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      isWalkLooking = false;
      // Strict guard: only primary click/tap (not right-click pan/middle zoom)
      if (downButton !== 0 || e.button !== 0) return;
      // Do not change selection if user was orbiting or manipulating transform gizmo
      if (isOrbiting || isTransformActive || transform.dragging || Boolean(transform.axis)) return;

      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      const elapsed = performance.now() - downTime;
      // Movement threshold: ignore drags longer than 8px or lasting over 800ms
      if (dist > 8 || elapsed > 800) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      if (propsRef.current.toolMode === 'place') {
        const hit = raycaster.ray.intersectPlane(_floorPlane, _planeHit);
        if (hit) {
          const snap = propsRef.current.gridSnapCm || 5;
          propsRef.current.onPlaceAtPoint({
            x: snapValue(hit.x * 100, snap),
            y: 0,
            z: snapValue(hit.z * 100, snap),
          });
        }
        return;
      }

      if (propsRef.current.toolMode === 'measure') {
        const targets: THREE.Object3D[] = [itemsGroup];
        if (roomHandle) targets.push(roomHandle.group);
        const hits = raycaster.intersectObjects(targets, true);
        if (hits.length > 0) {
          const pt = hits[0].point;
          propsRef.current.onMeasureClick({
            x: Math.round(pt.x * 100),
            y: Math.max(0, Math.round(pt.y * 100)),
            z: Math.round(pt.z * 100),
          });
        }
        return;
      }

      // Precise item raycasting with room surface occlusion
      const { itemMeshes, roomMeshes } = getSelectableTargets();
      const hits = raycaster.intersectObjects([...itemMeshes, ...roomMeshes], false);
      if (hits.length > 0) {
        const topHit = hits[0].object;
        let cur: THREE.Object3D | null = topHit;
        while (cur && !cur.userData.itemId && cur !== itemsGroup) {
          cur = cur.parent;
        }
        const hitId = cur?.userData.itemId as string | undefined;
        // If the closest hit has an itemId, select it; if it was a wall or floor, cleanly deselect
        propsRef.current.onSelectItem(hitId ?? null);
      } else {
        propsRef.current.onSelectItem(null);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // Keyboard controls for Walk Mode (WASD/Arrows)
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (propsRef.current.navMode !== 'walk') return;

      let changed = false;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        walkKeys.forward = true;
        changed = true;
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        walkKeys.backward = true;
        changed = true;
      }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        walkKeys.left = true;
        changed = true;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        walkKeys.right = true;
        changed = true;
      }
      if (changed) requestRender();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') walkKeys.forward = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') walkKeys.backward = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') walkKeys.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') walkKeys.right = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const renderSyncNow = () => {
      const rh = roomHandle as RoomShellHandle | null;
      if (rh) {
        rh.updateCutaway(camera.position, propsRef.current.navMode, propsRef.current.room);
      }
      const entranceDoorItem = propsRef.current.items.find((i) => i.id === 'entrance_door');
      const entranceDoorHandle = builtItems.get('entrance_door');
      if (entranceDoorHandle && entranceDoorItem) {
        const southCut =
          propsRef.current.navMode === 'orbit' &&
          propsRef.current.room.cutawayWalls &&
          camera.position.z > propsRef.current.room.depthCm / 200 + 0.02;
        entranceDoorHandle.group.visible = entranceDoorItem.visible && !southCut;
      }
      renderer.render(scene, camera);
    };

    // Resize Observer + Window Resize
    let lastW = width;
    let lastH = height;
    const onResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (w <= 0 || h <= 0 || (w === lastW && h === lastH)) return;
      lastW = w;
      lastH = h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderSyncNow();
      requestRender();
    };
    window.addEventListener('resize', onResize);
    const resizeObs = new ResizeObserver(() => onResize());
    resizeObs.observe(container);

    // Poll walk D-pad ref gently when in walk mode
    const padInterval = window.setInterval(() => {
      if (hasActiveWalkInput()) {
        requestRender();
      }
    }, 60);

    renderSyncNow();
    requestRender();

    propsRef.current.onRegisterCapture?.(() => {
      if (disposed) return null;
      renderSyncNow();
      return renderer.domElement.toDataURL('image/png');
    });

    return () => {
      disposed = true;
      propsRef.current.onRegisterCapture?.(null);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      clearInterval(padInterval);
      if (orbitEndTimer) clearTimeout(orbitEndTimer);
      if (transformEndTimer) clearTimeout(transformEndTimer);

      resizeObs.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      orbit.dispose();
      transform.dispose();
      if (roomHandle) roomHandle.dispose();
      for (const [, h] of builtItems) h.dispose();
      for (const d of dimLabelDisposables) d.dispose();
      textures.dispose();
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [walkPadRef]);

  // Synchronize React prop changes imperatively without re-mounting WebGL
  const prevRoomRef = useRef(room);
  useEffect(() => {
    if (prevRoomRef.current === room) return;
    prevRoomRef.current = room;
    syncRoomRef.current?.();
  }, [room]);

  const prevItemsRef = useRef(items);
  const prevItemFlagsRef = useRef({
    wallStyle: room.wallStyle,
    showShelfProps: room.showShelfProps,
    cadMode: room.cadMode,
    bracketStyle: room.bracketStyle,
  });
  useEffect(() => {
    const f = prevItemFlagsRef.current;
    if (
      prevItemsRef.current === items &&
      f.wallStyle === room.wallStyle &&
      f.showShelfProps === room.showShelfProps &&
      f.cadMode === room.cadMode &&
      f.bracketStyle === room.bracketStyle
    ) {
      return;
    }
    prevItemsRef.current = items;
    prevItemFlagsRef.current = {
      wallStyle: room.wallStyle,
      showShelfProps: room.showShelfProps,
      cadMode: room.cadMode,
      bracketStyle: room.bracketStyle,
    };
    syncItemsRef.current?.();
  }, [items, room.wallStyle, room.showShelfProps, room.cadMode, room.bracketStyle]);

  const prevSelRef = useRef({ selectedId, toolMode, items });
  useEffect(() => {
    const p = prevSelRef.current;
    if (p.selectedId === selectedId && p.toolMode === toolMode && p.items === items) return;
    prevSelRef.current = { selectedId, toolMode, items };
    syncSelectionRef.current?.();
  }, [selectedId, toolMode, items]);

  const prevMeasRef = useRef({ measurements, pendingMeasureStart });
  useEffect(() => {
    const p = prevMeasRef.current;
    if (p.measurements === measurements && p.pendingMeasureStart === pendingMeasureStart) return;
    prevMeasRef.current = { measurements, pendingMeasureStart };
    syncMeasuresRef.current?.();
  }, [measurements, pendingMeasureStart]);

  useEffect(() => {
    if (cameraPresetTrigger) {
      applyPresetRef.current?.(cameraPresetTrigger.id);
    }
  }, [cameraPresetTrigger]);

  const prevNavRef = useRef(navMode);
  useEffect(() => {
    if (prevNavRef.current === navMode) return;
    prevNavRef.current = navMode;
    syncNavModeRef.current?.(navMode);
  }, [navMode]);

  // Compute live helper info for measurement badge if needed
  const latestMeasure = measurements[measurements.length - 1];
  const latestDist = latestMeasure
    ? computeDistanceCm(latestMeasure.startCm, latestMeasure.endCm).totalCm
    : null;

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#11151d]"
      data-testid="scene-viewport"
      data-nav-mode={navMode}
      data-tool-mode={toolMode}
      data-selected-id={selectedId ?? ''}
      data-last-measure={latestDist ?? ''}
    >
      <div ref={mountRef} className="w-full h-full" />
      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0e1116]/95 text-stone-200 p-6 text-center z-50">
          <div className="max-w-sm border border-white/10 rounded-xl p-6 bg-[#171b24]">
            <p className="text-base font-semibold mb-2">WebGL Context Paused</p>
            <p className="text-xs text-stone-400">
              Hardware graphics context was interrupted. Reload the page to resume the 3D scene.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
