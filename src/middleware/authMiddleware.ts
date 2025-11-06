import {  Router, NextFunction, Request, Response  } from "express";

import { user } from "../types/authTypes";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Middleware to check if the user is authenticated
    const userid: string | null = req.cookies["id"] as string;
    if (!userid) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    next();
}