import express from "express";
import isAuth from "../middleware/isAuth";
import requireWebphonePlan from "../middleware/requireWebphonePlan";
import ResolveOutboundDidService from "../services/ResolveOutboundDidService";
import ResolveInboundCallRouteService from "../services/ResolveInboundCallRouteService";
import CreateSipCallLogService from "../services/CreateSipCallLogService";
import UpdateSipCallStatusService from "../services/UpdateSipCallStatusService";
import GenerateIceServersService from "../services/GenerateIceServersService";

const sipAdvancedRoutes = express.Router();

sipAdvancedRoutes.get("/sip/ice-servers", isAuth, requireWebphonePlan, async (req, res) => {
  const { companyId, id } = req.user;
  const result = GenerateIceServersService(Number(id), companyId);
  return res.json(result);
});

sipAdvancedRoutes.post("/sip/resolve-outbound-did", isAuth, requireWebphonePlan, async (req, res) => {
  const { companyId } = req.user;
  const { leadPhone, queueId, channelId } = req.body;

  const result = await ResolveOutboundDidService(companyId, Number(req.user.id), leadPhone, queueId, channelId);
  return res.json(result);
});

sipAdvancedRoutes.post("/sip/resolve-inbound-route", isAuth, requireWebphonePlan, async (req, res) => {
  const { companyId } = req.user;
  const { didNumber } = req.body;

  const result = await ResolveInboundCallRouteService(companyId, didNumber);
  return res.json(result);
});

export default sipAdvancedRoutes;