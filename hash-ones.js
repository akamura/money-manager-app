"use strict";

const bcrypt = require("bcryptjs");

(async function () {
    console.log("test:", await bcrypt.hash("pass",10));
    console.log("tamura:", await bcrypt.hash("1234",10));
})();