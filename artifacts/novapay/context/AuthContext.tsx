import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { router } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import type { UserProfile } from "@workspace/api-client-react";

const TOKEN_KEY = "novapay_token";
const USER_KEY = "novapay_user";

async function secureSet(key: string, value: string) {
  if (Platform.OS === "web") {
    try { localStorage.setItem(key, value); } catch {}
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  return SecureStore.getItemAsync(key);
}

async function secureDelete(key: string) {
  if (Platform.OS === "web") {
    try { localStorage.removeItem(key); } catch {}
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export type { UserProfile as AuthUser };

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: UserProfile) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

let _currentToken: string | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(() => _currentToken);
  }, []);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        secureGet(TOKEN_KEY),
        secureGet(USER_KEY),
      ]);
      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser) as UserProfile;
        setToken(storedToken);
        setUser(parsedUser);
        _currentToken = storedToken;
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (newToken: string, newUser: UserProfile) => {
    await Promise.all([
      secureSet(TOKEN_KEY, newToken),
      secureSet(USER_KEY, JSON.stringify(newUser)),
    ]);
    setToken(newToken);
    setUser(newUser);
    _currentToken = newToken;
  }, []);

  const logout = useCallback(async () => {
    await Promise.all([secureDelete(TOKEN_KEY), secureDelete(USER_KEY)]);
    setToken(null);
    setUser(null);
    _currentToken = null;
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
