interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Autenticação gerenciada pelo sistema principal (AtendZappy)
// O módulo é carregado via iframe em ambiente já autenticado
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  return <>{children}</>;
};