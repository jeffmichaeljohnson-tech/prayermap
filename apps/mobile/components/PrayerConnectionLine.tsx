import React, { memo, useMemo } from 'react';
import { ShapeSource, LineLayer, CircleLayer } from '@rnmapbox/maps';
import type { PrayerConnection } from '@/lib/types/connection';

interface PrayerConnectionLineProps {
  connections: PrayerConnection[];
}

// Vibrant ethereal colors - NO dark colors
const ETHEREAL_COLORS = {
  // Gold spectrum
  brightGold: '#FFD700',
  sunGold: '#FFDF00',
  warmGold: '#FFE55C',
  paleGold: '#FFED99',
  // Pink/Rose spectrum
  hotPink: '#FF69B4',
  rose: '#FF85A2',
  softPink: '#FFA0B4',
  palePink: '#FFBBC8',
  // Purple/Violet spectrum
  brightPurple: '#DA70D6',
  orchid: '#DA85DC',
  lavender: '#DDA0DD',
  paleLavender: '#E6BBE6',
  // White core
  white: '#FFFFFF',
  softWhite: '#FFF8F0',
};

// Create a smooth curved line between two points
function createCurvedLine(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number,
  numPoints: number = 40
): [number, number][] {
  const points: [number, number][] = [];

  const midLng = (startLng + endLng) / 2;
  const midLat = (startLat + endLat) / 2;

  // Perpendicular offset for graceful arc
  const perpLng = -(endLat - startLat) * 0.12;
  const perpLat = (endLng - startLng) * 0.12;

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

// Convert connections to curved GeoJSON
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

// Generate glowing endpoints
function generateEndpoints(connections: PrayerConnection[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  connections.forEach((conn) => {
    // Prayer location (destination)
    features.push({
      type: 'Feature',
      properties: { type: 'prayer' },
      geometry: {
        type: 'Point',
        coordinates: [conn.to_lng, conn.to_lat],
      },
    });

    // Responder location (source)
    features.push({
      type: 'Feature',
      properties: { type: 'responder' },
      geometry: {
        type: 'Point',
        coordinates: [conn.from_lng, conn.from_lat],
      },
    });
  });

  return {
    type: 'FeatureCollection',
    features,
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

  const endpointGeoJSON = useMemo(
    () => generateEndpoints(connections),
    [connections]
  );

  if (connections.length === 0) {
    return null;
  }

  return (
    <>
      {/* ============================================
          LAYER 1: Outer soft purple glow
          Wide, diffuse ethereal aura
          ============================================ */}
      <ShapeSource id="line-glow-purple" shape={curvedGeoJSON}>
        <LineLayer
          id="line-glow-purple-layer"
          style={{
            lineColor: ETHEREAL_COLORS.paleLavender,
            lineWidth: 28,
            lineOpacity: 0.3,
            lineBlur: 10,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      </ShapeSource>

      {/* ============================================
          LAYER 2: Middle pink/rose glow
          Warm middle layer
          ============================================ */}
      <ShapeSource id="line-glow-pink" shape={curvedGeoJSON}>
        <LineLayer
          id="line-glow-pink-layer"
          style={{
            lineColor: ETHEREAL_COLORS.palePink,
            lineWidth: 20,
            lineOpacity: 0.35,
            lineBlur: 6,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      </ShapeSource>

      {/* ============================================
          LAYER 3: Inner gold glow
          Warm golden core glow
          ============================================ */}
      <ShapeSource id="line-glow-gold" shape={curvedGeoJSON}>
        <LineLayer
          id="line-glow-gold-layer"
          style={{
            lineColor: ETHEREAL_COLORS.paleGold,
            lineWidth: 12,
            lineOpacity: 0.5,
            lineBlur: 3,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      </ShapeSource>

      {/* ============================================
          LAYER 4: Bright core line
          Soft white/cream visible line
          ============================================ */}
      <ShapeSource id="line-core" shape={curvedGeoJSON}>
        <LineLayer
          id="line-core-layer"
          style={{
            lineColor: ETHEREAL_COLORS.softWhite,
            lineWidth: 3,
            lineOpacity: 0.7,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      </ShapeSource>

      {/* ============================================
          LAYER 5: Endpoint markers
          Glowing halos at connection points
          ============================================ */}
      <ShapeSource id="endpoints" shape={endpointGeoJSON}>
        {/* Prayer location - purple/pink glow */}
        <CircleLayer
          id="endpoint-prayer-outer"
          filter={['==', ['get', 'type'], 'prayer']}
          style={{
            circleRadius: 16,
            circleColor: ETHEREAL_COLORS.lavender,
            circleOpacity: 0.3,
            circleBlur: 1,
          }}
        />
        <CircleLayer
          id="endpoint-prayer-mid"
          filter={['==', ['get', 'type'], 'prayer']}
          style={{
            circleRadius: 8,
            circleColor: ETHEREAL_COLORS.softPink,
            circleOpacity: 0.5,
            circleBlur: 0.5,
          }}
        />
        <CircleLayer
          id="endpoint-prayer-core"
          filter={['==', ['get', 'type'], 'prayer']}
          style={{
            circleRadius: 4,
            circleColor: ETHEREAL_COLORS.white,
            circleOpacity: 0.8,
          }}
        />

        {/* Responder location - gold glow */}
        <CircleLayer
          id="endpoint-responder-outer"
          filter={['==', ['get', 'type'], 'responder']}
          style={{
            circleRadius: 14,
            circleColor: ETHEREAL_COLORS.paleGold,
            circleOpacity: 0.35,
            circleBlur: 1,
          }}
        />
        <CircleLayer
          id="endpoint-responder-mid"
          filter={['==', ['get', 'type'], 'responder']}
          style={{
            circleRadius: 6,
            circleColor: ETHEREAL_COLORS.warmGold,
            circleOpacity: 0.6,
            circleBlur: 0.5,
          }}
        />
        <CircleLayer
          id="endpoint-responder-core"
          filter={['==', ['get', 'type'], 'responder']}
          style={{
            circleRadius: 3,
            circleColor: ETHEREAL_COLORS.white,
            circleOpacity: 0.8,
          }}
        />
      </ShapeSource>
    </>
  );
}

export const PrayerConnectionLine = memo(PrayerConnectionLineComponent);

export default PrayerConnectionLine;
