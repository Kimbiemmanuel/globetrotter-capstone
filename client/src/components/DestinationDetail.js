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
  const [userPos, setUserPos] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);

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
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      setUserPos({ latitude, longitude });
      const d = haversine(latitude, longitude, dest.lat, dest.lng);
      setDistanceKm(d.toFixed(2));
      if (mapRef.current) {
        L.marker([latitude, longitude], { title: 'You' }).addTo(mapRef.current).bindPopup('You');
        mapRef.current.fitBounds([[latitude, longitude], [dest.lat, dest.lng]], { padding: [50,50] });
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
      </div>
      <div style={{ marginTop: 8 }}>
        <button onClick={openDirections}>Get Directions</button>
      </div>
    </div>
  );
}
