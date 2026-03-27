const router = require("express").Router();
const { verifyFirebaseToken, verifyAdmin } = require("../middleware/auth");
const c = require("../controllers/users.controller");

router.post("/users", c.createUser);
router.get("/user/:email/role", verifyFirebaseToken, c.getUserRole);
router.get("/users", verifyFirebaseToken, verifyAdmin, c.getAllUsers);
router.get("/users/:email", verifyFirebaseToken, c.getUserByEmail);
router.patch("/users/:email", verifyFirebaseToken, c.updateUserProfile);
router.patch("/users/:id/role", verifyFirebaseToken, verifyAdmin, c.updateUserRole);
router.delete("/users/:id", verifyFirebaseToken, verifyAdmin, c.deleteUser);

module.exports = router;
