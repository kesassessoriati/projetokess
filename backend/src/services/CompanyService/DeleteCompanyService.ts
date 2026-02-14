import Company from "../../models/Company";
import User from "../../models/User";
import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";
import Message from "../../models/Message";
import Contact from "../../models/Contact";
import Setting from "../../models/Setting";
import Ticket from "../../models/Ticket";
import TicketTraking from "../../models/TicketTraking";
import CompaniesSettings from "../../models/CompaniesSettings";
import Invoices from "../../models/Invoices";
import UserRating from "../../models/UserRating";
import Prompt from "../../models/Prompt";
// Removendo imports problemáticos por enquanto - vamos focar no Prompts primeiro
import AppError from "../../errors/AppError";

const DeleteCompanyService = async (id: string): Promise<void> => {
  console.log("🗑️ INICIANDO EXCLUSÃO DA EMPRESA NO BACKEND:", id);
  
  const company = await Company.findOne({
    where: { id }
  });

  if (!company) {
    console.log("❌ Empresa não encontrada:", id);
    throw new AppError("ERR_NO_COMPANY_FOUND", 404);
  }

  console.log("✅ Empresa encontrada:", company.name);
  console.log("🧹 Removendo dados relacionados...");

  const runSafeDestroy = async (label: string, destroyFn: () => Promise<void>) => {
    try {
      await destroyFn();
      console.log(`✔️  ${label} removidos`);
    } catch (error) {
      console.log(`⚠️  Falha ao remover ${label}:`, error?.message || error);
    }
  };

  try {
    await runSafeDestroy("UserRatings", async () => { await UserRating.destroy({ where: { companyId: id } }); });
    await runSafeDestroy("TicketTrakings", async () => { await TicketTraking.destroy({ where: { companyId: id } }); });
    await runSafeDestroy("Tickets", async () => { await Ticket.destroy({ where: { companyId: id } }); });
    await runSafeDestroy("Messages", async () => { await Message.destroy({ where: { companyId: id } }); });
    await runSafeDestroy("Contacts", async () => { await Contact.destroy({ where: { companyId: id } }); });
    await runSafeDestroy("Whatsapps", async () => { await Whatsapp.destroy({ where: { companyId: id } }); });
    await runSafeDestroy("Prompts", async () => { await Prompt.destroy({ where: { companyId: id } }); });
    await runSafeDestroy("Queues", async () => { await Queue.destroy({ where: { companyId: id } }); });
    await runSafeDestroy("Users", async () => { await User.destroy({ where: { companyId: id } }); });
    await runSafeDestroy("Settings", async () => { await Setting.destroy({ where: { companyId: id } }); });
    await runSafeDestroy("CompaniesSettings", async () => { await CompaniesSettings.destroy({ where: { companyId: id } }); });
    await runSafeDestroy("Invoices", async () => { await Invoices.destroy({ where: { companyId: id } }); });
    
    console.log("🗑️ Removendo a empresa...");
    await company.destroy();
    
    console.log("✅ Empresa excluída com sucesso!");
    
  } catch (error) {
    console.log("❌ ERRO durante a exclusão:", error.message);
    throw new AppError(`Erro ao excluir empresa: ${error.message}`, 500);
  }
};

export default DeleteCompanyService;
