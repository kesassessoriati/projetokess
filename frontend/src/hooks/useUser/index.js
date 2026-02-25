import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";
import { useSocket } from "../../context/SocketContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useContext } from "react";

const useUser = () => {
  const [users, setUsers] = useState([]);
  const [update, setUpdate] = useState(true);

  useEffect(() => {
    (async () => {
      if (update) {
        try {
          const { data } = await api.get("/users");
          setUsers(data.users);
          setUpdate(false);
        } catch (err) {
          if (err.response?.status !== 500) {
            toastError(err);
          } else {
            toast.error(`${i18n.t("frontEndErrors.getUsers")}`);
          }
        }
      }
    })();
  });

  const { isConnected, on } = useSocket();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (!isConnected || !user?.companyId) return;

    const cleanup = on("users", (data) => {
      setUpdate(true);
    });

    return () => {
      console.log("OFF USERS SOCKET")
      cleanup();
    };
  }, [isConnected, on, user?.companyId]);

  return { users };
};

export default useUser;
