import ports from "../ports.json" with { type: "json" };

/* Where the local compose answers. The ports are the product's own, kept in one file. */
export const appOrigin = `http://localhost:${ports.app}`;
export const appHost = `localhost:${ports.app}`;
export const mailOrigin = `http://localhost:${ports.mail}`;
