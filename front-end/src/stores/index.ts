import { defineStore } from "pinia";

export const useMainStore = defineStore("main", {
	state: () => ({
		home: {
			header: {
				title: "Welcome to the Digital Restoration Journey",
				description:
					"Explore the pivotal events of the Restoration of the Gospel through an interactive digital experience.\n" +
					"Delve into key events, figures, and the profound spiritual journey that marks the beginning of a new era of guidance."
			},
			body: [
				{
					title: "Explore Key Events",
					description:
						"Learn about the First Vision, the translation of the Book of Mormon, and other key events in the Restoration.",
					image: "https://www.churchofjesuschrist.org/imgs/fe5db8da0174bc36aff99e6ae7b55e337d9eb965/full/800%2C/0/default",
					imgAlt: "The First Vision"
				},
				{
					title: "Meet Key Figures",
					description:
						"Discover the stories of Joseph Smith, Emma Smith, Brigham Young, and other key figures in the Restoration.",
					image: "https://upload.wikimedia.org/wikipedia/commons/2/23/Joseph_Smith_daguerreotype.jpg",
					imgAlt: "Joseph Smith"
				},
				{
					title: "Explore Multimedia Content",
					description:
						"Travel the map, view images, and read stories that bring the Restoration to life.",
					image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Golden_plates_and_other_artifacts.jpg/360px-Golden_plates_and_other_artifacts.jpg",
					imgAlt: "Translation of the Book of Mormon"
				}
			],
			testimony: {
				title: "Our Testimony",
				description:
					"We believe in the power of the Restoration to bring hope, healing, and light to all who seek it. " +
					"Our mission is to share the story of the Restoration with the world, one interactive experience at a time."
			}
		},
		about: {
			header: {
				title: "About the Digital Restoration Journey",
				description:
					"This project was conceived as a bridge between technology and faith, aiming to make the rich history of the Restoration accessible to all through interactive media. It represents an innovative approach to storytelling, where history and doctrine converge with modern digital experiences to foster understanding and testimony of the Restoration."
			},
			body: [
				{
					title: "Motivation Behind the Project",
					description:
						"Our passion for programming and storytelling propels this initiative forward. We are convinced of the transformative power of interactive learning in making historical events resonate on a personal level. This project aspires to transcend traditional learning boundaries, making the Restoration's pivotal moments, key figures, and foundational doctrines not just subjects to be studied, but experiences to be lived. Through this, we aim to inspire a deeper faith and a more profound understanding of these spiritual milestones among individuals around the world."
				},
				{
					title: "Innovative Features and Interactivity",
					description:
						"The Digital Restoration Journey is not merely a passive learning experience. It incorporates interactive timelines, geographic maps, and multimedia narratives to engage users actively. Features include personalized pathways through Restoration history, interactive discussions on doctrine, and reflective spaces for personal testimony growth. Each user's journey through the map is unique, encouraging exploration, discovery, and a personalized connection with the content."
				},
				{
					title: "How to Explore the Digital Restoration",
					description:
						"Begin your exploration through the Interactive Map, a central feature of the application. Each point on the map serves as a portal to a story, revealing the significance of events, the lives of key figures, and the evolution of sacred doctrines. Enriched with texts, images, and videos, the map offers a multidimensional view of the Restoration. Special features allow users to trace thematic pathways (e.g., the development of priesthood authority, temple construction) across different locations and time periods, illustrating the interconnectedness of the Restoration's many facets."
				},
				{
					title: "Engaging with the Community",
					description:
						"Understanding one’s role in the ongoing Restoration is pivotal. This project introduces community features, such as forums and shared testimonial spaces, enabling users to connect with others, share insights, and learn from diverse perspectives. These features aim to foster a sense of global community among users, reinforcing the idea that every individual plays a role in the unfolding story of the Restoration."
				},
				{
					title: "Preparing for the Future",
					description:
						"The Digital Restoration Journey is more than a look back at the past; it's a bridge to the future. By understanding the trials, triumphs, and testimonies of those who laid the foundations of the faith, users can find inspiration for their own discipleship. The project emphasizes preparation for the Second Coming, encouraging users to reflect on how they can contribute to the work of salvation and exaltation in their own lives."
				}
			]
		},
		events: {
			header: {
				title: "Key Events in the Restoration",
				description:
					"A journey through the pivotal moments that mark the Restoration of the Gospel and the founding of The Church of Jesus Christ of Latter-day Saints. These events encapsulate revelations, divine interventions, and the establishment of doctrines that shape the faith."
			},
			body: [
				{
					name: "The First Vision",
					description:
						"In the spring of 1820, Joseph Smith ventured into a grove of trees near his home in Palmyra, New York, seeking to know which church he should join. In this moment of intense prayer, he experienced a vision of God the Father and His Son, Jesus Christ, marking the beginning of the Restoration. This event not only answered his personal quest for truth but also led to the establishment of a new faith.",
					image: "https://www.churchofjesuschrist.org/imgs/fe5db8da0174bc36aff99e6ae7b55e337d9eb965/full/800%2C/0/default",
					imgAlt: "The First Vision",
					quote: "I saw a pillar of light exactly over my head, above the brightness of the sun, which descended gradually until it fell upon me.",
					quoteSource: "Joseph Smith—History 1:16",
					sources: ["Gospel Topics Essays: First Vision Accounts"]
				},
				{
					name: "Translation of the Book of Mormon",
					description:
						"From April 1829 to June 1829, Joseph Smith, with the help of scribes like Oliver Cowdery, translated the Book of Mormon by the gift and power of God. This work is considered another testament of Jesus Christ and has been a fundamental scripture in the faith. The translation process, involving the golden plates and the use of seer stones, stands as a testament to the divine assistance Joseph Smith received throughout his prophetic ministry.",
					image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/GoldenPlates.JPG/500px-GoldenPlates.JPG",
					imgAlt: "Translation of the Book of Mormon",
					quote: "I told the brethren that the Book of Mormon was the most correct of any book on earth, and the keystone of our religion.",
					quoteSource:
						"Joseph Smith, Introduction to the Book of Mormon",
					sources: ["Joseph Smith—History 1:14-17"]
				},
				{
					name: "Revelation on the Degrees of Glory",
					description:
						"Received in February 1832 by Joseph Smith and Sidney Rigdon, this revelation outlines the existence of different degrees of glory in the afterlife. Documented in Doctrine and Covenants 76, it expanded the understanding of heaven and offered profound insights into God's justice and mercy, challenging contemporary notions of salvation and damnation.",
					image: "https://content.churchofjesuschrist.org/acp/bc/cp/Canada/images2021/A%20Glorious%20Vision%20of%20Christs%20Plan%20of%20Salvation/1200x1200/3-three_degrees_of_glory_anne_nader.jpeg",
					imgAlt: "Degrees of Glory",
					quote: "And thus we saw the glory of the celestial, which excels in all things...",
					quoteSource: "Doctrine and Covenants 76",
					sources: ["Doctrine and Covenants 76"]
				},
				{
					name: "Liberty Jail Teachings",
					description:
						"During a period of intense suffering and persecution for the Church, Joseph Smith and several companions were unjustly imprisoned in Liberty Jail from December 1838 to April 1839. It was here that Joseph received revelations that would become key sections of the Doctrine and Covenants. These teachings addressed trials, divine comfort, and the nature of God, providing solace and understanding during one of the darkest times in early Church history.",
					image: "https://assets.ldscdn.org/2b/75/2b75d00b8531932e23a314efa4a0845b136d0cd6/joseph_smith_sitting_jail_writing.jpeg",
					imgAlt: "Liberty Jail",
					quote: "Thy friends do stand by thee, and they shall hail thee again with warm hearts and friendly hands.",
					quoteSource: "Doctrine and Covenants 121:9",
					sources: [
						"Joseph Smith, Letter to the Church and Edward Partridge, 20 March 1839",
						"Doctrine and Covenants 121"
					]
				},
				{
					name: "Moroni's Visit and the Gold Plates",
					description:
						"On the night of September 21, 1823, the angel Moroni appeared to Joseph Smith, revealing the location of the golden plates buried in the Hill Cumorah. This event led to the translation of the Book of Mormon. Moroni's visitation marks a direct link between heaven and earth, emphasizing the ongoing nature of revelation and the preparation required to undertake such a divine work.",
					image: "https://www.churchofjesuschrist.org/imgs/5f68ab3ebd717592dce9ee3819123a44f1853e1e/full/1920%2C/0/default",
					imgAlt: "Moroni Visitation",
					quote: "He called me by name, and said unto me that he was a messenger sent from the presence of God to me, and that his name was Moroni; that God had a work for me to do...",
					quoteSource: "Joseph Smith—History 1:33",
					sources: ["The Book of Mormon, Moroni 10:3-5"]
				},
				{
					name: "Organization of the Church",
					description:
						"On April 6, 1830, The Church of Jesus Christ of Latter-day Saints was officially organized in a small log cabin in Fayette, New York. This event marks the culmination of the Restoration's early period, as directed by revelations received by Joseph Smith. With just six members at its inception, the Church was established to restore the original church founded by Jesus Christ, complete with apostles, prophets, and other biblical offices and teachings.",
					image: "https://churchofjesuschrist.org/imgs/090481b7942a6f076054f69cacc25dc8554039c9/full/500%2C/0/default",
					imgAlt: "Organization of the Church",
					quote: "Behold, there shall be a record kept among you...",
					quoteSource: "Doctrine and Covenants 21:1",
					sources: [
						"Saints: The Story of the Church of Jesus Christ in the Latter Days, Volume 1"
					]
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
					description:
						"Joseph Smith, the first prophet of this latter-day dispensation, was a pivotal figure in religious history. At the age of fourteen, following a profound personal spiritual experience known as the First Vision, Smith embarked on a journey that would lead to the establishment of a modern faith. His translation of the Book of Mormon, which he claimed was from golden plates provided by an angel, has been a cornerstone of Latter-day Saint faith. Smith's life was marked by visions, revelations, and the establishment of doctrines and practices that continue to influence millions worldwide. His leadership, amidst intense persecution and challenges, laid the groundwork for the Church's growth and the spread of its teachings globally.",
					image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Joseph_Smith%2C_Jr._portrait_owned_by_Joseph_Smith_III.jpg/440px-Joseph_Smith%2C_Jr._portrait_owned_by_Joseph_Smith_III.jpg",
					imgAlt: "Joseph Smith",
					quote: "The Standard of Truth has been erected; no unhallowed hand can stop the work from progressing; persecutions may rage, mobs may combine, armies may assemble, calumny may defame, but the truth of God will go forth boldly, nobly, and independent, till it has penetrated every continent, visited every clime, swept every country, and sounded in every ear, till the purposes of God shall be accomplished, and the Great Jehovah shall say the work is done.",
					quoteSource: "Joseph Smith, History of the Church, 4:540",
					sources: [
						"Joseph Smith—History 1:14-17",
						"Doctrine and Covenants 76"
					]
				},
				{
					name: "Emma Smith",
					description:
						"Emma Smith, wife of Joseph Smith, played a crucial role in the early days of the Latter-day Saint movement. Not only did she support her husband in his religious endeavors, but she also took on significant responsibilities of her own. As the first president of the Relief Society, Emma advocated for women's participation in the church and worked tirelessly to aid those in need, reflecting her deep commitment to the principles of the Restoration. Her strength, faith, and resilience in the face of adversity made her an enduring figure of inspiration within the community.",
					image: "https://upload.wikimedia.org/wikipedia/commons/7/76/EmmaSmith.jpg",
					imgAlt: "Emma Smith",
					quote: "We are going to do something extraordinary. When a boat is stuck on the rapids with a multitude of Mormons on board we shall consider that a loud call for relief. We expect extraordinary occasions and pressing calls.",
					quoteSource:
						"Emma Smith, Relief Society Minute Book, 17 March 1842",
					sources: []
				},
				{
					name: "Brigham Young",
					description:
						"Brigham Young, Joseph Smith's successor, was a formidable leader and colonizer who played a critical role in the westward expansion of the United States. As the second president of The Church of Jesus Christ of Latter-day Saints, Young led the Mormon pioneers to the Salt Lake Valley, establishing a stronghold for the faith in what would become Utah. His vision, leadership, and practicality helped not only to preserve the church during turbulent times but also to expand its reach and influence. Young's legacy includes not only the settlement of the American West but also the promotion of a self-sufficient, communal society based on the principles taught by Joseph Smith.",
					image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Brigham_Young_by_Charles_William_Carter.jpg/440px-Brigham_Young_by_Charles_William_Carter.jpg",
					imgAlt: "Brigham Young",
					quote: "True independence and freedom can only exist in doing what's right.",
					quoteSource: "Brigham Young",
					sources: [] // ["Teachings of Presidents of the Church: Brigham Young"]
				},
				{
					name: "Oliver Cowdery",
					description:
						"Oliver Cowdery was instrumental in the formation of the Latter-day Saint movement as the primary scribe for Joseph Smith during the translation of the Book of Mormon. His efforts in recording the text as Smith dictated it were crucial to the emergence of this new scripture. Beyond his role as scribe, Cowdery was a key witness to the golden plates, asserting their reality and divine origin throughout his life. His contributions extend into the early organization and missionary work of the church, embodying a legacy of dedication to the faith and its foundational texts.",
					image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Olivercowdery-sm.jpg/440px-Olivercowdery-sm.jpg",
					imgAlt: "Oliver Cowdery",
					quote: "I wrote with my own pen the entire Book of Mormon (save a few pages) as it fell from the lips of the Prophet Joseph Smith, as he translated it by the gift and power of God, by the means of the Urim and Thummim, or, as it is called by that book, Holy Interpreters.",
					quoteSource: "Oliver Cowdery",
					sources: [
						"Testimonies of Oliver Cowdery and Martin Harris, Millennial Star"
					]
				},
				{
					name: "Parley P. Pratt",
					description:
						"Parley P. Pratt was an early leader in the Latter Day Saint movement and one of the original members of the Quorum of the Twelve Apostles. Pratt's writings and teachings, including his autobiography, provide a vivid account of early church history and doctrine. His missionary work was influential in the expansion of the church in the United States and England. Pratt's dedication to the church and its principles made him a key figure in its early development.",
					image: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Parley_P_Pratt.gif",
					imgAlt: "Parley P. Pratt",
					quote: "It was at this time that I received from him the first idea of eternal family organization... and the eternal union of the sexes in those spheres which are prepared for the righteous.",
					quoteSource: "Parley P. Pratt",
					sources: ["Autobiography of Parley P. Pratt"]
				},
				{
					name: "Eliza R. Snow",
					description:
						"Eliza R. Snow was one of the most influential women in the early Latter-day Saint movement, known for her work as a poet, a leader, and a women's rights advocate. She served as the second general president of the Relief Society and was instrumental in organizing and teaching women in the church. Snow's writings and hymns, including 'O My Father', contribute to the rich theological and cultural heritage of the faith.",
					image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Eliza_R._Snow.jpg/244px-Eliza_R._Snow.jpg",
					imgAlt: "Eliza R. Snow",
					quote: "Truth is reason; truth eternal tells me I've a mother there.",
					quoteSource:
						"'O My Father', Hymns of The Church of Jesus Christ of Latter-day Saints",
					sources: [
						"Hymns of The Church of Jesus Christ of Latter-day Saints"
					]
				}
			]
		},
		multimedia: [], // To store multimedia content data
		map: {
			header: {
				title: "Interactive Map of the Restoration",
				description:
					"Explore key locations of the Restoration journey through our interactive map. Click on markers to learn more about each event and figure."
			},
			body: {
				coordinates: [
					{
						name: "Palmyra, New York",
						latitude: 43.0631,
						longitude: -77.2332,
						events: [
							"The First Vision",
							"Translation of the Book of Mormon",
							"Organization of the Church"
						],
						figures: [
							"Joseph Smith",
							"Emma Smith",
							"Oliver Cowdery"
						],
						imageUrl:
							"https://assets.churchofjesuschrist.org/fe/5d/fe5db8da0174bc36aff99e6ae7b55e337d9eb965/the_first_vision.jpeg",
						imgAlt: "The First Vision"
					},
					{
						name: "Fayette, New York",
						latitude: 42.9136,
						longitude: -76.9659,
						events: ["Organization of the Church"],
						figures: [
							"Joseph Smith",
							"Oliver Cowdery",
							"David Whitmer",
							"Martin Harris"
						],
						imageUrl:
							"https://assets.ldscdn.org/80/8d/808d16962faa59e48f50bd936e55bdb23526c46a/barrett_mormon_lds_prophet_church.jpeg",
						imgAtl: "Organization of the Church"
					},
					{
						name: "Kirtland, Ohio",
						latitude: 41.5247,
						longitude: -81.3615,
						events: ["Revelation on the Degrees of Glory"],
						figures: [
							"Joseph Smith",
							"Sidney Rigdon",
							"Parley P. Pratt"
						],
						imageUrl:
							"https://upload.wikimedia.org/wikipedia/commons/9/90/KirtlandTemple_Ohio_USA.jpg",
						imgAlt: "Kirtland Temple"
					},
					{
						name: "Liberty, Missouri",
						latitude: 39.2461,
						longitude: -94.4191,
						events: ["Liberty Jail Teachings"],
						figures: [
							"Joseph Smith",
							"Hyrum Smith",
							"Sidney Rigdon"
						],
						imageUrl:
							"https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Liberty_Jail.jpg/350px-Liberty_Jail.jpg",
						imgAlt: "Liberty Jail"
					},
					{
						name: "Nauvoo, Illinois",
						latitude: 40.5509,
						longitude: -91.4634,
						events: ["Revelation on the Degrees of Glory"],
						figures: [
							"Joseph Smith",
							"Hyrum Smith",
							"Brigham Young",
							"John Taylor"
						],
						imageUrl:
							"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/New_Nauvoo_Temple.JPG/500px-New_Nauvoo_Temple.JPG",
						imgAlt: "Nauvoo Temple"
					},
					{
						name: "Salt Lake City, Utah",
						latitude: 40.7608,
						longitude: -111.891,
						events: [
							"Arrival of the Saints in the Salt Lake Valley",
							"Construction of the Salt Lake Temple"
						],
						figures: [
							"Brigham Young",
							"Wilford Woodruff",
							"John Taylor"
						],
						imageUrl:
							"https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Salt_Lake_Temple%2C_Utah_-_Sept_2004-2.jpg/440px-Salt_Lake_Temple%2C_Utah_-_Sept_2004-2.jpg",
						imgAlt: "Salt Lake Temple"
					}
				]
			}
		}
	}),
	// Define actions for fetching or mutating the state
	actions: {
		// Used for APIs
		/*
    fetchEvents() {
      // Simulating fetching data from an API
      const eventsData = [
        {
          name: 'The First Vision',
          description: 'Joseph Smith’s first vision in 1820.',
          image: 'https://upload.wikimedia.org/wikipedia/commons/0/0b/First_Vision_by_Del_Parson.jpg',
          quote: 'I saw a pillar of light exactly over my head, above the brightness of the sun, which descended gradually until it fell upon me.',
          quoteSource: 'Joseph Smith—History 1:16',
        },
        {
          name: 'Translation of the Book of Mormon',
          description: 'Completed in 1829 by Joseph Smith.',
          image: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Golden_plates.jpg',
          quote: 'I told the brethren that the Book of Mormon was the most correct of any book on earth, and the keystone of our religion.',
          quoteSource: 'Joseph Smith, Introduction to the Book of Mormon',
        },
        // Add more events as needed
      ]

      // Update the events body with fetched data
      this.events.body = eventsData
    }, */
	},

	// Define getters to compute derived state or access specific parts of the state
	getters: {
		// Example getter for getting all event names
		eventNames: state => state.events.body.map(event => event.name)
	}
});
