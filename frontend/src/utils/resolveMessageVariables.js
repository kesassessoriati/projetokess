/**
 * Resolve Mustache-style {{variable}} tokens in a message body before sending,
 * covering all keys defined in backend/src/helpers/Mustache.ts (regular messages)
 * and the shared aliases from RenderCampaignTemplate.ts (campaigns).
 *
 * Applying this client-side ensures the optimistic message body matches the
 * body the backend echoes via socket, preventing duplicate chat bubbles.
 *
 * Unknown tokens are preserved as-is (e.g. {{xyz}} → {{xyz}}).
 */
const resolveMessageVariables = (body, ticket) => {
  if (!body || !body.includes("{{")) return body;

  const contact = ticket?.contact || {};
  const now = new Date();
  const hh = now.getHours(); // no leading zero — matches backend hour()

  let ms = "Boa madrugada";
  if (hh >= 6) ms = "Bom dia";
  if (hh > 11) ms = "Boa tarde";
  if (hh > 17) ms = "Boa noite";

  const dd = String(now.getDate()).padStart(2, "0");
  const mon = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  const min = String(now.getMinutes()).padStart(2, "0");
  const sec = String(now.getSeconds()).padStart(2, "0");

  const contactName = contact.name || "";
  const firstNameToken = contactName.trim().split(" ")[0] || "";
  const contactPhone = contact.number || "";
  const contactEmail = contact.email || "";

  const hourStr = `${hh}:${min}:${sec}`;  // e.g. "9:05:33" — matches backend
  const dateStr = `${dd}-${mon}-${yyyy}`;  // e.g. "04-06-2026" — matches backend

  // All keys from Mustache.ts + RenderCampaignTemplate.ts aliases
  const view = {
    // Core contact variables (Mustache.ts)
    name: contactName,
    firstName: firstNameToken,
    ms,
    hour: hourStr,
    date: dateStr,
    data_hora: `${dateStr} às ${hourStr}`,
    contact_phone: contactPhone,
    contact_email: contactEmail,
    ticket_id: ticket?.id ? String(ticket.id) : "",

    // PT-BR / campaign aliases (RenderCampaignTemplate.ts)
    hora: hourStr,
    data: dateStr,
    nome: contactName,
    contactName,
    numero: contactPhone,
    number: contactPhone,
    email: contactEmail,
    greeting: ms,
    saudacao: ms,
  };

  return body.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(view, key) ? String(view[key]) : match
  );
};

export default resolveMessageVariables;
