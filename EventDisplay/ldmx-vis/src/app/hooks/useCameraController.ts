import { useEffect, useState } from 'react';
import type { Object3D } from 'three';
import {
  getActiveCameraContext,
  getCameraPreset,
  getPannedCameraTransform,
  getZoomedCameraTransform,
  isOrthographicCamera,
  readActiveCameraPose,
  type CameraPanDirection,
  type CameraPose,
  type CameraViewPreset
} from '../utils/cameraNavigation';
import type { EventDisplay } from 'phoenix-event-display';

/**
 * Wraps all active-camera synchronization and camera manipulation commands so
 * the main app controller does not need to mix Phoenix scene actions with
 * event/truth state derivation.
 */
export function useCameraController(
  eventDisplay: EventDisplay | null,
  geometryRoot: Object3D | null
) {
  const [orthographic, setOrthographic] = useState(false);
  const [cameraPose, setCameraPose] = useState<CameraPose | null>(null);

  useEffect(() => {
    if (!eventDisplay) return;

    let previousSignature = '';
    const interval = window.setInterval(() => {
      const nextPose = readActiveCameraPose(eventDisplay);
      if (!nextPose) return;

      const signature = [
        ...nextPose.position.map((value) => value.toFixed(3)),
        ...nextPose.target.map((value) => value.toFixed(3)),
        nextPose.zoom == null ? 'null' : nextPose.zoom.toFixed(4)
      ].join('|');

      if (signature === previousSignature) return;
      previousSignature = signature;
      setCameraPose(nextPose);
    }, 120);

    return () => window.clearInterval(interval);
  }, [eventDisplay]);

  function animateCamera(
    position: [number, number, number],
    target: [number, number, number],
    duration = 180
  ) {
    if (!eventDisplay) return;
    eventDisplay
      .getThreeManager()
      .animateCameraTransform(position, target, duration);
  }

  function zoom(factor: number) {
    if (!eventDisplay) return;

    const context = getActiveCameraContext(eventDisplay);
    if (!context) return;

    const next = getZoomedCameraTransform(
      context.camera,
      context.controls.target,
      factor
    );

    if (next.zoom != null && isOrthographicCamera(context.camera)) {
      context.camera.zoom = next.zoom;
      context.camera.updateProjectionMatrix();
      context.controls.update();
      setCameraPose(readActiveCameraPose(eventDisplay));
      return;
    }

    animateCamera(next.position, next.target, 160);
  }

  function setCameraView(preset: CameraViewPreset) {
    if (!eventDisplay) return;

    const { position, target } = getCameraPreset(preset, geometryRoot);
    animateCamera(position, target, 250);
  }

  function panCamera(direction: CameraPanDirection) {
    if (!eventDisplay) return;

    const context = getActiveCameraContext(eventDisplay);
    if (!context) return;

    const { position, target } = getPannedCameraTransform(
      context.camera,
      context.controls.target,
      direction
    );
    animateCamera(position, target, 180);
  }

  function setCameraPositionValue(axis: 0 | 1 | 2, value: number) {
    if (!eventDisplay) return;
    const pose = readActiveCameraPose(eventDisplay);
    if (!pose) return;

    const position = [...pose.position] as [number, number, number];
    position[axis] = value;
    animateCamera(position, pose.target, 140);
  }

  function setCameraTargetValue(axis: 0 | 1 | 2, value: number) {
    if (!eventDisplay) return;
    const pose = readActiveCameraPose(eventDisplay);
    if (!pose) return;

    const target = [...pose.target] as [number, number, number];
    target[axis] = value;
    animateCamera(pose.position, target, 140);
  }

  function setCameraDistanceOrZoomValue(value: number) {
    if (!eventDisplay) return;

    const context = getActiveCameraContext(eventDisplay);
    if (!context) return;

    if (isOrthographicCamera(context.camera)) {
      context.camera.zoom = Math.min(100, Math.max(0.05, value));
      context.camera.updateProjectionMatrix();
      context.controls.update();
      setCameraPose(readActiveCameraPose(eventDisplay));
      return;
    }

    const offset = context.camera.position.clone().sub(context.controls.target);
    const direction =
      offset.lengthSq() > 0
        ? offset.normalize()
        : offset.set(0, 0.2, 1).normalize();
    const nextDistance = Math.min(20000, Math.max(12, value));
    const nextPosition = context.controls.target
      .clone()
      .add(direction.multiplyScalar(nextDistance));

    animateCamera(
      [nextPosition.x, nextPosition.y, nextPosition.z],
      [
        context.controls.target.x,
        context.controls.target.y,
        context.controls.target.z
      ],
      140
    );
  }

  function toggleProjection() {
    if (!eventDisplay) return;

    const next = !orthographic;
    eventDisplay.getThreeManager().swapCameras(next);
    setOrthographic(next);
  }

  return {
    cameraPose,
    orthographic,
    panCamera,
    setCameraDistanceOrZoomValue,
    setCameraPositionValue,
    setCameraTargetValue,
    setCameraView,
    toggleProjection,
    zoom
  };
}
