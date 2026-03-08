import { useState, useEffect, useCallback, useRef } from "react";
import api from "../../services/api";
import toastError from "../../errors/toastError";

/**
 * useSafeApi - Hook para consumo de API com tratamentos de segurança.
 * 
 * @param {string} url - Endpoint da API.
 * @param {object} options - Opções (method, params, data, manual).
 * @returns {object} { data, loading, error, request }
 */
const useSafeApi = (url, options = {}) => {
    const [data, setData] = useState(options.initialData || null);
    const [loading, setLoading] = useState(!options.manual);
    const [error, setError] = useState(null);
    const abortControllerRef = useRef(null);

    const request = useCallback(
        async (requestData = null) => {
            // Cancelar requisição anterior se houver
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            abortControllerRef.current = new AbortController();
            setLoading(true);
            setError(null);

            try {
                const isRequestConfig =
                    requestData &&
                    typeof requestData === "object" &&
                    !Array.isArray(requestData) &&
                    (
                        Object.prototype.hasOwnProperty.call(requestData, "params") ||
                        Object.prototype.hasOwnProperty.call(requestData, "data") ||
                        Object.prototype.hasOwnProperty.call(requestData, "method") ||
                        Object.prototype.hasOwnProperty.call(requestData, "url") ||
                        Object.prototype.hasOwnProperty.call(requestData, "headers")
                    );

                const requestConfig = isRequestConfig ? requestData : {};
                const hasCustomParams = Object.prototype.hasOwnProperty.call(requestConfig, "params");
                const hasCustomData = Object.prototype.hasOwnProperty.call(requestConfig, "data");

                const {
                    url: customUrl,
                    method: customMethod,
                    params: customParams,
                    data: customData,
                    signal: _customSignal,
                    ...restConfig
                } = requestConfig;

                const response = await api({
                    url: customUrl || url,
                    method: customMethod || options.method || "get",
                    params: hasCustomParams ? customParams : options.params,
                    data: hasCustomData ? customData : (isRequestConfig ? options.data : (requestData || options.data)),
                    ...restConfig,
                    signal: abortControllerRef.current.signal
                });

                setData(response.data);
                return response.data;
            } catch (err) {
                if (err.name === "CanceledError") return;

                setError(err);
                toastError(err);
                return null;
            } finally {
                setLoading(false);
            }
        },
        [url, options.method, options.params, options.data]
    );

    useEffect(() => {
        if (!options.manual) {
            request();
        }

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [request, options.manual]);

    return {
        data,
        loading,
        error,
        request,
        setData, // Para atualizações otimistas (optimistic updates)
    };
};

export default useSafeApi;
