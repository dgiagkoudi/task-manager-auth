const prisma = require("../models/prismaClient");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "1h";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
}

// register
const register = async (req, res, next) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "Όλα τα πεδία απαιτούνται" });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] }
    });
    if (existingUser) {
      return res.status(400).json({ error: "Το username ή email υπάρχει ήδη" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, email, password: hashedPassword }
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // apothikeusi refresh token sto db
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: COOKIE_SECURE,
      maxAge: 1000 * 60 * 60 * 24 * 7 
    });

    res.status(201).json({ token: accessToken, user: { id: user.id, username, email } });
  } catch (err) {
    next(err);
  }
};

// login
const login = async (req, res, next) => {
  const { identifier, password } = req.body; 
  if (!identifier || !password) {
    return res.status(400).json({ error: "Username/email και password απαιτούνται" });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] }
    });
    if (!user) return res.status(400).json({ error: "Λανθασμένα στοιχεία" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Λανθασμένα στοιχεία" });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: COOKIE_SECURE,
      maxAge: 1000 * 60 * 60 * 24 * 7
    });

    res.json({ token: accessToken, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    next(err);
  }
};

// route gia refresh token
const refresh = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ error: "No refresh token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    const newAccess = signAccessToken(user);

    const newRefresh = signRefreshToken(user);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefresh } });

    res.cookie("refreshToken", newRefresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: COOKIE_SECURE,
      maxAge: 1000 * 60 * 60 * 24 * 7
    });

    res.json({ token: newAccess });
  } catch (err) {
    console.error(err);
    return res.status(403).json({ error: "Invalid or expired refresh token" });
  }
};

// logout
const logout = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      await prisma.user.update({ where: { id: decoded.id }, data: { refreshToken: null } });
    }
  } catch (err) {
  } finally {
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out" });
  }
};

module.exports = { register, login, refresh, logout };
