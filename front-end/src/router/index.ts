import {createRouter, createWebHistory, Router} from "vue-router";
import HomePage from "../views/HomePage.vue";
import AboutPage from "../views/AboutPage.vue";
import InteractiveMap from "../views/InteractiveMap.vue";
import KeyEvents from "../views/KeyEvents.vue";
import KeyFigures from "../views/KeyFigures.vue";
import ContactPage from "../views/ContactPage.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: HomePage,
  },
  {
    path: "/map",
    name: "Map",
    component: InteractiveMap,
  },
  {
    path: "/events",
    name: "Events",
    component: KeyEvents,
  },
  {
    path: "/figures",
    name: "Figures",
    component: KeyFigures,
  },
  {
    path: "/about",
    name: "About",
    component: AboutPage,
  },
  {
    path: "/contact",
    name: "Contact",
    component: ContactPage,
  },
];

const router: Router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
