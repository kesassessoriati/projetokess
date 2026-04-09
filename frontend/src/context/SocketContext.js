import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
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
                console.log("[SocketProvider] Inicializando conexao segura para usuario:", user.id);
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
                    console.error("[SocketProvider] Erro de conexao socket:", error.message);
                    setIsConnected(false);
                });
            }
        } else if (socketRef.current) {
            console.log("[SocketProvider] Encerrando socket (logout ou sessao invalida)");
            socketRef.current.disconnect();
            socketRef.current = null;
            setSocket(null);
            setIsConnected(false);
        }

        return () => {
            // Provider global, sem cleanup adicional por render.
        };
    }, [isAuth, user?.id, user?.companyId]);

    const contextValue = useMemo(() => ({
        socket,
        isConnected,
        isReady: isConnected
    }), [socket, isConnected]);

    return (
        <SocketContext.Provider value={contextValue}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error("useSocket deve ser usado dentro de um SocketProvider");
    }

    const { socket } = context;

    const on = useCallback((event, callback) => {
        if (socket && typeof socket.on === "function") {
            socket.on(event, callback);

            return () => {
                if (socket && typeof socket.off === "function") {
                    socket.off(event, callback);
                }
            };
        }

        return () => { };
    }, [socket]);

    const off = useCallback((event, callback) => {
        if (socket && typeof socket.off === "function") {
            socket.off(event, callback);
        }
    }, [socket]);

    const emit = useCallback((event, ...args) => {
        if (socket && typeof socket.emit === "function") {
            socket.emit(event, ...args);
        } else {
            console.warn(`[useSocket] Tentativa de emitir "${event}" sem conexao ativa.`);
        }
    }, [socket]);

    return useMemo(() => ({
        ...context,
        on,
        off,
        emit
    }), [context, on, off, emit]);
};
