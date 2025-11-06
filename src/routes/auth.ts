import { Router } from "express";
import { loginUser, registerUser, logoutUser, getUserProfile, updateUserProfile, deleteUserAccount, changeUserPassword } from "../controllers/auth";

const authRouter = Router();

authRouter.post("/login", loginUser);
authRouter.post("/register", registerUser);
authRouter.post("/logout", logoutUser);
authRouter.get("/profile", getUserProfile);
authRouter.put("/profile", updateUserProfile);
authRouter.delete("/account", deleteUserAccount);
authRouter.patch("/password", changeUserPassword);

export default authRouter;