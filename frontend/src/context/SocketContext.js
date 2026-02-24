import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { socketConnection } from "../services/socket";
import { AuthContext } from "./Auth/AuthContext";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const { user, isAuth } = useContext(AuthContext);
    const [socket, setSocket] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        if (isAuth && user && user.id) {
            if (!socketRef.current) {
                console.log("[SocketProvider] Inicializando conexão segura...");
                const io = socketConnection({ user });
                socketRef.current = io;
                setSocket(io);

                io.on("connect", () => {
                    console.log("[SocketProvider] Socket conectado.");
                    setIsConnected(true);
                    setIsReady(true);
                });

                io.on("disconnect", (reason) => {
                    console.warn("[SocketProvider] Socket desconectado:", reason);
                    setIsConnected(false);
                    // Não resetamos o isReady aqui para evitar flashes de loading em micro-desconexões,
                    // a menos que seja uma desconexão fatal.
                });

                io.on("connect_error", (error) => {
                    console.error("[SocketProvider] Erro de conexão:", error);
                    setIsConnected(false);
                });
            }
        } else {
            if (socketRef.current) {
                console.log("[SocketProvider] Encerrando socket por logout/invalidez.");
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
                setIsConnected(false);
                setIsReady(false);
            }
        }

        return () => {
            // O cleanup é importante, mas no Swarm/Mobile o socket costuma ser persistente.
            // Adicionamos listeners de cleanup se necessário.
        };
    }, [isAuth, user]);

    return (
        <SocketContext.Provider value={{ socket, isReady, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error("useSocket deve ser usado dentro de um SocketProvider");
    }

    // Helper para registro seguro de eventos
    const on = (event, callback) => {
        if (context.socket && typeof context.socket.on === "function") {
            context.socket.on(event, callback);
            return () => context.socket.off(event, callback);
        }
    };

    return { ...context, on };
};
