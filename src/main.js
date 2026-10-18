import "./styles.css";
import { searchCities, getForecast } from "./api.js";
import { normalizeHours, getDays } from "./weather.js";
import { readForecastCache } from "./cache.js";
import {
    elements, setBusy, renderCities, renderRules, renderDays, renderForecast,
} from "./ui.js";

const state = {
    city: null,
    activity: "walking",
    date: "",
    forecast: null,
    hours: [],
    retrievedAt: null,
    busy: false,
};

function changeDay(date) {
    state.date = date;
    renderForecast(state);
}

async function loadForecast(city, refresh = false) {
    if (state.busy) {
        return;
    }

    const sameCity = state.city?.latitude === city.latitude && state.city?.longitude === city.longitude;
    const previousDate = sameCity ? state.date : "";

    state.busy = true;
    state.city = city;
    state.forecast = null;
    elements.forecast.hidden = true;
    elements.welcome.hidden = true;
    elements.retryButton.hidden = true;
    elements.forecastStatus.textContent = `Looking at the sky over ${city.name}…`;
    setBusy(true);

    try {
        const { data, retrievedAt } = await getForecast(city, refresh);
        state.forecast = data;
        state.retrievedAt = retrievedAt;
        state.hours = normalizeHours(data);

        const days = getDays(state.hours, data.current.time);
        state.date = days.includes(previousDate) ? previousDate : days[0];
        renderDays(days, changeDay);
        renderForecast(state);
        elements.forecastStatus.textContent = `Forecast ready for ${city.name}. Choose a day to find your window.`;
        elements.cityResults.replaceChildren();
        elements.searchStatus.textContent = "Want a change of scenery? Search another city.";
        elements.searchInput.value = city.name;
        elements.location.tabIndex = -1;
        elements.location.focus({ preventScroll: true });
    } catch (error) {
        state.forecast = null;
        elements.forecast.hidden = true;
        elements.forecastStatus.textContent = error.message;
        elements.retryButton.hidden = false;
    } finally {
        state.busy = false;
        setBusy(false);
    }
}

elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (state.busy) {
        return;
    }

    if (elements.searchInput.value.trim().length < 2) {
        elements.searchStatus.textContent = "Enter at least two characters to find a city.";
        elements.cityResults.replaceChildren();
        elements.searchInput.focus();
        return;
    }

    state.busy = true;
    setBusy(true);
    elements.searchStatus.textContent = "Finding your place…";
    elements.cityResults.replaceChildren();

    try {
        const cities = await searchCities(elements.searchInput.value);
        renderCities(cities, loadForecast);
        elements.searchStatus.textContent = cities.length
            ? `${cities.length} ${cities.length === 1 ? "place" : "places"} found. Choose your city below.`
            : "No cities found. Try another name, or add a country after a comma.";
    } catch (error) {
        elements.searchStatus.textContent = error.message;
    } finally {
        state.busy = false;
        setBusy(false);
    }
});

elements.activities.addEventListener("change", (event) => {
    state.activity = event.target.value;
    renderRules(state.activity);

    if (state.forecast) {
        renderForecast(state);
    }
});

elements.refreshButton.addEventListener("click", () => loadForecast(state.city, true));
elements.retryButton.addEventListener("click", () => loadForecast(state.city, true));

renderRules(state.activity);

const cached = readForecastCache();

if (cached) {
    loadForecast(cached.city);
}
