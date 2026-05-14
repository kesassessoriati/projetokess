import api from "./api";

export const eventTypeOptions = [
  {
    value: "birthday",
    label: "Aniversário do Cliente",
    description: "Envia uma mensagem automática no dia do aniversário do cliente."
  },
  {
    value: "invoice_reminder",
    label: "Lembrete de Fatura",
    description: "Dispara lembretes antes do vencimento da fatura."
  },
  {
    value: "client_expiration",
    label: "Vencimento",
    description: "Dispara mensagens para clientes com data de vencimento preenchida no cadastro."
  },
  {
    value: "invoice_overdue",
    label: "Cobrança de Fatura em Atraso",
    description: "Aciona mensagens após o atraso da fatura."
  }
];

export const listScheduledDispatchers = async params => {
  const { data } = await api.get("/scheduled-dispatchers", { params });
  return data;
};

export const getScheduledDispatcher = async id => {
  const { data } = await api.get(`/scheduled-dispatchers/${id}`);
  return data;
};

const buildFormData = payload => {
  const { mediaFile, ...fields } = payload;
  const fd = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      fd.append(key, String(value));
    } else if (value === null) {
      fd.append(key, "");
    }
  });
  if (mediaFile) fd.append("media", mediaFile);
  return fd;
};

export const createScheduledDispatcher = async payload => {
  const fd = buildFormData(payload);
  const { data } = await api.post("/scheduled-dispatchers", fd, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
};

export const testScheduledDispatcher = async payload => {
  const fd = buildFormData(payload);
  const { data } = await api.post("/scheduled-dispatchers/test", fd, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
};

export const updateScheduledDispatcher = async (id, payload) => {
  const fd = buildFormData(payload);
  const { data } = await api.put(`/scheduled-dispatchers/${id}`, fd, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
};

export const deleteScheduledDispatcher = async id => {
  const { data } = await api.delete(`/scheduled-dispatchers/${id}`);
  return data;
};

export const toggleScheduledDispatcher = async (id, active) => {
  const { data } = await api.patch(`/scheduled-dispatchers/${id}/toggle`, {
    active
  });
  return data;
};

const scheduledDispatcherService = {
  listScheduledDispatchers,
  getScheduledDispatcher,
  createScheduledDispatcher,
  testScheduledDispatcher,
  updateScheduledDispatcher,
  deleteScheduledDispatcher,
  toggleScheduledDispatcher,
  eventTypeOptions
};

export default scheduledDispatcherService;
