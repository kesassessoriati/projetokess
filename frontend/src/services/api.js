import axios from "axios";
import { getBackendUrl } from "../config";

const api = axios.create({
  baseURL: getBackendUrl(),
  withCredentials: true,
});

export const openApi = axios.create({
  baseURL: getBackendUrl()
});

export default api;

