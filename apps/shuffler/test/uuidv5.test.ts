import { uuidv5 } from "../src/uuidv5.js";

const DNS_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

describe("uuidv5", () => {
  it("matches the RFC 4122 reference value", () => {
    expect(uuidv5("www.example.com", DNS_NAMESPACE)).toBe("2ed6657d-e927-568b-95e1-2665a8aea6a2");
  });
});
