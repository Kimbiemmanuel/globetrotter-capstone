import React, { useEffect, useState } from 'react';
import { getDestinations } from './services/api';
import DestinationList from './components/DestinationList';
import DestinationDetail from './components/DestinationDetail';

export default function App() {
  const [destinations, setDestinations] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getDestinations().then(setDestinations).catch(console.error);
  }, []);

  return (
    <div style={{ display: 'flex', gap: 20, padding: 20 }}>
      <div style={{ flex: 1 }}>
        <h2>Destinations</h2>
        <DestinationList items={destinations} onSelect={setSelected} />
      </div>
      <div style={{ flex: 2 }}>
        {selected ? (
          <DestinationDetail dest={selected} onBack={() => setSelected(null)} />
        ) : (
          <div>Select a destination to view details</div>
        )}
      </div>
    </div>
  );
}
