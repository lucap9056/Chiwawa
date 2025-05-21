import express from "express";

import GET_ROOT from "routes/app/get_root";
import POST_ROOT from "routes/app/post_root";
import OPTIONS_ROOT from "routes/app/options_root";

import POST_RESTART from "routes/app/post_restart";
import OPTIONS_RESTART from "routes/app/options_restart";

const router = express.Router();

router.get("/", GET_ROOT);
router.post("/", POST_ROOT);
router.options("/", OPTIONS_ROOT);

router.post("/restart", POST_RESTART);
router.options("/restart", OPTIONS_RESTART);

export default router;