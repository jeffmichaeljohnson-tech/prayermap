import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = 'pk.eyJ1IjoiamVmZm1pY2hhZWxqb2huc29uLXRlY2giLCJhIjoiY21pM28wNWw2MXNlZDJrcHdhaHJuY3M4ZyJ9.LD85_bwC_M-3JKjhjtDhqQ';

export function MapDebug() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapStatus, setMapStatus] = useState<string>('Initializing...');

  useEffect(() => {
    if (!mapContainer.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMapStatus('Error: Container not found');
      return;
    }

    setMapStatus('Creating map...');
    console.log('Container dimensions:', {
      width: mapContainer.current.offsetWidth,
      height: mapContainer.current.offsetHeight
    });

    try {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-83.2244, 42.5256], // Beverly Hills, MI
        zoom: 13
      });

      map.on('load', () => {
        setMapStatus('Map loaded successfully! ✓');
        console.log('Map loaded!');
      });

      map.on('error', (e) => {
        setMapStatus(`Map error: ${e.error?.message || 'Unknown error'}`);
        console.error('Map error:', e);
      });

      return () => {
        map.remove();
      };
    } catch (error) {
      setMapStatus(`Exception: ${error}`);
      console.error('Map initialization error:', error);
    }
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div
        ref={mapContainer}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%'
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          backgroundColor: 'white',
          padding: '10px',
          borderRadius: '5px',
          zIndex: 1000,
          fontFamily: 'monospace',
          fontSize: '12px'
        }}
      >
        Status: {mapStatus}
      </div>
    </div>
  );
}
