import React from "react";

const ColorModeContext = React.createContext({
    toggleColorMode: () => { },
    setPrimaryColorLight: (_) => { },
    setPrimaryColorDark: (_) => { },
    setAppLogoLight: (_) => { },
    setAppLogoDark: (_) => { },
    setAppLogoFavicon: (_) => { },
    setAppName: (_) => { },
    appLogoLight: null,
    appLogoDark: null,
    appLogoFavicon: null,
    appName: "",
    mode: "light",  // current theme mode — "light" | "dark"
});

export default ColorModeContext;