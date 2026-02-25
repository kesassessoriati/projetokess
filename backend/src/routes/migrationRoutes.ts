import { Router } from "express";
import isAuth from "../middleware/isAuth";
import MigrateLegacyKanbanService from "../services/PipelineServices/MigrateLegacyKanbanService";

const migrationRoutes = Router();

migrationRoutes.post("/migrate-kanban", isAuth, async (req, res) => {
    // Only allow for super admins or a specific check
    try {
        await MigrateLegacyKanbanService();
        res.status(200).json({ message: "Legacy Kanban migration completed successfully." });
    } catch (err) {
        res.status(500).json({ error: "Migration failed: " + err.message });
    }
});

export default migrationRoutes;
