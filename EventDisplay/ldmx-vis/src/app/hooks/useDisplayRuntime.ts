import {
  startTransition,
  useEffect,
  useRef,
  useState,
  type ChangeEvent
} from 'react';
import { EventDisplay, PhoenixLoader } from 'phoenix-event-display';
import type { Object3D } from 'three';
import {
  DEFAULT_CAMERA_POSITION,
  DEFAULT_CAMERA_TARGET,
  DEFAULT_GEOMETRY_URL,
  DISPLAY_ID,
  SOURCE_PRESETS
} from '../constants';
import { normalizeMetadata } from '../utils/classification';
import { normalizeEventPayloads } from '../utils/eventSummary';
import {
  installGeometryRoot,
  loadGeometryFromFile,
  loadGeometryFromUrl
} from '../utils/geometryLoader';
import type { PhoenixEventData, Status } from '../types';

async function fetchJson(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }

  return response.json();
}

function getDefaultSourcePreset() {
  const preset = SOURCE_PRESETS[0];
  if (!preset) {
    throw new Error('No source presets are configured');
  }
  return preset;
}

/**
 * Owns the Phoenix runtime instance, default sample/bootstrap loading, and
 * event/geometry import flows. This keeps I/O and lifecycle concerns out of
 * the higher-level app controller.
 */
export function useDisplayRuntime() {
  const eventFileInputRef = useRef<HTMLInputElement | null>(null);
  const geometryFileInputRef = useRef<HTMLInputElement | null>(null);

  const [eventDisplay, setEventDisplay] = useState<EventDisplay | null>(null);
  const [geometryRoot, setGeometryRoot] = useState<Object3D | null>(null);
  const [status, setStatus] = useState<Status>('init');
  const [sourceLabel, setSourceLabel] = useState('');
  const [eventKeys, setEventKeys] = useState<string[]>([]);
  const [currentEventKey, setCurrentEventKey] = useState('');
  const [eventPayloads, setEventPayloads] = useState<
    Record<string, PhoenixEventData>
  >({});
  const [metadata, setMetadata] = useState<{ label: string; value: string }[]>(
    []
  );
  const [geometryLabel, setGeometryLabel] = useState('fulldetector.gltf');
  const [error, setError] = useState('');

  const currentEventIndex = currentEventKey
    ? eventKeys.findIndex((key) => key === currentEventKey)
    : -1;

  useEffect(() => {
    const nextDisplay = new EventDisplay();
    setEventDisplay(nextDisplay);

    nextDisplay.listenToLoadedEventsChange((keys: string[]) => {
      startTransition(() => {
        setEventKeys(keys);
        setCurrentEventKey((previous) =>
          previous && keys.includes(previous) ? previous : (keys[0] ?? '')
        );
      });
    });

    nextDisplay.listenToDisplayedEventChange(() => {
      startTransition(() => {
        setMetadata(normalizeMetadata(nextDisplay.getEventMetadata()));
      });
    });

    nextDisplay.init({
      allowUrlOptions: false,
      defaultView: [...DEFAULT_CAMERA_POSITION, ...DEFAULT_CAMERA_TARGET],
      elementId: DISPLAY_ID,
      enableDatGUIMenu: false,
      eventDataLoader: new PhoenixLoader(),
      forceColourTheme: 'dark'
    });

    let cancelled = false;

    void (async () => {
      try {
        const defaultPreset = getDefaultSourcePreset();
        setStatus('geometry');
        const root = await loadGeometryFromUrl(
          DEFAULT_GEOMETRY_URL,
          'LDMX Detector'
        );
        const installedRoot = installGeometryRoot(nextDisplay, root);
        nextDisplay
          .getThreeManager()
          .animateCameraTransform(
            DEFAULT_CAMERA_POSITION,
            DEFAULT_CAMERA_TARGET,
            1
          );
        setGeometryRoot(installedRoot);

        if (cancelled) return;

        setStatus('events');
        const payload = await fetchJson(defaultPreset.url);
        if (cancelled) return;

        nextDisplay.parsePhoenixEvents(payload);
        setEventPayloads(normalizeEventPayloads(payload));
        setSourceLabel(defaultPreset.label);
        setStatus('ready');
      } catch (loadingError) {
        if (cancelled) return;

        setError(
          loadingError instanceof Error
            ? loadingError.message
            : 'Initialization failed'
        );
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      setEventDisplay(null);
      const mountNode = document.getElementById(DISPLAY_ID);
      if (mountNode) mountNode.innerHTML = '';
    };
  }, []);

  useEffect(() => {
    const mountNode = document.getElementById(DISPLAY_ID);
    if (!mountNode) return;

    const notifyResize = () => window.dispatchEvent(new Event('resize'));
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(notifyResize);
    });

    observer.observe(mountNode);
    window.requestAnimationFrame(notifyResize);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!eventDisplay || !currentEventKey) return;
    eventDisplay.loadEvent(currentEventKey);
  }, [currentEventKey, eventDisplay]);

  async function handleEventFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !eventDisplay) return;

    try {
      setError('');
      setStatus('importing');
      const text = await file.text();

      if (file.name.endsWith('.phnx')) {
        await eventDisplay.parsePhoenixDisplay(text);
        setEventPayloads({});
        setEventKeys([]);
        setCurrentEventKey('');
      } else {
        const payload = JSON.parse(text);
        eventDisplay.parsePhoenixEvents(payload);
        setEventPayloads(normalizeEventPayloads(payload));
      }

      setSourceLabel(file.name);
      setStatus('ready');
    } catch (loadingError) {
      setError(
        loadingError instanceof Error ? loadingError.message : 'Import failed'
      );
      setStatus('error');
    } finally {
      event.target.value = '';
    }
  }

  async function handleGeometryFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !eventDisplay) return;

    try {
      setError('');
      setStatus('importing');
      const root = await loadGeometryFromFile(file, file.name);
      const installedRoot = installGeometryRoot(eventDisplay, root);
      eventDisplay
        .getThreeManager()
        .animateCameraTransform(
          DEFAULT_CAMERA_POSITION,
          DEFAULT_CAMERA_TARGET,
          250
        );
      setGeometryRoot(installedRoot);
      setGeometryLabel(file.name);
      setStatus('ready');
    } catch (loadingError) {
      setError(
        loadingError instanceof Error
          ? loadingError.message
          : 'Geometry import failed'
      );
      setStatus('error');
    } finally {
      event.target.value = '';
    }
  }

  function openEventPicker() {
    eventFileInputRef.current?.click();
  }

  function openGeometryPicker() {
    geometryFileInputRef.current?.click();
  }

  function goToPreviousEvent() {
    if (currentEventIndex <= 0) return;
    const previousEventKey = eventKeys[currentEventIndex - 1];
    if (!previousEventKey) return;
    setCurrentEventKey(previousEventKey);
  }

  function goToNextEvent() {
    if (currentEventIndex < 0 || currentEventIndex >= eventKeys.length - 1) {
      return;
    }
    const nextEventKey = eventKeys[currentEventIndex + 1];
    if (!nextEventKey) return;
    setCurrentEventKey(nextEventKey);
  }

  return {
    currentEventIndex,
    currentEventKey,
    error,
    eventDisplay,
    eventFileInputRef,
    eventKeys,
    eventPayloads,
    geometryFileInputRef,
    geometryLabel,
    geometryRoot,
    goToNextEvent,
    goToPreviousEvent,
    handleEventFileChange,
    handleGeometryFileChange,
    metadata,
    openEventPicker,
    openGeometryPicker,
    setCurrentEventKey,
    sourceLabel,
    status
  };
}
