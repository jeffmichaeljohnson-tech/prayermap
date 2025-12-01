import { useState, useRef, useMemo } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import type { PrayerConnection as PrayerConnectionType } from '../../types/prayer';

interface PrayerConnectionProps {
  connection: PrayerConnectionType;
  map: MapboxMap;
  updateKey: number; // Triggers position recalculation when map moves
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}

export function PrayerConnection({
  connection,
  map,
  updateKey,
  isHovered,
  onHover,
  onLeave
}: PrayerConnectionProps) {
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const lineRef = useRef<SVGPathElement>(null);

  // Calculate positions using useMemo - recalculates when updateKey changes
  // This is triggered by the parent's centralized map event handler
  // Performance: No individual map listeners needed (was 8 × N, now 0)
  const positions = useMemo(() => {
    console.log('Recalculating position for connection:', connection.id, 'updateKey:', updateKey);

    const fromPoint = map.project([connection.fromLocation.lng, connection.fromLocation.lat]);
    const toPoint = map.project([connection.toLocation.lng, connection.toLocation.lat]);

    return {
      from: { x: fromPoint.x, y: fromPoint.y },
      to: { x: toPoint.x, y: toPoint.y }
    };
  }, [map, connection, updateKey]);

  // Calculate path control point for quadratic curve
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