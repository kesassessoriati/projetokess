import api from "./api";

const list = async () => {
    const { data } = await api.get("/external-apps");
    return data;
};

const show = async (id) => {
    const { data } = await api.get(`/external-apps/${id}`);
    return data;
};

const create = async (data) => {
    const { data: responseData } = await api.post("/external-apps", data);
    return responseData;
};

const update = async (id, data) => {
    const { data: responseData } = await api.put(`/external-apps/${id}`, data);
    return responseData;
};

const remove = async (id) => {
    const { data } = await api.delete(`/external-apps/${id}`);
    return data;
};

const service = {
    list,
    show,
    create,
    update,
    remove,
};

export default service;
