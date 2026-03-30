import { useCallback } from "react";

interface ApiErrorShape {
  message?: string;
  error?: string;
  response?: {
    data?: { message?: string; error?: string };
  };
}

export function parseApiError(err: unknown): string {
  if (!err) return "Something went wrong. Please try again.";
  const e = err as ApiErrorShape;

  if (e.response?.data?.message) return e.response.data.message;
  if (e.message) return e.message;
  return "Something went wrong. Please try again.";
}

export function useApiError() {
  const getError = useCallback((err: unknown): string => {
    return parseApiError(err);
  }, []);

  return { getError };
}
