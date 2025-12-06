// src/types/abstractions/BaseUser.ts
import type { Document, Types } from "mongoose";

export interface IBaseUser extends Document {
	_id: Types.ObjectId;
	name: string;
	email: string;
	password: string;
	saveEdit: string; // the “Save” / “Edit” toggle text

	comparePassword: (password: string) => Promise<boolean>;

	toJSON: () => Record<string, unknown>;
}
