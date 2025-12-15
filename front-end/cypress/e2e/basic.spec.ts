context("Basic", () => {
	beforeEach(() => {
		cy.visit("/");
	});

	it("shows the home hero and navigation", () => {
		cy.contains("h1", "Welcome to the Digital Restoration Journey").should("be.visible");
		cy.get("header nav").within(() => {
			cy.contains("a", "Map").should("be.visible");
			cy.contains("a", "Events").should("be.visible");
			cy.contains("a", "Figures").should("be.visible");
			cy.contains("a", "About").should("be.visible");
			cy.contains("a", "Contact").should("be.visible");
		});
	});

	it("navigates to about via header", () => {
		cy.contains("a", "About").click();
		cy.url().should("include", "/about");
		cy.contains("h1", "About the Digital Restoration Journey").should("be.visible");
	});

	it("navigates to the interactive map", () => {
		cy.contains("a", "Map").click();
		cy.url().should("include", "/map");
		cy.contains("h1", "Interactive Map of the Restoration").should("be.visible");
	});

	it("shows key events content", () => {
		cy.contains("a", "Events").click();
		cy.url().should("include", "/events");
		cy.contains("h1", "Key Events in the Restoration").should("be.visible");
		cy.contains("h3", "The First Vision").should("be.visible");
		cy.get(".items-container .item").should("have.length.greaterThan", 1);
	});

	it("shows key figures content", () => {
		cy.contains("a", "Figures").click();
		cy.url().should("include", "/figures");
		cy.contains("h1", "Key Figures in the Restoration").should("be.visible");
		cy.contains("h3", "Joseph Smith").should("be.visible");
		cy.get(".items-container .item").should("have.length.greaterThan", 1);
	});

	it("opens a map marker popup with location details", () => {
		cy.intercept("https://*.tile.openstreetmap.org/**", { statusCode: 204 });
		cy.contains("a", "Map").click();
		cy.url().should("include", "/map");
		cy.contains("h1", "Interactive Map of the Restoration").should("be.visible");

		cy.get(".leaflet-pane .leaflet-marker-icon", { timeout: 10000 })
			.first()
			.click({ force: true });
		cy.get(".leaflet-popup-content", { timeout: 10000 }).should("contain", "Palmyra, New York");
	});

	it("submits the contact form and resets the fields", () => {
		cy.contains("a", "Contact").click();
		cy.url().should("include", "/contact");
		cy.contains("h1", "Contact Me").should("be.visible");

		cy.window().then(win => {
			cy.stub(win, "alert").as("alertStub");
		});

		cy.get("#name").type("Cypress User");
		cy.get("#email").type("cypress@example.com");
		cy.get("#message").type("Great site!");
		cy.contains("button", "Send Message").click();

		cy.get("@alertStub").should("have.been.calledWithMatch", "Message sent");
		cy.get("#name").should("have.value", "");
		cy.get("#email").should("have.value", "");
		cy.get("#message").should("have.value", "");
	});
});
