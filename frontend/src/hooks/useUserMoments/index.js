import api from "../../services/api";
import toastError from "../../errors/toastError";
import { useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useSocket } from "../../context/SocketContext";

const useUserMoments = () => {
  const [users, setUsers] = useState([]);
  const [update, setUpdate] = useState(true);
  const [isUpdate, setIsUpdate] = useState([]);
  const { user } = useContext(AuthContext);
  const { isConnected, on } = useSocket();


  useEffect(() => {
    (async () => {
      try {
        if (update) {
          const { data } = await api.get("/usersMoments");

          setUsers(data);
          setUpdate(false);
        }
      } catch (err) {
        if (err.response?.status !== 500) {
          toastError(err);
        } else {
          toast.error(`${i18n.t("frontEndErrors.getUsers")}`);
        }
      }
    })();
  }, [update]);

  useEffect(() => {
    if (!isConnected || !user.id || !user.companyId) return;

    const companyId = user.companyId;

    const onTicketEvent = (data) => {
      if (isUpdate !== data) {
        setIsUpdate(data)
        setUpdate(prevUpdate => !prevUpdate);
      }
    }
    const onAppMessage = (data) => {
      if (isUpdate !== data) {
        setIsUpdate(data)
        setUpdate(prevUpdate => !prevUpdate);
      }
    };

    const cleanupTicket = on(`company-${companyId}-ticket`, onTicketEvent);
    const cleanupAppMessage = on(`company-${companyId}-appMessage`, onAppMessage);
    return () => {
      cleanupTicket();
      cleanupAppMessage();
    };
  }, [isConnected, on, user.id, user.companyId]);

  return { users };
};

export default useUserMoments;
