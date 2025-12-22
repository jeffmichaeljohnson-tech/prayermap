import React, { memo, useMemo } from 'react';
import { ShapeSource, LineLayer } from '@rnmapbox/maps';
import type { PrayerConnection } from '@/lib/types/connection';

interface PrayerConnectionLineProps {
  connections: PrayerConnection[];
}

// Web app gradient colors - full spectrum from responder to prayer
// Direction: Responder (start) → Prayer destination (end)
// Purple → Blue → Green → Yellow → Gold
const GRADIENT_COLORS = {
  purple: '#9B59B6',      // Start - responder location
  blue: '#3498DB',        // 25% along line
  green: '#2ECC71',       // 50% along line
  yellow: '#F1C40F',      // 75% along line
  gold: '#F39C12',        // End - prayer destination
};

// Create a smooth curved line between two points
// Responder location (from) → Prayer location (to)
function createCurvedLine(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number,
  numPoints: number = 50
): [number, number][] {
  const points: [number, number][] = [];

  const midLng = (startLng + endLng) / 2;
  const midLat = (startLat + endLat) / 2;

  // Perpendicular offset for graceful arc
  const perpLng = -(endLat - startLat) * 0.15;
  const perpLat = (endLng - startLng) * 0.15;

  const controlLng = midLng + perpLng;
  const controlLat = midLat + perpLat;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const invT = 1 - t;
    const lng = invT * invT * startLng + 2 * invT * t * controlLng + t * t * endLng;
    const lat = invT * invT * startLat + 2 * invT * t * controlLat + t * t * endLat;
    points.push([lng, lat]);
  }

  return points;
}

// Convert connections to curved GeoJSON with lineMetrics support
function connectionsToCurvedGeoJSON(connections: PrayerConnection[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: connections.map((conn, index) => ({
      type: 'Feature',
      id: conn.id,
      properties: {
        id: conn.id,
        index: index,
      },
      geometry: {
        type: 'LineString',
        // from = responder location (gradient start: purple)
        // to = prayer location (gradient end: gold)
        coordinates: createCurvedLine(
          conn.from_lng,
          conn.from_lat,
          conn.to_lng,
          conn.to_lat
        ),
      },
    })),
  };
}

function PrayerConnectionLineComponent({
  connections,
}: PrayerConnectionLineProps) {
  // Memoize GeoJSON data
  const curvedGeoJSON = useMemo(
    () => connectionsToCurvedGeoJSON(connections),
    [connections]
  );

  if (connections.length === 0) {
    return null;
  }

  return (
    <>
      {/* ============================================
          Subtle outer glow for ethereal effect
          Much thinner than before to match web app
          ============================================ */}
      <ShapeSource
        id="line-glow"
        shape={curvedGeoJSON}
        lineMetrics={true}
      >
        <LineLayer
          id="line-glow-layer"
          slot="top"
          style={{
            lineWidth: 8,
            lineOpacity: 0.3,
            lineBlur: 4,
            lineCap: 'round',
            lineJoin: 'round',
            lineEmissiveStrength: 1,
            // Gradient glow matching the main line colors
            lineGradient: [
              'interpolate',
              ['linear'],
              ['line-progress'],
              0, GRADIENT_COLORS.purple,
              0.25, GRADIENT_COLORS.blue,
              0.5, GRADIENT_COLORS.green,
              0.75, GRADIENT_COLORS.yellow,
              1, GRADIENT_COLORS.gold,
            ],
          }}
        />
      </ShapeSource>

      {/* ============================================
          Main gradient line - thin and elegant
          Full spectrum: Purple → Blue → Green → Yellow → Gold
          lineMetrics must be true for lineGradient to work
          ============================================ */}
      <ShapeSource
        id="line-gradient"
        shape={curvedGeoJSON}
        lineMetrics={true}
      >
        <LineLayer
          id="line-gradient-layer"
          slot="top"
          style={{
            lineWidth: 3,
            lineOpacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
            lineEmissiveStrength: 1, // Glow in night mode
            // Full spectrum gradient along the line
            // 0 = start (responder/purple) → 1 = end (prayer/gold)
            lineGradient: [
              'interpolate',
              ['linear'],
              ['line-progress'],
              0, GRADIENT_COLORS.purple,
              0.25, GRADIENT_COLORS.blue,
              0.5, GRADIENT_COLORS.green,
              0.75, GRADIENT_COLORS.yellow,
              1, GRADIENT_COLORS.gold,
            ],
          }}
        />
      </ShapeSource>

      {/* ============================================
          Bright center highlight for "glowing" effect
          Thin white/light core that makes it pop
          ============================================ */}
      <ShapeSource
        id="line-highlight"
        shape={curvedGeoJSON}
        lineMetrics={true}
      >
        <LineLayer
          id="line-highlight-layer"
          slot="top"
          style={{
            lineWidth: 1,
            lineOpacity: 0.6,
            lineCap: 'round',
            lineJoin: 'round',
            lineEmissiveStrength: 1,
            lineColor: 'rgba(255, 255, 255, 0.8)',
          }}
        />
      </ShapeSource>
    </>
  );
}

export const PrayerConnectionLine = memo(PrayerConnectionLineComponent);

export default PrayerConnectionLine;
