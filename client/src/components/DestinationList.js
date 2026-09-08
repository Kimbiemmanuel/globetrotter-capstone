import React from 'react';

export default function DestinationList({ items = [], selectedId = null, onSelect }) {
  return (
    <ul className="destination-list">
      {items.map((item) => {
        const isSelected = item.id === selectedId;
        const img = item.image || '';
        const src = img.startsWith('http') ? img : img.replace(/^\/?static\/images\/?/, '/images/');

        return (
          <li key={item.id}>
            <button
              type="button"
              className={`destination-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(item)}
            >
              <img src={src} alt={item.name} />
              <div className="destination-copy">
                <div className="destination-meta-row">
                  <strong>{item.name}</strong>
                  {item.rating ? <span className="rating-pill">★ {item.rating}</span> : null}
                </div>
                <span className="destination-area">{item.area}</span>
                <p>{item.short_description || item.description}</p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
