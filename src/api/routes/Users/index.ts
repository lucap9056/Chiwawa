import express from "express";

import GET_USERS from "./get_users";
import POST_USERS from "./post_users";
import DELETE_USERS from "./delete_users";
import OPTIONS_USERS from "./options_users";

const router = express.Router();

router.get("/@me", GET_USERS.ME);
router.post("/@me", POST_USERS.ME);
router.delete("/@me", DELETE_USERS.ME);
router.options("/@me", OPTIONS_USERS.ME);

router.get("/:id", GET_USERS.SOMEONE);
router.options("/:id", OPTIONS_USERS.SOMEONE);

export default router;