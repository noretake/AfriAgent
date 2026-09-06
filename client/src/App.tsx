import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useAuth } from "./hooks/useAuth";
import { ApprovalsPage } from "./pages/ApprovalsPage";
import { AuditPage } from "./pages/AuditPage";
import { CopilotPage } from "./pages/CopilotPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { PoliciesPage } from "./pages/PoliciesPage";
import { SecurityPage } from "./pages/SecurityPage";
import { TransactionDetailPage } from "./pages/TransactionDetailPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { WelcomePage } from "./pages/WelcomePage";

export default function App() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const userId = auth.session?.user.id ?? null;

  useEffect(() => {
    queryClient.clear();
  }, [userId, queryClient]);

  if (!auth.ready) return null;
  const signedIn = auth.session !== null;
  const welcome = <WelcomePage signedIn={signedIn} configured={auth.configured} />;

  if (auth.configured && !signedIn) {
    return (
      <Routes>
        <Route path="/welcome" element={welcome} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/welcome" element={welcome} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<Layout session={auth.session} />}>
        <Route index element={<DashboardPage />} />
        <Route path="copilot" element={<CopilotPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="transactions/:id" element={<TransactionDetailPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="policies" element={<PoliciesPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="security" element={<SecurityPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
