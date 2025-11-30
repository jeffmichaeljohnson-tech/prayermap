/**
 * Example: How to integrate ConnectionTooltip with PrayerConnection
 *
 * This demonstrates how to replace the simple inline tooltip in PrayerConnection.tsx
 * with the rich ConnectionTooltip component.
 */

import { useState, useRef, useMemo } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import type { PrayerConnection as PrayerConnectionType } from '../../types/prayer';
import { ConnectionTooltip } from './ConnectionTooltip';

interface PrayerConnectionProps {
  connection: PrayerConnectionType & {
    prayerTitle?: string;
    responseType?: 'text' | 'audio' | 'video';
  };
  map: MapboxMap;
  updateKey: number;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}

/**
 * INTEGRATION EXAMPLE:
 * Replace the existing foreignObject tooltip in PrayerConnection.tsx
 * with the new ConnectionTooltip component.
 */
export function PrayerConnectionWithRichTooltip({
  connection,
  map,
  updateKey,
  isHovered,
  onHover,
  onLeave
}: PrayerConnectionProps) {
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  const lineRef = useRef<SVGPathElement>(null);

  // Get map dimensions (can be done once in parent component)
  useMemo(() => {
    const container = map.getContainer();
    setMapDimensions({
      width: container.offsetWidth,
      height: container.offsetHeight
    });
  }, [map]);

  // Calculate positions using useMemo
  const positions = useMemo(() => {
    const fromPoint = map.project([connection.fromLocation.lng, connection.fromLocation.lat]);
    const toPoint = map.project([connection.toLocation.lng, connection.toLocation.lat]);

    return {
      from: { x: fromPoint.x, y: fromPoint.y },
      to: { x: toPoint.x, y: toPoint.y }
    };
  }, [map, connection, updateKey]);

  const midX = (positions.from.x + positions.to.x) / 2;
  const midY = (positions.from.y + positions.to.y) / 2 - 40;
  const pathD = `M ${positions.from.x} ${positions.from.y} Q ${midX} ${midY} ${positions.to.x} ${positions.to.y}`;

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
    <>
      <g
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={onLeave}
        style={{ pointerEvents: 'auto' }}
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
              pointerEvents: 'none'
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
          style={{ pointerEvents: 'none' }}
        />
      </g>

      {/*
        REPLACE THE OLD TOOLTIP with ConnectionTooltip component
        The tooltip should be rendered outside the <g> element but still within the parent SVG
      */}
      {isHovered && tooltipPosition && (
        <foreignObject
          x={0}
          y={0}
          width="100%"
          height="100%"
          style={{ pointerEvents: 'none', overflow: 'visible' }}
        >
          <ConnectionTooltip
            connection={connection}
            position={tooltipPosition}
            visible={isHovered}
            mapDimensions={mapDimensions}
          />
        </foreignObject>
      )}
    </>
  );
}

/**
 * INTEGRATION STEPS:
 *
 * 1. Import ConnectionTooltip in PrayerConnection.tsx:
 *    import { ConnectionTooltip } from './map/ConnectionTooltip';
 *
 * 2. Add state for map dimensions (or pass from parent):
 *    const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
 *
 * 3. Get map dimensions once:
 *    useEffect(() => {
 *      const container = map.getContainer();
 *      setMapDimensions({
 *        width: container.offsetWidth,
 *        height: container.offsetHeight
 *      });
 *    }, [map]);
 *
 * 4. Replace the existing tooltip foreignObject (lines 127-147) with:
 *    {isHovered && tooltipPosition && (
 *      <foreignObject
 *        x={0}
 *        y={0}
 *        width="100%"
 *        height="100%"
 *        style={{ pointerEvents: 'none', overflow: 'visible' }}
 *      >
 *        <ConnectionTooltip
 *          connection={connection}
 *          position={tooltipPosition}
 *          visible={isHovered}
 *          mapDimensions={mapDimensions}
 *        />
 *      </foreignObject>
 *    )}
 *
 * 5. Update PrayerConnectionProps to include optional fields:
 *    interface PrayerConnectionProps {
 *      connection: PrayerConnectionType & {
 *        prayerTitle?: string;
 *        responseType?: 'text' | 'audio' | 'video';
 *      };
 *      // ... other props
 *    }
 *
 * 6. Ensure prayer service or parent component provides prayerTitle and responseType
 *    when fetching connections.
 */
