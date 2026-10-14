/**
 * Approximate map centers for Costa Rica provinces + geocoding helper for cantons/districts.
 * Depends on costaRicaLocations from locations-cr.js
 */
const costaRicaProvinceCoords = {
    sanjose: { lat: 9.9281, lng: -84.0907 },
    alajuela: { lat: 10.0162, lng: -84.2116 },
    cartago: { lat: 9.8644, lng: -83.9194 },
    heredia: { lat: 10.0023, lng: -84.1165 },
    guanacaste: { lat: 10.4412, lng: -85.4237 },
    puntarenas: { lat: 9.9763, lng: -84.8384 },
    limon: { lat: 9.9907, lng: -83.0360 }
};

const geocodeCache = {};

async function geocodeLocationQuery(query) {
    if (!query) return null;
    if (geocodeCache[query]) return geocodeCache[query];

    try {
        const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({
            q: query,
            format: 'json',
            limit: '1',
            countrycodes: 'cr'
        });
        const res = await fetch(url, { headers: { 'Accept-Language': 'es,en' } });
        if (!res.ok) return null;
        const data = await res.json();
        if (data && data[0]) {
            const result = {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
            geocodeCache[query] = result;
            return result;
        }
    } catch (err) {
        console.warn('Geocode failed for:', query, err);
    }
    return null;
}

async function getCenterForLocation(zoneKey, cantonKey, districtName) {
    if (!zoneKey || typeof costaRicaLocations === 'undefined') return null;

    const province = costaRicaLocations[zoneKey];
    if (!province) return null;

    const parts = [];
    if (districtName) parts.push(districtName);
    if (cantonKey && province.cantones && province.cantones[cantonKey]) {
        parts.push(province.cantones[cantonKey].nombre);
    }
    parts.push(province.nombre, 'Costa Rica');

    const geocoded = await geocodeLocationQuery(parts.join(', '));
    if (geocoded) return geocoded;

    return costaRicaProvinceCoords[zoneKey] || null;
}

window.costaRicaProvinceCoords = costaRicaProvinceCoords;
window.getCenterForLocation = getCenterForLocation;
