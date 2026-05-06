import React, { useContext } from "react";
import { Route as RouterRoute, Redirect } from "react-router-dom";

import { AuthContext } from "../context/Auth/AuthContext";
import { usePlanPermissions } from "../context/PlanPermissionsContext";
import BackdropLoading from "../components/BackdropLoading";

const Route = ({ component: Component, isPrivate = false, isPublic = false, adminOnly = false, featureKey = null, ...rest }) => {
  const { isAuth, loading, user } = useContext(AuthContext);
  const permissions = usePlanPermissions();

  // Rotas públicas (landing, login, cadastro, etc) - carrega instantaneamente sem loading
  if (isPublic) {
    // Se já está logado e tenta acessar landing/login/cadastro, redireciona para dashboard
    if (!loading && isAuth && (rest.path === "/" || rest.path === "/login" || rest.path === "/cadastro")) {
      return <Redirect to={{ pathname: "/atendimentos", state: { from: rest.location } }} />;
    }
    return <RouterRoute {...rest} component={Component} />;
  }

  // Mostra loading apenas para rotas privadas enquanto verifica autenticação
  if (loading) {
    return <BackdropLoading />;
  }

  // Usuário não logado tentando acessar rota privada -> vai para login
  if (!isAuth && isPrivate) {
    return <Redirect to={{ pathname: "/login", state: { from: rest.location } }} />;
  }

  // Usuário não logado em rota não marcada -> vai para login
  if (!isAuth && !isPrivate) {
    return <Redirect to={{ pathname: "/login", state: { from: rest.location } }} />;
  }

  if (adminOnly && user?.profile !== "admin" && user?.profile !== "super") {
    return <Redirect to={{ pathname: "/atendimentos", state: { from: rest.location } }} />;
  }

  if (featureKey && user?.profile !== "super") {
    if (permissions.loading) {
      return <BackdropLoading />;
    }
    if (!permissions.canAccess(featureKey)) {
      return <Redirect to={{ pathname: "/atendimentos", state: { from: rest.location } }} />;
    }
  }

  return <RouterRoute {...rest} component={Component} />;
};

export default Route;
