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

// Show/hide settings modal
function toggleSettings() {
  const settingsModal = document.getElementById("settingsModal");
  const isHidden = settingsModal.style.display === "none" || !settingsModal.style.display;

  if (isHidden) {
    // Show settings modal and populate with current values
    const settings = getSettings();
    document.getElementById("tempTopOff").value = settings.tempThresholdTopOff;
    document.getElementById("tempDoorsOff").value = settings.tempThresholdDoorsOff;
    document.getElementById("rainThreshold").value = settings.rainChanceThreshold;
    document.getElementById("windThreshold").value = settings.windSpeedThreshold;
    settingsModal.style.display = "flex";
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
  } else {
    settingsModal.style.display = "none";
    // Restore body scroll
    document.body.style.overflow = "auto";
  }
}

// Close modal function
function closeModal() {
  const settingsModal = document.getElementById("settingsModal");
  settingsModal.style.display = "none";
  document.body.style.overflow = "auto";
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
  // Hide loading and error states
  hideAllStates();

  // Show weather results
  document.getElementById("weatherResults").classList.remove("hidden");

  // Update title
  document.getElementById("weatherTitle").textContent = `Today's Weather Wrangler for ${cityName}`;

  // Update image
  const topStatus = topOff ? "off" : "on";
  const doorsStatus = doorsOff ? "off" : "on";
  const imageName = `top${topStatus}-doors${doorsStatus}.png`;
  const imagePath = `/images/${imageName}`;

  const jeepImage = document.getElementById("jeepImage");
  jeepImage.src = imagePath;
  jeepImage.alt = `Jeep with top ${topStatus} and doors ${doorsStatus}`;
  jeepImage.classList.remove("hidden");

  // Update weather details
  document.getElementById("maxTemp").textContent = maxTemp;
  document.getElementById("rainChance").textContent = minRain;
  document.getElementById("windSpeed").textContent = maxWind;

  // Update status
  document.getElementById("topStatus").textContent = topOff ? "Off" : "On";
  document.getElementById("doorsStatus").textContent = doorsOff ? "Off" : "On";

  // Re-add event listener for current location button (if it exists)
  const useCurrentLocationBtn = document.getElementById("useCurrentLocation");
  if (useCurrentLocationBtn) {
    useCurrentLocationBtn.removeEventListener("click", handleUseCurrentLocation);
    useCurrentLocationBtn.addEventListener("click", handleUseCurrentLocation);
  }
}

function hideAllStates() {
  document.getElementById("loading").classList.add("hidden");
  document.getElementById("error").classList.add("hidden");
  document.getElementById("locationPrompt").classList.add("hidden");
  document.getElementById("weatherResults").classList.add("hidden");
}

function handleUseCurrentLocation() {
  // Clear stored location to force fresh location request
  document.getElementById("zipcode").value = "";
  localStorage.removeItem("weatherLocation");
  getLocationAndFetchWeather();
}

function showLocationForm() {
  hideAllStates();
  document.getElementById("locationPrompt").classList.remove("hidden");
}

function showError(error) {
  hideAllStates();
  const errorDiv = document.getElementById("error");
  errorDiv.textContent = `Error: ${error.message}`;
  errorDiv.classList.remove("hidden");
}

function getLocationAndFetchWeather() {
  // Show loading state
  hideAllStates();
  document.getElementById("loading").classList.remove("hidden");

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
    }
    // else, proceed (do nothing here)
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

      // Show loading state
      hideAllStates();
      document.getElementById("loading").classList.remove("hidden");

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

  // Add event handler for close modal button
  document
    .getElementById("closeModal")
    .addEventListener("click", closeModal);

  // Add event handler for cancel settings button
  document
    .getElementById("cancelSettings")
    .addEventListener("click", closeModal);

  // Add event handler to close modal when clicking outside
  document
    .getElementById("settingsModal")
    .addEventListener("click", (event) => {
      if (event.target.id === "settingsModal") {
        closeModal();
      }
    });

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
      // Hide settings modal
      closeModal();

      // Refresh the weather evaluation with new settings
      const storedLocation = localStorage.getItem("weatherLocation");
      if (storedLocation) {
        // Show loading state
        hideAllStates();
        document.getElementById("loading").classList.remove("hidden");

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
