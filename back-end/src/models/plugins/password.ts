// src/models/plugins/password.ts
import type { Document, Schema } from "mongoose";
import argon2 from "argon2";

// Make sure T includes both password: string AND Document
export function passwordPlugin<T extends Document & { password: string }>(schema: Schema<T>) {
	schema.pre("save", async function (this: T, next) {
		// 'isModified' comes from Document
		if (!this.isModified("password")) return next();
		this.password = await argon2.hash(this.password);
		next();
	});

	schema.methods.comparePassword = function (pw: string) {
		// this.password is guaranteed to exist
		return argon2.verify(this.password, pw);
	};

	schema.methods.toJSON = function () {
		const obj = this.toObject();
		delete obj.password;
		return obj;
	};
}
