// src/types/session/express-session.d.ts

// noinspection JSUnusedGlobalSymbols // These are used/included by tsconfig.json
import type { IAdmin } from "./IAdmin.js";


/**
 * Extend express-session's SessionData interface
 */
declare module "express-session" {
  interface SessionData {
    adminID?: string;
  }
}

/**
 * Extend Express's Request interface to include currentAdmin, etc.
 */
declare global {
  namespace Express {
    interface Request {
      currentAdmin?: IAdmin;
    }
  }
}
