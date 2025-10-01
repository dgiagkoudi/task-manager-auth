const prisma = require("../models/prismaClient");

// create
const createTask = async (req, res, next) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "Το title απαιτείται" });

  try {
    const task = await prisma.task.create({
      data: { title, userId: req.user.id }
    });
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
};

// get
const getTasks = async (req, res, next) => {
  try {
    const tasks = await prisma.task.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" } });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
};

// update
const updateTask = async (req, res, next) => {
  const { id } = req.params;
  const { title, done } = req.body;

  try {
    const taskId = parseInt(id);
    const existing = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existing) return res.status(404).json({ error: "Task δεν βρέθηκε" });
    if (existing.userId !== req.user.id) return res.status(403).json({ error: "Δεν έχεις δικαίωμα" });

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { title, done }
    });
    res.json(task);
  } catch (err) {
    next(err);
  }
};

// delete
const deleteTask = async (req, res, next) => {
  const { id } = req.params;
  try {
    const taskId = parseInt(id);
    const existing = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existing) return res.status(404).json({ error: "Task δεν βρέθηκε" });
    if (existing.userId !== req.user.id) return res.status(403).json({ error: "Δεν έχεις δικαίωμα" });

    await prisma.task.delete({ where: { id: taskId } });
    res.json({ message: "Διαγράφηκε επιτυχώς" });
  } catch (err) {
    next(err);
  }
};

module.exports = { createTask, getTasks, updateTask, deleteTask };
