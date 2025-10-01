const jwt = require("jsonwebtoken");
const prisma = require("../models/prismaClient");
require("dotenv").config();

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: "Απαιτείται authentication" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ error: "Απαιτείται authentication" });

    req.user = { id: user.id, username: user.username, email: user.email };
    next();
  } catch (err) {
    console.error(err);
    return res.status(403).json({ error: "Μη έγκυρο ή ληγμένο token" });
  }
};

module.exports = authMiddleware;
