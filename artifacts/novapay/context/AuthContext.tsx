import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { router } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import type { UserProfile } from "@workspace/api-client-react";

const TOKEN_KEY = "novapay_token";
const REFRESH_TOKEN_KEY = "novapay_refresh_token";
const USER_KEY = "novapay_user";

// On web: sessionStorage (cleared when tab closes — safer than localStorage against XSS persistence)
// On mobile: expo-secure-store (hardware-backed keychain)
async function secureSet(key: string, value: string) {
  if (Platform.OS === "web") {
    try { sessionStorage.setItem(key, value); } catch {}
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try { return sessionStorage.getItem(key); } catch { return null; }
  }
  return SecureStore.getItemAsync(key);
}

async function secureDelete(key: string) {
  if (Platform.OS === "web") {
    try { sessionStorage.removeItem(key); } catch {}
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export type { UserProfile as AuthUser };

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: UserProfile, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: UserProfile) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

let _currentToken: string | null = null;
let _currentRefreshToken: string | null = null;

function getApiBase(): string {
  if (Platform.OS === "web") {
    return `${typeof window !== "undefined" ? window.location.origin : ""}/api`;
  }
  const domain = process.env["EXPO_PUBLIC_DOMAIN"] ?? "";
  return `https://${domain}/api`;
}

async function tryRefreshToken(): Promise<string | null> {
  if (!_currentRefreshToken) return null;
  try {
    const res = await fetch(`${getApiBase()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: _currentRefreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { token: string; refreshToken: string };
    _currentToken = data.token;
    _currentRefreshToken = data.refreshToken;
    await Promise.all([
      secureSet(TOKEN_KEY, data.token),
      secureSet(REFRESH_TOKEN_KEY, data.refreshToken),
    ]);
    return data.token;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAuthTokenGetter(() => _currentToken, tryRefreshToken);
  }, []);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const scheduleAutoRefresh = useCallback((accessToken: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    try {
      const parts = accessToken.split(".");
      if (parts.length !== 3) return;
      const payload = JSON.parse(
        atob(parts[1]!.replace(/-/g, "+").replace(/_/g, "/"))
      ) as { exp?: number };
      if (typeof payload.exp !== "number") return;
      const msUntilRefresh = Math.max(0, payload.exp * 1000 - Date.now() - 60_000);
      refreshTimerRef.current = setTimeout(async () => {
        const newToken = await tryRefreshToken();
        if (newToken) {
          setToken(newToken);
          _currentToken = newToken;
          scheduleAutoRefresh(newToken);
        }
      }, msUntilRefresh);
    } catch { /* non-critical */ }
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedRefresh, storedUser] = await Promise.all([
        secureGet(TOKEN_KEY),
        secureGet(REFRESH_TOKEN_KEY),
        secureGet(USER_KEY),
      ]);
      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser) as UserProfile;
        setToken(storedToken);
        setUser(parsedUser);
        _currentToken = storedToken;
        _currentRefreshToken = storedRefresh ?? null;
        scheduleAutoRefresh(storedToken);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (newToken: string, newUser: UserProfile, newRefreshToken?: string) => {
    await Promise.all([
      secureSet(TOKEN_KEY, newToken),
      secureSet(USER_KEY, JSON.stringify(newUser)),
      newRefreshToken ? secureSet(REFRESH_TOKEN_KEY, newRefreshToken) : Promise.resolve(),
    ]);
    setToken(newToken);
    setUser(newUser);
    _currentToken = newToken;
    if (newRefreshToken) _currentRefreshToken = newRefreshToken;
    scheduleAutoRefresh(newToken);
  }, [scheduleAutoRefresh]);

  const logout = useCallback(async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    if (_currentRefreshToken) {
      try {
        await fetch(`${getApiBase()}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: _currentRefreshToken }),
        });
      } catch { /* best-effort */ }
    }
    await Promise.all([
      secureDelete(TOKEN_KEY),
      secureDelete(REFRESH_TOKEN_KEY),
      secureDelete(USER_KEY),
    ]);
    setToken(null);
    setUser(null);
    _currentToken = null;
    _currentRefreshToken = null;
    router.replace("/(auth)/login");
  }, []);

  const updateUser = useCallback((updatedUser: UserProfile) => {
    setUser(updatedUser);
    secureSet(USER_KEY, JSON.stringify(updatedUser)).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
