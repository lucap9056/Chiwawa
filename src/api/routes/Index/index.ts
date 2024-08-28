import express from "express";

import GET_LOGIN from "./get_login";
import POST_LOGIN from "./post_login";
import DELETE_LOGIN from "./delete_login";
import OPTIONS_LOGIN from "./options_login";

import GET_INFO from "./get_info";
import OPTIONS_INFO from "./options_info";

const router = express.Router();


router.get("/login", GET_LOGIN);
router.post("/login", POST_LOGIN);
router.delete("/login", DELETE_LOGIN);
router.options("/login", OPTIONS_LOGIN);


router.get("/info", GET_INFO);
router.options("/info", OPTIONS_INFO);

export default router;