import { visitReady } from "../support/visit";

context("Analytics script identity", () => {
	it("reuses the server script after hydration and repeated navigation", () => {
		const selector = "script[src=\"https://analytics.jacobdanderson.net/script.js\"]";
		visitReady("/");
		cy.get(selector).should("have.length", 1).and("have.attr", "data-hid", "site-analytics");
		for (const route of ["/about", "/contact", "/about"]) {
			cy.get(`header a[href="${route}"]`).click();
			cy.location("pathname").should("eq", route);
			cy.get(selector).should("have.length", 1).and("have.attr", "data-hid", "site-analytics");
			cy.get("script[type=\"application/ld+json\"]").should("have.length", 1);
		}
	});
});
