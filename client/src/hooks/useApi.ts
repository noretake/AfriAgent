import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

export const keys = {
  health: ["health"] as const,
  dashboard: ["dashboard"] as const,
  transactions: ["transactions"] as const,
  transaction: (id: string) => ["transactions", id] as const,
  approvals: ["approvals"] as const,
  policies: ["policies"] as const,
  audit: ["audit"] as const,
  security: ["security"] as const,
};

export const useHealth = () => useQuery({ queryKey: keys.health, queryFn: api.health, refetchInterval: 30_000 });
export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: api.dashboard, refetchInterval: 15_000 });
export const useTransactions = () => useQuery({ queryKey: keys.transactions, queryFn: api.transactions });
export const useTransaction = (id: string) => useQuery({ queryKey: keys.transaction(id), queryFn: () => api.transaction(id), enabled: !!id });
export const useApprovals = () => useQuery({ queryKey: keys.approvals, queryFn: api.approvals, refetchInterval: 15_000 });
export const usePolicies = () => useQuery({ queryKey: keys.policies, queryFn: api.policies });
export const useAudit = () => useQuery({ queryKey: keys.audit, queryFn: api.audit });
export const useSecurity = () => useQuery({ queryKey: keys.security, queryFn: api.security, refetchInterval: 15_000 });

/** Invalidate everything that a financial action can change. */
export function useInvalidateFinancial() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.dashboard }),
      qc.invalidateQueries({ queryKey: keys.transactions }),
      qc.invalidateQueries({ queryKey: keys.approvals }),
      qc.invalidateQueries({ queryKey: keys.audit }),
      qc.invalidateQueries({ queryKey: keys.security }),
    ]);
}

export function useApprovalActions() {
  const invalidate = useInvalidateFinancial();
  const approve = useMutation({ mutationFn: (id: string) => api.approve(id), onSettled: invalidate });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => api.reject(id, reason),
    onSettled: invalidate,
  });
  return { approve, reject };
}
