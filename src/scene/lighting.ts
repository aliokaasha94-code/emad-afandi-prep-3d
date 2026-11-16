import type { LightingMode } from './types';

export interface LightingRigConfig {
  kelvin: number;
  ambientColor: number;
  ambientIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  hemiIntensity: number;
  keyColor: number;
  keyIntensity: number;
  bulbColor: number;
  ceilingBulbIntensity: number;
  backBulbIntensity: number;
  envIntensity: number;
  bgColor: number;
  fogDensity: number;
}

/**
 * Computes physically grounded lighting rig parameters.
 * Default 'warm_3000k' replicates realistic 3000K cozy cafe warm LED fixtures + ambient fill.
 */
export function getLightingRigConfig(
  mode: LightingMode = 'warm_3000k',
  cadMode = false
): LightingRigConfig {
  if (cadMode) {
    return {
      kelvin: 5500,
      ambientColor: 0xffffff,
      ambientIntensity: 0.48,
      hemiSkyColor: 0xffffff,
      hemiGroundColor: 0xcbd5e1,
      hemiIntensity: 0.85,
      keyColor: 0xffffff,
      keyIntensity: 1.05,
      bulbColor: 0xffffff,
      ceilingBulbIntensity: 0.55,
      backBulbIntensity: 0.4,
      envIntensity: 0.5,
      bgColor: 0xeef2f7,
      fogDensity: 0.015,
    };
  }

  if (mode === 'neutral_5000k') {
    return {
      kelvin: 5000,
      ambientColor: 0xf4f7fb,
      ambientIntensity: 0.48,
      hemiSkyColor: 0xf8fafc,
      hemiGroundColor: 0x3a3f4a,
      hemiIntensity: 0.65,
      keyColor: 0xfff8f0,
      keyIntensity: 1.25,
      bulbColor: 0xfff4e6,
      ceilingBulbIntensity: 2.6,
      backBulbIntensity: 1.85,
      envIntensity: 0.68,
      bgColor: 0x11151d,
      fogDensity: 0.032,
    };
  }

  // Warm Cafe 3000K (Planckian warm tungsten/LED interior ambiance with rich PBR metallic reflections)
  return {
    kelvin: 3000,
    ambientColor: 0xffdfb8,
    ambientIntensity: 0.72,
    hemiSkyColor: 0xffe6cb,
    hemiGroundColor: 0x362112,
    hemiIntensity: 0.65,
    keyColor: 0xfff4e6,
    keyIntensity: 1.35,
    bulbColor: 0xffc775,
    ceilingBulbIntensity: 3.65,
    backBulbIntensity: 2.75,
    envIntensity: 0.75,
    bgColor: 0x0c0f16,
    fogDensity: 0.018,
  };
}
