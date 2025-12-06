// src/models/plugins/password.ts
import type { Document, HydratedDocument, Schema } from "mongoose";
import argon2 from "argon2";

export function passwordPlugin<T extends Document & { password: string }>(
	schema: Schema<T>
) {
	schema.pre("save", async function (this: HydratedDocument<T>) {
		if (!this.isModified("password")) return;

		this.password = await argon2.hash(this.password);
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
