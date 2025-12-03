// vaultClient.ts
import { env } from "node:process";

const VAULT_ADDR = env.VAULT_ADDR || "http://127.0.0.1:8200";
const VAULT_ROLEID = env.VAULT_ROLE_ID!;
const VAULT_SECRET = env.VAULT_SECRET_ID!;

async function vaultLogin(): Promise<string> {
	const r = await fetch(`${VAULT_ADDR}/v1/auth/approle/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ role_id: VAULT_ROLEID, secret_id: VAULT_SECRET }),
	});
	if (!r.ok) throw new Error(`Vault login failed: ${r.status} ${await r.text()}`);
	const data = await r.json();
	return data.auth.client_token as string;
}

export async function readMongoSecret() {
	const token = await vaultLogin();
	const r = await fetch(`${VAULT_ADDR}/v1/secret/data/jacob/mongodb`, {
		headers: { "X-Vault-Token": token },
	});
	if (!r.ok) throw new Error(`Vault read failed: ${r.status} ${await r.text()}`);
	const data = await r.json();
	return data.data.data; // <- KV v2 payload
}
