/**
 * Utility functions for better performance and UX
 */

/**
 * Debounce function to limit how often a function can be called
 */
export function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(this, args);
  };
}

/**
 * Throttle function to limit function calls to at most once per interval
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (i === maxRetries) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Simple event emitter for loose coupling between components
 */
export class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event, ...args) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in event handler for '${event}':`, error);
      }
    });
  }
}

/**
 * Local storage wrapper with error handling and fallbacks
 */
export class SafeStorage {
  static isAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  static getItem(key, defaultValue = null) {
    if (!this.isAvailable()) return defaultValue;

    try {
      const item = localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading from localStorage key '${key}':`, error);
      return defaultValue;
    }
  }

  static setItem(key, value) {
    if (!this.isAvailable()) return false;

    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Error writing to localStorage key '${key}':`, error);
      return false;
    }
  }

  static removeItem(key) {
    if (!this.isAvailable()) return false;

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Error removing localStorage key '${key}':`, error);
      return false;
    }
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  static mark(name) {
    if (performance && performance.mark) {
      performance.mark(name);
    }
  }

  static measure(name, startMark, endMark) {
    if (performance && performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name, 'measure')[0];
        return measure ? measure.duration : null;
      } catch (error) {
        console.warn('Performance measurement failed:', error);
        return null;
      }
    }
    return null;
  }

  static logTiming(name, startMark, endMark) {
    const duration = this.measure(name, startMark, endMark);
    if (duration !== null) {
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    }
  }
}
