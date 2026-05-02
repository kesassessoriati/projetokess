import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import Whatsapp from "../models/Whatsapp";
import { getPageProfile, getAccessTokenFromPage, subscribeApp } from "../services/FacebookServices/graphAPI";
import ShowCompanyService from "../services/CompanyService/ShowCompanyService";
import ShowPlanService from "../services/PlanService/ShowPlanService";

export const facebookCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { code, state } = req.query;
    
    console.log("Facebook OAuth Callback - code:", code ? "present" : "missing");
    console.log("Facebook OAuth Callback - state:", state);

    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "Missing authorization code" });
      return;
    }

    if (!state || typeof state !== "string") {
      res.status(400).json({ error: "Missing state parameter" });
      return;
    }

    const companyId = state;
    
    // Verificar se empresa existe e tem plano ativo
    const company = await ShowCompanyService(companyId);
    const plan = await ShowPlanService(company.planId);

    if (!plan.useFacebook) {
      res.status(400).json({ error: "Empresa não possui permissão para Facebook" });
      return;
    }

    // Trocar code por access token
    const facebookAppId = process.env.FACEBOOK_APP_ID;
    const facebookAppSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = `${process.env.BACKEND_URL || process.env.APP_URL}/facebook-callback`;

    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${facebookAppId}&client_secret=${facebookAppSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
    );
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error("Erro ao obter access token:", tokenData);
      res.status(400).json({ error: "Erro ao obter token de acesso" });
      return;
    }

    const userToken = tokenData.access_token;

    // Obter páginas do usuário
    const pages = await getPageProfile(tokenData.user_id || "me", userToken);

    if (pages.length === 0) {
      res.status(400).json({ error: "Nenhuma página encontrada" });
      return;
    }

    // Criar conexões para cada página
    const io = getIO();
    const createdConnections = [];

    for await (const page of pages) {
      const { name, access_token, id, instagram_business_account } = page;
      const pageToken = await getAccessTokenFromPage(access_token);

      // Criar conexão Facebook
      const facebookConnection = await Whatsapp.create({
        companyId,
        name: `FB ${name}`,
        facebookUserId: tokenData.user_id || "me",
        facebookPageUserId: id,
        facebookUserToken: pageToken,
        tokenMeta: userToken,
        isDefault: false,
        channel: "facebook",
        status: "CONNECTED",
        greetingMessage: "",
        farewellMessage: "",
        queueIds: [],
        isMultidevice: false
      });

      // Inscrever webhook
      await subscribeApp(id, pageToken);

      createdConnections.push(facebookConnection);

      // Se tiver Instagram, criar conexão também
      if (instagram_business_account) {
        const { id: instagramId, username, name: instagramName } = instagram_business_account;

        const instagramConnection = await Whatsapp.create({
          companyId,
          name: `Insta ${username || instagramName}`,
          facebookUserId: tokenData.user_id || "me",
          facebookPageUserId: instagramId,
          facebookUserToken: pageToken,
          tokenMeta: userToken,
          isDefault: false,
          channel: "instagram",
          status: "CONNECTED",
          greetingMessage: "",
          farewellMessage: "",
          queueIds: [],
          isMultidevice: false
        });

        createdConnections.push(instagramConnection);
      }
    }

    // Emitir evento para atualizar frontend
    io.to(`company-${companyId}`).emit("whatsapp", {
      action: "update",
      whatsapp: createdConnections
    });

    // Redirecionar para frontend com sucesso
    res.redirect(`${process.env.FRONTEND_URL}/canais?success=facebook-connected`);

  } catch (error) {
    console.error("Erro no Facebook OAuth callback:", error);
    res.redirect(`${process.env.FRONTEND_URL}/canais?error=facebook-failed`);
  }
};

export const instagramCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { code, state } = req.query;
    
    console.log("Instagram OAuth Callback - code:", code ? "present" : "missing");
    console.log("Instagram OAuth Callback - state:", state);

    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "Missing authorization code" });
      return;
    }

    if (!state || typeof state !== "string") {
      res.status(400).json({ error: "Missing state parameter" });
      return;
    }

    const companyId = state;
    
    // Verificar se empresa existe e tem plano ativo
    const company = await ShowCompanyService(companyId);
    const plan = await ShowPlanService(company.planId);

    if (!plan.useInstagram) {
      res.status(400).json({ error: "Empresa não possui permissão para Instagram" });
      return;
    }

    // Trocar code por access token
    const facebookAppId = process.env.FACEBOOK_APP_ID;
    const facebookAppSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = `${process.env.BACKEND_URL || process.env.APP_URL}/instagram-callback`;

    const instagramTokenResponse = await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_id: facebookAppId,
          client_secret: facebookAppSecret,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code
        } as Record<string, string>)
      }
    );

    const instagramTokenData = await instagramTokenResponse.json();

    if (instagramTokenData.access_token && instagramTokenData.user_id) {
      let instagramAccessToken = instagramTokenData.access_token;

      try {
        const longLivedResponse = await fetch(
          `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${facebookAppSecret}&access_token=${instagramAccessToken}`
        );
        const longLivedData = await longLivedResponse.json();
        if (longLivedData.access_token) {
          instagramAccessToken = longLivedData.access_token;
        }
      } catch (tokenError) {
        console.error("Erro ao obter token long-lived do Instagram:", tokenError);
      }

      let profile: any = {};
      try {
        const profileResponse = await fetch(
          `https://graph.instagram.com/me?fields=id,username,name,profile_picture_url&access_token=${instagramAccessToken}`
        );
        profile = await profileResponse.json();
      } catch (profileError) {
        console.error("Erro ao obter perfil do Instagram:", profileError);
      }

      const instagramConnection = await Whatsapp.create({
        companyId,
        name: `Insta ${profile.username || profile.name || instagramTokenData.user_id}`,
        facebookUserId: String(instagramTokenData.user_id),
        facebookPageUserId: String(profile.id || instagramTokenData.user_id),
        facebookUserToken: instagramAccessToken,
        tokenMeta: instagramAccessToken,
        isDefault: false,
        channel: "instagram",
        status: "CONNECTED",
        greetingMessage: "",
        farewellMessage: "",
        queueIds: [],
        isMultidevice: false
      });

      const io = getIO();
      io.to(`company-${companyId}`).emit("whatsapp", {
        action: "update",
        whatsapp: [instagramConnection]
      });

      res.redirect(`${process.env.FRONTEND_URL}/canais?success=instagram-connected`);
      return;
    }

    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${facebookAppId}&client_secret=${facebookAppSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
    );
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error("Erro ao obter access token:", tokenData);
      res.status(400).json({ error: "Erro ao obter token de acesso" });
      return;
    }

    const userToken = tokenData.access_token;

    // Obter páginas do usuário (Instagram está vinculado a páginas do Facebook)
    const pages = await getPageProfile(tokenData.user_id || "me", userToken);

    if (pages.length === 0) {
      res.status(400).json({ error: "Nenhuma página com Instagram encontrada" });
      return;
    }

    // Criar conexões apenas para páginas com Instagram
    const io = getIO();
    const createdConnections = [];

    for await (const page of pages) {
      const { name, access_token, id, instagram_business_account } = page;

      // Apenas criar se tiver Instagram Business
      if (instagram_business_account) {
        const { id: instagramId, username, name: instagramName } = instagram_business_account;
        const pageToken = await getAccessTokenFromPage(access_token);

        const instagramConnection = await Whatsapp.create({
          companyId,
          name: `Insta ${username || instagramName}`,
          facebookUserId: tokenData.user_id || "me",
          facebookPageUserId: instagramId,
          facebookUserToken: pageToken,
          tokenMeta: userToken,
          isDefault: false,
          channel: "instagram",
          status: "CONNECTED",
          greetingMessage: "",
          farewellMessage: "",
          queueIds: [],
          isMultidevice: false
        });

        createdConnections.push(instagramConnection);

        // Inscrever webhook
        await subscribeApp(id, pageToken);
      }
    }

    if (createdConnections.length === 0) {
      res.status(400).json({ error: "Nenhuma conta Instagram Business encontrada" });
      return;
    }

    // Emitir evento para atualizar frontend
    io.to(`company-${companyId}`).emit("whatsapp", {
      action: "update",
      whatsapp: createdConnections
    });

    // Redirecionar para frontend com sucesso
    res.redirect(`${process.env.FRONTEND_URL}/canais?success=instagram-connected`);

  } catch (error) {
    console.error("Erro no Instagram OAuth callback:", error);
    res.redirect(`${process.env.FRONTEND_URL}/canais?error=instagram-failed`);
  }
};
