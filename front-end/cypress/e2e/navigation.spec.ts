import { visitReady } from "../support/visit";

context("Production navigation", () => {
	it("uses page metadata and moves focus after navigation", () => {
		visitReady("/");
		cy.get('header a[href="/about"]').click();
		cy.title().should("eq", "About | The Restoration");
		cy.get('link[rel="canonical"]').should("have.attr", "href", "https://therestoration.jacobdanderson.net/about");
		cy.focused().should("have.id", "main-content");
		cy.get('header a[aria-current="page"]').should("have.text", "About");
		cy.go("back");
		cy.title().should("eq", "The Restoration");
		cy.get('header a.nav-link[aria-current="page"]').should("have.text", "Home");
	});

	it("keeps the mobile menu above the map and closes it after selection", () => {
		cy.viewport(390, 844);
		cy.intercept("https://*.tile.openstreetmap.org/**", { statusCode: 204 });
		visitReady("/map");
		cy.get(".leaflet-marker-icon").should("have.length", 6);
		cy.get(".hamburger").should("have.attr", "aria-expanded", "false").click();
		cy.get('header a[href="/contact"]').should("be.visible").click();
		cy.location("pathname").should("eq", "/contact");
		cy.get(".hamburger").should("have.attr", "aria-expanded", "false");
		cy.get("#main-navigation").should("not.be.visible");
		cy.focused().should("have.id", "main-content");
	});

	it("keeps working after revisiting the map", () => {
		cy.intercept("https://*.tile.openstreetmap.org/**", { statusCode: 204 });
		visitReady("/map");
		cy.get(".leaflet-marker-icon").should("have.length", 6);
		cy.get('header a[href="/about"]').click();
		cy.get('header a[href="/map"]').click();
		cy.get(".leaflet-marker-icon")
			.should("have.length", 6)
			.first()
			.should("have.attr", "alt", "Palmyra, New York")
			.should($image => {
				expect(($image[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0);
			})
			.click({ force: true });
		cy.get(".leaflet-popup-content").should("contain", "Palmyra, New York");
		cy.get(".leaflet-popup-content img").should($image => {
			expect(($image[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0);
		});
	});

	it("returns a real missing-page response with a working home link", () => {
		cy.request({ url: "/missing-page", failOnStatusCode: false, headers: { Accept: "text/html" } })
			.its("status")
			.should("eq", 404);
		visitReady("/missing-page", { failOnStatusCode: false });
		cy.contains("h1", "Page not found").should("be.visible");
		cy.get('meta[name="robots"]').should("have.attr", "content", "noindex,nofollow");
		cy.get('link[rel="canonical"]').should("not.exist");
		cy.contains("a", "Return home").click();
		cy.contains("h1", "The Restoration").should("be.visible");
	});

	it("does not publish developer documentation or turn API misses into HTML", () => {
		cy.request({ url: "/README", failOnStatusCode: false }).its("status").should("eq", 404);
		cy.request({ url: "/api", failOnStatusCode: false, headers: { Accept: "text/html" } })
			.its("body")
			.should("deep.eq", { ok: false, error: "not-found" });
	});
});
