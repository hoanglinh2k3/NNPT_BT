const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");

router.post("/", userController.createUser);
router.get("/", userController.getAllUsers);
router.post("/enable", userController.enableUser);
router.post("/disable", userController.disableUser);
router.get("/:id", userController.getUserById);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

module.exports = router;