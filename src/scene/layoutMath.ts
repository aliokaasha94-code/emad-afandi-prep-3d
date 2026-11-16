import type {
  CameraPresetId,
  LayoutSnapshot,
  Point3D,
  RoomConfig,
  SceneItem,
} from './types';

export function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function snapValue(value: number, gridStepCm: number): number {
  if (gridStepCm <= 0) return Math.round(value);
  return Math.round(value / gridStepCm) * gridStepCm;
}

export function clampItemToRoom(item: SceneItem, room: RoomConfig): SceneItem {
  const halfW = room.widthCm / 2;
  const halfD = room.depthCm / 2;
  const maxY = Math.max(0, room.heightCm - 10);

  const maxHoriz = Math.max(12, Math.max(room.widthCm, room.depthCm) + 40);
  const widthCm = clampNumber(item.widthCm, 12, maxHoriz);
  const depthCm = clampNumber(item.depthCm, 8, maxHoriz);
  const heightCm = clampNumber(item.heightCm, 2, Math.max(10, room.heightCm + 20));

  const xCm = clampNumber(item.xCm, -halfW - 10, halfW + 10);
  const zCm = clampNumber(item.zCm, -halfD - 10, halfD + 10);
  const yCm = clampNumber(item.yCm, 0, maxY);

  return {
    ...item,
    xCm,
    yCm,
    zCm,
    widthCm,
    depthCm,
    heightCm,
  };
}

export function computeDistanceCm(a: Point3D, b: Point3D): {
  totalCm: number;
  dxCm: number;
  dyCm: number;
  dzCm: number;
} {
  const dxCm = Math.abs(b.x - a.x);
  const dyCm = Math.abs(b.y - a.y);
  const dzCm = Math.abs(b.z - a.z);
  const totalCm = Math.sqrt(dxCm * dxCm + dyCm * dyCm + dzCm * dzCm);
  return {
    totalCm: Math.round(totalCm * 10) / 10,
    dxCm: Math.round(dxCm * 10) / 10,
    dyCm: Math.round(dyCm * 10) / 10,
    dzCm: Math.round(dzCm * 10) / 10,
  };
}

export interface RoomStats {
  areaSqM: number;
  clearAisleCm: number;
  visibleItemsCount: number;
}

/** Computes approximate clear aisle width between left-side and right-side floor fixtures */
export function computeRoomStats(items: SceneItem[], room: RoomConfig): RoomStats {
  const areaSqM = Math.round(((room.widthCm / 100) * (room.depthCm / 100)) * 100) / 100;
  let leftEdge = -room.widthCm / 2;
  let rightEdge = room.widthCm / 2;

  for (const item of items) {
    if (!item.visible || item.wallMounted || item.yCm > 110) continue;
    // Skip back/front door pieces centered in the middle
    if (item.kind === 'back_door' || item.kind === 'entrance_door') continue;
    // Compute effective X footprint considering rotation (~0 or +-90)
    const rad = (item.rotYDeg * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const halfSpanX = (item.widthCm * cos + item.depthCm * sin) / 2;

    if (item.xCm < -15) {
      leftEdge = Math.max(leftEdge, item.xCm + halfSpanX);
    } else if (item.xCm > 15) {
      rightEdge = Math.min(rightEdge, item.xCm - halfSpanX);
    }
  }

  const clearAisleCm = Math.max(0, Math.round(rightEdge - leftEdge));
  const visibleItemsCount = items.filter((i) => i.visible).length;

  return {
    areaSqM,
    clearAisleCm,
    visibleItemsCount,
  };
}

export interface WalkKeysState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  up?: boolean;
  down?: boolean;
}

export function computeWalkStep(
  posCm: Point3D,
  yawRad: number,
  keys: WalkKeysState,
  dtSec: number,
  room: RoomConfig,
  speedCmPerSec = 175
): Point3D {
  const dt = clampNumber(dtSec, 0, 0.1);
  let moveForward = (keys.forward ? 1 : 0) - (keys.backward ? 1 : 0);
  let moveRight = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);

  if (moveForward === 0 && moveRight === 0) {
    return posCm;
  }

  const len = Math.hypot(moveForward, moveRight);
  moveForward /= len;
  moveRight /= len;

  // Camera looks along (-sin(yaw), 0, -cos(yaw))
  const fwdX = -Math.sin(yawRad);
  const fwdZ = -Math.cos(yawRad);
  const rightX = Math.cos(yawRad);
  const rightZ = -Math.sin(yawRad);

  const step = speedCmPerSec * dt;
  const nextX = posCm.x + (fwdX * moveForward + rightX * moveRight) * step;
  const nextZ = posCm.z + (fwdZ * moveForward + rightZ * moveRight) * step;

  const margin = 24;
  const maxX = Math.max(20, room.widthCm / 2 - margin);
  const maxZ = Math.max(20, room.depthCm / 2 - margin);

  return {
    x: clampNumber(nextX, -maxX, maxX),
    y: clampNumber(posCm.y, 80, Math.max(120, room.heightCm - 25)),
    z: clampNumber(nextZ, -maxZ, maxZ + 80),
  };
}

export interface CameraPose {
  positionCm: Point3D;
  targetCm: Point3D;
}

export function getCameraPresetPose(preset: CameraPresetId, room: RoomConfig): CameraPose {
  const halfW = room.widthCm / 2;
  const halfD = room.depthCm / 2;

  switch (preset) {
    case 'entrance':
      return {
        positionCm: { x: 14, y: 156, z: halfD + 30 },
        targetCm: { x: -6, y: 124, z: -halfD * 0.45 },
      };
    case 'topdown':
      return {
        positionCm: { x: 0, y: Math.max(room.widthCm, room.depthCm) * 1.42, z: 12 },
        targetCm: { x: 0, y: 20, z: 0 },
      };
    case 'left_wall':
      return {
        positionCm: { x: Math.min(48, halfW * 0.48), y: 158, z: halfD + 18 },
        targetCm: { x: -halfW * 0.65, y: 118, z: -25 },
      };
    case 'right_wall':
      return {
        positionCm: { x: -Math.min(48, halfW * 0.48), y: 158, z: halfD + 18 },
        targetCm: { x: halfW * 0.65, y: 132, z: -20 },
      };
    case 'back_wall':
      return {
        positionCm: { x: -4, y: 156, z: halfD * 0.42 },
        targetCm: { x: 0, y: 146, z: -halfD },
      };
    case 'front_wall':
      return {
        positionCm: { x: 12, y: 152, z: -halfD * 0.45 },
        targetCm: { x: -24, y: 134, z: halfD },
      };
    case 'corner_iso':
      return {
        positionCm: { x: -halfW - 165, y: room.heightCm + 125, z: halfD + 165 },
        targetCm: { x: 0, y: 95, z: -10 },
      };
  }
}

export interface HistoryState {
  past: LayoutSnapshot[];
  present: LayoutSnapshot;
  future: LayoutSnapshot[];
}

export function cloneSnapshot(snap: LayoutSnapshot): LayoutSnapshot {
  return {
    room: { ...snap.room },
    items: snap.items.map((item) => ({ ...item })),
  };
}

export function pushHistory(state: HistoryState, next: LayoutSnapshot, maxSteps = 30): HistoryState {
  const past = [...state.past, cloneSnapshot(state.present)].slice(-maxSteps);
  return {
    past,
    present: cloneSnapshot(next),
    future: [],
  };
}

export function undoHistory(state: HistoryState): HistoryState {
  if (state.past.length === 0) return state;
  const previous = state.past[state.past.length - 1];
  return {
    past: state.past.slice(0, -1),
    present: cloneSnapshot(previous),
    future: [cloneSnapshot(state.present), ...state.future],
  };
}

export function redoHistory(state: HistoryState): HistoryState {
  if (state.future.length === 0) return state;
  const next = state.future[0];
  return {
    past: [...state.past, cloneSnapshot(state.present)],
    present: cloneSnapshot(next),
    future: state.future.slice(1),
  };
}

export function serializeLayout(snapshot: LayoutSnapshot): string {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      room: snapshot.room,
      items: snapshot.items,
    },
    null,
    2
  );
}

export function parseLayoutJson(raw: string): LayoutSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as Partial<LayoutSnapshot>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !parsed.room ||
      !Array.isArray(parsed.items)
    ) {
      return null;
    }
    if (
      typeof parsed.room.widthCm !== 'number' ||
      typeof parsed.room.depthCm !== 'number' ||
      typeof parsed.room.heightCm !== 'number'
    ) {
      return null;
    }
    const normalizedRoom: RoomConfig = {
      ...parsed.room,
      hideAllWalls: parsed.room.hideAllWalls ?? false,
      showShelfProps: parsed.room.showShelfProps ?? true,
      cadMode: parsed.room.cadMode ?? false,
      walls: parsed.room.walls ?? {
        north: true,
        south: true,
        west: true,
        east: true,
        pillar: true,
      },
    };
    return {
      room: normalizedRoom,
      items: parsed.items.map((item) => clampItemToRoom(item, normalizedRoom)),
    };
  } catch {
    return null;
  }
}
