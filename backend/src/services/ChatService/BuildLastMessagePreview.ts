interface PreviewMessageLike {
  message?: string;
  mediaName?: string;
  sender?: {
    name?: string;
  };
}

const BuildLastMessagePreview = (message?: PreviewMessageLike | null): string => {
  if (!message) {
    return "";
  }

  const senderName = message.sender?.name || "Usuario";
  const text = String(message.message || "").trim();

  if (message.mediaName) {
    return `${senderName}: [Arquivo] ${message.mediaName}`;
  }

  if (!text) {
    return "";
  }

  return `${senderName}: ${text}`;
};

export default BuildLastMessagePreview;
