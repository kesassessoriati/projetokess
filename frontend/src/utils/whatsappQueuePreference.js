const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const getUserQueueIds = (user) =>
  (user?.queues || [])
    .map((queue) => toNumber(queue?.id))
    .filter((id) => id !== null);

export const whatsappMatchesUserQueue = (whatsapp, user) => {
  const userQueueIds = getUserQueueIds(user);
  if (!userQueueIds.length || !Array.isArray(whatsapp?.queues)) return false;

  return whatsapp.queues.some((queue) =>
    userQueueIds.includes(toNumber(queue?.id)),
  );
};

export const sortWhatsappsByUserQueues = (whatsapps = [], user) => {
  const list = Array.isArray(whatsapps) ? whatsapps : [];
  const userQueueIds = getUserQueueIds(user);
  if (!userQueueIds.length) return [...list];

  return [...list].sort((first, second) => {
    const firstMatches = whatsappMatchesUserQueue(first, user) ? 0 : 1;
    const secondMatches = whatsappMatchesUserQueue(second, user) ? 0 : 1;
    return firstMatches - secondMatches;
  });
};

export const getPreferredWhatsappId = (whatsapps = [], user, options = {}) => {
  const list = sortWhatsappsByUserQueues(whatsapps, user);
  const hasConnectedPreference = options.connectedFirst !== false;

  const queueLinkedConnected = hasConnectedPreference
    ? list.find(
        (whatsapp) =>
          whatsappMatchesUserQueue(whatsapp, user) &&
          whatsapp?.status === "CONNECTED",
      )
    : null;

  if (queueLinkedConnected) return queueLinkedConnected.id;

  const queueLinked = list.find((whatsapp) =>
    whatsappMatchesUserQueue(whatsapp, user),
  );
  if (queueLinked) return queueLinked.id;

  if (user?.whatsappId) {
    const userWhatsapp = list.find(
      (whatsapp) => Number(whatsapp.id) === Number(user.whatsappId),
    );
    if (userWhatsapp) return userWhatsapp.id;
  }

  const connected = hasConnectedPreference
    ? list.find((whatsapp) => whatsapp?.status === "CONNECTED")
    : null;

  return (connected || list[0])?.id || "";
};
