// search-hubs.js – Browse & filter working hubs

let allHubs = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    await loadCities();
    await loadHubs();

    // Pre-fill city from URL param (coming from home hero search)
    const city = getParam('city');
    if (city) {
        document.getElementById('filter-city').value = city;
        filterHubs();
    }
});

// ── City Dropdown ──────────────────────────────

async function loadCities() {
    try {
        const res = await fetch(`${API_URL}/hubs`);
        const result = await res.json();
        const cities = [...new Set((result.data || []).map(h => h.city))].sort();
        const sel = document.getElementById('filter-city');
        cities.forEach(c => sel.innerHTML += `<option value="${c}">${c}</option>`);
    } catch (e) {
        console.error('Error loading cities:', e);
    }
}

// ── Load & Display Hubs ────────────────────────

async function loadHubs() {
    const grid = document.getElementById('hubs-grid');
    grid.innerHTML = loadingHTML('Loading hubs...');
    try {
        const res = await fetch(`${API_URL}/hubs`);
        const result = await res.json();
        allHubs = result.data || [];
        displayHubs(allHubs);
    } catch (e) {
        grid.innerHTML = noDataHTML('fa-exclamation-circle', 'Error loading hubs', 'Please try again later.');
    }
}

function displayHubs(hubs) {
    const grid = document.getElementById('hubs-grid');
    if (!hubs.length) {
        grid.innerHTML = noDataHTML('fa-inbox', 'No hubs found', 'Try adjusting your filters.');
        return;
    }

    grid.innerHTML = hubs.map(hub => `
        <div class="hub-card" onclick="location.href='hub-workspaces.html?hub_id=${hub.id}'">
            <div class="hub-card-header">
                <h3>${hub.name}</h3>
                <div class="hub-location">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${hub.city}, ${hub.state}</span>
                </div>
            </div>
            <div class="hub-card-body">
                <div class="hub-info">
                    <div class="hub-info-item">
                        <i class="fas fa-location-arrow"></i>
                        <span>${hub.address}</span>
                    </div>
                    <div class="hub-info-item">
                        <i class="fas fa-map-pin"></i>
                        <span>${hub.pincode}, ${hub.country}</span>
                    </div>
                </div>
                <div class="hub-stats">
                    <div class="hub-stat">
                        <div class="number" id="hub-${hub.id}-ws">—</div>
                        <div class="label">Workspaces</div>
                    </div>
                    <div class="hub-stat">
                        <div class="number"><i class="fas fa-arrow-right"></i></div>
                        <div class="label">View Details</div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    hubs.forEach(hub => loadWorkspaceCount(hub.id));
}

async function loadWorkspaceCount(hubId) {
    try {
        const res = await fetch(`${API_URL}/workspaces?hub_id=${hubId}`);
        const result = await res.json();
        const el = document.getElementById(`hub-${hubId}-ws`);
        if (el) el.textContent = (result.data || []).length;
    } catch {}
}

// ── Filter ─────────────────────────────────────

function filterHubs() {
    const city   = document.getElementById('filter-city').value.toLowerCase();
    const search = document.getElementById('search-hub').value.toLowerCase();

    let filtered = allHubs;
    if (city)   filtered = filtered.filter(h => h.city.toLowerCase() === city);
    if (search) filtered = filtered.filter(h =>
        h.name.toLowerCase().includes(search) ||
        h.address.toLowerCase().includes(search)
    );
    displayHubs(filtered);
}
