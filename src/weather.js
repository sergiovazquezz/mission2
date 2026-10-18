export const ACTIVITIES = {
    walking: { label: "Walking", minTemperature: 10, maxTemperature: 28, maxRain: 30, maxWind: 20 },
    cycling: { label: "Cycling", minTemperature: 8, maxTemperature: 25, maxRain: 20, maxWind: 15 },
    picnic: { label: "Picnic", minTemperature: 16, maxTemperature: 30, maxRain: 10, maxWind: 12 },
};

export function normalizeHours(data) {
    return data.hourly.time.map((time, index) => ({
        index,
        time,
        date: time.split("T")[0],
        clock: time.split("T")[1],
        temperature: data.hourly.temperature_2m[index],
        rain: data.hourly.precipitation_probability[index],
        wind: data.hourly.wind_speed_10m[index],
        daylight: data.hourly.is_day[index] === 1,
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
    if (![hour.temperature, hour.rain, hour.wind].every(Number.isFinite)) {
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

        if (previousHour && previousHour.index + 1 === hour.index && previousHour.date === hour.date) {
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
