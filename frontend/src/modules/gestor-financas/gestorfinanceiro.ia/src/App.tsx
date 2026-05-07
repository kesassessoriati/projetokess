import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Receitas from "./pages/Receitas";
import Despesas from "./pages/Despesas";
import Transacoes from "./pages/Transacoes";
import Dividas from "./pages/Dividas";
import Categorias from "./pages/Categorias";
import Relatorios from "./pages/Relatorios";
import Metas from "./pages/Metas";
import Mercado from "./pages/Mercado";
import Veiculos from "./pages/Veiculos";
import Perfil from "./pages/Perfil";
import IA from "./pages/IA";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import "./App.css";

import { ErrorBoundary } from "./components/ErrorBoundary";

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/receitas"
              element={
                <ProtectedRoute>
                  <Receitas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/despesas"
              element={
                <ProtectedRoute>
                  <Despesas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transacoes"
              element={
                <ProtectedRoute>
                  <Transacoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dividas"
              element={
                <ProtectedRoute>
                  <Dividas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/categorias"
              element={
                <ProtectedRoute>
                  <Categorias />
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios"
              element={
                <ProtectedRoute>
                  <Relatorios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/metas"
              element={
                <ProtectedRoute>
                  <Metas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mercado"
              element={
                <ProtectedRoute>
                  <Mercado />
                </ProtectedRoute>
              }
            />
            <Route
              path="/veiculos"
              element={
                <ProtectedRoute>
                  <Veiculos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <Perfil />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ia"
              element={
                <ProtectedRoute>
                  <IA />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </div>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
