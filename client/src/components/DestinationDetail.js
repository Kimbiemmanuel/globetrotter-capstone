import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

function haversine(lat1, lon1, lat2, lon2) {
  function toRad(x) { return x * Math.PI / 180; }
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function DestinationDetail({ dest, onBack }) {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const [userPos, setUserPos] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [eta, setEta] = useState(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) mapRef.current.remove();

    const map = L.map(mapContainerRef.current).setView([dest.lat, dest.lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    L.marker([dest.lat, dest.lng]).addTo(map).bindPopup(dest.name);
    mapRef.current = map;
  }, [dest]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      setUserPos({ latitude, longitude });
      const d = haversine(latitude, longitude, dest.lat, dest.lng);
      setDistanceKm(d.toFixed(2));

      if (mapRef.current) {
        // remove old user marker
        if (userMarkerRef.current) {
          mapRef.current.removeLayer(userMarkerRef.current);
          userMarkerRef.current = null;
        }
        userMarkerRef.current = L.marker([latitude, longitude], { title: 'You' }).addTo(mapRef.current).bindPopup('You');

        // remove old route layer
        if (routeLayerRef.current) {
          mapRef.current.removeLayer(routeLayerRef.current);
          routeLayerRef.current = null;
        }

        mapRef.current.fitBounds([[latitude, longitude], [dest.lat, dest.lng]], { padding: [50,50] });

        // fetch route from OSRM public server and draw it
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${longitude},${latitude};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.routes && data.routes.length) {
            const route = data.routes[0];
            const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
            routeLayerRef.current = L.polyline(coords, { color: 'blue', weight: 4 }).addTo(mapRef.current);
            mapRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [50,50] });
            // duration in seconds -> minutes
            setEta(Math.round(route.duration / 60));
          }
        } catch (e) {
          console.warn('Routing error', e);
        }
      }
    }, err => {
      console.warn('Geolocation error', err);
    });
  }, [dest]);

  function openDirections() {
    if (!userPos) {
      alert('Please allow location access to get directions from your position.');
      return;
    }
    const origin = `${userPos.latitude},${userPos.longitude}`;
    const destination = `${dest.lat},${dest.lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    window.open(url, '_blank');
  }

  return (
    <div>
      <button onClick={onBack}>Back</button>
      <h2>{dest.name}</h2>
      {(() => {
        const img = dest.image || '';
        const src = img.startsWith('http')
          ? img
          : img.replace(/^\/?static\/images\/?/, '/images/');
        return <img src={src} alt={dest.name} style={{ width: '100%', maxHeight: 400, objectFit: 'cover' }} />;
      })()}
      <p>{dest.description}</p>
      <div style={{ height: 300 }} ref={mapContainerRef}></div>
      <div style={{ marginTop: 10 }}>
        <strong>Distance:</strong> {distanceKm ? `${distanceKm} km` : 'Allow location to calculate'}
        <div>
          <strong>Estimated travel time:</strong> {eta ? `${eta} min` : '—'}
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <button onClick={openDirections}>Get Directions</button>
      </div>
    </div>
  );
}
