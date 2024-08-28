import express from "express";

import GET_ROOT from "./get_root";
import POST_ROOT from "./post_root";
import OPTIONS_ROOT from "./options_root";

import POST_RESTART from "./post_restart";
import OPTIONS_RESTART from "./options_restart";

const router = express.Router();

router.get("/", GET_ROOT);
router.post("/", POST_ROOT);
router.options("/", OPTIONS_ROOT);

router.post("/restart", POST_RESTART);
router.options("/restart", OPTIONS_RESTART);

export default router;