const SEARCH_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

async function requestJSON(url) {
    let response;
    try {
        response = await fetch(url);
    } catch {
        throw new Error(
            "Could not reach the weather service. Check your connection and try again."
        );
    }

    if (!response.ok) {
        throw new Error(
            `The weather service returned an error (${response.status}). Please try again.`
        );
    }

    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error("The weather service sent an unreadable response. Please try again.");
    }

    if (!data || typeof data !== "object" || data.error) {
        throw new Error("The weather service could not complete this request. Please try again.");
    }

    return { data, retrievedAt: Date.now() };
}

export async function searchCities(query) {
    const name = query.trim();
    if (name.length < 2) {
        throw new Error("Enter at least two characters to find a city.");
    }

    const url = new URL(SEARCH_URL);
    url.search = new URLSearchParams({ name, count: "5", language: "en", format: "json" });

    const { data } = await requestJSON(url.href);
    if (data.results === undefined) {
        return [];
    }

    if (!Array.isArray(data.results)) {
        throw new Error("The city search response was incomplete. Please try again.");
    }

    return data.results
        .filter(
            (city) =>
                typeof city.name === "string" &&
                Number.isFinite(city.latitude) &&
                Number.isFinite(city.longitude)
        )
        .map((city) => ({
            id: city.id,
            name: city.name,
            region: city.admin1 || "",
            country: city.country || city.country_code || "",
            latitude: city.latitude,
            longitude: city.longitude,
        }));
}

export async function getForecast(city) {
    const url = new URL(FORECAST_URL);

    url.search = new URLSearchParams({
        latitude: String(city.latitude),
        longitude: String(city.longitude),
        hourly: "temperature_2m,precipitation_probability,wind_speed_10m,is_day",
        current: "temperature_2m",
        forecast_days: "7",
        timezone: "auto",
        timeformat: "iso8601",
        temperature_unit: "celsius",
        wind_speed_unit: "kmh",
    });

    return requestJSON(url.href);
}
