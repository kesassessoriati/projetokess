import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { logContextStorage } from "../libs/logContext";

const loggerContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers["x-request-id"] as string || uuidv4();

    // O middleware isAuth injeta o usuário no req.user, mas este middleware roda antes do isAuth em muitos casos.
    // Vamos tentar pegar o userId/companyId se já estiver disponível ou se for injetado posteriormente.
    // No caso de erro, o middleware de erro terá acesso ao req.user.

    const context = {
        requestId,
        path: req.path,
        userId: (req as any).user?.id,
        companyId: (req as any).user?.companyId
    };

    logContextStorage.run(context, () => {
        // Adiciona o requestId ao header da resposta
        res.setHeader("x-request-id", requestId);
        next();
    });
};

export default loggerContextMiddleware;
