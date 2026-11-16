export type WallStyle =
  | 'subway_white'
  | 'matte_cream'
  | 'warm_concrete'
  | 'dark_slate'
  | 'terracotta_brick';

export type FloorStyle =
  | 'cream_ceramic'
  | 'light_porcelain'
  | 'oak_plank'
  | 'terrazzo'
  | 'charcoal_tile';

export type BracketStyle = 'gusset_plate' | 'curved_arch' | 'diagonal_tube' | 'hidden_rod';
export type LightingMode = 'warm_3000k' | 'neutral_5000k';

export interface PerimeterWallsState {
  north: boolean;
  south: boolean;
  west: boolean;
  east: boolean;
  pillar: boolean;
}

export interface RoomConfig {
  widthCm: number;
  depthCm: number;
  heightCm: number;
  wallStyle: WallStyle;
  floorStyle: FloorStyle;
  bracketStyle?: BracketStyle;
  lightingMode?: LightingMode;
  showCeiling: boolean;
  cutawayWalls: boolean;
  hideAllWalls?: boolean;
  showShelfProps?: boolean;
  cadMode?: boolean;
  showGrid: boolean;
  showDimensions: boolean;
  walls: PerimeterWallsState;
}

export type ItemKind =
  | 'back_door'
  | 'entrance_door'
  | 'side_door'
  | 'split_ac'
  | 'sink_cabinet'
  | 'display_fridge'
  | 'microwave_station'
  | 'prep_counter_white'
  | 'prep_counter_wood'
  | 'stainless_bar'
  | 'stainless_shelves'
  | 'stainless_single_shelf'
  | 'electrical_rack'
  | 'wall_shelf_right'
  | 'wall_shelf_left'
  | 'exhaust_duct'
  | 'step_ladder'
  | 'custom_wall'
  | 'custom_wall_door'
  | 'custom_partition'
  | 'custom_counter'
  | 'custom_table'
  | 'custom_stool'
  | 'custom_fridge'
  | 'custom_shelf'
  | 'custom_espresso'
  | 'custom_sink';

export type FinishPreset =
  | 'original'
  | 'matte_black'
  | 'warm_oak'
  | 'stainless'
  | 'white_marble'
  | 'charcoal';

export type ItemCategory = 'structure' | 'appliance' | 'counter' | 'storage' | 'custom';

export interface SceneItem {
  id: string;
  kind: ItemKind;
  nameAr: string;
  nameEn: string;
  category: ItemCategory;
  /** Center X in cm relative to room center */
  xCm: number;
  /** Bottom Y in cm from floor */
  yCm: number;
  /** Center Z in cm relative to room center (-Z is back wall, +Z is entrance) */
  zCm: number;
  /** Y-axis rotation in degrees */
  rotYDeg: number;
  /** Current width in cm (local X) */
  widthCm: number;
  /** Current depth in cm (local Z) */
  depthCm: number;
  /** Current height in cm (local Y) */
  heightCm: number;
  /** Nominal base geometry width/depth/height for clean scaling */
  baseW: number;
  baseD: number;
  baseH: number;
  finish: FinishPreset;
  locked: boolean;
  visible: boolean;
  wallMounted?: boolean;
  /** Fabrication unique tracking code (e.g. SH-R1, BAR-MAIN) */
  code?: string;
  /** Fabrication technical notes in Arabic for the fabricator/workshop */
  fabricationNotesAr?: string;
  /** Fabrication technical notes in English */
  fabricationNotesEn?: string;
  /** Recommended material grade (e.g. ستانلس ستيل 304 غذائي) */
  materialGrade?: string;
  /** Number of structural wall brackets */
  bracketCount?: number;
}

export type CameraPresetId =
  | 'entrance'
  | 'topdown'
  | 'left_wall'
  | 'right_wall'
  | 'back_wall'
  | 'front_wall'
  | 'corner_iso';

export type NavMode = 'orbit' | 'walk';
export type ToolMode = 'select' | 'translate' | 'rotate' | 'scale' | 'measure' | 'place';
export type DockTab = 'nav' | 'edit' | 'room' | 'add' | 'measure' | 'photos';
export type Lang = 'ar' | 'en';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Measurement {
  id: string;
  startCm: Point3D;
  endCm: Point3D;
  distanceCm: number;
}

export interface LayoutSnapshot {
  room: RoomConfig;
  items: SceneItem[];
}

export interface CatalogTemplate {
  kind: ItemKind;
  nameAr: string;
  nameEn: string;
  category: ItemCategory;
  widthCm: number;
  depthCm: number;
  heightCm: number;
  defaultYCm: number;
  wallMounted?: boolean;
}

export interface ReferencePhoto {
  id: string;
  src: string;
  labelAr: string;
  labelEn: string;
}
