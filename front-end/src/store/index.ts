import {Commit, createStore} from "vuex";

const store = createStore({
  state() {
    return {
      home: {
        header: {
          title: "Welcome to the Digital Restoration Journey",
          description: "Explore the pivotal events of the Restoration of the Gospel through an interactive digital experience.\n" +
            "Delve into key events, figures, and the profound spiritual journey that marks the beginning of a new era of guidance.",
        },
        body: [
          {
            title: "Explore Key Events",
            description: "Learn about the First Vision, the translation of the Book of Mormon, and other key events in the Restoration.",
            image: "https://upload.wikimedia.org/wikipedia/commons/0/0b/First_Vision_by_Del_Parson.jpg",
          },
          {
            title: "Meet Key Figures",
            description: "Discover the stories of Joseph Smith, Emma Smith, Brigham Young, and other key figures in the Restoration.",
            image: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Joseph_Smith_daguerreotype_by_Lucian_Foster_1843.jpg",
          },
          {
            title: "Explore Multimedia Content",
            description: "Watch videos, view images, and read stories that bring the Restoration to life.",
            image: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Golden_plates.jpg",
          },
        ],
        testimony: {
          title: "Our Testimony",
          description: "We believe in the power of the Restoration to bring hope, healing, and light to all who seek it. " +
            "Our mission is to share the story of the Restoration with the world, one interactive experience at a time.",
        }
      },
      about: {
        header:
          {
            title: "About the Digital Restoration Journey",
            description: "This project was conceived as a bridge between technology and faith, aiming to make the rich history of the\n" +
              "Restoration accessible to all through interactive media.",
          },
        body: [
          {
            title: "Motivation Behind the Project",
            description: "Our love for programming and storytelling drives this project. We believe in the power of interactive learning\n" +
              "to bring historical events to life and inspire faith in individuals around the globe.",
          }, {
            title: "How to Explore the Digital Restoration",
            description: "Navigate through the Interactive Map to discover key events and figures. Each point on the map is a gateway to a\n" +
              "story, enriched with texts, images, and videos.",
          },
        ],
      },
      events: {
        header: {
          title: "Key Events in the Restoration",
          description: ""
        },
        body: [
          {
            name: "The First Vision",
            description: "Joseph Smith’s first vision in 1820.",
            image: "https://upload.wikimedia.org/wikipedia/commons/0/0b/First_Vision_by_Del_Parson.jpg",
            quote: "I saw a pillar of light exactly over my head, above the brightness of the sun, which descended gradually until it fell upon me.",
            quoteSource: "Joseph Smith—History 1:16"
          },
          {
            name: "Translation of the Book of Mormon",
            description: "Completed in 1829 by Joseph Smith.",
            image: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Golden_plates.jpg",
            quote: "I told the brethren that the Book of Mormon was the most correct of any book on earth, and the keystone of our religion.",
            quoteSource: "Joseph Smith, Introduction to the Book of Mormon"
          }
        ]
      },
      figures: {
        header: {
          title: "Key Figures in the Restoration",
          description: ""
        },
        body: [
          {
            name: "Joseph Smith",
            description: "Joseph Smith was the founder of the Latter-day Saint movement and the translator of the Book of Mormon.",
            image: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Joseph_Smith_daguerreotype_by_Lucian_Foster_1843.jpg",
            quote: "The Standard of Truth has been erected; no unhallowed hand can stop the work from progressing; persecutions may rage, mobs may combine, armies may assemble, calumny may defame, but the truth of God will go forth boldly, nobly, and independent, till it has penetrated every continent, visited every clime, swept every country, and sounded in every ear, till the purposes of God shall be accomplished, and the Great Jehovah shall say the work is done.",
            quoteSource: "Joseph Smith, History of the Church, 4:540"
          },
          {
            name: "Emma Smith",
            description: "Emma Smith was the wife of Joseph Smith and the first president of the Relief Society.",
            image: "https://upload.wikimedia.org/wikipedia/commons/0/0b/Emma_Smith_-_portrait.jpg",
            quote: "We are going to do something extraordinary. When a boat is stuck on the rapids with a multitude of Mormons on board we shall consider that a loud call for relief. We expect extraordinary occasions and pressing calls.",
            quoteSource: "Emma Smith, Relief Society Minute Book, 17 March 1842"
          },
          {
            name: "Brigham Young",
            description: "Brigham Young was the second president of the Church of Jesus Christ of Latter-day Saints.",
            image: "https://upload.wikimedia.org/wikipedia/commons/4/4b/Brigham_Young_by_Charles_William_Carter.jpg",
            quote: "I am not afraid to die; I am afraid to sin. I get down on my knees and pray to my Father in the name of Jesus to keep me from sin and in the path of duty. I am not afraid of death. I am afraid of sin.",
            quoteSource: "Brigham Young, Journal of Discourses, 1:123"
          },
          {
            name: "Oliver Cowdery",
            description: "Oliver Cowdery was the scribe for Joseph Smith during the translation of the Book of Mormon.",
            image: "https://upload.wikimedia.org/wikipedia/commons/1/1f/Oliver_Cowdery.jpg",
            quote: "I wrote with my own pen the entire Book of Mormon (save a few pages) as it fell from the lips of the Prophet Joseph Smith, as he translated it by the gift and power of God, by the means of the Urim and Thummim, or, as it is called by that book, Holy Interpreters.",
            quoteSource: "Oliver Cowdery, Messenger and Advocate, 1:14"
          }
        ]
      },
      multimedia: [], // To store multimedia content data
      map: {
        header: {
          title: "Interactive Map of the Restoration",
          description: "Explore key locations of the Restoration journey through our interactive map. Click on markers to learn more about each event and figure.",
        }
      }
    };
  },
  mutations: {
    setEvents(state, events): void {
      state.events = events;
    },
    setFigures(state, figures): void {
      state.figures = figures;
    },
    setMultimedia(state, multimedia): void {
      state.multimedia = multimedia;
    }
  },
  actions: {
    // Existing or new actions
    fetchEvents({commit}: { commit: Commit }): void {
      // Fetch your events data from an API or other source
      // This is a mockup; replace it with actual data fetching
      const eventsData: { id: number, name: string, description: string }[] = [
        {id: 1, name: "The First Vision", description: "Joseph Smith’s first vision in 1820."},
        {id: 2, name: "Translation of the Book of Mormon", description: "Completed in 1829 by Joseph Smith."},
        // Add more events as needed
      ];

      commit("setEvents", eventsData);
    },
  },
  getters: {
    events: state => state.events,
    figures: state => state.figures,
    multimedia: state => state.multimedia
  },

});

export default store;
