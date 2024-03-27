<template>
  <div id="app">
    <nav class="local">
      <ul id="real_list" class="flexbox_container">
        <li :class="{ 'expanded': isExpanded, 'active': activeLink === 'Home' }" @click="toggleMenu()">
          <router-link class="nav-link" to="/" @click="setActiveLink('Home', $event)">Home</router-link>
        </li>
        <li v-for="(link, index) in links" :key="index"
            :class="{ 'expanded': isExpanded, 'active': activeLink === link.name }" @click="toggleMenu()">
          <router-link :to="link.path" class="nav-link" @click="setActiveLink(link.name, $event)">{{
              link.name
            }}
          </router-link>
        </li>
      </ul>
    </nav>

    <div class="content">
      <router-view/>

      <!-- Additional Router View for Contact Page on Home Page -->
      <router-view v-if="route.path === '/'" name="contact"/>

      <!-- Footer Component -->
      <!--      <FooterComponent v-if="route.path !== '/'"/>-->
      <FooterComponent/>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, ref} from "vue";
import {useRoute} from "vue-router";
import FooterComponent from "./components/FooterComponent.vue";

export default defineComponent({
  name: "App",
  components: {
    FooterComponent
  },
  setup() {
    const route = useRoute();
    const isExpanded = ref(false);
    const links = ref([
      {name: "Map", path: "/map"},
      {name: "Events", path: "/events"},
      {name: "Figures", path: "/figures"},
      {name: "About", path: "/about"},
      {name: "Contact", path: "/contact"},
    ]);

    const toggleMenu = () => {
      isExpanded.value = !isExpanded.value;
    };

    const activeLink = ref("Home"); // Default active link is 'Home'

    const setActiveLink = (linkName: string, event: Event) => {
      event.preventDefault();
      activeLink.value = linkName;
    };

    return {route, isExpanded, links, toggleMenu, activeLink, setActiveLink};
  }
});
</script>


<!--suppress CssUnusedSymbol -->
<style>
/**************
*   General   *
**************/

body {
  background-color: #f5f5f5;
  font-size: 110%;
  margin: 0;
}

.content {
  margin: 20px;
}

/******************
*   Router View   *
******************/

h1, h2, h3 {
  font-weight: bold;
  text-align: center;
  padding-bottom: 5px;
  margin: 0;
  color: #2a6496;
}

h1 {
  font-size: 200%;
}

h2 {
  font-size: 150%;
}

h3 {
  font-size: 100%;
}

.page {
  background-color: #f5f5f5;
}

.item {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 5px;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.1);

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.item p {
  margin-top: 10px;
}


/*****************
*   Navigation   *
*****************/

nav.local {
  position: relative;
}

.nav-link {
  text-decoration: none;
  padding: 3%;
  color: black;
}

ul.flexbox_container {
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;

  list-style-type: none;

  padding: 0;
  margin: 0;
}

nav.local li {
  background-color: rgb(160, 160, 160);
  border-right: 1px solid black;
  display: flex;
  justify-content: center;
  align-items: center;
}

nav.local li:last-child {
  border-right: none;
}

nav.local > ul > li {
  width: 20%;
  height: 75px;
}

@media (max-width: 480px) {
  nav.local ul.flexbox_container {
    flex-direction: column;
  }

  nav.local > ul > li {
    width: 100%;
  }

  nav.local li {
    overflow: hidden;
    transition: max-height 0.5s ease-in-out;
    padding: 10px 0; /* Add padding */
    border-right: none;
  }

  nav.local li:first-child {
    position: relative;
  }

  nav.local li.expanded:first-child::after {
    transform: rotate(90deg); /* Rotate the arrow */
  }

  nav.local li:not(.active):not(.expanded) {
    display: none;
  }
}
</style>
