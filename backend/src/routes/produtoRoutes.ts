import express from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";

import * as ProdutoController from "../controllers/ProdutoController";

const produtoRoutes = express.Router();
const upload = multer(uploadConfig);

produtoRoutes.get("/produtos", isAuth, ProdutoController.index);
produtoRoutes.post("/produtos", isAuth, ProdutoController.store);
produtoRoutes.get("/produtos/:produtoId", isAuth, ProdutoController.show);
produtoRoutes.put("/produtos/:produtoId", isAuth, ProdutoController.update);
produtoRoutes.delete("/produtos/:produtoId", isAuth, ProdutoController.remove);

produtoRoutes.post(
  "/produtos/upload-imagem",
  isAuth,
  upload.single("file"),
  ProdutoController.uploadImagem
);

export default produtoRoutes;
