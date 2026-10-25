# Weekend Window

Find the best time of the day for popular outdoor activities in the next 7 days.

## Use of AI

I used the Codex CLI.

Prompt examples:

- When I switch between activities, update the results without fetching the forecast again.
- Remember the last forecast for 30 minutes, but let me refresh it whenever I want.

## Autopsy

1. I use `map` to turn the API's arrays into hourly objects, `filter` to select hours that match the
   day and activity, and `reduce` to group consecutive hours.
2. Saving the latest forecast in `localStorage` to avoid repeating the same request after reloading.
   The cached data will expire in 30 minutes, or can be updated with the refresh button.
