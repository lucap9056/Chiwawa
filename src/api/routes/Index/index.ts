import express from "express";

import GET_LOGIN from "routes/index/get_login";
import POST_LOGIN from "routes/index/post_login";
import DELETE_LOGIN from "routes/index/delete_login";
import OPTIONS_LOGIN from "routes/index/options_login";

import GET_INFO from "routes/index/get_info";
import OPTIONS_INFO from "routes/index/options_info";

const router = express.Router();


router.get("/login", GET_LOGIN);
router.post("/login", POST_LOGIN);
router.delete("/login", DELETE_LOGIN);
router.options("/login", OPTIONS_LOGIN);


router.get("/info", GET_INFO);
router.options("/info", OPTIONS_INFO);

export default router;