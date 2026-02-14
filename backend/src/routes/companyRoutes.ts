import express from "express";
import isAuth from "../middleware/isAuth";
import multer from "multer";
import path from "path";
import fs from "fs";

import * as CompanyController from "../controllers/CompanyController";
import * as CompanyLoadingImageController from "../controllers/CompanyLoadingImageController";

const companyRoutes = express.Router();

// Configuração do multer para upload de imagem de loading
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Pegar companyId do usuário autenticado
    const companyId = req.user?.companyId || 1;
    const folder = path.resolve(__dirname, "..", "..", "public", `company${companyId}`);
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
      fs.chmodSync(folder, 0o777);
    }
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const fileName = `loading-${Date.now()}${ext}`;
    cb(null, fileName);
  }
});

const uploadLoadingImage = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de arquivo inválido. Use: JPG, PNG, GIF ou WEBP'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

companyRoutes.get("/companies/list", isAuth, CompanyController.list);
companyRoutes.get("/companies", isAuth, CompanyController.index);
companyRoutes.get("/companies/:id", isAuth, CompanyController.show);
companyRoutes.post("/companies", isAuth, CompanyController.store);
companyRoutes.put("/companies/:id", isAuth, CompanyController.update);
companyRoutes.put("/companies/:id/schedules",isAuth,CompanyController.updateSchedules);
companyRoutes.delete("/companies/:id", isAuth, CompanyController.remove);

// Rota para listar o plano da empresa
companyRoutes.get("/companies/listPlan/:id", isAuth, CompanyController.listPlan);
companyRoutes.get("/companiesPlan", isAuth, CompanyController.indexPlan);

// Rotas para imagem de loading customizada (apenas companyId 1)
companyRoutes.post(
  "/companies/loading-image",
  isAuth,
  uploadLoadingImage.single("file"),
  CompanyLoadingImageController.uploadLoadingImage
);
companyRoutes.delete(
  "/companies/loading-image",
  isAuth,
  CompanyLoadingImageController.removeLoadingImage
);

export default companyRoutes;
