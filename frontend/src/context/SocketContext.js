import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { socketConnection } from "../services/socket";
import { AuthContext } from "./Auth/AuthContext";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const { user, isAuth } = useContext(AuthContext);
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        if (isAuth && user && user.id) {
            if (!socketRef.current) {
                console.log("[SocketProvider] Inicializando conexão segura para usuário:", user.id);
                const io = socketConnection({ user });
                socketRef.current = io;
                setSocket(io);

                io.on("connect", () => {
                    console.log("[SocketProvider] Socket conectado com ID:", io.socket?.id || io?.id || "unknown");
                    setIsConnected(true);
                });

                io.on("disconnect", (reason) => {
                    console.warn("[SocketProvider] Socket desconectado:", reason);
                    setIsConnected(false);
                });

                io.on("connect_error", (error) => {
                    console.error("[SocketProvider] Erro de conexão socket:", error.message);
                    setIsConnected(false);
                });
            }
        } else {
            if (socketRef.current) {
                console.log("[SocketProvider] Encerrando socket (logout ou sessão inválida)");
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
                setIsConnected(false);
            }
        }

        return () => {
            // Cleanup ao desmontar o Provider (raro, pois é global)
        };
    }, [isAuth, user]);

    // isReady é mantido por compatibilidade, mas isConnected é o estado real da conexão
    return (
        <SocketContext.Provider value={{ socket, isConnected, isReady: isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error("useSocket deve ser usado dentro de um SocketProvider");
    }

    const { socket, isConnected } = context;

    /**
     * Helper para registro seguro de eventos.
     * Só registra se o socket existir e estiver conectado.
     * Retorna uma função de cleanup segura.
     */
    const on = (event, callback) => {
        if (socket && isConnected && typeof socket.on === "function") {
            socket.on(event, callback);
            return () => {
                if (socket && typeof socket.off === "function") {
                    socket.off(event, callback);
                }
            };
        }
        // Se não estiver pronto, retorna um cleanup vazio
        return () => { };
    };

    /**
     * Helper para desregistro manual de eventos.
     */
    const off = (event, callback) => {
        if (socket && typeof socket.off === "function") {
            socket.off(event, callback);
        }
    };

    /**
     * Helper para emissão segura de eventos.
     */
    const emit = (event, ...args) => {
        if (socket && isConnected && typeof socket.emit === "function") {
            socket.emit(event, ...args);
        } else {
            console.warn(`[useSocket] Tentativa de emitir "${event}" sem conexão ativa.`);
        }
    };

    return { ...context, on, off, emit };
};
