"use client";

import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    setOutput("");

    try {
      const res = await fetch("/api/parse-food", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `Request failed (${res.status} ${res.statusText})${errorText ? `: ${errorText}` : ""}`
        );
      }

      const data = await res.json();
      const rawResult = String(data?.result ?? "");
      const normalizedResult = rawResult
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      try {
        const parsed = JSON.parse(normalizedResult);
        setOutput(JSON.stringify(parsed, null, 2));
      } catch {
        setError("Could not parse response as JSON");
        setOutput(rawResult);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong while fetching data";
      setError(message);
    }
  };

  return (
    <main style={{ padding: 20 }}>
      <h1>AI Calorie Tracker</h1>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="What did you eat?"
        style={{ width: 300 }}
      />

      <button onClick={handleSubmit}>Submit</button>

      {error ? <p>{error}</p> : null}
      <pre>{output}</pre>
    </main>
  );
}