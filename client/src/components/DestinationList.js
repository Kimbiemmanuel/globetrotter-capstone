import React from 'react';

export default function DestinationList({ items = [], onSelect }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {items.map(item => (
        <li key={item.id} style={{ marginBottom: 12, cursor: 'pointer' }} onClick={() => onSelect(item)}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <img src={`/images/${item.image}`} alt={item.name} style={{ width: 80, height: 60, objectFit: 'cover' }} />
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
