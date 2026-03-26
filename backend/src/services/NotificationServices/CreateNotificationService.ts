import { getIO } from "../../libs/socket";
import Notification from "../../models/Notification";
import User from "../../models/User";
import { SendMail } from "../../helpers/SendMail";

export interface CreateNotificationData {
  userId: number;
  companyId: number;
  type: string;
  title: string;
  body?: string;
  channel?: "in_app" | "email" | "whatsapp";
  metadata?: Record<string, any>;
  scheduledAt?: Date;
  sendEmail?: boolean;
}

const CreateNotificationService = async (data: CreateNotificationData): Promise<Notification> => {
  const {
    userId,
    companyId,
    type,
    title,
    body,
    channel = "in_app",
    metadata,
    scheduledAt,
    sendEmail = false,
  } = data;

  const notification = await Notification.create({
    userId,
    companyId,
    type,
    title,
    body: body || null,
    status: "unread",
    channel,
    metadata: metadata || null,
    scheduledAt: scheduledAt || null,
    sentAt: new Date(),
  });

  // Emit real-time event via Socket.io
  try {
    const io = getIO();
    io.of(companyId.toString()).emit(`company-${companyId}-notification`, {
      action: "create",
      notification,
    });
  } catch (err) {
    // Non-fatal: socket may not be ready
  }

  // Send email notification if requested
  if (sendEmail) {
    try {
      const user = await User.findByPk(userId);
      if (user?.email) {
        await SendMail({
          to: user.email,
          subject: title,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
              <h2 style="color:#075E54;">${title}</h2>
              ${body ? `<p>${body}</p>` : ""}
              <hr/>
              <p style="color:#888;font-size:12px;">AtendZappy — Notificação automática</p>
            </div>
          `,
        });

        // Create companion email notification record
        await Notification.create({
          userId,
          companyId,
          type,
          title,
          body: body || null,
          status: "unread",
          channel: "email",
          metadata: metadata || null,
          scheduledAt: scheduledAt || null,
          sentAt: new Date(),
        });
      }
    } catch (err) {
      // Email send failure is non-fatal
    }
  }

  return notification;
};

export default CreateNotificationService;
