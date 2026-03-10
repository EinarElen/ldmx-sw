import { useState } from 'react';
import type {
  HitColorMode,
  HitSizeMode,
  HitVisualStyle,
  TrajectoryColorMode,
  TrajectorySizeMode,
  TrajectoryStyleMode,
  TrajectoryVisualStyle
} from '../types';

const DEFAULT_HIT_VISUAL_STYLE: HitVisualStyle = {
  colorMode: 'parentSpecies',
  sizeMode: 'source',
  sizeStrength: 0.9
};

const DEFAULT_TRAJECTORY_VISUAL_STYLE: TrajectoryVisualStyle = {
  colorMode: 'track',
  sizeMode: 'role',
  sizeScale: 1.15,
  styleMode: 'species',
  emphasizeSelected: true,
  showDescendants: true
};

/**
 * Collects the user-editable hit/trajectory style state and its small update
 * actions in one place so the main controller is not filled with repetitive
 * setter wrappers.
 */
export function useVisualizationStyleState() {
  const [hitVisualStyle, setHitVisualStyle] = useState<HitVisualStyle>(
    DEFAULT_HIT_VISUAL_STYLE
  );
  const [trajectoryVisualStyle, setTrajectoryVisualStyle] =
    useState<TrajectoryVisualStyle>(DEFAULT_TRAJECTORY_VISUAL_STYLE);

  return {
    hitVisualStyle,
    setHitColorMode(colorMode: HitColorMode) {
      setHitVisualStyle((previous) => ({ ...previous, colorMode }));
    },
    setHitSizeMode(sizeMode: HitSizeMode) {
      setHitVisualStyle((previous) => ({ ...previous, sizeMode }));
    },
    setHitSizeStrength(sizeStrength: number) {
      setHitVisualStyle((previous) => ({ ...previous, sizeStrength }));
    },
    setTrajectoryColorMode(colorMode: TrajectoryColorMode) {
      setTrajectoryVisualStyle((previous) => ({ ...previous, colorMode }));
    },
    setTrajectoryEmphasizeSelected(emphasizeSelected: boolean) {
      setTrajectoryVisualStyle((previous) => ({
        ...previous,
        emphasizeSelected
      }));
    },
    setTrajectoryShowDescendants(showDescendants: boolean) {
      setTrajectoryVisualStyle((previous) => ({
        ...previous,
        showDescendants
      }));
    },
    setTrajectorySizeMode(sizeMode: TrajectorySizeMode) {
      setTrajectoryVisualStyle((previous) => ({ ...previous, sizeMode }));
    },
    setTrajectorySizeScale(sizeScale: number) {
      setTrajectoryVisualStyle((previous) => ({ ...previous, sizeScale }));
    },
    setTrajectoryStyleMode(styleMode: TrajectoryStyleMode) {
      setTrajectoryVisualStyle((previous) => ({ ...previous, styleMode }));
    },
    trajectoryVisualStyle
  };
}
