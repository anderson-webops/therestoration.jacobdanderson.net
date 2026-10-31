import type { UserModule } from "~/types.ts";
import { library } from "@fortawesome/fontawesome-svg-core";
import { faFacebook, faGithub, faInstagram } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { createHead as createClientHead } from "@unhead/vue/client";
import { createHead as createServerHead } from "@unhead/vue/server";
import { setupLayouts } from "virtual:generated-layouts";
import { ViteSSG } from "vite-ssg";
import { routes } from "vue-router/auto-routes";

import App from "./App.vue";
// Assuming you have styles defined in these files
import "@unocss/reset/tailwind.css";
import "./styles/main.css";
import "uno.css";

// FontAwesome library setup
library.add(faFacebook, faGithub, faInstagram);

// https://github.com/antfu/vite-ssg
export const createApp = ViteSSG(
	App,
	{
		routes: setupLayouts([...routes]),
		base: import.meta.env.BASE_URL,
		scrollBehavior(to, _from, savedPosition) {
			if (savedPosition) return savedPosition;
			if (to.hash) return { el: to.hash };
			return { top: 0 };
		}
	},
	ctx => {
		const head = import.meta.env.SSR ? createServerHead() : createClientHead();
		ctx.app.use(head);
		ctx.head = head as unknown as typeof ctx.head;
		// ctx is the context where you can add global components or plugins
		ctx.app.component("font-awesome-icon", FontAwesomeIcon);

		// Auto-import and install all modules under `modules/`, if any
		// install all modules under `modules/`
		Object.values(
			import.meta.glob<{
				install: UserModule;
			}>("./modules/*.ts", { eager: true })
		).forEach(i => i.install?.(ctx));
		// ctx.app.use(Previewer)

		// If you had specific plugins like a global error handler, i18n, etc., initialize them here
	},
	{ useHead: false }
);
