import React, { useEffect, useState } from 'react';
import { getDestinations } from './services/api';
import DestinationList from './components/DestinationList';
import DestinationDetail from './components/DestinationDetail';
import Landing from './components/Landing';

export default function App() {
  const [destinations, setDestinations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [user, setUser] = useState(() => localStorage.getItem('globetrotter_user') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDestinations()
      .then((items) => {
        setDestinations(items);
        if (items.length) setSelectedId(items[0].id);
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => setLoading(false));
  }, []);

  const selected = destinations.find((destination) => destination.id === selectedId) || null;

  if (!user) {
    return <Landing onEnter={(u) => setUser(u)} />;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Travel planner</p>
          <h1>GlobeTrotter</h1>
        </div>
        <button className="primary-button" type="button">
          Explore Yaoundé
        </button>
      </header>

      <main className="layout-grid">
        <aside className="sidebar-panel">
          <div className="panel-header">
            <h2>Destinations</h2>
            <span>{destinations.length} spots</span>
          </div>

          {loading ? (
            <div className="state-card">Loading destinations...</div>
          ) : (
            <DestinationList
              items={destinations}
              selectedId={selectedId}
              onSelect={(item) => setSelectedId(item.id)}
            />
          )}
        </aside>

        <section className="detail-panel">
          {selected ? (
            <DestinationDetail dest={selected} onBack={() => setSelectedId(null)} />
          ) : (
            <div className="state-card empty-state">
              <h3>Choose a destination</h3>
              <p>Select a place from the list to view details, route guidance, and distance from your location.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
