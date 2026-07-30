(() => {
  const token = localStorage.getItem("gt_token");
  const user = JSON.parse(localStorage.getItem("gt_user") || "null");

  if (!token || !user) {
    window.location.href = "/";
    return;
  }

  const $ = (sel) => document.querySelector(sel);

  function initials(name) {
    return (name || "G")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("") || "G";
  }

  function fillHero(u) {
    $("#profileAvatar").textContent = initials(u.name);
    $("#profileHeroName").textContent = u.name;
    $("#profileHeroEmail").textContent = u.email;
  }

  async function loadProfile() {
    const res = await fetch("/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      localStorage.removeItem("gt_token");
      localStorage.removeItem("gt_user");
      window.location.href = "/";
      return;
    }
    const data = await res.json();
    const u = data.user;
    fillHero(u);
    $("#profileName").value = u.name || "";
    $("#profileEmail").value = u.email || "";
    document.querySelectorAll(".pref-tag").forEach((cb) => {
      cb.checked = (u.preferences?.tags || []).includes(cb.value);
    });

    const itins = data.itineraries || [];
    $("#profileItins").innerHTML = itins.length
      ? itins
          .map(
            (i) => `
        <article class="profile-trip">
          <div>
            <h3>${i.title}</h3>
            <p>${i.start_date || "No date"} · ${(i.stop_details || []).length} stops</p>
          </div>
          <div class="itin-stops">
            ${(i.stop_details || [])
              .map((d) => `<a class="itin-stop-chip" href="/place/${d.id}">${d.name}</a>`)
              .join("")}
          </div>
        </article>`
          )
          .join("")
      : `<p class="empty-state">No trips yet. Browse destinations and tap <strong>Add to trip</strong>.</p>`;

    const visited = data.visited || [];
    $("#profileVisited").innerHTML = visited.length
      ? visited
          .map(
            (d) => `
        <a class="profile-visited-card" href="/place/${d.id}">
          <img src="${d.image}" alt="${d.name}" loading="lazy" onerror="this.onerror=null;this.src='/static/images/yaounde-fallback.svg';">
          <div>
            <strong>${d.name}</strong>
            <p>${d.area || ""}</p>
          </div>
        </a>`
          )
          .join("")
      : `<p class="empty-state">Places from completed trips will show up here.</p>`;
  }

  $("#profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#profileName").value.trim();
    const password = $("#profilePassword").value;
    const tags = Array.from(document.querySelectorAll(".pref-tag:checked")).map((i) => i.value);
    const body = { name, preferences: { tags } };
    if (password) body.password = password;

    const res = await fetch("/api/me", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const msg = $("#profileMsg");
    if (!res.ok) {
      msg.textContent = data.error || "Could not update profile.";
      return;
    }
    msg.style.color = "var(--success)";
    msg.textContent = "Profile saved.";
    localStorage.setItem("gt_user", JSON.stringify({ ...user, name: data.user.name, email: data.user.email }));
    fillHero(data.user);
    if (window.renderNavAuth) window.renderNavAuth();
    $("#profilePassword").value = "";
  });

  fillHero(user);
  loadProfile();
})();
