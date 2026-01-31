/**
 * Platform detection utilities for web vs Android wrapped app
 */

export const isAndroid = () => {
  // Check if running in Capacitor
  if (window.Capacitor) {
    return window.Capacitor.getPlatform() === 'android';
  }
  
  // Fallback: Check user agent
  return /android/i.test(navigator.userAgent);
};

export const isWeb = () => {
  return !window.Capacitor || window.Capacitor.getPlatform() === 'web';
};

export const isIOS = () => {
  if (window.Capacitor) {
    return window.Capacitor.getPlatform() === 'ios';
  }
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const getPlatform = () => {
  if (isAndroid()) return 'android';
  if (isIOS()) return 'ios';
  return 'web';
};