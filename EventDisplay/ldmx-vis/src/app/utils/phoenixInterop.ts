import type { EventDisplay } from 'phoenix-event-display';
import type { Camera, Object3D, Vector3 } from 'three';

export type PhoenixActiveControls = {
  target: Vector3;
  update: () => void;
};

export type PhoenixOrbitControls = {
  enabled: boolean;
};

export type PhoenixControlsManager = {
  getActiveCamera?: () => Camera;
  getActiveControls?: () => PhoenixActiveControls;
  getMainControls?: () => PhoenixOrbitControls;
};

export type PhoenixRendererManager = {
  getMainRenderer?: () => { domElement: HTMLElement };
  setLocalClippingEnabled?: (enabled: boolean) => void;
};

export type PhoenixSceneManager = {
  getScene: () => Object3D;
  getEventData?: () => Object3D;
};

export type PhoenixThreeManager = {
  animateCameraTransform: (
    position: [number, number, number],
    target: [number, number, number],
    duration: number
  ) => void;
  controlsManager?: PhoenixControlsManager;
  getSceneManager: () => PhoenixSceneManager;
  rendererManager?: PhoenixRendererManager;
  swapCameras: (useOrthographic: boolean) => void;
};

/**
 * Central typed boundary for Phoenix internals. The upstream library does not
 * currently expose the Three-manager surface we need, so all structural
 * assertions are kept here instead of being repeated throughout the app.
 */
export function getPhoenixThreeManager(
  eventDisplay: EventDisplay
): PhoenixThreeManager {
  const manager: unknown = eventDisplay.getThreeManager();
  if (isPhoenixThreeManager(manager)) {
    return manager;
  }

  throw new Error('Phoenix three manager does not expose the expected API.');
}

function isPhoenixThreeManager(value: unknown): value is PhoenixThreeManager {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<PhoenixThreeManager>;
  return (
    typeof candidate.animateCameraTransform === 'function' &&
    typeof candidate.getSceneManager === 'function' &&
    typeof candidate.swapCameras === 'function'
  );
}
