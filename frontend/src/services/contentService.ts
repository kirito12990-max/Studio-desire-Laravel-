import { API_BASE } from "../config/api";

export const contentService = {
  async getSectionContent<T>(section: string, fallbackDefault: T): Promise<T> {
    try {
      const res = await fetch(`${API_BASE}/content/${section}`);
      if (!res.ok) return fallbackDefault;
      const data = await res.json();
      return (data && Object.keys(data).length > 0) ? data : fallbackDefault;
    } catch {
      return fallbackDefault;
    }
  }
};
