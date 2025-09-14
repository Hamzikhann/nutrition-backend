"use strict";
const jwt = require("../utils/jwt");

const authenticationRouteHandler = require("../modules/authentication/router");
const rolesRouteHandler = require("../modules/roles/router");
const usersRouteHandler = require("../modules/users/router");
const habitsRouteHandler = require("../modules/habits/router");
const highlightsRouteHandler = require("../modules/highlights/router");
const dishesRouteHandler = require("../modules/dishes/router");
const userAssesmentFormRouter = require("../modules/userAssesmentForm/router");
const plansRouteHandler = require("../modules/plans/router");
const paymentsRouteHandler = require("../modules/payments/router");
const exerciseRouteHandler = require("../modules/exercise/router");
const workOutDaysExerciseRouteHandler = require("../modules/workOutDaysExercise/router");
const categoriesRouteHandler = require("../modules/categories/router");
const communityRouteHandler = require("../modules/community/router");
const communityLikesRouteHandler = require("../modules/communityLikes/router");
const communityCommentsRouteHandler = require("../modules/communityComments/router");
const mealsRouteHandler = require("../modules/meals/router");

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
		this.app.use("/api/assesments", jwt.protect, userAssesmentFormRouter);
		this.app.use("/api/plans", plansRouteHandler);
		this.app.use("/api/payments", paymentsRouteHandler);
		this.app.use("/api/exercise", jwt.protect, exerciseRouteHandler);
		this.app.use("/api/workout", jwt.protect, workOutDaysExerciseRouteHandler);
		this.app.use("/api/categories", jwt.protect, categoriesRouteHandler);
		this.app.use("/api/community", jwt.protect, communityRouteHandler);
		this.app.use("/api/communityLikes", jwt.protect, communityLikesRouteHandler);
		this.app.use("/api/communityComments", jwt.protect, communityCommentsRouteHandler);
		this.app.use("/api/meals", jwt.protect, mealsRouteHandler);
	}
	routesConfig() {
		this.appRoutes();
	}
}
module.exports = Routes;
