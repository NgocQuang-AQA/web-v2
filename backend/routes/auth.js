import { Router } from "express";
import { createAuthMiddleware, roles } from "../middleware/auth.js";

export function createAuthRouter({ secret }) {
  const router = Router();
  const { login, getAuthUser } = createAuthMiddleware(secret);

  router.post("/login", async (req, res) => {
    try {
      const { username, password } = req.body || {};
      const result = await login(username, password);
      if (!result) return res.status(401).json({ message: "invalid_credentials" });
      res.json(result);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "internal_error" });
    }
  });

  router.get("/me", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ message: "unauthorized" });
    res.json(user);
  });

  router.get("/roles", (req, res) => {
    res.json(Object.values(roles));
  });

  return router;
}
