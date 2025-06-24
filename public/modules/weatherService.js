import { WEATHER_CONFIG, STORAGE_KEYS } from './constants.js';

/**
 * Weather API service with caching and error handling
 */
export class WeatherService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5/forecast';
    this.geocodingUrl = 'https://api.openweathermap.org/geo/1.0/zip';
  }

  /**
   * Fetch weather data by coordinates with caching
   */
  async fetchWeatherByCoords(lat, lon) {
    console.log('🌐 WeatherService: fetchWeatherByCoords called for coords:', lat, lon);
    const cacheKey = `coords_${lat}_${lon}`;
    const cachedData = this.getCachedWeather(cacheKey);

    if (cachedData) {
      console.log('📄 WeatherService: Using cached data for coords:', lat, lon);
      return cachedData;
    }

    if (!this.apiKey || this.apiKey === 'WEATHER_API_KEY_PLACEHOLDER') {
      throw new Error('Weather API key not configured. Please check your .env file or GitHub secrets.');
    }

    console.log('🌍 WeatherService: Making API request for coords:', lat, lon);
    const url = `${this.baseUrl}?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=imperial`;
    const data = await this.makeApiRequest(url);

    this.cacheWeather(cacheKey, data);

    // Add current timestamp for fresh data
    return {
      ...data,
      cacheTimestamp: Date.now()
    };
  }

  /**
   * Convert ZIP code to coordinates using geocoding API
   */
  async getCoordinatesFromZip(zipCode) {
    console.log('🌐 WeatherService: Converting ZIP to coordinates:', zipCode);

    if (!this.apiKey || this.apiKey === 'WEATHER_API_KEY_PLACEHOLDER') {
      throw new Error('Weather API key not configured. Please check your .env file or GitHub secrets.');
    }

    const url = `${this.geocodingUrl}?zip=${zipCode}&appid=${this.apiKey}`;

    try {
      const response = await this.makeApiRequest(url);

      if (!response.lat || !response.lon) {
        throw new Error(`Invalid ZIP code: ${zipCode}`);
      }

      return {
        lat: response.lat,
        lon: response.lon,
        name: response.name,
        country: response.country
      };
    } catch (error) {
      if (error.message.includes('404')) {
        throw new Error(`ZIP code not found: ${zipCode}`);
      }
      throw error;
    }
  }

  /**
   * Fetch weather data by ZIP code with caching
   */
  async fetchWeatherByZip(zipCode) {
    console.log('🌐 WeatherService: fetchWeatherByZip called for ZIP:', zipCode);
    const cacheKey = `zip_${zipCode}`;
    const cachedData = this.getCachedWeather(cacheKey);

    if (cachedData) {
      console.log('📄 WeatherService: Using cached data for ZIP:', zipCode);
      return cachedData;
    }

    // First, convert ZIP code to coordinates using geocoding API
    const coordinates = await this.getCoordinatesFromZip(zipCode);
    console.log('📍 WeatherService: Got coordinates for ZIP:', zipCode, coordinates);

    // Then fetch weather data using coordinates
    console.log('🌍 WeatherService: Making weather API request for ZIP:', zipCode);
    const url = `${this.baseUrl}?lat=${coordinates.lat}&lon=${coordinates.lon}&appid=${this.apiKey}&units=imperial`;
    const data = await this.makeApiRequest(url);

    // Store location for future use, including the resolved city name
    const locationData = {
      zipCode,
      lat: coordinates.lat,
      lon: coordinates.lon,
      name: coordinates.name,
      country: coordinates.country
    };
    localStorage.setItem(STORAGE_KEYS.WEATHER_LOCATION, JSON.stringify(locationData));
    this.cacheWeather(cacheKey, data);

    // Add current timestamp for fresh data
    return {
      ...data,
      cacheTimestamp: Date.now(),
      locationInfo: coordinates
    };
  }

  /**
   * Make API request with timeout and error handling
   */
  async makeApiRequest(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEATHER_CONFIG.API_TIMEOUT);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Weather request timed out. Please try again.');
      }

      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      }

      throw error;
    }
  }

  /**
   * Get cached weather data if still valid
   */
  getCachedWeather(key) {
    try {
      const cached = localStorage.getItem(`${STORAGE_KEYS.WEATHER_CACHE}_${key}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > WEATHER_CONFIG.CACHE_DURATION;

        if (!isExpired) {
          console.log('Using cached weather data');
          // Add the cache timestamp to the data
          return {
            ...data,
            cacheTimestamp: timestamp
          };
        } else {
          // Clean up expired cache
          localStorage.removeItem(`${STORAGE_KEYS.WEATHER_CACHE}_${key}`);
        }
      }
    } catch (error) {
      console.warn('Error reading weather cache:', error);
    }
    return null;
  }

  /**
   * Cache weather data with timestamp
   */
  cacheWeather(key, data) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(`${STORAGE_KEYS.WEATHER_CACHE}_${key}`, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Error caching weather data:', error);
    }
  }

  /**
   * Clear all cached weather data
   */
  clearCache() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_KEYS.WEATHER_CACHE)) {
        localStorage.removeItem(key);
      }
    });
  }
}
