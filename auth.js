import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET || "dev-only-change-this-secret";

export function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, secret, { expiresIn: "8h" });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
