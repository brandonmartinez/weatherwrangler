import { WeatherService } from './modules/weatherService.js';
import { WeatherAnalyzer } from './modules/weatherAnalyzer.js';
import { DOMManager } from './modules/domManager.js';
import { SettingsManager, SettingsModal } from './modules/settings.js';
import { LocationManager, LocationModal } from './modules/location.js';
import { DOM_ELEMENTS } from './modules/constants.js';

/**
 * Main Weather Wrangler Application
 */
class WeatherWranglerApp {
  constructor() {
    this.weatherService = new WeatherService(window.WEATHER_API_KEY);
    this.domManager = new DOMManager();
    this.locationManager = new LocationManager();
    this.settingsModal = new SettingsModal(
      this.domManager,
      SettingsManager,
      this.handleSettingsChange.bind(this)
    );
    this.locationModal = new LocationModal(this.domManager, this.locationManager);

    this.isInitialized = false;
    this.currentWeatherData = null;
    this.currentYear = new Date().getFullYear();
  }

  /**
   * Initialize the application
   */
  async init() {
    if (this.isInitialized) return;

    try {
      const currentYearElem = this.domManager.getElement('currentYear');
      if (currentYearElem) {
        if (this.currentYear > 2025) {
          currentYearElem.textContent = `2025 - ${this.currentYear}`;
        } else {
          currentYearElem.textContent = this.currentYear;
        }
      }

      this.setupEventListeners();
      await this.loadInitialWeather();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.domManager.showError(error);
    }
  }

  /**
   * Set up all event listeners
   */
  setupEventListeners() {

    // Location toggle
    const locationToggle = this.domManager.getElement('locationToggle');
    if (locationToggle) {
      locationToggle.addEventListener('click', () => this.locationModal.toggle());
    }

    // Location form submission
    const locationForm = this.domManager.getElement(DOM_ELEMENTS.locationForm);
    if (locationForm) {
      locationForm.addEventListener('submit', this.locationModal.handleSubmit.bind(this.locationModal));
    }

    // Location prompt form submission
    const locationPromptForm = this.domManager.getElement(DOM_ELEMENTS.locationPromptForm);
    if (locationPromptForm) {
      locationPromptForm.addEventListener('submit', this.handleLocationPromptSubmit.bind(this));
    }

    // Location modal close button
    const closeLocationModal = this.domManager.getElement('closeLocationModal');
    if (closeLocationModal) {
      closeLocationModal.addEventListener('click', () => this.locationModal.close());
    }

    // Location modal backdrop click
    const locationModal = this.domManager.getElement('locationModal');
    if (locationModal) {
      locationModal.addEventListener('click', this.locationModal.handleBackdropClick.bind(this.locationModal));
    }

    // Settings toggle
    const settingsToggle = this.domManager.getElement(DOM_ELEMENTS.settingsToggle);
    if (settingsToggle) {
      settingsToggle.addEventListener('click', () => this.settingsModal.toggle());
    }

    // Settings form submission
    const settingsForm = this.domManager.getElement(DOM_ELEMENTS.settingsForm);
    if (settingsForm) {
      settingsForm.addEventListener('submit', this.settingsModal.handleSubmit.bind(this.settingsModal));
    }

    // Modal close buttons
    const closeModal = this.domManager.getElement(DOM_ELEMENTS.closeModal);
    const cancelSettings = this.domManager.getElement(DOM_ELEMENTS.cancelSettings);
    const resetSettings = this.domManager.getElement(DOM_ELEMENTS.resetSettings);

    if (closeModal) {
      closeModal.addEventListener('click', () => this.settingsModal.close());
    }

    if (cancelSettings) {
      cancelSettings.addEventListener('click', () => this.settingsModal.close());
    }

    if (resetSettings) {
      resetSettings.addEventListener('click', () => this.settingsModal.handleReset());
    }

    // Modal backdrop click
    const settingsModal = this.domManager.getElement(DOM_ELEMENTS.settingsModal);
    if (settingsModal) {
      settingsModal.addEventListener('click', this.settingsModal.handleBackdropClick.bind(this.settingsModal));
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      this.settingsModal.handleKeyDown(event);
      this.locationModal.handleKeyDown(event);
    });

    // Use current location button (added dynamically)
    const useCurrentLocationBtn = this.domManager.getElement(DOM_ELEMENTS.useCurrentLocation);
    if (useCurrentLocationBtn) {
      useCurrentLocationBtn.addEventListener('click', this.handleUseCurrentLocation.bind(this));
    }

    // Refresh weather button
    const refreshWeatherBtn = this.domManager.getElement(DOM_ELEMENTS.refreshWeather);
    if (refreshWeatherBtn) {
      refreshWeatherBtn.addEventListener('click', this.handleRefreshWeather.bind(this));
    }

    // Weather details toggle
    const toggleWeatherDetails = this.domManager.getElement('toggleWeatherDetails');
    if (toggleWeatherDetails) {
      toggleWeatherDetails.addEventListener('click', () => this.domManager.toggleAdditionalWeather());
    }
  }

  /**
   * Load initial weather data
   */
  async loadInitialWeather() {
    const storedLocation = this.locationManager.getStoredLocation();

    if (storedLocation) {
      await this.fetchWeatherForLocation(storedLocation);
    } else {
      await this.requestLocationAndFetchWeather();
    }
  }

  /**
   * Request user location and fetch weather
   */
  async requestLocationAndFetchWeather() {
    this.domManager.showLoading();

    try {
      const location = await this.locationManager.getCurrentLocation();
      await this.fetchWeatherForLocation(location);
    } catch (error) {
      console.log('Location access denied or failed:', error.message);
      this.domManager.showLocationPrompt();
    }
  }

  /**
   * Fetch weather for a given location
   */
  async fetchWeatherForLocation(location) {
    this.domManager.showLoading();

    try {
      let weatherData;

      if (location.zipCode) {
        weatherData = await this.weatherService.fetchWeatherByZip(location.zipCode);
      } else if (location.latitude && location.longitude) {
        weatherData = await this.weatherService.fetchWeatherByCoords(location.latitude, location.longitude);
      } else {
        throw new Error('Invalid location data');
      }

      this.currentWeatherData = weatherData;
      await this.updateWeatherDisplay();

    } catch (error) {
      console.error('Weather fetch error:', error);
      this.domManager.showError(error);
    }
  }

  /**
   * Update weather display with current data and settings
   */
  async updateWeatherDisplay() {
    if (!this.currentWeatherData) return;

    try {
      const settings = SettingsManager.getSettings();
      const result = WeatherAnalyzer.evaluateConditions(this.currentWeatherData, settings);

      this.domManager.updateWeatherResults(result, settings);

    } catch (error) {
      console.error('Weather analysis error:', error);
      this.domManager.showError(error);
    }
  }

  /**
   * Handle location form submission
   */
  async handleLocationSubmit(event) {
    event.preventDefault();

    const zipCode = this.domManager.getZipCode();
    if (!zipCode) {
      alert('Please enter a valid ZIP code.');
      return;
    }

    if (!LocationManager.validateZipCode(zipCode)) {
      alert('Please enter a valid 5-digit ZIP code.');
      return;
    }

    try {
      const location = this.locationManager.storeZipLocation(zipCode);
      await this.fetchWeatherForLocation(location);
    } catch (error) {
      console.error('ZIP code error:', error);
      this.domManager.showError(error);
    }
  }

  /**
   * Handle location prompt form submission
   */
  async handleLocationPromptSubmit(event) {
    event.preventDefault();

    const zipCode = this.domManager.getZipCodeFromPrompt();
    if (!zipCode) {
      alert('Please enter a valid ZIP code.');
      return;
    }

    if (!LocationManager.validateZipCode(zipCode)) {
      alert('Please enter a valid 5-digit ZIP code.');
      return;
    }

    try {
      const location = this.locationManager.storeZipLocation(zipCode);
      await this.fetchWeatherForLocation(location);
    } catch (error) {
      console.error('ZIP code error:', error);
      this.domManager.showError(error);
    }
  }

  /**
   * Handle use current location button click
   */
  async handleUseCurrentLocation() {
    this.domManager.clearZipCode();
    this.locationManager.clearStoredLocation();
    await this.requestLocationAndFetchWeather();
  }

  /**
   * Handle settings change
   */
  async handleSettingsChange(newSettings) {
    console.log('Settings updated:', newSettings);

    // Re-evaluate weather with new settings
    if (this.currentWeatherData) {
      await this.updateWeatherDisplay();
    }
  }

  /**
   * Refresh weather data (public method for manual refresh)
   */
  async refresh() {
    const location = this.locationManager.getStoredLocation();
    if (location) {
      // Clear cache and fetch fresh data
      this.weatherService.clearCache();
      await this.fetchWeatherForLocation(location);
    } else {
      await this.requestLocationAndFetchWeather();
    }
  }

  /**
   * Handle refresh weather button click
   */
  async handleRefreshWeather() {
    const location = this.locationManager.getStoredLocation();
    if (location) {
      // Clear cache and fetch fresh data
      this.weatherService.clearCache();
      await this.fetchWeatherForLocation(location);
    } else {
      // If no stored location, try to get current location
      await this.requestLocationAndFetchWeather();
    }
  }
}

// Initialize app with Safari-compatible DOM ready check
async function initializeApp() {
  // Prevent multiple initializations - check if already initializing or initialized
  if (window.weatherApp) {
    console.log('Weather Wrangler already exists, skipping initialization');
    return;
  }

  console.log('Initializing Weather Wrangler...');
  const app = new WeatherWranglerApp();

  // Make app available globally immediately to prevent duplicate initialization
  window.weatherApp = app;

  try {
    await app.init();
    console.log('Weather Wrangler initialized successfully');
  } catch (error) {
    console.error('Failed to start Weather Wrangler:', error);
  }
}

// Cross-browser DOM ready function that works with ES modules
function domReady(callback) {
  if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    // DOM is already loaded (common with ES modules), execute immediately
    callback();
  }
}

// Initialize the app when DOM is ready
domReady(initializeApp);

// Additional fallback for older browsers or edge cases
window.onload = () => {
  if (!window.weatherApp) {
    console.log('Fallback initialization via window.onload');
    initializeApp();
  }
};
