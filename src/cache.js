import { validateForecast } from "./weather.js";

const CACHE_KEY = "weekend-window-forecast";
const CACHE_DURATION_MS = 30 * 60 * 1000;

export function readForecastCache(city = null) {
    try {
        const entry = JSON.parse(localStorage.getItem(CACHE_KEY));

        if (!entry || !Number.isFinite(entry.retrievedAt)
            || Date.now() - entry.retrievedAt >= CACHE_DURATION_MS
            || entry.retrievedAt > Date.now()) {
            return null;
        }

        const savedCity = entry.city;

        if (!savedCity || typeof savedCity.name !== "string"
            || !Number.isFinite(savedCity.latitude) || !Number.isFinite(savedCity.longitude)) {
            return null;
        }

        if (city && (city.latitude !== savedCity.latitude || city.longitude !== savedCity.longitude)) {
            return null;
        }

        validateForecast(entry.data);
        return entry;
    } catch {
        // Storage may be blocked or contain an old, incomplete response. Fetch normally instead.
        return null;
    }
}

export function writeForecastCache(city, result) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ city, ...result }));
        return true;
    } catch {
        // A full or unavailable store must not prevent the forecast from being displayed.
        return false;
    }
}
