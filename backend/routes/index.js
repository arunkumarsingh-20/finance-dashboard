const express = require("express");

const usersRoutes = require("./users");
const recordsRoutes = require("./records");
const summaryRoutes = require("./summary");
const searchRoutes = require("./search");
const auditRoutes = require("./audit");

const router = express.Router();

router.use("/users", usersRoutes);
router.use("/records", recordsRoutes);
router.use("/summary", summaryRoutes);
router.use("/search", searchRoutes);
router.use("/audit", auditRoutes);

module.exports = router;
