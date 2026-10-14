/**
 * Shared radius mini-map for category listing search pages.
 * Expects: #radius-mini-map, #filter-radius, #filter-zone, optional #radius-value-label
 */
(function (global) {
    'use strict';

    const DEFAULT_RADIUS_KM = 10;
    let ready = false;
    let mapSearchCenter = null;

    function els() {
        return {
            map: document.getElementById('radius-mini-map'),
            radius: document.getElementById('filter-radius'),
            zone: document.getElementById('filter-zone'),
            canton: document.getElementById('filter-canton'),
            district: document.getElementById('filter-district'),
            label: document.getElementById('radius-value-label')
        };
    }

    function updateRadiusLabel(km) {
        const label = els().label;
        if (label) label.textContent = `${km} km`;
    }

    async function updateFromFilters() {
        if (!ready || !global.NunciaYaRadiusMap || !global.getCenterForLocation) return;

        const { zone, canton, district, radius } = els();
        const zoneVal = zone ? zone.value : '';

        if (!zoneVal) {
            mapSearchCenter = null;
            global.NunciaYaRadiusMap.showDefaultView();
            return;
        }

        const cantonVal = canton ? canton.value : '';
        const districtVal = district ? district.value : '';
        const center = await global.getCenterForLocation(zoneVal, cantonVal, districtVal);
        if (!center) return;

        mapSearchCenter = center;
        const km = parseInt(radius && radius.value, 10) || DEFAULT_RADIUS_KM;
        updateRadiusLabel(km);
        global.NunciaYaRadiusMap.setCenter(center.lat, center.lng, km);
    }

    function init() {
        const { map, radius } = els();
        if (!map || !global.NunciaYaRadiusMap || ready) return;

        const defaultKm = parseInt(radius && radius.value, 10) || DEFAULT_RADIUS_KM;
        ready = global.NunciaYaRadiusMap.init(map, { defaultRadiusKm: defaultKm });
        if (!ready) return;

        global.NunciaYaRadiusMap.showDefaultView();
        updateRadiusLabel(defaultKm);

        if (radius) {
            radius.addEventListener('input', function () {
                const km = parseInt(radius.value, 10) || DEFAULT_RADIUS_KM;
                updateRadiusLabel(km);
                if (mapSearchCenter) global.NunciaYaRadiusMap.setRadiusKm(km);
            });
        }

        document.addEventListener('change', function (e) {
            const id = e.target && e.target.id;
            if (id === 'filter-zone' || id === 'filter-canton' || id === 'filter-district') {
                updateFromFilters();
            }
        });

        document.addEventListener('click', function (e) {
            if (e.target && (e.target.id === 'reset-button' || e.target.closest('#reset-button'))) {
                reset();
            }
        });
    }

    function reset() {
        const { radius } = els();
        if (radius) radius.value = String(DEFAULT_RADIUS_KM);
        updateRadiusLabel(DEFAULT_RADIUS_KM);
        mapSearchCenter = null;
        if (ready && global.NunciaYaRadiusMap) {
            global.NunciaYaRadiusMap.showDefaultView();
        }
    }

    /**
     * Do NOT pass aroundLatLng/aroundRadius to Algolia — that hides every listing
     * without _geoloc (almost all existing ads). Location filtering uses zone/canton/district facets.
     * The map + slider are visual only unless client-side filterHits is used.
     */
    function applyToSearchOptions(searchOptions) {
        return searchOptions;
    }

    /**
     * Optional post-search filter: listings without coordinates always pass;
     * geolocated listings must fall inside the selected radius.
     */
    function filterHits(hits, zoneValue) {
        if (!hits || !hits.length || !mapSearchCenter || !zoneValue || !global.NunciaYaRadiusMap) {
            return hits || [];
        }
        const km = parseInt(els().radius && els().radius.value, 10) || DEFAULT_RADIUS_KM;
        return hits.filter(function (hit) {
            const lat = hit.locationLat != null ? hit.locationLat : (hit._geoloc && hit._geoloc.lat);
            const lng = hit.locationLng != null ? hit.locationLng : (hit._geoloc && hit._geoloc.lng);
            if (lat == null || lng == null) return true;
            return global.NunciaYaRadiusMap.haversineKm(mapSearchCenter.lat, mapSearchCenter.lng, lat, lng) <= km;
        });
    }

    function getCenter() {
        return mapSearchCenter;
    }

    global.NunciaYaListingRadiusFilter = {
        init: init,
        reset: reset,
        updateFromFilters: updateFromFilters,
        applyToSearchOptions: applyToSearchOptions,
        filterHits: filterHits,
        getCenter: getCenter
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(window);
