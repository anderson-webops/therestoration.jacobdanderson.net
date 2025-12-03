// src/create-admin-user.ts
import { env, exit } from "node:process";
import mongoose from "mongoose";
import * as readlineSync from "readline-sync";

import { Admin } from "./models/schemas/Admin.js";
import "dotenv/config";

const MONGODB_URI = env.MONGODB_URI;
if (!MONGODB_URI) {
	console.error("MONGODB_URI is required");
	exit(1);
}

// Connect to MongoDB
mongoose.connect(MONGODB_URI).then(() => console.log("Connected to MongoDB")).catch((err) => {
	console.error("Error connecting to MongoDB:", err);
	exit(1);
});

// Gather input
const name: string = readlineSync.question("Name: ");
const email: string = readlineSync.question("Email: ");
const password: string = readlineSync.question("Password: ", {
	hideEchoBack: true,
});

if (!name || !email || !password) {
	console.error("You need to enter name, email, and password!");
	exit(1);
}

(async () => {
	try {
		const existingAdmin = await Admin.findOne({ email });
		if (existingAdmin) {
			console.error("That email already exists");
			exit(1);
		}

		const admin = new Admin({
			name,
			email,
			password,
			editAdmins: false,
			saveEdit: "Edit",
			role: "admin",
		});

		await admin.save();
		// console.log(`Admin user created for ${name} with email ${email}`);
		exit(0);
	}
	catch (error) {
		console.error(`Error: ${error}`);
		exit(1);
	}
})();
