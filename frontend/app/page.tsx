"use client";

import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [user, setUser] = useState("j.williams");

  const API_BASE = "https://supt-ai-backend.onrender.com";

  const addStickyNote = async () => {
    if (!prompt.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: prompt,
          user: user,
        }),
      });

      if (!res.ok) throw new Error("Failed to save sticky note.");

      alert("Sticky note saved.");
      setPrompt("");
    } catch (error) {
      console.error(error);
      alert("Failed to save sticky note.");
    }
  };

  const dailyWrapUp = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/generate-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: user,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(text);
        throw new Error("Failed to generate report.");
      }

      const data = await res.json();
      setResponse(data.text ?? "No report returned.");
    } catch (error) {
      console.error(error);
      setResponse("Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  const startVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Voice input unsupported in this browser. Use Chrome (Android) or Safari (iPhone)."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      setPrompt(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error(event.error);
      alert("Microphone error: " + event.error);
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognition.start();
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/upload-photo`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      alert("Photo uploaded successfully");
    } catch (error) {
      console.error(error);
      alert("Photo upload failed");
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-xl space-y-4 border mt-8">
        <h1 className="text-4xl font-bold text-blue-700">Sup’t AI</h1>

        <p className="text-gray-500">
          Field Intelligence & Daily Reporting System
        </p>

        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Select User
          </label>
          <select
            value={user}
            onChange={(e) => setUser(e.target.value)}
            className="w-full border p-3 rounded text-black"
          >
            <option value="j.williams">J. Williams</option>
            <option value="r.smith">R. Smith</option>
          </select>
        </div>

        <button
          onClick={startVoice}
          className="bg-red-600 text-white text-xl px-6 py-4 rounded-full w-full"
        >
          🎤 {listening ? "Listening..." : "Tap to Speak"}
        </button>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full border p-3 rounded text-black"
          placeholder="Type or speak a field note..."
          rows={5}
        />

        <div className="flex gap-2">
          <button
            onClick={addStickyNote}
            className="bg-yellow-500 text-black px-4 py-2 rounded-lg"
          >
            📝 Sticky Note
          </button>

          <button
            onClick={dailyWrapUp}
            className="bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            ✅ Daily Wrap-Up
          </button>
        </div>

        <input
          type="file"
          accept="image/*"
          onChange={uploadPhoto}
          className="mt-2"
        />

        {loading && <p className="text-black">Generating report...</p>}

        {!loading && response && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg whitespace-pre-line text-black">
            {response}
          </div>
        )}
      </div>
    </main>
  );
}
