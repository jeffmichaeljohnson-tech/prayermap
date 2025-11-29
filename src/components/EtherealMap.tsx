import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface EtherealMapProps {
  center: { lat: number; lng: number };
  zoom: number;
  pitch: number;
  bearing: number;
  onMove?: () => void;
  onZoom?: () => void;
}

export function EtherealMap({ zoom, pitch, bearing }: EtherealMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        background: 'linear-gradient(135deg, hsl(210, 80%, 92%) 0%, hsl(210, 70%, 88%) 50%, hsl(200, 60%, 85%) 100%)',
      }}
    >
      {/* Map Grid */}
      <motion.div
        className="absolute inset-0"
        style={{
          x: position.x,
          y: position.y,
          scale: zoom / 11,
          rotateX: pitch * 0.5,
          rotateZ: bearing,
        }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
      >
        {/* Grid lines */}
        <svg className="absolute inset-0 w-[200%] h-[200%] -left-[50%] -top-[50%]" style={{ opacity: 0.15 }}>
          <defs>
            <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="hsl(210, 50%, 60%)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Roads/paths */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.3 }}>
          <path
            d="M 20% 30% Q 40% 20%, 60% 35% T 90% 40%"
            stroke="hsl(210, 40%, 70%)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 10% 60% Q 30% 55%, 50% 65% T 85% 70%"
            stroke="hsl(210, 40%, 70%)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 50% 10% L 45% 90%"
            stroke="hsl(210, 40%, 70%)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 15% 50% L 85% 55%"
            stroke="hsl(210, 40%, 70%)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </svg>

        {/* Parks/green spaces */}
        <div className="absolute top-[15%] left-[25%] w-32 h-32 rounded-full bg-green-200/30 blur-sm" />
        <div className="absolute bottom-[20%] right-[30%] w-40 h-24 rounded-full bg-green-200/30 blur-sm" />
        
        {/* Water bodies */}
        <div className="absolute top-[40%] right-[15%] w-48 h-36 rounded-[40%] bg-blue-300/40 blur-sm" />
        
        {/* Buildings/landmarks */}
        <div className="absolute top-[25%] left-[60%] w-3 h-3 bg-gray-400/50 rounded-sm" />
        <div className="absolute top-[55%] left-[35%] w-4 h-4 bg-gray-400/50 rounded-sm" />
        <div className="absolute bottom-[30%] left-[70%] w-2 h-2 bg-gray-400/50 rounded-sm" />
      </motion.div>

      {/* Ethereal glow overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-purple-200/10 pointer-events-none" />
    </div>
  );
}

// Map class mimicking Mapbox API
export class SimpleMap {
  private container: HTMLElement;
  private center: { lng: number; lat: number };
  private zoom: number;
  private pitch: number;
  private bearing: number;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(options: {
    container: HTMLElement;
    style?: string;
    center: [number, number];
    zoom: number;
    pitch: number;
    bearing: number;
    attributionControl?: boolean;
  }) {
    this.container = options.container;
    this.center = { lng: options.center[0], lat: options.center[1] };
    this.zoom = options.zoom;
    this.pitch = options.pitch;
    this.bearing = options.bearing;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(handler);

    // Immediately fire 'load' event
    if (event === 'load') {
      setTimeout(() => handler(), 100);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  off(event: string, handler: Function) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  project(lngLat: [number, number]): { x: number; y: number } {
    const container = this.container;
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    
    // Simple mercator projection
    const scale = (256 * Math.pow(2, this.zoom)) / 360;
    const x = (lngLat[0] - this.center.lng) * scale + width / 2;
    const y = height / 2 - (lngLat[1] - this.center.lat) * scale;
    
    return { x, y };
  }

  flyTo(options: {
    center?: [number, number];
    zoom?: number;
    pitch?: number;
    bearing?: number;
    duration?: number;
  }) {
    if (options.center) {
      this.center = { lng: options.center[0], lat: options.center[1] };
    }
    if (options.zoom !== undefined) {
      this.zoom = options.zoom;
    }
    if (options.pitch !== undefined) {
      this.pitch = options.pitch;
    }
    if (options.bearing !== undefined) {
      this.bearing = options.bearing;
    }
    
    // Trigger move events
    setTimeout(() => {
      this.eventHandlers.get('move')?.forEach(h => h());
    }, 50);
  }

  setPaintProperty() {
    // Mock implementation - parameters unused in mock
  }

  remove() {
    this.eventHandlers.clear();
  }

  getCenter() {
    return this.center;
  }

  getZoom() {
    return this.zoom;
  }

  getPitch() {
    return this.pitch;
  }

  getBearing() {
    return this.bearing;
  }
}
