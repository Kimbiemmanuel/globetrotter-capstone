(() => {
  const place = window.__PLACE__;
  if (!place || typeof L === "undefined") return;

  const hero = document.getElementById("placeHeroImg");
  const travelInfo = document.getElementById("travelInfo");
  const locateBtn = document.getElementById("locateBtn");
  const addBtn = document.getElementById("placeAddBtn");

  document.querySelectorAll(".gallery-thumb").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".gallery-thumb").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      if (hero) hero.src = btn.dataset.src;
    });
  });

  const map = L.map("placeMap", { scrollWheelZoom: false }).setView([place.lat, place.lng], 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  const placeMarker = L.marker([place.lat, place.lng]).addTo(map)
    .bindPopup(`<strong>${place.name}</strong><br>${place.area}`);
  placeMarker.openPopup();

  let userMarker = null;
  let routeLine = null;

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function haversineKm(a, b) {
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function formatTravel(km) {
    const walkMin = Math.round((km / 5) * 60);
    const driveMin = Math.max(3, Math.round((km / 22) * 60));
    const dist = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
    const walk = walkMin < 60 ? `${walkMin} min walk` : `${(walkMin / 60).toFixed(1)} h walk`;
    const drive = driveMin < 60 ? `${driveMin} min by car` : `${(driveMin / 60).toFixed(1)} h by car`;
    return `${dist} from your location · about ${walk} or ${drive} (city estimate).`;
  }

  function showUserLocation(lat, lng) {
    const user = { lat, lng };
    const dest = { lat: place.lat, lng: place.lng };
    const km = haversineKm(user, dest);

    if (userMarker) map.removeLayer(userMarker);
    if (routeLine) map.removeLayer(routeLine);

    userMarker = L.circleMarker([lat, lng], {
      radius: 8,
      color: "#0f4c81",
      fillColor: "#2bb7ff",
      fillOpacity: 0.9,
    }).addTo(map).bindPopup("You are here");

    routeLine = L.polyline([[lat, lng], [place.lat, place.lng]], {
      color: "#1d6fb8",
      weight: 3,
      dashArray: "6 8",
      opacity: 0.85,
    }).addTo(map);

    map.fitBounds(L.latLngBounds([userMarker.getLatLng(), placeMarker.getLatLng()]), {
      padding: [36, 36],
    });

    if (travelInfo) travelInfo.textContent = formatTravel(km);

    const maps = document.getElementById("openMapsLink");
    if (maps) {
      maps.href = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${lat}%2C${lng}%3B${place.lat}%2C${place.lng}`;
    }
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      if (travelInfo) travelInfo.textContent = "Geolocation is not supported in this browser.";
      return;
    }
    if (travelInfo) travelInfo.textContent = "Locating you…";
    navigator.geolocation.getCurrentPosition(
      (pos) => showUserLocation(pos.coords.latitude, pos.coords.longitude),
      () => {
        if (travelInfo) {
          travelInfo.textContent = "Location permission denied. You can still open the map link above.";
        }
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  if (locateBtn) locateBtn.addEventListener("click", requestLocation);
  requestLocation();

  if (addBtn && window.GlobeTrotter) {
    const sync = () => {
      const selected = window.GlobeTrotter.isSelected(place.id);
      addBtn.classList.toggle("added", selected);
      addBtn.textContent = selected ? "Added ✓" : "Add to trip";
    };
    sync();
    addBtn.addEventListener("click", () => {
      window.GlobeTrotter.toggleStop(place.id);
      sync();
    });
  }

  setTimeout(() => map.invalidateSize(), 200);
})();
