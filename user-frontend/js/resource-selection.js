// resource-selection.js – Add-on resources selection with live cost calculation

let allResources = [];
let selectedQtys = {};
let bookingMeta  = null; // { workspace_id, start_time, end_time }

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    // Pull booking meta from sessionStorage (set by booking-form.js or workspace-details)
    bookingMeta = getSession('pendingBooking') || getSession('resourceMeta');
    if (!bookingMeta) { window.location.href = 'search-hubs.html'; return; }

    renderDuration();
    await loadResources(bookingMeta.workspace_id);
});

// ── Duration Banner ────────────────────────────

function renderDuration() {
    if (!bookingMeta) return;
    const start = new Date(bookingMeta.start_time);
    const end   = new Date(bookingMeta.end_time);
    const hours = ((end - start) / 3600000).toFixed(1);

    document.getElementById('duration-label').textContent = `${hours} hour${hours !== '1.0' ? 's' : ''}`;
    document.getElementById('start-label').textContent    = formatDateTime(bookingMeta.start_time);
    document.getElementById('end-label').textContent      = formatDateTime(bookingMeta.end_time);
}

// ── Load Resources ─────────────────────────────

async function loadResources(wsId) {
    const container = document.getElementById('resources-container');
    container.innerHTML = loadingHTML('Loading resources...');

    try {
        const res = await fetch(`${API_URL}/resources?workspace_id=${wsId}`);
        allResources = (await res.json()).data || [];

        if (!allResources.length) {
            container.innerHTML = noDataHTML('fa-box-open', 'No Add-On Resources', 'This workspace has no additional resources.');
            return;
        }

        container.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.25rem;">
                ${allResources.map(r => `
                    <div class="resource-item" id="card-${r.id}" style="border-radius:8px;">
                        <div class="resource-info">
                            <h4>${r.name}</h4>
                            <p>${r.description || ''}</p>
                            <div style="margin-top:.5rem;font-size:.875rem;color:var(--text-light);">
                                <i class="fas fa-tag" style="color:var(--accent);"></i>
                                ₹${r.price_per_slot} per slot/hour
                            </div>
                        </div>
                        <div class="resource-select">
                            <button onclick="changeQty(${r.id}, ${r.price_per_slot}, -1)"
                                style="width:32px;height:32px;border:1px solid var(--border);border-radius:6px;background:white;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span id="qty-${r.id}" style="min-width:32px;text-align:center;font-weight:700;font-size:1.1rem;">0</span>
                            <button onclick="changeQty(${r.id}, ${r.price_per_slot}, 1)"
                                style="width:32px;height:32px;border:1px solid var(--border);border-radius:6px;background:white;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>`;

        updateTotal();
    } catch (e) {
        container.innerHTML = noDataHTML('fa-exclamation-circle', 'Error loading resources');
    }
}

// ── Quantity Control ───────────────────────────

function changeQty(id, price, delta) {
    const current = selectedQtys[id] || 0;
    const next    = Math.max(0, current + delta);
    selectedQtys[id] = next;
    const el = document.getElementById(`qty-${id}`);
    if (el) el.textContent = next;

    // Highlight card if selected
    const card = document.getElementById(`card-${id}`);
    if (card) card.style.border = next > 0 ? '2px solid var(--accent)' : '';

    updateTotal();
}

function updateTotal() {
    const start = new Date(bookingMeta.start_time);
    const end   = new Date(bookingMeta.end_time);
    const hours = (end - start) / 3600000;

    const total = allResources.reduce((sum, r) => {
        const qty = selectedQtys[r.id] || 0;
        return sum + qty * r.price_per_slot * hours;
    }, 0);

    document.getElementById('resources-total').textContent = formatCurrency(total);
}

// ── Actions ────────────────────────────────────

function clearAll() {
    selectedQtys = {};
    allResources.forEach(r => {
        const el   = document.getElementById(`qty-${r.id}`);
        const card = document.getElementById(`card-${r.id}`);
        if (el) el.textContent = '0';
        if (card) card.style.border = '';
    });
    updateTotal();
}

function confirmSelection() {
    // Build selected resources array
    const selected = allResources
        .filter(r => (selectedQtys[r.id] || 0) > 0)
        .map(r => ({ id: r.id, name: r.name, price: r.price_per_slot, quantity: selectedQtys[r.id] }));

    // Merge into pending booking session
    const pending = getSession('pendingBooking') || {};
    pending.resources = selected;
    saveSession('pendingBooking', pending);

    // Navigate back to booking form or payment
    window.location.href = 'booking-form.html?workspace_id=' + bookingMeta.workspace_id;
}
