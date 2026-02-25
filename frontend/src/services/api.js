import axios from "axios";
import { getBackendUrl } from "../config";

const api = axios.create({
  baseURL: getBackendUrl(),
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const openApi = axios.create({
  baseURL: getBackendUrl()
});

export default api;

