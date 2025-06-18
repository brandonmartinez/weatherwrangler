// Default weather thresholds for Jeep recommendations
const DEFAULT_SETTINGS = {
  tempThresholdTopOff: 60,      // Minimum temperature (°F) for top off recommendation
  tempThresholdDoorsOff: 65,    // Minimum temperature (°F) for doors off recommendation
  rainChanceThreshold: 10,      // Maximum rain chance (%) for any recommendation
  windSpeedThreshold: 15        // Maximum wind speed (mph) for doors off recommendation
};

// Get current settings from localStorage or use defaults
function getSettings() {
  const stored = localStorage.getItem("settings");
  if (stored) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch (e) {
      console.warn("Failed to parse stored settings, using defaults");
    }
  }
  return DEFAULT_SETTINGS;
}

// Save settings to localStorage
function saveSettings(settings) {
  localStorage.setItem("settings", JSON.stringify(settings));
}

// Show/hide settings panel
function toggleSettings() {
  const settingsPanel = document.getElementById("settings");
  const isHidden = settingsPanel.style.display === "none" || !settingsPanel.style.display;

  if (isHidden) {
    // Show settings panel and populate with current values
    const settings = getSettings();
    document.getElementById("tempTopOff").value = settings.tempThresholdTopOff;
    document.getElementById("tempDoorsOff").value = settings.tempThresholdDoorsOff;
    document.getElementById("rainThreshold").value = settings.rainChanceThreshold;
    document.getElementById("windThreshold").value = settings.windSpeedThreshold;
    settingsPanel.style.display = "block";
  } else {
    settingsPanel.style.display = "none";
  }
}

async function fetchWeather(lat, lon) {
  if (!WEATHER_API_KEY) {
    throw new Error(
      "Weather API key not configured. Please check your .env file or GitHub secrets."
    );
  }

  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=imperial`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch weather: ${res.status} ${res.statusText}`
    );
  }
  const data = await res.json();
  return data;
}

async function fetchWeatherByZip(zipCode) {
  if (!WEATHER_API_KEY) {
    throw new Error(
      "Weather API key not configured. Please check your .env file or GitHub secrets."
    );
  }

  const url = `https://api.openweathermap.org/data/2.5/forecast?zip=${zipCode}&appid=${WEATHER_API_KEY}&units=imperial`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch weather for zip ${zipCode}: ${res.status} ${res.statusText}`
    );
  }
  localStorage.setItem("weatherLocation", JSON.stringify({ zipCode }));
  const data = await res.json();
  return data;
}

function evaluateConditions(weather) {
  // Get current settings
  const settings = getSettings();

  // Extract city name from the weather data
  const cityName = weather.city ? weather.city.name : "Unknown Location";

  // OpenWeatherMap forecast data - analyze today's hourly data
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  // Filter forecasts for today
  const todayForecasts = weather.list.filter((forecast) => {
    const forecastTime = new Date(forecast.dt * 1000);
    return forecastTime >= todayStart && forecastTime < todayEnd;
  });

  if (todayForecasts.length === 0) {
    // If no forecasts for today, use the first few available
    todayForecasts.push(...weather.list.slice(0, 8));
  }

  let maxTemp = -Infinity;
  let maxRainChance = 0;
  let maxWind = -Infinity;

  for (const forecast of todayForecasts) {
    const temp = Math.round(forecast.main.temp);
    maxTemp = Math.max(maxTemp, temp);

    // Calculate rain chance from weather conditions
    let rainChance = 0;
    if (forecast.weather && forecast.weather[0]) {
      const weatherId = forecast.weather[0].id;
      // Rain: 500-531, Drizzle: 300-321, Thunderstorm: 200-232
      if (weatherId >= 200 && weatherId <= 531) {
        // Use probability of precipitation if available
        rainChance = forecast.pop ? forecast.pop * 100 : 50;
      }
    }
    maxRainChance = Math.max(maxRainChance, rainChance);

    // Convert m/s to mph
    const windMph = Math.round(forecast.wind.speed * 2.237);
    maxWind = Math.max(maxWind, windMph);
  }

  const topOff =
    maxTemp >= settings.tempThresholdTopOff &&
    maxRainChance < settings.rainChanceThreshold;
  const doorsOff =
    maxTemp >= settings.tempThresholdDoorsOff &&
    maxRainChance < settings.rainChanceThreshold &&
    maxWind < settings.windSpeedThreshold;

  return {
    topOff,
    doorsOff,
    maxTemp,
    minRain: Math.round(maxRainChance),
    maxWind,
    cityName,
  };
}

function renderResult({
  topOff,
  doorsOff,
  maxTemp,
  minRain,
  maxWind,
  cityName,
}) {
  // Generate image filename based on top and doors status
  const topStatus = topOff ? "off" : "on";
  const doorsStatus = doorsOff ? "off" : "on";
  const imageName = `top${topStatus}-doors${doorsStatus}.png`;
  const imagePath = `/images/${imageName}`;

  const headerHTML = `
  <h1 class="mb-4 font-bold text-2xl text-center">Today's Weather Wrangler for ${cityName}</h1>
  `;

  const imageHTML = `
  <div class="mt-6 text-center">
    <img src="${imagePath}" alt="Jeep with top ${topStatus} and doors ${doorsStatus}"
         class="shadow-md mx-auto rounded-lg max-w-full h-auto"
         style="max-height: 300px;"
         onerror="this.style.display='none'">
  </div>
  `;

  const detailsHTML = `
  <div class="mt-4">
    <p><strong>Max Temperature:</strong> ${maxTemp}°F</p>
    <p><strong>Rain Chance:</strong> ${minRain}%</p>
    <p><strong>Max Wind Speed:</strong> ${maxWind} MPH</p>
  </div>
  `;

  const statusHTML = `
  <div class="mt-6">
    <p class="font-bold text-green-600">Top: ${topOff ? "Off" : "On"}</p>
    <p class="font-bold text-green-600">Doors: ${
      doorsOff ? "Off" : "On"
    }</p>
  </div>
  `;

  const resultHTML = headerHTML + imageHTML + detailsHTML + statusHTML;

  document.getElementById("result").innerHTML = resultHTML;

  document
    .getElementById("useCurrentLocation")
    .addEventListener("click", () => {
      // Clear stored location to force fresh location request
      document.getElementById("zipcode").value = "";
      localStorage.removeItem("weatherLocation");
      getLocationAndFetchWeather();
    });
}

function showLocationForm() {
  document.getElementById("result").innerHTML = `
    <h1 class="mb-4 font-bold text-2xl text-center">Weather Wrangler</h1>
    <p class="mb-4 text-center text-gray-600">Please enter your location to get weather recommendations</p>
  `;
}

function showError(error) {
  document.getElementById(
    "result"
  ).textContent = `Error: ${error.message}`;
}

function getLocationAndFetchWeather() {
  // Check if location is stored in localStorage
  const storedLocation = localStorage.getItem("weatherLocation");
  if (storedLocation) {
    const { latitude, longitude, zipCode } = JSON.parse(storedLocation);
    if (zipCode) {
      fetchWeatherByZip(zipCode)
        .then((weather) => {
          const conditions = evaluateConditions(weather);
          renderResult(conditions);
        })
        .catch((e) => showError(e));
    } else if (latitude && longitude) {
      fetchWeather(latitude, longitude)
        .then((weather) => {
          const conditions = evaluateConditions(weather);
          renderResult(conditions);
        })
        .catch((e) => showError(e));
    } // else, proceed (do nothing here)
    return;
  }

  if (!navigator.geolocation) {
    showLocationForm();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        // Store location in localStorage
        localStorage.setItem(
          "weatherLocation",
          JSON.stringify({ latitude, longitude })
        );
        const weather = await fetchWeather(latitude, longitude);
        const conditions = evaluateConditions(weather);
        renderResult(conditions);
      } catch (e) {
        showError(e);
      }
    },
    (error) => {
      showLocationForm();
    }
  );
}

// Initialize the app when the DOM is loaded
function initializeApp() {
  // Add event handler for locationForm submission
  document
    .getElementById("locationForm")
    .addEventListener("submit", async (event) => {
      event.preventDefault();
      const zipCode = document.getElementById("zipcode").value;
      if (!zipCode) {
        alert("Please enter a valid zip code.");
        return;
      }
      try {
        const weather = await fetchWeatherByZip(zipCode);
        const conditions = evaluateConditions(weather);
        renderResult(conditions);
      } catch (e) {
        showError(e);
      }
    });

  // Add event handler for settings toggle button
  document
    .getElementById("settingsToggle")
    .addEventListener("click", toggleSettings);

  // Add event handler for settings form submission
  document
    .getElementById("settingsForm")
    .addEventListener("submit", (event) => {
      event.preventDefault();

      const settings = {
        tempThresholdTopOff: parseInt(document.getElementById("tempTopOff").value),
        tempThresholdDoorsOff: parseInt(document.getElementById("tempDoorsOff").value),
        rainChanceThreshold: parseInt(document.getElementById("rainThreshold").value),
        windSpeedThreshold: parseInt(document.getElementById("windThreshold").value)
      };

      saveSettings(settings);
      toggleSettings(); // Hide settings panel

      // Refresh the weather evaluation with new settings
      const storedLocation = localStorage.getItem("weatherLocation");
      if (storedLocation) {
        const { latitude, longitude, zipCode } = JSON.parse(storedLocation);
        if (zipCode) {
          fetchWeatherByZip(zipCode)
            .then((weather) => {
              const conditions = evaluateConditions(weather);
              renderResult(conditions);
            })
            .catch((e) => showError(e));
        } else if (latitude && longitude) {
          fetchWeather(latitude, longitude)
            .then((weather) => {
              const conditions = evaluateConditions(weather);
              renderResult(conditions);
            })
            .catch((e) => showError(e));
        }
      }
    });

  // Start the weather fetching process
  getLocationAndFetchWeather();
}

// Run when the page loads
window.onload = initializeApp;
