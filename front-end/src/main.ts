import "../public/assets/stylesheets/defaultStyles.css";
import "../public/assets/stylesheets/tailwind.css";

import {createApp} from "vue";
import App from "./App.vue";
import store from "./store";
import router from "./router";

import {library} from "@fortawesome/fontawesome-svg-core";
import {faFacebook, faGithub, faInstagram} from "@fortawesome/free-brands-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";

const app = createApp(App);

library.add(faFacebook, faGithub, faInstagram);

app.component("font-awesome-icon", FontAwesomeIcon);

app.use(store);
app.use(router);

app.mount("#app");
