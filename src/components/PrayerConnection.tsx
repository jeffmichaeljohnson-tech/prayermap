import { useState, useRef, useEffect } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import type { PrayerConnection as PrayerConnectionType } from '../types/prayer';

interface PrayerConnectionProps {
  connection: PrayerConnectionType;
  map: MapboxMap;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}

export function PrayerConnection({ 
  connection, 
  map, 
  isHovered, 
  onHover, 
  onLeave 
}: PrayerConnectionProps) {
  const [positions, setPositions] = useState<{
    from: { x: number; y: number };
    to: { x: number; y: number };
  } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const lineRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    console.log('PrayerConnection mounted for:', connection.id);
    
    const updatePositions = () => {
      const fromPoint = map.project([connection.fromLocation.lng, connection.fromLocation.lat]);
      const toPoint = map.project([connection.toLocation.lng, connection.toLocation.lat]);
      setPositions({
        from: { x: fromPoint.x, y: fromPoint.y },
        to: { x: toPoint.x, y: toPoint.y }
      });
    };

    updatePositions();
    
    // Update on all map movement events for smooth tracking
    map.on('move', updatePositions);
    map.on('movestart', updatePositions);
    map.on('moveend', updatePositions);
    map.on('zoom', updatePositions);
    map.on('zoomstart', updatePositions);
    map.on('zoomend', updatePositions);
    map.on('rotate', updatePositions);
    map.on('pitch', updatePositions);

    return () => {
      map.off('move', updatePositions);
      map.off('movestart', updatePositions);
      map.off('moveend', updatePositions);
      map.off('zoom', updatePositions);
      map.off('zoomstart', updatePositions);
      map.off('zoomend', updatePositions);
      map.off('rotate', updatePositions);
      map.off('pitch', updatePositions);
    };
  }, [map, connection]);

  if (!positions) {
    console.log('No positions yet for connection:', connection.id);
    return null;
  }

  const midX = (positions.from.x + positions.to.x) / 2;
  const midY = (positions.from.y + positions.to.y) / 2 - 40;

  const pathD = `M ${positions.from.x} ${positions.from.y} Q ${midX} ${midY} ${positions.to.x} ${positions.to.y}`;

  console.log('Rendering connection line:', connection.id, pathD);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const svgRect = (e.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
    if (svgRect) {
      setTooltipPosition({ 
        x: e.clientX - svgRect.left, 
        y: e.clientY - svgRect.top 
      });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const svgRect = (e.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
      if (svgRect) {
        setTooltipPosition({ 
          x: touch.clientX - svgRect.left, 
          y: touch.clientY - svgRect.top 
        });
      }
      onHover();
    }
  };

  return (
    <g 
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchEnd={onLeave}
      style={{ pointerEvents: 'auto' }} // Enable pointer events on the group
    >
      {/* Wider invisible path for easier hovering/tapping */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth="20"
        style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
      />
      
      {/* Glow effect when hovered */}
      {isHovered && (
        <path
          d={pathD}
          fill="none"
          stroke="url(#glowGradient)"
          strokeWidth="8"
          opacity="0.4"
          style={{ 
            filter: 'blur(8px)',
            pointerEvents: 'none' // Don't interfere with hit detection
          }}
        />
      )}
      
      {/* Main connection line */}
      <path
        ref={lineRef}
        d={pathD}
        fill="none"
        stroke={isHovered ? 'url(#connectionGradientHover)' : 'url(#connectionGradient)'}
        strokeWidth={isHovered ? '3' : '2'}
        strokeLinecap="round"
        style={{ 
          pointerEvents: 'none' // Only the invisible wide path should handle events
        }}
      />
      
      {/* Tooltip */}
      {isHovered && tooltipPosition && (
        <g style={{ pointerEvents: 'none' }}> {/* Tooltip shouldn't block interactions */}
          <foreignObject
            x={tooltipPosition.x - 100}
            y={tooltipPosition.y - 80}
            width="200"
            height="100"
          >
            <div className="glass-strong rounded-xl p-3 shadow-xl">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">{connection.replierName}</span>
                {' prayed for '}
                <span className="font-semibold">{connection.requesterName}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDate(connection.createdAt)}
              </p>
            </div>
          </foreignObject>
        </g>
      )}
    </g>
  );
}