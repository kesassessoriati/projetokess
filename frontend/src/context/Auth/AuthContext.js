import React, { createContext } from "react";

import useAuth from "../../hooks/useAuth.js/index.js";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
	const {
		loading,
		user,
		isAuth,
		handleLogin,
		handleLogout,
		handleSetLoginOrigin,
		isMobileSession,
		socket
	} = useAuth();

	return (
		<AuthContext.Provider
			value={{
				loading,
				user,
				isAuth,
				handleLogin,
				handleLogout,
				handleSetLoginOrigin,
				isMobileSession,
				socket
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export { AuthContext, AuthProvider };