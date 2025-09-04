import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import request from "supertest";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Smoke Tests - Route Content Validation", () => {
  let app: any;
  
  beforeEach(async () => {
    // Set environment for testing to use in-memory persistence
    process.env.PORT_PERSIST_STATE = "in-memory";
    
    // Import and create test app
    const { createApp } = await import("../dist/app.js");
    app = createApp();
  });
  
  test("GET / serves index.html with correct content", async () => {
    const response = await request(app).get("/");
    
    // Check that the game setup screen appears with expected text
    assert(response.text.includes("Woohoo it's Magic time"), "Home page should contain welcome text");
    assert(response.text.includes("hx-get=\"/choose-deck\""), "Home page should load deck chooser via HTMX");
    assert.strictEqual(response.status, 200, "Home page should return 200 status");
  });
  
  test("GET /choose-deck returns deck selection form", async () => {
    const response = await request(app).get("/choose-deck");
    
    assert.strictEqual(response.status, 200, "choose-deck should return 200");
    assert(response.text.includes("Let's Play"), "choose-deck should contain play buttons");
    assert(response.text.includes("14669648"), "choose-deck should have pre-filled Archidekt deck ID");
  });
  
  test("POST /deck with default Archidekt deck redirects to game", async () => {
    const response = await request(app)
      .post("/deck")
      .send({ "deck-number": "14669648", "deck-source": "archidekt" });
      
    assert.strictEqual(response.status, 302, "deck POST should redirect");
    assert(response.headers.location?.startsWith("/game/"), `Should redirect to game route, got: ${response.headers.location}`);
  });
  
  test("GET /game/{id} shows deck review with correct deck name", async () => {
    // First create a game by posting to /deck
    const createResponse = await request(app)
      .post("/deck") 
      .send({ "deck-number": "14669648", "deck-source": "archidekt" });
      
    const gameUrl = createResponse.headers.location as string;
    
    // Then get the game page
    const response = await request(app).get(gameUrl);
    
    assert.strictEqual(response.status, 200, "Game page should return 200");
    assert(response.text.includes("Ygra EATS IT ALL"), `Should show correct deck name, content: ${response.text.substring(0, 500)}`);
    assert(response.text.includes("Shuffle Up"), "Should show Shuffle Up button in deck review");
    assert(response.text.includes("https://cards.scryfall.io/normal/front/b/9/b9ac7673-eae8-4c4b-889e-5025213a6151.jpg"), "Should show commander image");
  });
  
  test("POST /start-game creates active game with card-back library", async () => {
    // Create a game
    const createResponse = await request(app)
      .post("/deck")
      .send({ "deck-number": "14669648", "deck-source": "archidekt" });
      
    const gameUrl = createResponse.headers.location as string;
    const gameId = gameUrl.split("/").pop();
    
    // Start the game
    const response = await request(app)
      .post("/start-game")
      .send({ "game-id": gameId });
      
    assert.strictEqual(response.status, 200, "start-game should return 200");
    assert(response.text.includes('data-testid="card-back"'), "Should show library with card-back element");
    assert(!response.text.includes("Shuffle Up"), "Should NOT show Shuffle Up button in active game");
  });
  
  test("Navigation: Choose Another Deck button works", async () => {
    // Create and view a game
    const createResponse = await request(app)
      .post("/deck")
      .send({ "deck-number": "14669648", "deck-source": "archidekt" });
      
    const gameUrl = createResponse.headers.location as string;
    const gameResponse = await request(app).get(gameUrl);
    
    // Verify "Choose Another Deck" link is present and points to root
    assert(gameResponse.text.includes('href="/"'), "Should have link back to home");
    assert(gameResponse.text.includes("Choose Another Deck"), "Should show Choose Another Deck button");
  });
  
  test("Local deck loading works", async () => {
    const response = await request(app)
      .post("/deck")
      .send({ "deck-source": "local", "local-deck": "rats.json" });
      
    assert.strictEqual(response.status, 302, "local deck POST should redirect");
    
    const gameUrl = response.headers.location as string;
    const gameResponse = await request(app).get(gameUrl);
    
    assert.strictEqual(gameResponse.status, 200, "Local game page should return 200");
    assert(gameResponse.text.includes("Rat Girl's Food Hoarding"), "Should show correct local deck name");
  });
});

describe("Critical Route Availability", () => {
  let app: any;
  
  beforeEach(async () => {
    process.env.PORT_PERSIST_STATE = "in-memory";
    const { createApp } = await import("../dist/app.js");
    app = createApp();
  });
  
  test("All critical routes respond correctly", async () => {
    // Test each critical route responds (not 404)
    const routes = [
      { method: "get", path: "/" },
      { method: "get", path: "/choose-deck" },
    ];
    
    for (const route of routes) {
      const response = await request(app)[route.method](route.path);
      assert(response.status < 400, `Route ${route.method.toUpperCase()} ${route.path} should not return 4xx/5xx, got ${response.status}`);
    }
  });
  
  test("404 handler works", async () => {
    const response = await request(app).get("/nonexistent-route");
    assert.strictEqual(response.status, 404, "Should return 404 for non-existent routes");
  });
});