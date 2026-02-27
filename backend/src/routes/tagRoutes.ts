import express from "express";
import isAuth from "../middleware/isAuth";

import * as TagController from "../controllers/TagController";

const tagRoutes = express.Router();

tagRoutes.get("/tags/list", isAuth, TagController.list);
tagRoutes.get("/tags", isAuth, TagController.index);
tagRoutes.get("/tags/:tagId", isAuth, TagController.show);

// [DEPRECATED] Funil Legado - retorna 410 Gone
tagRoutes.get("/tag/kanban", isAuth, (_req, res) => {
    return res.status(410).json({
        error: "Gone",
        message: "Este módulo foi desativado. Utilize a nova API do Board Inteligente: GET /pipelines e GET /pipelines/:id/board."
    });
});

tagRoutes.post("/tags", isAuth, TagController.store);
tagRoutes.post("/tags/sync", isAuth, TagController.syncTags);

tagRoutes.put("/tags/:tagId", isAuth, TagController.update);

tagRoutes.delete("/tags/:tagId", isAuth, TagController.remove);
tagRoutes.delete("/tags-contacts/:tagId/:contactId", isAuth, TagController.removeContactTag);

export default tagRoutes;

