import "./styles.css";
import { searchCities, getForecast } from "./api.js";

const form = document.querySelector("#search-form");
const searchStatus = document.querySelector("#search-status");
const forecastStatus = document.querySelector("#forecast-status");
const searchButton = document.querySelector("#search-button");
const cityResults = document.querySelector("#city-results");

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    searchButton.disabled = true;
    searchStatus.textContent = "Finding your place…";
    cityResults.replaceChildren();

    try {
        const cities = await searchCities(form.elements.city.value);

        searchStatus.textContent = cities.length
            ? "Choose your city below."
            : "No cities found. Try another name.";

        cities.forEach((city) => {
            const item = document.createElement("li");
            const button = document.createElement("button");

            button.type = "button";
            button.textContent = [city.name, city.region, city.country].filter(Boolean).join(", ");

            button.addEventListener("click", async () => {
                forecastStatus.textContent = "Looking at the sky…";
                try {
                    const { data } = await getForecast(city);
                    forecastStatus.textContent = `Loaded ${data.hourly.time.length} forecast hours for ${city.name}.`;
                } catch (error) {
                    forecastStatus.textContent = error.message;
                }
            });

            item.append(button);
            cityResults.append(item);
        });
    } catch (error) {
        searchStatus.textContent = error.message;
    } finally {
        searchButton.disabled = false;
    }
});
