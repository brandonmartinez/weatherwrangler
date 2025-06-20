import { WEATHER_CONFIG } from './constants.js';

/**
 * Weather condition analysis utilities
 */
export class WeatherAnalyzer {
  /**
   * Evaluate weather conditions for Jeep recommendations
   */
  static evaluateConditions(weatherData, settings) {
    const cityName = weatherData.city ? weatherData.city.name : "Unknown Location";
    const lastUpdated = weatherData.cacheTimestamp || Date.now();
    const todayForecasts = this.getTodayForecasts(weatherData);

    if (todayForecasts.length === 0) {
      throw new Error('No weather forecast data available for today');
    }

    const conditions = this.analyzeForecasts(todayForecasts);
    const recommendations = this.generateRecommendations(conditions, settings);

    // Debug logging
    console.log('Time-based analysis:', conditions.timeBasedAnalysis);
    console.log('Time-based recommendations:', recommendations.timeBasedRecommendations);

    return {
      ...recommendations,
      ...conditions,
      cityName,
      lastUpdated
    };
  }

  /**
   * Get today's weather forecasts from the API response
   * Takes into account the timezone of the weather location, not the browser's timezone
   * Enriches forecasts with timezone information for easier processing
   */
  static getTodayForecasts(weatherData) {
    // Get timezone offset in milliseconds for the weather location
    const timezoneOffsetMs = this.getLocationTimezoneOffset(weatherData);

    // Calculate "today" in the location's timezone
    const now = new Date();
    const locationTime = new Date(now.getTime() + timezoneOffsetMs);
    const todayStart = new Date(locationTime.getFullYear(), locationTime.getMonth(), locationTime.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Filter forecasts for today based on location timezone
    let todayForecasts = weatherData.list.filter((forecast) => {
      const forecastUtc = new Date(forecast.dt * 1000);
      const forecastLocalTime = new Date(forecastUtc.getTime() + timezoneOffsetMs);
      return forecastLocalTime >= todayStart && forecastLocalTime < todayEnd;
    });

    // If no forecasts for today, use the first few available
    if (todayForecasts.length === 0) {
      todayForecasts = weatherData.list.slice(0, 8);
    }

    // Enrich forecasts with timezone information for easier processing
    return todayForecasts.map(forecast => ({
      ...forecast,
      _timezoneOffsetMs: timezoneOffsetMs
    }));
  }

  /**
   * Get timezone offset for the weather location in milliseconds
   * Uses the timezone offset provided by the OpenWeatherMap API
   */
  static getLocationTimezoneOffset(weatherData) {
    // The API provides timezone offset in seconds from UTC
    if (weatherData.city && typeof weatherData.city.timezone === 'number') {
      return weatherData.city.timezone * 1000; // Convert to milliseconds
    }

    // Fallback to browser's timezone if location data is unavailable
    return -new Date().getTimezoneOffset() * 60 * 1000; // Convert minutes to milliseconds
  }

  /**
   * Analyze forecast data to extract max conditions and rain timing
   */
  static analyzeForecasts(forecasts) {
    let maxTemp = -Infinity;
    let maxRainChance = 0;
    let maxWind = -Infinity;

    for (const forecast of forecasts) {
      // Temperature analysis
      const temp = Math.round(forecast.main.temp);
      maxTemp = Math.max(maxTemp, temp);

      // Rain chance analysis
      const rainChance = this.calculateRainChance(forecast);
      maxRainChance = Math.max(maxRainChance, rainChance);

      // Wind analysis (convert m/s to mph)
      const windMph = Math.round(forecast.wind.speed * 2.237);
      maxWind = Math.max(maxWind, windMph);
    }

    // Analyze rain timing for better planning
    const rainTiming = this.analyzeRainTiming(forecasts);

    // Analyze time-based conditions for detailed recommendations
    const timeBasedAnalysis = this.analyzeTimeBasedConditions(forecasts);

    return {
      maxTemp,
      minRain: Math.round(maxRainChance),
      maxWind,
      rainTiming,
      timeBasedAnalysis
    };
  }

  /**
   * Analyze rain timing throughout the day to help with planning
   */
  static analyzeRainTiming(forecasts) {
    const rainPeriods = [];
    let currentPeriod = null;
    const RAIN_THRESHOLD = 10; // Consider 10%+ as meaningful rain chance

    // Get timezone offset from the first forecast (all should have the same)
    const timezoneOffsetMs = forecasts.length > 0 ? forecasts[0]._timezoneOffsetMs || 0 : 0;

    forecasts.forEach((forecast, index) => {
      const rainChance = this.calculateRainChance(forecast);
      const utcTime = new Date(forecast.dt * 1000);
      const localTime = new Date(utcTime.getTime() + timezoneOffsetMs);
      const timeStr = localTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      if (rainChance >= RAIN_THRESHOLD) {
        if (!currentPeriod) {
          // Start of a new rain period
          currentPeriod = {
            startTime: timeStr,
            startHour: localTime.getHours(),
            endTime: timeStr,
            endHour: localTime.getHours(),
            maxChance: rainChance,
            forecasts: [{ time: timeStr, chance: rainChance }]
          };
        } else {
          // Continue current rain period
          currentPeriod.endTime = timeStr;
          currentPeriod.endHour = localTime.getHours();
          currentPeriod.maxChance = Math.max(currentPeriod.maxChance, rainChance);
          currentPeriod.forecasts.push({ time: timeStr, chance: rainChance });
        }
      } else {
        if (currentPeriod) {
          // End of current rain period
          rainPeriods.push(currentPeriod);
          currentPeriod = null;
        }
      }
    });

    // Add the last period if it exists
    if (currentPeriod) {
      rainPeriods.push(currentPeriod);
    }

    return {
      periods: rainPeriods,
      hasRain: rainPeriods.length > 0,
      summary: this.generateRainSummary(rainPeriods)
    };
  }

  /**
   * Generate a human-readable rain timing summary
   */
  static generateRainSummary(rainPeriods) {
    if (rainPeriods.length === 0) {
      return "No significant rain expected today";
    }

    if (rainPeriods.length === 1) {
      const period = rainPeriods[0];
      if (period.startTime === period.endTime) {
        return `Rain expected around ${period.startTime} (${Math.round(period.maxChance)}% chance)`;
      }
      return `Rain expected from ${period.startTime} to ${period.endTime} (up to ${Math.round(period.maxChance)}% chance)`;
    }

    // Multiple rain periods
    const periodSummaries = rainPeriods.map(period => {
      if (period.startTime === period.endTime) {
        return `${period.startTime} (${Math.round(period.maxChance)}%)`;
      }
      return `${period.startTime}-${period.endTime} (${Math.round(period.maxChance)}%)`;
    });

    return `Rain expected: ${periodSummaries.join(', ')}`;
  }

  /**
   * Calculate rain chance from weather conditions
   * Prioritizes the 'pop' (probability of precipitation) field from the API
   */
  static calculateRainChance(forecast) {
    // Always use 'pop' (probability of precipitation) if available
    // This is the most accurate predictor regardless of current weather conditions
    if (typeof forecast.pop === 'number') {
      return forecast.pop * 100; // Convert from decimal (0-1) to percentage (0-100)
    }

    // Fallback to weather condition analysis if 'pop' is not available
    if (!forecast.weather || !forecast.weather[0]) {
      return 0;
    }

    const weatherId = forecast.weather[0].id;
    const { THUNDERSTORM_MIN, THUNDERSTORM_MAX, DRIZZLE_MIN, DRIZZLE_MAX, RAIN_MIN, RAIN_MAX } = WEATHER_CONFIG.RAIN_WEATHER_IDS;

    // Check if weather indicates precipitation
    const isRainy = (weatherId >= THUNDERSTORM_MIN && weatherId <= THUNDERSTORM_MAX) ||
                    (weatherId >= DRIZZLE_MIN && weatherId <= DRIZZLE_MAX) ||
                    (weatherId >= RAIN_MIN && weatherId <= RAIN_MAX);

    // Return 50% chance if currently raining but no 'pop' data available
    return isRainy ? 50 : 0;
  }

  /**
   * Analyze time-based conditions throughout the day
   */
  static analyzeTimeBasedConditions(forecasts) {
    const timezoneOffsetMs = forecasts.length > 0 ? forecasts[0]._timezoneOffsetMs || 0 : 0;

    // Define time periods
    const periods = {
      morning: { start: 6, end: 12, name: 'Morning', forecasts: [] },
      afternoon: { start: 12, end: 18, name: 'Afternoon', forecasts: [] },
      evening: { start: 18, end: 24, name: 'Evening', forecasts: [] }
    };

    // Group forecasts by time period
    forecasts.forEach(forecast => {
      const utcTime = new Date(forecast.dt * 1000);
      const localTime = new Date(utcTime.getTime() + timezoneOffsetMs);
      const hour = localTime.getHours();

      for (const [periodKey, period] of Object.entries(periods)) {
        if (hour >= period.start && hour < period.end) {
          period.forecasts.push({
            ...forecast,
            localTime,
            hour
          });
          break;
        }
      }
    });

    // Analyze each period
    const analysis = {};
    for (const [periodKey, period] of Object.entries(periods)) {
      if (period.forecasts.length === 0) {
        analysis[periodKey] = null;
        continue;
      }

      // Calculate average conditions for the period
      let totalTemp = 0;
      let maxRainChance = 0;
      let maxWind = 0;

      period.forecasts.forEach(forecast => {
        totalTemp += forecast.main.temp;
        maxRainChance = Math.max(maxRainChance, this.calculateRainChance(forecast));
        maxWind = Math.max(maxWind, forecast.wind.speed * 2.237);
      });

      const avgTemp = Math.round(totalTemp / period.forecasts.length);

      analysis[periodKey] = {
        name: period.name,
        avgTemp,
        maxRainChance: Math.round(maxRainChance),
        maxWind: Math.round(maxWind),
        startTime: period.forecasts[0].localTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          hour12: true
        }),
        endTime: period.forecasts[period.forecasts.length - 1].localTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          hour12: true
        }),
        forecasts: period.forecasts
      };
    }

    return analysis;
  }

  /**
   * Generate Jeep configuration recommendations based on conditions and settings
   */
  static generateRecommendations(conditions, settings) {
    const { maxTemp, minRain, maxWind, timeBasedAnalysis } = conditions;

    // Overall day recommendations (existing logic)
    const topOff = maxTemp >= settings.tempThresholdTopOff &&
                   minRain < settings.rainChanceThreshold;

    const doorsOff = maxTemp >= settings.tempThresholdDoorsOff &&
                     minRain < settings.rainChanceThreshold &&
                     maxWind < settings.windSpeedThreshold;

    // Generate time-based recommendations
    const timeBasedRecommendations = this.generateTimeBasedRecommendations(timeBasedAnalysis, settings);

    return {
      topOff,
      doorsOff,
      timeBasedRecommendations
    };
  }

  /**
   * Generate time-based recommendations for different periods of the day
   */
  static generateTimeBasedRecommendations(timeBasedAnalysis, settings) {
    const recommendations = [];

    if (!timeBasedAnalysis) return recommendations;

    const periods = ['morning', 'afternoon', 'evening'];
    const periodRecommendations = {};

    // Analyze each period
    periods.forEach(periodKey => {
      const period = timeBasedAnalysis[periodKey];
      if (!period) return;

      const topOff = period.avgTemp >= settings.tempThresholdTopOff &&
                     period.maxRainChance < settings.rainChanceThreshold;

      const doorsOff = period.avgTemp >= settings.tempThresholdDoorsOff &&
                       period.maxRainChance < settings.rainChanceThreshold &&
                       period.maxWind < settings.windSpeedThreshold;

      periodRecommendations[periodKey] = {
        period: period.name,
        topOff,
        doorsOff,
        temp: period.avgTemp,
        rainChance: period.maxRainChance,
        windSpeed: period.maxWind,
        startTime: period.startTime,
        endTime: period.endTime
      };
    });

    // Generate intelligent recommendations based on changing conditions
    const intelligentRecommendations = this.generateIntelligentRecommendations(periodRecommendations, settings);

    return {
      periods: periodRecommendations,
      recommendations: intelligentRecommendations
    };
  }

  /**
   * Generate intelligent recommendations that account for changing conditions throughout the day
   */
  static generateIntelligentRecommendations(periodRecommendations, settings) {
    const recommendations = [];
    const periods = ['morning', 'afternoon', 'evening'];

    // Find valid periods (where we have data)
    const validPeriods = periods.filter(p => periodRecommendations[p]);

    if (validPeriods.length === 0) {
      return ['No detailed forecast available for today'];
    }

    // Analyze patterns in the day
    const patterns = this.analyzeWeatherPatterns(validPeriods, periodRecommendations);

    // Generate recommendations based on patterns
    if (patterns.consistentGoodWeather) {
      if (patterns.allDoorsOff) {
        recommendations.push("Perfect weather all day! Keep both top and doors off.");
      } else if (patterns.allTopOff) {
        recommendations.push("Great weather for the top off all day, but keep doors on due to wind or temperature.");
      } else {
        recommendations.push("Weather conditions suggest keeping top and doors on today.");
      }
    } else {
      // Variable conditions - provide time-specific recommendations
      const timeSpecificRecs = this.generateTimeSpecificRecommendations(validPeriods, periodRecommendations, settings);
      recommendations.push(...timeSpecificRecs);
    }

    return recommendations;
  }

  /**
   * Analyze weather patterns throughout the day
   */
  static analyzeWeatherPatterns(validPeriods, periodRecommendations) {
    const topOffCount = validPeriods.filter(p => periodRecommendations[p].topOff).length;
    const doorsOffCount = validPeriods.filter(p => periodRecommendations[p].doorsOff).length;

    return {
      consistentGoodWeather: topOffCount === validPeriods.length || topOffCount === 0,
      allTopOff: topOffCount === validPeriods.length,
      allDoorsOff: doorsOffCount === validPeriods.length,
      variableConditions: topOffCount > 0 && topOffCount < validPeriods.length
    };
  }

  /**
   * Generate time-specific recommendations for variable conditions
   */
  static generateTimeSpecificRecommendations(validPeriods, periodRecommendations, settings) {
    const recommendations = [];

    if (validPeriods.length === 0) {
      return ['No forecast data available for specific time recommendations'];
    }

    // Group consecutive periods with similar recommendations
    let currentGroup = null;
    const groups = [];

    validPeriods.forEach(periodKey => {
      const period = periodRecommendations[periodKey];
      const config = this.getConfigurationString(period.topOff, period.doorsOff);

      if (!currentGroup || currentGroup.config !== config) {
        // Start new group
        if (currentGroup) groups.push(currentGroup);
        currentGroup = {
          config,
          periods: [period],
          startTime: period.startTime,
          endTime: period.endTime,
          topOff: period.topOff,
          doorsOff: period.doorsOff
        };
      } else {
        // Continue current group
        currentGroup.periods.push(period);
        currentGroup.endTime = period.endTime;
      }
    });

    if (currentGroup) groups.push(currentGroup);

    // Generate recommendations for each group
    groups.forEach((group, index) => {
      const timePhrase = this.getTimePhrase(group.periods);
      const reason = this.getRecommendationReason(group.periods, settings);

      if (group.topOff && group.doorsOff) {
        if (timePhrase === 'all day') {
          recommendations.push(`Perfect weather all day! Both top and doors off recommended${reason}`);
        } else {
          recommendations.push(`${timePhrase}: Perfect for both top and doors off${reason}`);
        }
      } else if (group.topOff && !group.doorsOff) {
        if (timePhrase === 'all day') {
          recommendations.push(`Good day for top off, but keep doors on all day${reason}`);
        } else {
          recommendations.push(`${timePhrase}: Take the top off, but keep doors on${reason}`);
        }
      } else {
        if (timePhrase === 'all day') {
          recommendations.push(`Keep both top and doors on today${reason}`);
        } else {
          recommendations.push(`${timePhrase}: Keep top and doors on${reason}`);
        }
      }
    });

    // Add helpful transition advice for multiple groups
    if (groups.length > 1) {
      const hasChanges = groups.some((group, index) => {
        if (index === 0) return false;
        const prev = groups[index - 1];
        return group.topOff !== prev.topOff || group.doorsOff !== prev.doorsOff;
      });

      if (hasChanges) {
        recommendations.push(`💡 Pro tip: Consider your plans and comfort when making changes throughout the day`);
      }
    }

    // If we only have one recommendation that covers everything, make it more specific
    if (recommendations.length === 1 && validPeriods.length > 1) {
      const tempRange = this.getTemperatureRange(validPeriods, periodRecommendations);
      const first = recommendations[0];
      recommendations[0] = first.replace('all day', `all day (${tempRange})`);
    }

    return recommendations;
  }

  /**
   * Get temperature range for the day
   */
  static getTemperatureRange(validPeriods, periodRecommendations) {
    const temps = validPeriods.map(p => periodRecommendations[p].temp);
    const min = Math.min(...temps);
    const max = Math.max(...temps);

    if (min === max) {
      return `${min}°F`;
    }
    return `${min}°F - ${max}°F`;
  }

  /**
   * Get configuration string for grouping
   */
  static getConfigurationString(topOff, doorsOff) {
    if (topOff && doorsOff) return 'both-off';
    if (topOff && !doorsOff) return 'top-off';
    return 'both-on';
  }

  /**
   * Get time phrase for recommendation
   */
  static getTimePhrase(periods) {
    if (periods.length === 1) {
      const period = periods[0].period.toLowerCase();
      if (period === 'morning') return 'This morning';
      if (period === 'afternoon') return 'This afternoon';
      if (period === 'evening') return 'This evening';
      return period;
    } else if (periods.length === 2) {
      const first = periods[0].period.toLowerCase();
      const second = periods[1].period.toLowerCase();
      return `${first} and ${second}`;
    } else {
      return 'all day';
    }
  }

  /**
   * Get reason for recommendation based on limiting factors
   */
  static getRecommendationReason(periods, settings) {
    const reasons = [];

    // Find the most restrictive conditions
    const maxTemp = Math.max(...periods.map(p => p.temp));
    const maxRain = Math.max(...periods.map(p => p.rainChance));
    const maxWind = Math.max(...periods.map(p => p.windSpeed));

    if (maxTemp < settings.tempThresholdTopOff) {
      reasons.push(`temperature only reaching ${maxTemp}°F`);
    }

    if (maxRain >= settings.rainChanceThreshold) {
      reasons.push(`${maxRain}% chance of rain`);
    }

    if (maxWind >= settings.windSpeedThreshold) {
      reasons.push(`winds up to ${maxWind} mph`);
    }

    if (reasons.length > 0) {
      return ` (${reasons.join(', ')})`;
    }

    return '';
  }

  /**
   * Get recommendation explanations for user display
   */
  static getRecommendationExplanations(conditions, settings) {
    const { maxTemp, minRain, maxWind, rainTiming, timeBasedRecommendations } = conditions;
    const explanations = [];

    // Add time-based recommendations first (most important)
    if (timeBasedRecommendations && timeBasedRecommendations.recommendations) {
      timeBasedRecommendations.recommendations.forEach(rec => {
        explanations.push(`🎯 ${rec}`);
      });
    }

    // Add technical details for those interested
    const technicalDetails = [];

    // Temperature explanations
    if (maxTemp < settings.tempThresholdTopOff) {
      technicalDetails.push(`Temperature too low (${maxTemp}°F < ${settings.tempThresholdTopOff}°F)`);
    }

    if (maxTemp < settings.tempThresholdDoorsOff) {
      technicalDetails.push(`Temperature too low for doors off (${maxTemp}°F < ${settings.tempThresholdDoorsOff}°F)`);
    }

    // Rain explanations with timing
    if (minRain >= settings.rainChanceThreshold) {
      let rainExplanation = `Rain chance too high (${minRain}% >= ${settings.rainChanceThreshold}%)`;
      if (rainTiming && rainTiming.summary) {
        rainExplanation += ` - ${rainTiming.summary}`;
      }
      technicalDetails.push(rainExplanation);
    }

    // Wind explanations
    if (maxWind >= settings.windSpeedThreshold) {
      technicalDetails.push(`Wind too strong for doors off (${maxWind} mph >= ${settings.windSpeedThreshold} mph)`);
    }

    // Add helpful rain timing info even when conditions are good
    if (minRain < settings.rainChanceThreshold && rainTiming && rainTiming.hasRain) {
      explanations.push(`ℹ️ Planning tip: ${rainTiming.summary}`);
    }

    // Add technical details if there are any
    if (technicalDetails.length > 0) {
      explanations.push(`📊 Technical details: ${technicalDetails.join('; ')}`);
    }

    return explanations;
  }
}
