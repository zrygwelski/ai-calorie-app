"use client";

import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const handleSubmit = async () => {
    const res = await fetch("/api/parse-food", {
      method: "POST",
      body: JSON.stringify({ input }),
    });

    const data = await res.json();
    setOutput(data.result);
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

      <pre>{output}</pre>
    </main>
  );
}