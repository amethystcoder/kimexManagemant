import { Router } from "express";

import { restock, getAllRestocks } from "../controllers/restock";

const router = Router();

router.post("/", restock);
router.get("/", getAllRestocks);

export default router;