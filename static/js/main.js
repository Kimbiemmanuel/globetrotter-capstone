(() => {
  const state = {
    destinations: [],
    selectedStops: new Set(),
    activeCategory: "",
    token: localStorage.getItem("gt_token") || null,
    user: JSON.parse(localStorage.getItem("gt_user") || "null"),
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2600);
  }

  function authHeaders() {
    return state.token ? { Authorization: `Bearer ${state.token}` } : {};
  }

  function renderNavAuth() {
    const nav = $("#navAuth");
    const heroCta = $("#heroCreateAccount");
    if (heroCta) heroCta.style.display = state.user ? "none" : "inline-block";
    if (!nav) return;
    if (state.user) {
      nav.innerHTML = `
        <a href="/profile" class="nav-user-pill">
          <span class="nav-user-avatar">${state.user.name.charAt(0).toUpperCase()}</span>
          <span class="nav-user-meta">
            <strong>Hi, ${state.user.name.split(" ")[0]}</strong>
            <small>Profile</small>
          </span>
        </a>
        <button class="btn btn-ghost" id="logoutBtn">Log out</button>`;
      $("#logoutBtn").addEventListener("click", logout);
    } else {
      nav.innerHTML = `
        <button class="btn btn-ghost" data-open="login">Log in</button>
        <button class="btn btn-solid" data-open="register">Sign up</button>`;
      bindOpenTriggers();
    }
  }

  window.renderNavAuth = renderNavAuth;

  function logout() {
    state.token = null;
    state.user = null;
    localStorage.removeItem("gt_token");
    localStorage.removeItem("gt_user");
    renderNavAuth();
    loadRecommendations();
    renderItinerarySection();
    toast("Logged out");
  }

  function openModal(which) {
    const backdrop = $("#modalBackdrop");
    if (!backdrop) return;
    backdrop.classList.add("open");
    $("#panelLogin").classList.toggle("hidden", which !== "login");
    $("#panelRegister").classList.toggle("hidden", which !== "register");
  }
  function closeModal() {
    const backdrop = $("#modalBackdrop");
    if (!backdrop) return;
    backdrop.classList.remove("open");
    $("#loginError").textContent = "";
    $("#regError").textContent = "";
  }
  function bindOpenTriggers() {
    $$("[data-open]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        openModal(btn.dataset.open);
      });
    });
  }
  $("#modalClose")?.addEventListener("click", closeModal);
  $("#modalBackdrop")?.addEventListener("click", (e) => {
    if (e.target.id === "modalBackdrop") closeModal();
  });

  async function loadDestinations() {
    const res = await fetch("/destinations");
    const data = await res.json();
    state.destinations = data.destinations;
    populateCategoryFilter();
    renderCategoryPills();
    renderDestinationGrid(state.destinations);
    renderCredits();
  }

  function populateCategoryFilter() {
    const select = $("#categorySelect");
    if (!select) return;
    const categories = [...new Set(state.destinations.map((d) => d.category).filter(Boolean))];
    select.innerHTML = '<option value="">All categories</option>';
    categories.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      select.appendChild(opt);
    });
    select.value = state.activeCategory;
  }

  function renderCategoryPills() {
    const container = $("#categoryPills");
    if (!container) return;
    const categories = [...new Set(state.destinations.map((d) => d.category).filter(Boolean))];
    container.innerHTML = categories.map((c) => `
      <button class="category-pill ${state.activeCategory === c ? "active" : ""}" data-category="${c}">
        ${c}
      </button>`).join("");
    container.querySelectorAll(".category-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activeCategory = btn.dataset.category;
        renderCategoryPills();
        populateCategoryFilter();
        filterDestinations();
      });
    });
  }

  function destCard(d, idx) {
    const added = state.selectedStops.has(d.id);
    return `
      <article class="dest-card" style="animation-delay:${idx * 0.06}s" data-id="${d.id}">
        <div class="dest-photo">
          <img src="${d.image}" alt="${d.name}" loading="lazy" onerror="this.onerror=null;this.src='/static/images/yaounde-fallback.svg';">
          <span class="dest-rating">★ ${d.rating}</span>
        </div>
        <div class="dest-body">
          <span class="dest-cat">${d.category}</span>
          <h3>${d.name}</h3>
          <p class="dest-area">${d.area}</p>
          <p class="dest-desc">${d.description}</p>
          <div class="dest-actions">
            <span class="dest-credit">📷 ${d.credit}</span>
            <button class="add-btn ${added ? "added" : ""}" data-id="${d.id}" type="button">
              ${added ? "Added ✓" : "Add to trip"}
            </button>
          </div>
        </div>
      </article>`;
  }

  function renderDestinationGrid(list) {
    const grid = $("#destinationGrid");
    if (!grid) return;
    grid.innerHTML = list.length
      ? list.map((d, i) => destCard(d, i)).join("")
      : `<p class="loading">No destinations match your search.</p>`;
    bindAddButtons(grid);
    bindDestinationCards(grid);
  }

  function bindAddButtons(scopeEl) {
    scopeEl.querySelectorAll(".add-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (state.selectedStops.has(id)) {
          state.selectedStops.delete(id);
          btn.classList.remove("added");
          btn.textContent = "Add to trip";
        } else {
          state.selectedStops.add(id);
          btn.classList.add("added");
          btn.textContent = "Added ✓";
        }
        $("#selectedCount").textContent = state.selectedStops.size;
      });
    });
  }

  function bindDestinationCards(scopeEl) {
    scopeEl.querySelectorAll(".dest-card").forEach((card) => {
      card.addEventListener("click", () => {
        const dest = state.destinations.find((d) => d.id === card.dataset.id);
        if (dest) openDestinationModal(dest);
      });
    });
  }

  function renderCredits() {
    const unique = [...new Set(state.destinations.map((d) => d.credit))];
    const credits = $("#creditsList");
    if (credits) credits.textContent = `Destination photography: ${unique.join(", ")}.`;
  }

  $("#searchInput")?.addEventListener("input", filterDestinations);
  $("#categorySelect")?.addEventListener("change", (e) => {
    state.activeCategory = e.target.value;
    renderCategoryPills();
    filterDestinations();
  });

  function filterDestinations() {
    const q = $("#searchInput").value.trim().toLowerCase();
    const cat = state.activeCategory || $("#categorySelect").value;
    const filtered = state.destinations.filter((d) => {
      const matchQ = !q || d.name.toLowerCase().includes(q) || d.area.toLowerCase().includes(q) || (d.tags || []).some((t) => t.includes(q));
      const matchCat = !cat || d.category === cat;
      return matchQ && matchCat;
    });
    renderDestinationGrid(filtered);
  }

  function openDestinationModal(dest) {
    const backdrop = $("#detailModalBackdrop");
    const content = $("#detailModalContent");
    if (!backdrop || !content) return;
    const images = dest.images || [dest.image];
    const details = dest.details || {};
    const highlights = Array.isArray(details.highlights) ? details.highlights : [];
    const gallery = images.map((img, index) => `
      <button type="button" class="thumb ${index === 0 ? "active" : ""}" data-image="${img}">
        <img src="${img}" alt="${dest.name} view ${index + 1}" loading="lazy" onerror="this.onerror=null;this.src='/static/images/yaounde-fallback.svg';">
      </button>`).join("");
    const mapEmbed = `https://www.openstreetmap.org/export/embed.html?bbox=${(dest.lng || 11.5203) - 0.01}%2C${(dest.lat || 3.8667) - 0.01}%2C${(dest.lng || 11.5203) + 0.01}%2C${(dest.lat || 3.8667) + 0.01}&layer=mapnik&marker=${dest.lat || 3.8667}%2C${dest.lng || 11.5203}`;
    content.innerHTML = `
      <div class="detail-gallery">
        <img class="detail-main-image" id="detailMainImage" src="${images[0]}" alt="${dest.name}" onerror="this.onerror=null;this.src='/static/images/yaounde-fallback.svg';">
        <div class="detail-thumbs">${gallery}</div>
      </div>
      <div class="detail-copy">
        <p class="eyebrow">${dest.category}</p>
        <h3>${dest.name}</h3>
        <p class="dest-area">${dest.area}</p>
        <p>${details.overview || dest.description}</p>
        <div class="detail-meta">
          <div>
            <strong>Why it stands out</strong>
            <p>${details.story || "A local favourite with plenty of charm and character."}</p>
          </div>
          <div>
            <strong>Highlights</strong>
            <ul>${highlights.map((item) => `<li>${item}</li>`).join("")}</ul>
          </div>
        </div>
        <iframe class="detail-map" title="Map for ${dest.name}" src="${mapEmbed}"></iframe>
        <div class="detail-actions">
          <button class="btn btn-outline" id="routeBtn" type="button">Get route info</button>
        </div>
        <p class="route-answer" id="routeAnswer">This live map is embedded directly in the card view and route estimates are available from your location.</p>
      </div>`;
    backdrop.classList.remove("hidden");
    content.querySelectorAll(".thumb").forEach((btn) => {
      btn.addEventListener("click", () => {
        const img = content.querySelector("#detailMainImage");
        if (img) img.src = btn.dataset.image;
        content.querySelectorAll(".thumb").forEach((item) => item.classList.toggle("active", item === btn));
      });
    });
    $("#routeBtn")?.addEventListener("click", () => getRouteInfo(dest));
  }

  function closeDestinationModal() {
    $("#detailModalBackdrop")?.classList.add("hidden");
  }

  $("#detailModalClose")?.addEventListener("click", closeDestinationModal);
  $("#detailModalBackdrop")?.addEventListener("click", (e) => {
    if (e.target.id === "detailModalBackdrop") closeDestinationModal();
  });

  function getRouteInfo(dest) {
    const answer = $("#routeAnswer");
    if (!answer) return;
    if (!navigator.geolocation) {
      answer.textContent = "Location access is unavailable in this browser.";
      return;
    }
    answer.textContent = "Finding your route…";
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const origin = `${pos.coords.longitude},${pos.coords.latitude}`;
      const destination = `${dest.lng || 11.5203},${dest.lat || 3.8667}`;
      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${origin};${destination}?overview=false`);
        const data = await res.json();
        if (!data.routes?.length) throw new Error("No route");
        const route = data.routes[0];
        const kilometers = (route.distance / 1000).toFixed(1);
        const minutes = Math.max(1, Math.round(route.duration / 60));
        answer.textContent = `Approx. ${kilometers} km • ${minutes} min from your current location.`;
      } catch (error) {
        answer.textContent = "Route lookup was unavailable, but you can still open the location map.";
      }
    }, () => {
      answer.textContent = "Please allow location access to estimate travel time.";
    });
  }

  async function loadRecommendations() {
    const res = await fetch("/recommendations", { headers: authHeaders() });
    const data = await res.json();
    $("#recNote").textContent = data.personalized
      ? "Personalized for your saved interests and past trips."
      : "Showing top-rated picks. Log in for recommendations based on your preferences and past trips.";
    $("#recGrid").innerHTML = data.recommendations.map((d, i) => destCard(d, i)).join("");
    bindAddButtons($("#recGrid"));
    bindDestinationCards($("#recGrid"));
  }

  $("#registerForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#regName").value.trim();
    const email = $("#regEmail").value.trim();
    const password = $("#regPassword").value;
    const tags = $$("#panelRegister .tag-fieldset input:checked").map((i) => i.value);

    const res = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, preferred_tags: tags }),
    });
    const data = await res.json();
    if (!res.ok) {
      $("#regError").textContent = data.error || "Something went wrong.";
      return;
    }
    onAuthSuccess(data);
  });

  $("#loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      $("#loginError").textContent = data.error || "Invalid credentials.";
      return;
    }
    onAuthSuccess(data);
  });

  function onAuthSuccess(data) {
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("gt_token", state.token);
    localStorage.setItem("gt_user", JSON.stringify(state.user));
    closeModal();
    renderNavAuth();
    toast(`Welcome, ${data.user.name.split(" ")[0]}!`);
    loadRecommendations();
    renderItinerarySection();
    loadItineraries();
  }

  function renderItinerarySection() {
    const form = $("#itinForm");
    const note = $("#itinNote");
    if (state.user) {
      form.classList.remove("hidden");
      note.textContent = "Tap \"Add to trip\" on destinations above, then save your itinerary here.";
    } else {
      form.classList.add("hidden");
      note.textContent = "Log in to create an itinerary from the destinations above.";
      $("#itinList").innerHTML = "";
    }
  }

  $("#itinForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (state.selectedStops.size === 0) {
      toast("Add at least one destination to your trip first.");
      return;
    }
    const body = {
      title: $("#itinTitle").value.trim(),
      start_date: $("#itinDate").value || null,
      notes: $("#itinNotes").value.trim(),
      stops: [...state.selectedStops],
    };
    const res = await fetch("/itineraries", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Could not save itinerary.");
      return;
    }
    toast("Itinerary saved!");
    $("#itinForm").reset();
    state.selectedStops.clear();
    $("#selectedCount").textContent = 0;
    renderDestinationGrid(state.destinations);
    loadItineraries();
  });

  async function loadItineraries() {
    if (!state.user) return;
    const res = await fetch("/itineraries", { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    $("#itinList").innerHTML = data.itineraries.map(itinCard).join("");
    bindShareForms();
  }

  function itinCard(i) {
    const stops = (i.stop_details || []).map((d) => `<span class="itin-stop-chip">${d.name}</span>`).join("");
    return `
      <div class="itin-card">
        <h4>${i.title}</h4>
        <p class="dest-area">${i.start_date ? "Starting " + i.start_date : "No date set"}${i.notes ? " · " + i.notes : ""}</p>
        <div class="itin-stops">${stops}</div>
        <div class="share-row">
          <input type="email" placeholder="Share with email…" data-share="${i.id}">
          <button class="btn btn-outline" data-share-btn="${i.id}">Share</button>
        </div>
      </div>`;
  }

  function bindShareForms() {
    $$("[data-share-btn]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.shareBtn;
        const input = document.querySelector(`[data-share="${id}"]`);
        const email = input.value.trim();
        if (!email) return;
        const res = await fetch(`/itineraries/${id}/share`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        toast(res.ok ? data.message : data.error);
        if (res.ok) input.value = "";
      });
    });
  }

  bindOpenTriggers();
  renderNavAuth();
  renderItinerarySection();
  loadDestinations().then(loadRecommendations);
  if (state.user) loadItineraries();
})();
