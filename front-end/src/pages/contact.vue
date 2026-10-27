<script lang="ts" setup>
import { ref } from "vue";

const form = ref({
	name: "",
	email: "",
	message: "",
	website: ""
});

const isSubmitting = ref(false);
const responseMessage = ref("");
const responseTone = ref<"success" | "error">("success");

async function handleSubmit() {
	if (isSubmitting.value) return;
	isSubmitting.value = true;
	responseMessage.value = "";

	try {
		const response = await fetch("/api/contact", {
			method: "POST",
			credentials: "omit",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(form.value),
			signal: AbortSignal.timeout(15_000)
		});
		const payload = await response.json().catch(() => null);

		if (!response.ok || payload?.ok !== true) {
			responseTone.value = "error";
			responseMessage.value =
				typeof payload?.error === "string" && payload.error.length <= 300
					? payload.error
					: "The message could not be sent right now. Please try again later.";
			return;
		}

		responseTone.value = "success";
		responseMessage.value = "Message sent.";
		form.value.name = "";
		form.value.email = "";
		form.value.message = "";
		form.value.website = "";
	} catch (error) {
		responseTone.value = "error";
		responseMessage.value =
			(error instanceof Error || error instanceof DOMException) && error.name === "TimeoutError"
				? "Delivery could not be confirmed. Your message is still here. Please wait before trying again."
				: "The message could not be sent right now. Please try again later.";
	} finally {
		isSubmitting.value = false;
	}
}
</script>

<template>
	<div class="page">
		<h1>Contact Me</h1>
		<div class="item">
			<form :aria-busy="isSubmitting" @submit.prevent="handleSubmit">
				<div class="form-group">
					<label for="name">Name:</label>
					<input
						id="name"
						v-model="form.name"
						:readonly="isSubmitting"
						autocomplete="name"
						maxlength="120"
						required
						type="text"
					/>
				</div>

				<div class="form-group">
					<label for="email">Email:</label>
					<input
						id="email"
						v-model="form.email"
						:readonly="isSubmitting"
						required
						autocomplete="email"
						maxlength="320"
						type="email"
					/>
				</div>

				<div class="form-group">
					<label for="message">Message:</label>
					<textarea
						id="message"
						v-model="form.message"
						:readonly="isSubmitting"
						required
						minlength="10"
						maxlength="5000"
						rows="4"
					/>
				</div>

				<input
					v-model="form.website"
					type="text"
					name="website"
					autocomplete="off"
					tabindex="-1"
					class="sr-only"
					aria-hidden="true"
					maxlength="200"
				/>

				<button type="submit" :disabled="isSubmitting">
					{{ isSubmitting ? "Sending..." : "Send Message" }}
				</button>

				<p
					class="form-response"
					role="status"
					aria-atomic="true"
					:class="responseTone === 'error' ? 'form-response--error' : 'form-response--success'"
				>
					{{ responseMessage }}
				</p>
			</form>
		</div>
	</div>
</template>

<style scoped>
.form-group {
	margin-bottom: 20px;
}

.form-group label {
	display: block;
	margin-bottom: 5px;
}

.form-group input[type="text"],
.form-group input[type="email"],
.form-group textarea {
	width: 100%;
	min-width: 600px;
	padding: 8px;
	border: 1px solid #ccc;
	border-radius: 4px;
}

button[type="submit"] {
	background-color: #2e7d32;
	color: white;
	padding: 10px 20px;
	border: none;
	border-radius: 4px;
	cursor: pointer;
}

button[type="submit"]:hover {
	background-color: #1b5e20;
}

.form-response:not(:empty) {
	margin-top: 12px;
}

.form-response--success {
	color: #256f3a;
}

.form-response--error {
	color: #9f2d2d;
}

@media (max-width: 800px) {
	.item {
		max-width: 100%;
	}

	.form-group input[type="text"],
	.form-group input[type="email"],
	.form-group textarea {
		min-width: auto; /* Resets min-width for small screens */
	}
}
</style>

<route lang="yaml">
meta:
layout: default
</route>
