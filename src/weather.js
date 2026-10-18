export const ACTIVITIES = {
    walking: { label: "Walking", minTemperature: 10, maxTemperature: 28, maxRain: 30, maxWind: 20 },
    cycling: { label: "Cycling", minTemperature: 8, maxTemperature: 25, maxRain: 20, maxWind: 15 },
    picnic: { label: "Picnic", minTemperature: 16, maxTemperature: 30, maxRain: 10, maxWind: 12 },
};

export function validateForecast(data) {
    const hourly = data?.hourly;
    const arrays = [
        hourly?.time, hourly?.temperature_2m, hourly?.precipitation_probability,
        hourly?.wind_speed_10m, hourly?.is_day,
    ];

    if (!arrays.every(Array.isArray) || hourly.time.length === 0
        || !arrays.every((array) => array.length === hourly.time.length)) {
        throw new Error("No usable hourly forecast is available. Try another city or refresh.");
    }

    const validTimes = hourly.time.every((time, index) => (
        typeof time === "string" && time.length === 16 && time[10] === "T"
        && time.endsWith(":00") && (index === 0 || time > hourly.time[index - 1])
    ));

    if (!validTimes || typeof data.current?.time !== "string"
        || data.current.time.length !== 16 || typeof data.timezone !== "string") {
        throw new Error("The forecast response has incomplete dates or times. Please try again.");
    }

    const hours = normalizeHours(data);
    const usable = hours.some((hour) => (
        hour.time >= data.current.time && getHourReason(hour, ACTIVITIES.walking) !== "Data unavailable"
    ));

    if (!usable) {
        throw new Error("No usable upcoming weather data is available. Try another city or refresh.");
    }
}

export function normalizeHours(data) {
    return data.hourly.time.map((time, index) => ({
        index,
        time,
        date: time.split("T")[0],
        clock: time.split("T")[1],
        temperature: data.hourly.temperature_2m[index],
        rain: data.hourly.precipitation_probability[index],
        wind: data.hourly.wind_speed_10m[index],
        daylight: data.hourly.is_day[index] === 1 ? true : data.hourly.is_day[index] === 0 ? false : null,
    }));
}

export function getDays(hours, currentTime) {
    const futureHours = hours.filter((hour) => hour.time >= currentTime);
    return [...new Set(futureHours.map((hour) => hour.date))];
}

export function getDayHours(hours, date, currentTime) {
    return hours.filter((hour) => hour.date === date && hour.time >= currentTime);
}

export function getHourReason(hour, activity) {
    if (![hour.temperature, hour.rain, hour.wind].every(Number.isFinite)
        || typeof hour.daylight !== "boolean" || hour.rain < 0 || hour.rain > 100 || hour.wind < 0) {
        return "Data unavailable";
    }

    if (!hour.daylight) {
        return "After dark";
    }

    if (hour.temperature < activity.minTemperature) {
        return "Too cool";
    }

    if (hour.temperature > activity.maxTemperature) {
        return "Too warm";
    }

    if (hour.rain > activity.maxRain) {
        return "Rain above preference";
    }

    if (hour.wind > activity.maxWind) {
        return "Wind above preference";
    }

    return "Good to go";
}

export function findWindows(hours, activity) {
    const matchingHours = hours.filter((hour) => getHourReason(hour, activity) === "Good to go");

    return matchingHours.reduce((windows, hour) => {
        const previousWindow = windows[windows.length - 1];
        const previousHour = previousWindow?.[previousWindow.length - 1];

        const adjacentTime = previousHour
            && Number(hour.clock.split(":")[0]) === Number(previousHour.clock.split(":")[0]) + 1;

        if (previousHour && previousHour.index + 1 === hour.index
            && previousHour.date === hour.date && adjacentTime) {
            previousWindow.push(hour);
        } else {
            windows.push([hour]);
        }

        return windows;
    }, []);
}

export function summarizeWindows(windows) {
    return windows.reduce((summary, window) => ({
        totalHours: summary.totalHours + window.length,
        longest: window.length > summary.longest.length ? window : summary.longest,
    }), { totalHours: 0, longest: [] });
}

export function windowLabel(window) {
    const first = window[0];
    const last = window[window.length - 1];
    const endHour = Number(last.clock.split(":")[0]) + 1;

    return `${first.clock}–${String(endHour).padStart(2, "0")}:00`;
}
