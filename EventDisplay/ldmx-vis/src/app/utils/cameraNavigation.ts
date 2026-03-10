import type { EventDisplay } from 'phoenix-event-display';
import type { Camera, Object3D, OrthographicCamera } from 'three';
import { Box3, Vector3 } from 'three';
import {
  DEFAULT_CAMERA_POSITION,
  DEFAULT_CAMERA_TARGET
} from '../constants';
import { getPhoenixThreeManager } from './phoenixInterop';

export type CameraViewPreset = 'home' | 'full' | 'top' | 'right' | 'downstream';
export type CameraPanDirection = 'up' | 'down' | 'left' | 'right';
export type CameraPose = {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number | null;
};

const DEFAULT_POSITION = new Vector3(...DEFAULT_CAMERA_POSITION);
const DEFAULT_TARGET = new Vector3(...DEFAULT_CAMERA_TARGET);
const DEFAULT_DIRECTION = DEFAULT_POSITION
  .clone()
  .sub(DEFAULT_TARGET)
  .normalize();
const DEFAULT_DISTANCE = DEFAULT_POSITION.distanceTo(DEFAULT_TARGET);

type CameraFrame = {
  center: Vector3;
  diagonal: number;
  extent: number;
  target: Vector3;
};

/**
 * Returns detector-aware camera presets. The presets stay in the LDMX
 * display frame and adapt their distance to the loaded geometry bounds.
 */
export function getCameraPreset(
  preset: CameraViewPreset,
  geometryRoot: Object3D | null
) {
  const frame = getCameraFrame(geometryRoot);

  if (!frame) {
    return fallbackPreset(preset);
  }

  switch (preset) {
    case 'home': {
      const distance = Math.max(DEFAULT_DISTANCE, frame.diagonal * 1.15);
      return {
        position: toTuple(
          frame.target.clone().add(DEFAULT_DIRECTION.clone().multiplyScalar(distance))
        ),
        target: toTuple(frame.target)
      };
    }
    case 'full': {
      const distance = Math.max(DEFAULT_DISTANCE, frame.diagonal * 1.35);
      return {
        position: toTuple(
          frame.center.clone().add(DEFAULT_DIRECTION.clone().multiplyScalar(distance))
        ),
        target: toTuple(frame.center)
      };
    }
    case 'top': {
      const distance = Math.max(frame.extent * 1.7, 1400);
      return {
        position: toTuple(
          frame.target.clone().add(new Vector3(0, distance, distance * 0.08))
        ),
        target: toTuple(frame.target)
      };
    }
    case 'right': {
      const distance = Math.max(frame.extent * 1.55, 1500);
      return {
        position: toTuple(
          frame.target.clone().add(new Vector3(distance, distance * 0.08, 0))
        ),
        target: toTuple(frame.target)
      };
    }
    case 'downstream': {
      const distance = Math.max(frame.extent * 1.65, 1650);
      return {
        position: toTuple(
          frame.target.clone().add(new Vector3(0, distance * 0.2, distance))
        ),
        target: toTuple(frame.target)
      };
    }
  }
}

/**
 * Applies viewport pan in camera-local axes while keeping the current
 * look direction and orbit target coupled.
 */
export function getPannedCameraTransform(
  camera: Camera,
  target: Vector3,
  direction: CameraPanDirection
) {
  const position = camera.position.clone();
  const focus = target.clone();
  const forward = focus.clone().sub(position).normalize();
  const up = camera.up.clone().normalize();
  const right = new Vector3().crossVectors(forward, up).normalize();
  const distance = Math.max(position.distanceTo(focus), 1);
  const step = Math.max(distance * 0.14, 22);
  const delta = new Vector3();

  switch (direction) {
    case 'up':
      delta.addScaledVector(up, step);
      break;
    case 'down':
      delta.addScaledVector(up, -step);
      break;
    case 'left':
      delta.addScaledVector(right, -step);
      break;
    case 'right':
      delta.addScaledVector(right, step);
      break;
  }

  return {
    position: toTuple(position.add(delta)),
    target: toTuple(focus.add(delta))
  };
}

/**
 * Computes zoom as a direct camera transform. Perspective cameras move along
 * the current view ray; orthographic cameras retain position and adjust zoom.
 */
export function getZoomedCameraTransform(
  camera: Camera,
  target: Vector3,
  factor: number
) {
  if (isOrthographicCamera(camera)) {
    const nextZoom = clamp(camera.zoom * factor, 0.05, 100);
    return {
      position: toTuple(camera.position.clone()),
      target: toTuple(target.clone()),
      zoom: nextZoom
    };
  }

  const position = camera.position.clone();
  const offset = position.sub(target);
  const distance = Math.max(offset.length(), 1);
  const nextDistance = clamp(distance / factor, 12, 20000);
  const nextPosition = target
    .clone()
    .add(offset.normalize().multiplyScalar(nextDistance));

  return {
    position: toTuple(nextPosition),
    target: toTuple(target.clone()),
    zoom: null
  };
}

/**
 * Reads Phoenix's active camera/controls pair through the untyped manager
 * interface exposed by the viewer library.
 */
export function getActiveCameraContext(eventDisplay: EventDisplay) {
  const threeManager = getPhoenixThreeManager(eventDisplay);
  const camera = threeManager.controlsManager?.getActiveCamera?.();
  const controls = threeManager.controlsManager?.getActiveControls?.();
  if (!camera || !controls) return null;
  return { camera, controls };
}

/**
 * Serializes the current camera pose into plain tuples so React state and
 * editable navigation inputs do not depend on mutable Three.js objects.
 */
export function readActiveCameraPose(eventDisplay: EventDisplay): CameraPose | null {
  const context = getActiveCameraContext(eventDisplay);
  if (!context) return null;

  return {
    position: toTuple(context.camera.position.clone()),
    target: toTuple(context.controls.target.clone()),
    zoom: isOrthographicCamera(context.camera) ? context.camera.zoom : null
  };
}

function getCameraFrame(geometryRoot: Object3D | null): CameraFrame | null {
  if (!geometryRoot) return null;

  const bounds = new Box3().setFromObject(geometryRoot);
  if (
    !Number.isFinite(bounds.min.x) ||
    !Number.isFinite(bounds.min.y) ||
    !Number.isFinite(bounds.min.z)
  ) {
    return null;
  }

  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const diagonal = size.length();
  const extent = Math.max(size.x, size.y, size.z, 1);
  const target = bounds.containsPoint(DEFAULT_TARGET)
    ? DEFAULT_TARGET.clone()
    : center.clone();

  return { center, diagonal, extent, target };
}

function fallbackPreset(preset: CameraViewPreset) {
  switch (preset) {
    case 'home':
      return {
        position: [...DEFAULT_CAMERA_POSITION] as [number, number, number],
        target: [...DEFAULT_CAMERA_TARGET] as [number, number, number]
      };
    case 'full':
      return {
        position: [...DEFAULT_CAMERA_POSITION] as [number, number, number],
        target: [...DEFAULT_CAMERA_TARGET] as [number, number, number]
      };
    case 'top':
      return {
        position: [0, 2600, 720] as [number, number, number],
        target: [...DEFAULT_CAMERA_TARGET] as [number, number, number]
      };
    case 'right':
      return {
        position: [2500, 260, 520] as [number, number, number],
        target: [...DEFAULT_CAMERA_TARGET] as [number, number, number]
      };
    case 'downstream':
      return {
        position: [0, 320, 2600] as [number, number, number],
        target: [...DEFAULT_CAMERA_TARGET] as [number, number, number]
      };
  }
}

function toTuple(vector: Vector3): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

export function isOrthographicCamera(
  camera: Camera
): camera is OrthographicCamera {
  return Boolean((camera as OrthographicCamera).isOrthographicCamera);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
