// Application constants and configuration
export const DEFAULT_SETTINGS = {
  tempThresholdTopOff: 60,      // Minimum temperature (°F) for top off recommendation
  tempThresholdDoorsOff: 65,    // Minimum temperature (°F) for doors off recommendation
  rainChanceThreshold: 10,      // Maximum rain chance (%) for any recommendation
  windSpeedThreshold: 15        // Maximum wind speed (mph) for doors off recommendation
};

export const WEATHER_CONFIG = {
  // CACHE_DURATION: 10 * 60 * 1000, // 10 minutes in milliseconds
  CACHE_DURATION: 1000, // 10 minutes in milliseconds
  API_TIMEOUT: 10000, // 10 seconds
  RAIN_WEATHER_IDS: {
    THUNDERSTORM_MIN: 200,
    THUNDERSTORM_MAX: 232,
    DRIZZLE_MIN: 300,
    DRIZZLE_MAX: 321,
    RAIN_MIN: 500,
    RAIN_MAX: 531
  }
};

export const DOM_ELEMENTS = {
  // Settings
  settingsModal: 'settingsModal',
  settingsToggle: 'settingsToggle',
  settingsForm: 'settingsForm',
  closeModal: 'closeModal',
  cancelSettings: 'cancelSettings',

  // Form inputs
  tempTopOff: 'tempTopOff',
  tempDoorsOff: 'tempDoorsOff',
  rainThreshold: 'rainThreshold',
  windThreshold: 'windThreshold',
  zipcode: 'zipcode',
  locationForm: 'locationForm',
  zipcodePrompt: 'zipcodePrompt',
  locationPromptForm: 'locationPromptForm',

  // Display elements
  loading: 'loading',
  error: 'error',
  locationPrompt: 'locationPrompt',
  weatherResults: 'weatherResults',
  weatherTitle: 'weatherTitle',
  jeepImage: 'jeepImage',
  maxTemp: 'maxTemp',
  rainChance: 'rainChance',
  windSpeed: 'windSpeed',
  topStatus: 'topStatus',
  doorsStatus: 'doorsStatus',
  useCurrentLocation: 'useCurrentLocation'
};

export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  WEATHER_LOCATION: 'weatherLocation',
  WEATHER_CACHE: 'weatherCache'
};
