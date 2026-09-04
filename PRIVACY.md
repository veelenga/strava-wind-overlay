# Privacy

Strava Wind Overlay runs only on `https://www.strava.com/maps/*` pages.

What leaves your browser:

- The coordinates of the visible map area are sent to Open-Meteo
  (`api.open-meteo.com`) to fetch the wind forecast.
- The coordinates of the map centre are sent to BigDataCloud
  (`api.bigdatacloud.net`) to show a place name in the panel.

Nothing else is sent anywhere. The extension has no server, no analytics and no
account. It reads no Strava data beyond the map position in the page URL.

Stored locally in your browser: whether the overlay is on and the selected
forecast hour. The Debug button copies a diagnostic report to your clipboard
only when you click it. It contains the map position, timings and your browser
version, and goes nowhere unless you paste it somewhere.
