import {
    ACTIVITIES, getDayHours, getHourReason, findWindows, summarizeWindows, windowLabel,
} from "./weather.js";

export const elements = {
    form: document.querySelector("#search-form"),
    searchInput: document.querySelector("#city-search"),
    searchButton: document.querySelector("#search-button"),
    searchStatus: document.querySelector("#search-status"),
    cityResults: document.querySelector("#city-results"),
    activities: document.querySelector("#activities"),
    rules: document.querySelector("#activity-rules"),
    forecastStatus: document.querySelector("#forecast-status"),
    retryButton: document.querySelector("#retry-forecast"),
    forecast: document.querySelector("#forecast"),
    location: document.querySelector("#location-title"),
    meta: document.querySelector("#forecast-meta"),
    refreshButton: document.querySelector("#refresh-button"),
    days: document.querySelector("#day-options"),
    recommendations: document.querySelector("#recommendations"),
    hourlyRows: document.querySelector("#hourly-rows"),
    welcome: document.querySelector("#welcome"),
};

function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;

    if (text !== undefined) {
        node.textContent = text;
    }

    return node;
}

export function cityLabel(city) {
    return [city.name, city.region, city.country].filter(Boolean).join(", ");
}

export function setBusy(busy) {
    elements.searchInput.disabled = busy;
    elements.searchButton.disabled = busy;
    elements.refreshButton.disabled = busy;
    elements.retryButton.disabled = busy;
    elements.activities.disabled = busy;
    elements.form.setAttribute("aria-busy", String(busy));

    elements.cityResults.querySelectorAll("button").forEach((button) => {
        button.disabled = busy;
    });
}

export function renderCities(cities, onSelect) {
    elements.cityResults.replaceChildren();

    cities.forEach((city) => {
        const item = element("li", "");
        const button = element("button", "city-result", cityLabel(city));
        button.type = "button";
        button.addEventListener("click", () => onSelect(city));
        item.append(button);
        elements.cityResults.append(item);
    });
}

export function renderRules(activityName) {
    const activity = ACTIVITIES[activityName];
    elements.rules.textContent = `${activity.label} weather: ${activity.minTemperature}–${activity.maxTemperature}°C`
        + ` · Rain ≤ ${activity.maxRain}% · Wind ≤ ${activity.maxWind} km/h · Daylight only`;
}

export function renderDays(days, onSelect) {
    elements.days.replaceChildren();

    days.forEach((date, index) => {
        const button = element("button", "day-button");
        button.type = "button";
        button.dataset.date = date;
        button.append(element("span", "day-eyebrow", index === 0 ? "NEXT UP" : "LOOK AHEAD"),
            element("span", "day-date", date.slice(5)));
        button.setAttribute("aria-label", `Forecast for ${date}`);
        button.addEventListener("click", () => onSelect(date));
        elements.days.append(button);
    });
}

export function renderForecast(state) {
    const activity = ACTIVITIES[state.activity];
    const dayHours = getDayHours(state.hours, state.date, state.forecast.current.time);
    const windows = findWindows(dayHours, activity);
    const summary = summarizeWindows(windows);

    elements.welcome.hidden = true;
    elements.forecast.hidden = false;
    elements.location.textContent = state.city.name;
    elements.meta.textContent = `${cityLabel(state.city)} · ${state.forecast.timezone} · Local times`
        + ` · Retrieved ${new Date(state.retrievedAt).toISOString().slice(11, 16)} UTC`;

    elements.days.querySelectorAll("button").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.date === state.date));
    });

    elements.recommendations.replaceChildren();
    const heading = element("div", "results-heading");
    heading.append(element("h3", "", `Your ${activity.label.toLowerCase()} outlook`),
        element("span", "small-note", state.date));
    elements.recommendations.append(heading);

    const stats = element("div", "stats");
    const total = element("div", "stat");
    total.append(element("span", "stat-label", "TIME FOR OUTSIDE"),
        element("strong", "stat-value", `${summary.totalHours} ${summary.totalHours === 1 ? "hour" : "hours"}`));
    const longest = element("div", "stat");
    longest.append(element("span", "stat-label", "YOUR LONGEST WINDOW"),
        element("strong", "stat-value", summary.longest.length ? windowLabel(summary.longest) : "No window yet"));
    stats.append(total, longest);
    elements.recommendations.append(stats);

    if (windows.length === 0) {
        const empty = element("div", "empty-results");
        empty.append(element("h3", "", "A good day for a different plan."),
            element("p", "", "No daylight hours match these preferences. Try another activity or day; the forecast is below."));
        elements.recommendations.append(empty);
    }

    const cards = element("div", "window-cards");
    windows.forEach((window) => {
        const best = window === summary.longest;
        const card = element("article", best ? "window-card best-window" : "window-card");
        const rain = Math.max(...window.map((hour) => hour.rain));
        const wind = Math.max(...window.map((hour) => hour.wind));
        const minTemperature = Math.min(...window.map((hour) => hour.temperature));
        const maxTemperature = Math.max(...window.map((hour) => hour.temperature));
        card.append(element("span", "window-tag", best ? "✳ YOUR BEST WINDOW" : "ANOTHER LITTLE OPENING"),
            element("h4", "", windowLabel(window)),
            element("p", "", `${window.length} ${window.length === 1 ? "hour" : "hours"} to make your own`),
            element("div", "window-weather", `${minTemperature}–${maxTemperature}°C · Rain ≤ ${rain}% · Wind ≤ ${wind} km/h`));
        cards.append(card);
    });
    elements.recommendations.append(cards);

    elements.hourlyRows.replaceChildren();
    dayHours.forEach((hour) => {
        const reason = getHourReason(hour, activity);
        const matches = reason === "Good to go";
        const row = element("tr", matches ? "matching-hour" : "");
        const clock = element("th", "", hour.clock);
        clock.scope = "row";
        row.append(clock);

        [measurement(hour.temperature, "°C"), measurement(hour.rain, "%"), measurement(hour.wind, " km/h")]
            .forEach((value) => row.append(element("td", "", value)));

        const statusCell = element("td", "");
        statusCell.append(element("span", matches ? "hour-status match" : "hour-status", reason));
        row.append(statusCell);
        elements.hourlyRows.append(row);
    });
}

function measurement(value, unit) {
    return Number.isFinite(value) ? `${value}${unit}` : "Unavailable";
}
