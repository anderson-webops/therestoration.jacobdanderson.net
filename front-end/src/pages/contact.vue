<script lang="ts" setup>
import { ref } from "vue";

const form = ref({
	name: "",
	email: "",
	message: ""
});

function handleSubmit() {
	console.log("Form submitted:", form.value);
	// eslint-disable-next-line no-alert
	alert("Message sent! We'll get back to you soon.");

	// Reset form after submission
	form.value.name = "";
	form.value.email = "";
	form.value.message = "";
}
</script>

<template>
	<div class="page">
		<h1>Contact Me</h1>
		<div class="item">
			<p>
				If you have any questions or feedback, please feel free to reach
				out to us through the form below.
			</p>

			<form @submit.prevent="handleSubmit">
				<div class="form-group">
					<label for="name">Name:</label>
					<input id="name" v-model="form.name" required type="text" />
				</div>

				<div class="form-group">
					<label for="email">Email:</label>
					<input
						id="email"
						v-model="form.email"
						required
						type="email"
					/>
				</div>

				<div class="form-group">
					<label for="message">Message:</label>
					<textarea
						id="message"
						v-model="form.message"
						required
						rows="4"
					/>
				</div>

				<button type="submit">Send Message</button>
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
	background-color: #4caf50;
	color: white;
	padding: 10px 20px;
	border: none;
	border-radius: 4px;
	cursor: pointer;
}

button[type="submit"]:hover {
	background-color: #45a049;
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
