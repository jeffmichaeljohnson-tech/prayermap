import { vi } from 'vitest';

// Mock Mapbox GL Map
export class MockMap {
  _events: Record<string, ((...args: unknown[]) => void)[]> = {};
  _center = [0, 0];
  _zoom = 10;
  _bearing = 0;
  _pitch = 0;

  constructor() {}

  on(event: string, callback: (...args: unknown[]) => void) {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push(callback);
    return this;
  }

  off(event: string, callback: (...args: unknown[]) => void) {
    if (this._events[event]) {
      this._events[event] = this._events[event].filter(cb => cb !== callback);
    }
    return this;
  }

  once(event: string, callback: (...args: unknown[]) => void) {
    const onceCallback = (...args: unknown[]) => {
      callback(...args);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    if (this._events[event]) {
      this._events[event].forEach(callback => callback(...args));
    }
  }

  getCenter() {
    return { lng: this._center[0], lat: this._center[1] };
  }

  setCenter(center: [number, number]) {
    this._center = center;
    return this;
  }

  getZoom() {
    return this._zoom;
  }

  setZoom(zoom: number) {
    this._zoom = zoom;
    return this;
  }

  getBearing() {
    return this._bearing;
  }

  setBearing(bearing: number) {
    this._bearing = bearing;
    return this;
  }

  getPitch() {
    return this._pitch;
  }

  setPitch(pitch: number) {
    this._pitch = pitch;
    return this;
  }

  flyTo() {
    return this;
  }

  easeTo() {
    return this;
  }

  jumpTo() {
    return this;
  }

  resize() {
    return this;
  }

  remove() {}

  addControl() {
    return this;
  }

  removeControl() {
    return this;
  }

  addSource() {
    return this;
  }

  removeSource() {
    return this;
  }

  addLayer() {
    return this;
  }

  removeLayer() {
    return this;
  }

  setLayoutProperty() {
    return this;
  }

  setPaintProperty() {
    return this;
  }

  getCanvas() {
    return document.createElement('canvas');
  }

  getContainer() {
    return document.createElement('div');
  }

  loaded() {
    return true;
  }

  queryRenderedFeatures() {
    return [];
  }

  project() {
    return { x: 0, y: 0 };
  }

  unproject() {
    return { lng: 0, lat: 0 };
  }
}

// Mock Mapbox GL Marker
export class MockMarker {
  _lngLat = [0, 0];
  _element: HTMLElement | null = null;
  _map: MockMap | null = null;

  constructor(options?: { element?: HTMLElement }) {
    if (options?.element) {
      this._element = options.element;
    }
  }

  setLngLat(lngLat: [number, number]) {
    this._lngLat = lngLat;
    return this;
  }

  getLngLat() {
    return { lng: this._lngLat[0], lat: this._lngLat[1] };
  }

  addTo(map: MockMap) {
    this._map = map;
    return this;
  }

  remove() {
    this._map = null;
    return this;
  }

  getElement() {
    return this._element || document.createElement('div');
  }

  setPopup() {
    return this;
  }

  getPopup() {
    return null;
  }

  togglePopup() {
    return this;
  }
}

// Mock Mapbox GL Popup
export class MockPopup {
  _lngLat = [0, 0];
  _content: HTMLElement | string | null = null;

  constructor() {}

  setLngLat(lngLat: [number, number]) {
    this._lngLat = lngLat;
    return this;
  }

  setHTML(html: string) {
    this._content = html;
    return this;
  }

  setDOMContent(element: HTMLElement) {
    this._content = element;
    return this;
  }

  addTo() {
    return this;
  }

  remove() {
    return this;
  }

  isOpen() {
    return false;
  }
}

export const mockMapboxGL = {
  Map: MockMap,
  Marker: MockMarker,
  Popup: MockPopup,
  NavigationControl: class {},
  GeolocateControl: class {},
  ScaleControl: class {},
  FullscreenControl: class {},
  AttributionControl: class {},
};

// Setup Mapbox GL mock
export function setupMapboxMock() {
  vi.mock('mapbox-gl', () => mockMapboxGL);
}
