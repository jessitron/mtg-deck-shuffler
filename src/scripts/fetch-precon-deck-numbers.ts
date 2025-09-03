#!/usr/bin/env node

async function fetchPreconDeckNumbers(url?: string): Promise<number[]> {
  // Default to the Archidekt precons page if no URL provided
  const targetUrl = url || "https://archidekt.com/decks/precons/";
  
  console.log(`Fetching precon deck numbers from: ${targetUrl}`);
  
  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Find all links matching /decks/{number} pattern
    const deckLinkPattern = /\/decks\/(\d+)/g;
    const matches = [...html.matchAll(deckLinkPattern)];
    
    // Extract unique deck numbers
    const deckNumbers = [...new Set(matches.map(match => parseInt(match[1], 10)))];
    
    console.log(`Found ${deckNumbers.length} unique precon deck numbers:`);
    deckNumbers.sort((a, b) => a - b); // Sort numerically
    
    return deckNumbers;
    
  } catch (error) {
    console.error("Failed to fetch precon deck numbers:", error);
    throw error;
  }
}

async function main(): Promise<void> {
  const url = process.argv[2]; // Optional URL argument
  
  try {
    const deckNumbers = await fetchPreconDeckNumbers(url);
    
    // Output the results
    console.log("\nPrecon deck numbers:");
    deckNumbers.forEach(num => console.log(num));
    
    // Also output as JSON for potential piping/processing
    console.log(`\nAs JSON: ${JSON.stringify(deckNumbers)}`);
    
  } catch (error) {
    process.exit(1);
  }
}

main();