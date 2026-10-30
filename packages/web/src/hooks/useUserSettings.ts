import { useSyncExternalStore } from "react";

export interface UserProfile {
  fullName: string;
  role: string;
  email: string;
  phone: string;
}

export interface UserPreferences {
  landingTab: string;
  defaultCompany: string;
  sidebarCollapsed: boolean;
  showCostBadge: boolean;
  notifyApprovals: boolean;
  notifyStock: boolean;
  notifyAgent: boolean;
}

export interface UserSettings {
  profile: UserProfile;
  preferences: UserPreferences;
}

const STORAGE_KEY = "mint.user-settings";

export const COMPANIES = [
  "Mint Colombia",
  "Bogotá D.C.",
  "Bucaramanga",
  "Medellín",
] as const;

export const LANDING_OPTIONS = [
  { value: "inicio", label: "Inicio" },
  { value: "aprobaciones", label: "Aprobaciones" },
  { value: "inventario", label: "Inventario" },
  { value: "flujo_agente", label: "Agente" },
  { value: "analisis_reportes", label: "Reportes" },
] as const;

const DEFAULT_SETTINGS: UserSettings = {
  profile: {
    fullName: "Usuario Mint",
    role: "Administrador",
    email: "",
    phone: "",
  },
  preferences: {
    landingTab: "inicio",
    defaultCompany: COMPANIES[0],
    sidebarCollapsed: false,
    showCostBadge: true,
    notifyApprovals: true,
    notifyStock: true,
    notifyAgent: true,
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readSettings = (): UserSettings => {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT_SETTINGS;

  const parsed: unknown = JSON.parse(stored);
  if (!isRecord(parsed)) return DEFAULT_SETTINGS;

  const savedProfile = isRecord(parsed.profile) ? parsed.profile : {};
  const savedPreferences = isRecord(parsed.preferences) ? parsed.preferences : {};

  return {
    profile: {
      fullName:
        typeof savedProfile.fullName === "string"
          ? savedProfile.fullName
          : DEFAULT_SETTINGS.profile.fullName,
      role:
        typeof savedProfile.role === "string"
          ? savedProfile.role
          : DEFAULT_SETTINGS.profile.role,
      email:
        typeof savedProfile.email === "string"
          ? savedProfile.email
          : DEFAULT_SETTINGS.profile.email,
      phone:
        typeof savedProfile.phone === "string"
          ? savedProfile.phone
          : DEFAULT_SETTINGS.profile.phone,
    },
    preferences: {
      landingTab:
        typeof savedPreferences.landingTab === "string"
          ? savedPreferences.landingTab
          : DEFAULT_SETTINGS.preferences.landingTab,
      defaultCompany:
        typeof savedPreferences.defaultCompany === "string"
          ? savedPreferences.defaultCompany
          : DEFAULT_SETTINGS.preferences.defaultCompany,
      sidebarCollapsed:
        typeof savedPreferences.sidebarCollapsed === "boolean"
          ? savedPreferences.sidebarCollapsed
          : DEFAULT_SETTINGS.preferences.sidebarCollapsed,
      showCostBadge:
        typeof savedPreferences.showCostBadge === "boolean"
          ? savedPreferences.showCostBadge
          : DEFAULT_SETTINGS.preferences.showCostBadge,
      notifyApprovals:
        typeof savedPreferences.notifyApprovals === "boolean"
          ? savedPreferences.notifyApprovals
          : DEFAULT_SETTINGS.preferences.notifyApprovals,
      notifyStock:
        typeof savedPreferences.notifyStock === "boolean"
          ? savedPreferences.notifyStock
          : DEFAULT_SETTINGS.preferences.notifyStock,
      notifyAgent:
        typeof savedPreferences.notifyAgent === "boolean"
          ? savedPreferences.notifyAgent
          : DEFAULT_SETTINGS.preferences.notifyAgent,
    },
  };
};

let settings = readSettings();
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    settings = readSettings();
    notifyListeners();
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
};

const getSnapshot = () => settings;
const getServerSnapshot = () => DEFAULT_SETTINGS;

export const getUserSettings = () => settings;

export const useUserSettings = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

const saveSettings = (nextSettings: UserSettings) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
  }
  settings = nextSettings;
  notifyListeners();
};

export const updateProfile = (profile: Partial<UserProfile>) => {
  saveSettings({
    ...settings,
    profile: { ...settings.profile, ...profile },
  });
};

export const updatePreferences = (preferences: Partial<UserPreferences>) => {
  saveSettings({
    ...settings,
    preferences: { ...settings.preferences, ...preferences },
  });
};

export const resetPreferences = () => {
  saveSettings({
    ...settings,
    preferences: { ...DEFAULT_SETTINGS.preferences },
  });
};

export const getInitials = (fullName: string) =>
  fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toLocaleUpperCase())
    .join("") || "U";
