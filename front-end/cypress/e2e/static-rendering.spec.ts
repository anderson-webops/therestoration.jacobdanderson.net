import { visitReady } from "../support/visit";

context("Production head and stylesheet rendering", () => {
	for (const route of ["/", "/about", "/events", "/figures", "/map", "/contact"]) {
		it(`preserves server metadata and complete styles on ${route}`, () => {
			cy.intercept("https://*.tile.openstreetmap.org/**", { statusCode: 204 });
			cy.request(route).then((response) => {
				const document = new DOMParser().parseFromString(response.body, "text/html");
				expect(document.querySelectorAll("title")).to.have.length(1);
				expect(document.querySelectorAll("meta[name=\"description\"]")).to.have.length(1);
				expect(document.querySelectorAll("link[rel=\"canonical\"]")).to.have.length(1);
				expect(document.querySelector("link[rel=\"canonical\"]")?.getAttribute("href")).to.equal(
					`https://therestoration.jacobdanderson.net${route}`
				);
				const schemas = document.querySelectorAll("script[type=\"application/ld+json\"]");
				expect(schemas).to.have.length(1);
				expect(JSON.parse(schemas[0].textContent || "{}")).to.include({
					"@type": "WebSite",
					"name": "The Restoration"
				});
				expect(
					[...document.querySelectorAll("*")].some(element =>
						[...element.attributes].some(attribute => /^on/i.test(attribute.name))
					)
				).to.equal(false);
			});
			visitReady(route);
			cy.document().should((document) => {
				const stylesheets = [...document.querySelectorAll<HTMLLinkElement>("link[rel=\"stylesheet\"]")];
				expect(stylesheets.length).to.be.greaterThan(0);
				expect(stylesheets.every(stylesheet => Boolean(stylesheet.sheet?.cssRules.length))).to.equal(true);
			});
		});
	}
});
