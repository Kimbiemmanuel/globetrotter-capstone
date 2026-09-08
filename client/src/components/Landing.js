import React, { useState } from 'react';

export default function Landing({ onEnter }) {
  const [name, setName] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const user = (name || 'Guest').trim();
    localStorage.setItem('globetrotter_user', user);
    onEnter(user);
  }

  return (
    <div className="landing-root">
      <div className="landing-card">
        <img src="/images/I%20Love%20Cameroon.jpeg" alt="I Love Cameroon" className="landing-hero" />
        <div className="landing-copy">
          <h1>Welcome to GlobeTrotter</h1>
          <p>Discover Yaoundé’s best places. Get distances and directions from your phone.</p>
          <form onSubmit={handleSubmit} className="landing-form">
            <label className="sr-only">Your name</label>
            <input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="landing-input"
            />
            <button type="submit" className="primary-button landing-cta">Enter</button>
          </form>
          <small className="muted">By entering you accept this demo's simple client-side login.</small>
        </div>
      </div>
    </div>
  );
}
