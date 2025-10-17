const prisma = require("../models/prismaClient");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
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

// Transporter gia apostoli email 
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendResetEmail(email, token) {
  const resetUrl = `${process.env.FRONTEND_URL}?token=${token}`;
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Επαναφορά Κωδικού - Task Manager",
    html: `
      <p>Γεια σου,</p>
      <p>Ζήτησες επαναφορά κωδικού. Πάτησε τον παρακάτω σύνδεσμο:</p>
      <a href="${resetUrl}" target="_blank">${resetUrl}</a>
      <p>Ο σύνδεσμος θα ισχύει για 15 λεπτά.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
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

// forgot password
const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Απαιτείται email" });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "Δεν υπάρχει χρήστης με αυτό το email" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 1000 * 60 * 15);

    await prisma.user.update({where: { id: user.id }, data: { resetToken, resetTokenExpiry: expiry }});

    await sendResetEmail(email, resetToken);

    res.json({ message: "Εστάλη email επαναφοράς κωδικού!" });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

// reset password
const resetPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ error: "Λείπουν δεδομένα" });

  try {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() }
      }
    });

    if (!user)
      return res.status(400).json({ error: "Μη έγκυρο ή ληγμένο token" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    res.json({ message: "Ο κωδικός άλλαξε επιτυχώς!" });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword };
