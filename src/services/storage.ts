export const isClient = typeof window !== "undefined";

export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    if (!isClient) return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error("Error reading localStorage key", key, error);
      return defaultValue;
    }
  },

  set: <T>(key: string, value: T): void => {
    if (!isClient) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Error writing localStorage key", key, error);
    }
  },

  remove: (key: string): void => {
    if (!isClient) return;
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error("Error removing localStorage key", key, error);
    }
  },
};
