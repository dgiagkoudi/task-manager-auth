module.exports = (err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = err.message || "Σφάλμα server";
  res.status(status).json({ error: message });
};
