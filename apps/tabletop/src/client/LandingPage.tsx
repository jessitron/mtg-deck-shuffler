import React, { useState } from "react";
import { slugifyTableName } from "../shared/slugify";

/**
 * The landing page takes a table name only
 */
export function LandingPage() {
  const [tableName, setTableName] = useState("");

  function goToTable(e: React.FormEvent) {
    e.preventDefault();
    const slug = slugifyTableName(tableName);
    if (slug) {
      window.location.href = `/t/${encodeURIComponent(slug)}`;
    }
  }

  return (
    <div style={styles.page}>
      <main style={styles.card}>
        <h1 style={styles.title}>The Tabletop</h1>
        <p style={styles.subtitle}>A shared table for remote Magic. Name a table to create or join it — anyone with the link can watch.</p>
        <form onSubmit={goToTable} style={styles.form}>
          <label htmlFor="table-name" style={styles.label}>
            Table name
          </label>
          <input
            id="table-name"
            data-testid="table-name-input"
            style={styles.input}
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="friday-night-magic"
            autoFocus
          />
          <button type="submit" data-testid="go-to-table" style={styles.button} disabled={!slugifyTableName(tableName)}>
            Go to table
          </button>
        </form>
      </main>
      <a href="https://mtg.jessitron.honeydemo.io" style={styles.shufflerLink} data-testid="shuffler-link">
        Manage your decks in the Shuffler
      </a>
    </div>
  );
}

// Square corners except on physical round things. Tablet-friendly targets.
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1.5rem",
    background: "#1a2a1f",
    fontFamily: "Georgia, serif",
  },
  card: {
    background: "#f5f1e8",
    padding: "3rem",
    maxWidth: "28rem",
    width: "100%",
    borderRadius: 0,
    border: "2px solid #3d5a45",
  },
  title: { margin: "0 0 0.5rem", color: "#1a2a1f" },
  subtitle: { margin: "0 0 1.5rem", color: "#3d5a45" },
  form: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  label: { fontWeight: "bold", color: "#1a2a1f" },
  input: {
    fontSize: "1.25rem",
    padding: "0.75rem",
    border: "2px solid #3d5a45",
    borderRadius: 0,
  },
  button: {
    fontSize: "1.25rem",
    padding: "0.9rem",
    background: "#3d5a45",
    color: "#f5f1e8",
    border: "none",
    borderRadius: 0,
    cursor: "pointer",
    minHeight: "48px",
  },
  // Fleet nav-link idiom: white chrome type on a dark surface, always underlined
  // (inline styles can't express :hover). Kept outside the cream card, which has
  // its own buoyed palette problem (tabletop-landing-page-palette).
  shufflerLink: {
    fontFamily: "var(--font-chrome)",
    fontSize: "0.95rem",
    color: "white",
    textDecoration: "underline",
  },
};
