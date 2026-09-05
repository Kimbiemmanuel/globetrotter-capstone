import React from 'react';

export default function DestinationList({ items = [], onSelect }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {items.map(item => (
        <li key={item.id} style={{ marginBottom: 12, cursor: 'pointer' }} onClick={() => onSelect(item)}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {(() => {
              const img = item.image || '';
              const src = img.startsWith('http')
                ? img
                : img.replace(/^\/?static\/images\/?/, '/images/');
              return <img src={src} alt={item.name} style={{ width: 80, height: 60, objectFit: 'cover' }} />;
            })()}
            <div>
              <strong>{item.name}</strong>
              <div style={{ fontSize: 12 }}>{item.short_description || item.description}</div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
