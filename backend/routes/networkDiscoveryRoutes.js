import express from "express";
import { isAuthenticated } from "../middleware/auth.js";
import networkDiscoveryController from "../controllers/networkDiscoveryController.js";

const router = express.Router();

router.use(isAuthenticated);

router.get("/", networkDiscoveryController.getExploreNetwork);
router.get("/who-have-you", networkDiscoveryController.getPeopleWhoHaveYou);
router.get("/same-industry", networkDiscoveryController.getPeopleInYourIndustry);

export default router;


