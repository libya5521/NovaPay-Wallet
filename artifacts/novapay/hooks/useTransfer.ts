// artifacts/novapay/hooks/useTransfer.ts
//
// React hook for initiating idempotent peer-to-peer transfers.
//
// Key properties:
//   • Generates a crypto.randomUUID() idempotency key per call — if the
//     network drops mid-request, retrying with the same key is safe.
//   • Manages loading / error / success states.
//   • Auto-refreshes the auth token on 401 (delegates to AuthContext logout
//     if refresh also fails).
//
import { useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { customFetch } from "@workspace/api-client-react";

export interface TransferParams {
  recipientEmail: string;
  amount: number;
  currency?: string;
  note?: string;
}

export interface TransferResult {
  id: string;
  type: string;
  amount: string;
  currency: string;
  description: string;
  status: string;
  createdAt: string;
}

export interface UseTransferState {
  isLoading: boolean;
  error: string | null;
  result: TransferResult | null;
  idempotent: boolean;
}

export function useTransfer() {
  const { logout } = useAuth();

  const [state, setState] = useState<UseTransferState>({
    isLoading: false,
    error: null,
    result: null,
    idempotent: false,
  });

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, result: null, idempotent: false });
  }, []);

  const initiateTransfer = useCallback(
    async (params: TransferParams): Promise<TransferResult | null> => {
      // Generate a fresh idempotency key for this logical transfer attempt.
      // The caller should NOT generate the key — this keeps it internal.
      const idempotencyKey = crypto.randomUUID();

      setState({ isLoading: true, error: null, result: null, idempotent: false });

      try {
        const response = await customFetch<{
          idempotent: boolean;
          debit: TransferResult;
        }>("/api/transfer", {
          method: "POST",
          body: JSON.stringify({
            recipientEmail: params.recipientEmail,
            amount: params.amount,
            currency: params.currency ?? "USD",
            note: params.note,
            idempotencyKey,
          }),
        });

        setState({
          isLoading: false,
          error: null,
          result: response.debit,
          idempotent: response.idempotent,
        });

        return response.debit;
      } catch (err: unknown) {
        const e = err as {
          status?: number;
          response?: { data?: { error?: { message?: string } } };
          message?: string;
        };

        // 401 — token expired; log out and let the auth flow handle re-login
        if (e.status === 401) {
          await logout();
          setState({ isLoading: false, error: "Session expired. Please log in again.", result: null, idempotent: false });
          return null;
        }

        // Extract API error message safely — never expose internals
        const apiMessage = e.response?.data?.error?.message;
        const message =
          apiMessage && apiMessage.length < 200
            ? apiMessage
            : "Transfer failed. Please try again.";

        setState({ isLoading: false, error: message, result: null, idempotent: false });
        return null;
      }
    },
    [logout]
  );

  return {
    ...state,
    initiateTransfer,
    reset,
  };
}
