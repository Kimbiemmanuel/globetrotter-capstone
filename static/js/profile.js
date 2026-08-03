(function () {
  const token = localStorage.getItem('gt_token');
  const authHeaders = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  function toast(msg) {
    const el = document.getElementById('toast');
    if (el) { el.textContent = msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2500); }
  }

  async function loadProfile() {
    if (!token) {
      document.getElementById('profileMsg').textContent = 'Please log in to manage your profile.';
      return;
    }
    const res = await fetch('/api/me', { headers: authHeaders });
    if (!res.ok) {
      document.getElementById('profileMsg').textContent = 'Could not load profile.';
      return;
    }
    const data = await res.json();
    const u = data.user;
    $('#profileName').value = u.name || '';
    $('#profileEmail').value = u.email || '';

    const tags = (u.preferences && u.preferences.tags) || [];
    $$('.pref-tag').forEach((chk) => { chk.checked = tags.includes(chk.value); });

    const itins = data.itineraries || [];
    $('#profileTripCount').textContent = itins.length;
    $('#profileItins').innerHTML = itins.length ? itins.map((i) => `
      <div class="profile-entry-card">
        <div class="profile-entry-head">
          <strong>${i.title}</strong>
          <span>${i.start_date || 'Flexible plan'}</span>
        </div>
        <p class="dest-area">${(i.stop_details || []).map((d) => d.name).join(' • ')}</p>
        ${i.notes ? `<p class="profile-entry-note">${i.notes}</p>` : ''}
      </div>
    `).join('') : '<p class="empty-state">No trips yet. Start one from the home page.</p>';

    const visited = data.visited || [];
    $('#profileVisitCount').textContent = visited.length;
    $('#profileVisited').innerHTML = visited.length ? visited.map((d) => `
      <div class="visited-card">
        <img src="${d.image}" alt="${d.name}" loading="lazy" onerror="this.onerror=null;this.src='/static/images/yaounde-fallback.svg'"/>
        <div>
          <strong>${d.name}</strong>
          <p class="dest-area">${d.area}</p>
        </div>
      </div>
    `).join('') : '<p class="empty-state">No visited places recorded yet.</p>';
  }

  $('#profileForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (!token) { toast('Log in first'); return; }
    const name = $('#profileName').value.trim();
    const password = $('#profilePassword').value || null;
    const tags = $$('.pref-tag').filter((c)=>c.checked).map((c)=>c.value);

    const body = { name, preferences: { tags } };
    if (password) body.password = password;

    const res = await fetch('/api/me', { method: 'PUT', headers: authHeaders, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) {
      $('#profileMsg').textContent = data.error || 'Could not update profile.';
      return;
    }
    const localUser = JSON.parse(localStorage.getItem('gt_user')||'null');
    if (localUser) { localUser.name = data.user.name; localStorage.setItem('gt_user', JSON.stringify(localUser)); }
    toast('Profile saved');
    $('#profilePassword').value = '';
  });

  document.addEventListener('DOMContentLoaded', ()=>{
    if (window.renderNavAuth) window.renderNavAuth();
    loadProfile();
  });
})();
