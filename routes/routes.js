"use strict";
const jwt = require("../utils/jwt");

const authenticationRouteHandler = require("../modules/authentication/router");
const rolesRouteHandler = require("../modules/roles/router");
const usersRouteHandler = require("../modules/users/router");
const habitsRouteHandler = require("../modules/habits/router");
const highlightsRouteHandler = require("../modules/highlights/router");
const dishesRouteHandler = require("../modules/dishes/router");

class Routes {
	constructor(app) {
		this.app = app;
	}
	appRoutes() {
		this.app.use("/api/auth", authenticationRouteHandler);
		this.app.use("/api/roles", jwt.protect, rolesRouteHandler);
		this.app.use("/api/users", jwt.protect, usersRouteHandler);
		this.app.use("/api/habits", jwt.protect, habitsRouteHandler);
		this.app.use("/api/highlights", jwt.protect, highlightsRouteHandler);
		this.app.use("/api/dishes", jwt.protect, dishesRouteHandler);
	}
	routesConfig() {
		this.appRoutes();
	}
}
module.exports = Routes;
