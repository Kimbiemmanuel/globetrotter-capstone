import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

function haversine(lat1, lon1, lat2, lon2) {
  function toRad(x) { return (x * Math.PI) / 180; }
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    L.marker([dest.lat, dest.lng]).addTo(map).bindPopup(dest.name);
    mapRef.current = map;
  }, [dest]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPos({ latitude, longitude });
        const d = haversine(latitude, longitude, dest.lat, dest.lng);
        setDistanceKm(d.toFixed(2));

        if (mapRef.current) {
          if (userMarkerRef.current) {
            mapRef.current.removeLayer(userMarkerRef.current);
            userMarkerRef.current = null;
          }
          if (routeLayerRef.current) {
            mapRef.current.removeLayer(routeLayerRef.current);
            routeLayerRef.current = null;
          }

          userMarkerRef.current = L.marker([latitude, longitude], { title: 'You' })
            .addTo(mapRef.current)
            .bindPopup('You');

          mapRef.current.fitBounds([[latitude, longitude], [dest.lat, dest.lng]], { padding: [50, 50] });

          try {
            const url = `https://router.project-osrm.org/route/v1/driving/${longitude},${latitude};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.routes && data.routes.length) {
              const route = data.routes[0];
              const coords = route.geometry.coordinates.map((coord) => [coord[1], coord[0]]);
              routeLayerRef.current = L.polyline(coords, { color: '#2563eb', weight: 4 }).addTo(mapRef.current);
              mapRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [50, 50] });
              setEta(Math.round(route.duration / 60));
            }
          } catch (error) {
            console.warn('Routing error', error);
          }
        }
      },
      (error) => {
        console.warn('Geolocation error', error);
      }
    );
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

  const img = dest.image || '';
  const src = img.startsWith('http') ? img : img.replace(/^\/?static\/images\/?/, '/images/');

  return (
    <article className="detail-card">
      <div className="detail-toolbar">
        <button type="button" className="back-button" onClick={onBack}>
          ← Back
        </button>
        <span className="badge">{dest.category}</span>
      </div>

      <h2>{dest.name}</h2>
      <div className="detail-image-wrap">
        <img src={src} alt={dest.name} className="detail-image" />
      </div>

      <p className="detail-description">{dest.description}</p>

      <div className="meta-grid">
        <div className="metric-box">
          <span className="label">Distance</span>
          <strong>{distanceKm ? `${distanceKm} km` : 'Allow location'}</strong>
        </div>
        <div className="metric-box">
          <span className="label">Travel time</span>
          <strong>{eta ? `${eta} min` : 'Not available'}</strong>
        </div>
      </div>

      <div className="map-wrap" ref={mapContainerRef} />

      <div className="detail-actions">
        <button type="button" className="primary-button" onClick={openDirections}>
          Get directions
        </button>
      </div>
    </article>
  );
}
