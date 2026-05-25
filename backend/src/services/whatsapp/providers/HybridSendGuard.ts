import logger from "../../../utils/logger";

type HybridConnection = {
  id?: number | string;
  assertSessions?: (jids: string[], force?: boolean) => Promise<unknown>;
};

type SendWithHybridSessionGuardParams = {
  connection: HybridConnection;
  content: Record<string, unknown>;
  jid: string;
  provider: "baileys" | "whaileys";
  send: () => Promise<unknown>;
  tenantId?: number | string;
};

const isFlagEnabled = (value?: string): boolean =>
  String(value || "").toLowerCase() === "true";

const isOneToOneJid = (jid: string): boolean =>
  Boolean(
    jid &&
      jid.endsWith("@s.whatsapp.net") &&
      !jid.includes("@g.us") &&
      !jid.includes("@broadcast") &&
      !jid.includes("newsletter") &&
      jid !== "status@broadcast"
  );

const isPlainTextContent = (content: Record<string, unknown>): boolean =>
  Boolean(
    content &&
      typeof content === "object" &&
      typeof content.text === "string" &&
      !content.image &&
      !content.video &&
      !content.audio &&
      !content.document &&
      !content.sticker &&
      !content.contacts &&
      !content.location
  );

const getErrorMeta = (error: unknown) => {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message
    };
  }

  return {
    errorName: undefined,
    errorMessage: String(error)
  };
};

export const sendWithHybridSessionGuard = async ({
  connection,
  content,
  jid,
  provider,
  send,
  tenantId
}: SendWithHybridSessionGuardParams): Promise<unknown> => {
  const guardEnabled = isFlagEnabled(
    process.env.WHATSAPP_HYBRID_SEND_GUARD_ENABLED
  );
  const assertBeforeSendEnabled = isFlagEnabled(
    process.env.WHATSAPP_ASSERT_SESSION_BEFORE_SEND
  );
  const forceAssertOnRetryEnabled = isFlagEnabled(
    process.env.WHATSAPP_FORCE_ASSERT_SESSION_ON_RETRY
  );
  const whatsappId = connection?.id;
  const baseMeta = {
    companyId: tenantId,
    whatsappId,
    provider,
    resolvedJid: jid,
    guardEnabled,
    assertBeforeSendEnabled,
    forceAssertOnRetryEnabled
  };

  let assertExecuted = false;
  let assertSkippedReason: string | undefined;

  if (guardEnabled && assertBeforeSendEnabled) {
    if (!isOneToOneJid(jid)) {
      assertSkippedReason = "not_one_to_one_jid";
    } else if (!isPlainTextContent(content)) {
      assertSkippedReason = "not_plain_text_content";
    } else if (typeof connection?.assertSessions !== "function") {
      assertSkippedReason = "assert_sessions_unavailable";
      logger.warn(
        {
          ...baseMeta,
          assertSkippedReason
        },
        "[WhatsAppHybridSendGuard] assertSessions unavailable"
      );
    } else {
      try {
        await connection.assertSessions?.([jid], false);
        assertExecuted = true;
        logger.info(
          {
            ...baseMeta,
            assertExecuted
          },
          "[WhatsAppHybridSendGuard] assertSessions completed"
        );
      } catch (error) {
        assertSkippedReason = "assert_sessions_failed";
        logger.warn(
          {
            ...baseMeta,
            assertSkippedReason,
            ...getErrorMeta(error)
          },
          "[WhatsAppHybridSendGuard] assertSessions failed; continuing normal send"
        );
      }
    }
  }

  try {
    const sentMessage = await send();

    logger.debug(
      {
        ...baseMeta,
        assertExecuted,
        assertSkippedReason,
        wid: (sentMessage as { key?: { id?: string } })?.key?.id,
        ack: (sentMessage as { status?: number | string })?.status
      },
      "[WhatsAppHybridSendGuard] send completed"
    );

    return sentMessage;
  } catch (error) {
    logger.error(
      {
        ...baseMeta,
        assertExecuted,
        assertSkippedReason,
        ...getErrorMeta(error)
      },
      "[WhatsAppHybridSendGuard] send failed"
    );
    throw error;
  }
};
