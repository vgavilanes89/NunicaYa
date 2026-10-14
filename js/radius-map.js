/**
 * Mini Leaflet map with a radius circle (km).
 * Requires Leaflet (L) loaded before this script.
 */
(function (global) {
    'use strict';

    let mapInstance = null;
    let circleLayer = null;
    let markerLayer = null;
    let currentRadiusKm = 10;
    let onChangeCallback = null;

    function haversineKm(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const toRad = (d) => d * Math.PI / 180;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) ** 2
            + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function clearLayers() {
        if (!mapInstance) return;
        if (circleLayer) {
            mapInstance.removeLayer(circleLayer);
            circleLayer = null;
        }
        if (markerLayer) {
            mapInstance.removeLayer(markerLayer);
            markerLayer = null;
        }
    }

    function init(containerEl, options) {
        if (!containerEl || typeof L === 'undefined') return false;

        options = options || {};
        currentRadiusKm = options.defaultRadiusKm || 10;
        onChangeCallback = options.onChange || null;

        if (mapInstance) {
            mapInstance.remove();
            mapInstance = null;
        }

        mapInstance = L.map(containerEl, {
            scrollWheelZoom: false,
            attributionControl: true,
            zoomControl: true
        }).setView([9.7489, -83.7534], 7);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(mapInstance);

        setTimeout(function () {
            if (mapInstance) mapInstance.invalidateSize();
        }, 120);

        return true;
    }

    function setCenter(lat, lng, radiusKm, options) {
        if (!mapInstance || lat == null || lng == null) return;

        options = options || {};
        if (radiusKm != null) currentRadiusKm = radiusKm;

        clearLayers();

        const draggable = !!options.draggable;
        if (draggable) {
            markerLayer = L.marker([lat, lng], { draggable: true }).addTo(mapInstance);
            markerLayer.on('dragend', function () {
                const ll = markerLayer.getLatLng();
                drawCircle(ll.lat, ll.lng, currentRadiusKm);
                if (onChangeCallback) {
                    onChangeCallback({ lat: ll.lat, lng: ll.lng, radiusKm: currentRadiusKm });
                }
            });
        } else {
            markerLayer = L.circleMarker([lat, lng], {
                radius: 6,
                color: '#1d4ed8',
                fillColor: '#2563eb',
                fillOpacity: 1,
                weight: 2
            }).addTo(mapInstance);
        }

        drawCircle(lat, lng, currentRadiusKm);

        if (onChangeCallback) {
            onChangeCallback({ lat: lat, lng: lng, radiusKm: currentRadiusKm });
        }
    }

    function drawCircle(lat, lng, radiusKm) {
        if (circleLayer) {
            mapInstance.removeLayer(circleLayer);
        }
        circleLayer = L.circle([lat, lng], {
            radius: radiusKm * 1000,
            color: '#2563eb',
            fillColor: '#3b82f6',
            fillOpacity: 0.12,
            weight: 2
        }).addTo(mapInstance);

        if (mapInstance) {
            mapInstance.fitBounds(circleLayer.getBounds(), { padding: [24, 24], maxZoom: 14 });
        }
    }

    function setRadiusKm(km) {
        currentRadiusKm = km;
        if (!markerLayer) return;

        let lat;
        let lng;
        if (typeof markerLayer.getLatLng === 'function') {
            const ll = markerLayer.getLatLng();
            lat = ll.lat;
            lng = ll.lng;
        } else {
            return;
        }
        drawCircle(lat, lng, currentRadiusKm);
        if (onChangeCallback) {
            onChangeCallback({ lat: lat, lng: lng, radiusKm: currentRadiusKm });
        }
    }

    function showDefaultView() {
        if (!mapInstance) return;
        clearLayers();
        mapInstance.setView([9.7489, -83.7534], 7);
    }

    function getState() {
        if (!markerLayer || typeof markerLayer.getLatLng !== 'function') return null;
        const ll = markerLayer.getLatLng();
        return { lat: ll.lat, lng: ll.lng, radiusKm: currentRadiusKm };
    }

    function destroy() {
        if (mapInstance) {
            mapInstance.remove();
            mapInstance = null;
        }
        circleLayer = null;
        markerLayer = null;
    }

    global.NunciaYaRadiusMap = {
        init: init,
        setCenter: setCenter,
        setRadiusKm: setRadiusKm,
        showDefaultView: showDefaultView,
        getState: getState,
        destroy: destroy,
        haversineKm: haversineKm
    };
})(window);
