import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampItemToRoom,
  computeDistanceCm,
  computeRoomStats,
  computeWalkStep,
  getCameraPresetPose,
  parseLayoutJson,
  pushHistory,
  redoHistory,
  serializeLayout,
  snapValue,
  undoHistory,
} from './layoutMath';
import { getLightingRigConfig } from './lighting';
import { INITIAL_ROOM_CONFIG, INITIAL_SCENE_ITEMS } from './presets';

test('snapValue aligns coordinates cleanly to cm grid', () => {
  assert.equal(snapValue(43, 5), 45);
  assert.equal(snapValue(42, 5), 40);
  assert.equal(snapValue(-17, 10), -20);
  assert.equal(snapValue(18.4, 0), 18);
});

test('clampItemToRoom keeps items inside room boundaries and preserves 370cm rotated bar', () => {
  const sample = {
    ...INITIAL_SCENE_ITEMS[3],
    xCm: 999,
    yCm: -50,
    zCm: -999,
  };
  const clamped = clampItemToRoom(sample, INITIAL_ROOM_CONFIG);
  assert.ok(clamped.xCm <= INITIAL_ROOM_CONFIG.widthCm / 2 + 10);
  assert.equal(clamped.yCm, 0);
  assert.ok(clamped.zCm >= -INITIAL_ROOM_CONFIG.depthCm / 2 - 10);

  const rightBar = INITIAL_SCENE_ITEMS.find((i) => i.id === 'stainless_bar_right')!;
  const clampedBar = clampItemToRoom(rightBar, INITIAL_ROOM_CONFIG);
  assert.equal(clampedBar.widthCm, 370);
  assert.equal(clampedBar.depthCm, 65);

  const backShelf = INITIAL_SCENE_ITEMS.find((i) => i.id === 'shelf_back_u')!;
  const clampedShelf = clampItemToRoom(backShelf, INITIAL_ROOM_CONFIG);
  assert.equal(clampedShelf.heightCm, 3);
});

test('computeDistanceCm returns accurate 3D and axis distances', () => {
  const res = computeDistanceCm({ x: 0, y: 0, z: 0 }, { x: 30, y: 0, z: 40 });
  assert.equal(res.totalCm, 50);
  assert.equal(res.dxCm, 30);
  assert.equal(res.dzCm, 40);
});

test('computeRoomStats calculates realistic floor area and aisle clearance', () => {
  const stats = computeRoomStats(INITIAL_SCENE_ITEMS, INITIAL_ROOM_CONFIG);
  assert.equal(stats.areaSqM, 8.8); // 2.20m * 4.00m = 8.80 m^2
  assert.ok(stats.clearAisleCm >= 85 && stats.clearAisleCm <= 105);
  assert.equal(stats.visibleItemsCount, INITIAL_SCENE_ITEMS.length);
});

test('computeWalkStep moves camera forward and clamps to room walls', () => {
  const start = { x: 0, y: 162, z: 100 };
  const moved = computeWalkStep(start, 0, { forward: true, backward: false, left: false, right: false }, 0.1, INITIAL_ROOM_CONFIG);
  assert.ok(moved.z < start.z);

  const againstWall = computeWalkStep({ x: -115, y: 162, z: 0 }, 0, { forward: false, backward: false, left: true, right: false }, 0.1, INITIAL_ROOM_CONFIG);
  assert.ok(againstWall.x >= -(INITIAL_ROOM_CONFIG.widthCm / 2 - 24));
});

test('undoHistory and redoHistory preserve layout snapshots', () => {
  const initSnap = { room: INITIAL_ROOM_CONFIG, items: INITIAL_SCENE_ITEMS };
  const nextRoom = { ...INITIAL_ROOM_CONFIG, widthCm: 300 };
  const h1 = pushHistory({ past: [], present: initSnap, future: [] }, { room: nextRoom, items: INITIAL_SCENE_ITEMS });
  assert.equal(h1.present.room.widthCm, 300);

  const undone = undoHistory(h1);
  assert.equal(undone.present.room.widthCm, 220);

  const redone = redoHistory(undone);
  assert.equal(redone.present.room.widthCm, 300);
});

test('getCameraPresetPose adapts to modified room dimensions and includes front_wall', () => {
  const wideRoom = { ...INITIAL_ROOM_CONFIG, widthCm: 400, depthCm: 600 };
  const pose = getCameraPresetPose('entrance', wideRoom);
  assert.equal(pose.positionCm.z, 330);

  const frontPose = getCameraPresetPose('front_wall', INITIAL_ROOM_CONFIG);
  assert.equal(frontPose.targetCm.z, 200);

  const sauce1 = INITIAL_SCENE_ITEMS.find((i) => i.id === 'shelf_right_sauce_1')!;
  const topRight = INITIAL_SCENE_ITEMS.find((i) => i.id === 'shelf_right_large_2')!;
  const backU1 = INITIAL_SCENE_ITEMS.find((i) => i.id === 'shelf_back_u')!;
  const backU2 = INITIAL_SCENE_ITEMS.find((i) => i.id === 'shelf_back_u_2')!;
  const leftU = INITIAL_SCENE_ITEMS.find((i) => i.id === 'shelf_left_u')!;
  const leftUpper = INITIAL_SCENE_ITEMS.find((i) => i.id === 'shelf_left_upper')!;
  const ac = INITIAL_SCENE_ITEMS.find((i) => i.id === 'split_ac')!;
  const backShelves = INITIAL_SCENE_ITEMS.filter((i) => i.id.startsWith('shelf_back_u'));

  assert.equal(backShelves.length, 2); // Exactly 2 back U shelves (رفين), never 4
  assert.equal(sauce1.yCm, 150);
  assert.equal(topRight.yCm + topRight.heightCm, 220);
  assert.equal(backU1.yCm + backU1.heightCm, 220);
  assert.equal(leftU.yCm + leftU.heightCm, 220);
  assert.equal(backU2.yCm + backU2.heightCm, 250);
  assert.equal(leftUpper.yCm + leftUpper.heightCm, 250);
  // Flush corner contacts (Left edge x=-74, Right edge x=+60 / +110)
  assert.equal(backU1.xCm - backU1.widthCm / 2, -74);
  assert.equal(backU1.xCm + backU1.widthCm / 2, 60);
  assert.equal(backU2.xCm - backU2.widthCm / 2, -74);
  assert.equal(backU2.xCm + backU2.widthCm / 2, 110);
  // AC fits cleanly between 220cm (backU1 top) and 247cm (backU2 bottom)
  assert.ok(ac.yCm > backU1.yCm + backU1.heightCm);
  assert.ok(ac.yCm + ac.heightCm <= backU2.yCm);
  assert.equal(INITIAL_ROOM_CONFIG.heightCm - (topRight.yCm + topRight.heightCm), 60);
});

test('serializeLayout and parseLayoutJson roundtrip cleanly', () => {
  const json = serializeLayout({
    room: { ...INITIAL_ROOM_CONFIG, hideAllWalls: true, showShelfProps: false, cadMode: true },
    items: INITIAL_SCENE_ITEMS,
  });
  const parsed = parseLayoutJson(json);
  assert.ok(parsed);
  assert.equal(parsed.room.widthCm, INITIAL_ROOM_CONFIG.widthCm);
  assert.equal(parsed.room.walls.north, true);
  assert.equal(parsed.room.hideAllWalls, true);
  assert.equal(parsed.room.showShelfProps, false);
  assert.equal(parsed.room.cadMode, true);
  assert.equal(parsed.items.length, INITIAL_SCENE_ITEMS.length);
  assert.equal(parseLayoutJson('invalid json'), null);

  // Legacy JSON without walls/cad/prop toggles backfills defaults
  const legacy = JSON.parse(json);
  delete legacy.room.walls;
  delete legacy.room.hideAllWalls;
  delete legacy.room.showShelfProps;
  delete legacy.room.cadMode;
  const legacyParsed = parseLayoutJson(JSON.stringify(legacy));
  assert.ok(legacyParsed);
  assert.equal(legacyParsed.room.walls.south, true);
  assert.equal(legacyParsed.room.hideAllWalls, false);
  assert.equal(legacyParsed.room.showShelfProps, true);
  assert.equal(legacyParsed.room.cadMode, false);
});

test('getLightingRigConfig provides warm 3000K cafe ambient lighting by default', () => {
  const warm = getLightingRigConfig('warm_3000k', false);
  assert.equal(warm.kelvin, 3000);
  assert.ok(warm.ambientIntensity >= 0.5);
  // Warm 3000K RGB has stronger red channel than blue
  const r = (warm.ambientColor >> 16) & 0xff;
  const b = warm.ambientColor & 0xff;
  assert.ok(r > b);

  const neutral = getLightingRigConfig('neutral_5000k', false);
  assert.equal(neutral.kelvin, 5000);

  const cad = getLightingRigConfig('warm_3000k', true);
  assert.equal(cad.ambientColor, 0xffffff);
  assert.equal(cad.bgColor, 0xeef2f7);
});
