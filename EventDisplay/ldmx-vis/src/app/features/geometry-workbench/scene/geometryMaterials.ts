import {
  Color,
  type Material,
  type Mesh,
  type Plane
} from 'three';
import type { GeometryRenderMode } from '../../../types';

type ManagedMaterialState = {
  original: Material | Material[];
  originalList: Material[];
  styled: Material | Material[];
  styledList: Material[];
};

type GeometryMeshStyle = {
  clippingPlanes: Plane[];
  fillColor: string;
  opacity: number;
  renderMode: GeometryRenderMode;
  visible: boolean;
};

const MATERIAL_STATE_KEY = '__ldmx_geometry_materials__';

export function applyGeometryMaterial(
  mesh: Mesh,
  style: GeometryMeshStyle
) {
  const state = ensureManagedMaterialState(mesh);
  mesh.visible = style.visible && style.renderMode !== 'hidden';

  if (!mesh.visible) {
    return;
  }

  if (mesh.material !== state.styled) {
    mesh.material = state.styled;
  }

  const fillOpacity = getFillOpacity(style.renderMode, style.opacity);
  const firstOriginal = state.originalList[0];
  if (!firstOriginal) return;
  state.styledList.forEach((material, index) => {
    const original = state.originalList[index] ?? firstOriginal;
    applyMaterialStyle(material, original, style, fillOpacity);
  });
}

function ensureManagedMaterialState(mesh: Mesh): ManagedMaterialState {
  const existing = mesh.userData[MATERIAL_STATE_KEY] as
    | ManagedMaterialState
    | undefined;
  if (existing) {
    return existing;
  }

  const original = mesh.material as Material | Material[];
  const originalList = Array.isArray(original) ? original : [original];
  const firstOriginal = originalList[0];
  if (!firstOriginal) {
    throw new Error(`Mesh ${mesh.uuid} is missing material data`);
  }
  const styledList = originalList.map((entry) => entry.clone());
  const firstStyled = styledList[0];
  if (!firstStyled) {
    throw new Error(`Mesh ${mesh.uuid} could not clone material data`);
  }
  const state: ManagedMaterialState = {
    original,
    originalList,
    styled: Array.isArray(original) ? styledList : firstStyled,
    styledList
  };
  mesh.userData[MATERIAL_STATE_KEY] = state;
  return state;
}

function applyMaterialStyle(
  material: Material,
  original: Material,
  style: GeometryMeshStyle,
  fillOpacity: number
) {
  const target = material as Material & {
    alphaTest?: number;
    clippingPlanes?: Plane[];
    color?: Color;
    colorWrite?: boolean;
    depthWrite?: boolean;
    emissive?: Color;
    opacity?: number;
    transparent?: boolean;
  };
  const source = original as Material & {
    color?: Color;
    emissive?: Color;
  };

  if (target.color) {
    target.color.set(style.fillColor);
  }
  if (target.emissive) {
    if (source.emissive) {
      target.emissive.copy(source.emissive);
    } else {
      target.emissive.set('#000000');
    }
  }

  target.transparent = fillOpacity < 0.999;
  target.opacity = fillOpacity;
  target.alphaTest = fillOpacity > 0 && fillOpacity < 0.04 ? 0.015 : 0;
  target.depthWrite = style.renderMode === 'solid' || style.renderMode === 'solidWire';
  target.colorWrite = style.renderMode !== 'wire';
  target.clippingPlanes = style.clippingPlanes;
  material.needsUpdate = true;
}

function getFillOpacity(renderMode: GeometryRenderMode, opacity: number) {
  switch (renderMode) {
    case 'ghost':
      return Math.min(opacity, 0.035);
    case 'wire':
      return 0;
    case 'solidWire':
      return Math.min(0.08, Math.max(0.012, opacity));
    case 'hidden':
      return 0;
    case 'solid':
    default:
      return opacity;
  }
}
