// home.js – Landing page logic

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return; // redirect to auth.html if not logged in
    await loadCities();
});

async function loadCities() {
    try {
        const res = await fetch(`${API_URL}/hubs`);
        const result = await res.json();
        const cities = [...new Set((result.data || []).map(h => h.city))].sort();
        const sel = document.getElementById('hero-city');
        cities.forEach(c => sel.innerHTML += `<option value="${c}">${c}</option>`);
    } catch (e) {
        console.error('Error loading cities:', e);
    }
}

function searchFromHero() {
    const city = document.getElementById('hero-city').value;
    const url = city ? `search-hubs.html?city=${encodeURIComponent(city)}` : 'search-hubs.html';
    window.location.href = url;
}
