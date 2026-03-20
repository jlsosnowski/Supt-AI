"use client";

import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const addStickyNote = async () => {
    if (!prompt.trim()) return;

    try {
      const res = await fetch("http://localhost:8000/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: prompt }),
      });

      if (!res.ok) throw new Error("Failed to save sticky note.");

      setPrompt("");
    } catch (error) {
      console.error(error);
      alert("Failed to save sticky note.");
    }
  };

  const dailyWrapUp = async () => {
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/generate-report", {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to generate report.");

      const data = await res.json();
      setResponse(data.text || "No report returned.");
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
      alert("Voice input is not supported in this browser. Use typed notes for now.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) {
        setPrompt(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);

      if (event.error === "network") {
        alert("Voice input is unavailable on this browser/session right now. Use typed notes for this test.");
        return;
      }

      alert(`Microphone error: ${event.error}`);
    };

    recognition.onend = () => {
      setListening(false);
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("recognition.start failed", err);
      setListening(false);
      alert("Voice input could not start. Use typed notes for now.");
    }
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/upload-photo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed.");

      alert("Photo uploaded successfully.");
    } catch (error) {
      console.error(error);
      alert("Photo upload failed.");
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-xl space-y-4 border mt-8">
        <h1 className="text-4xl font-bold text-blue-700">Sup’t AI</h1>
        <p className="text-gray-500">Field Intelligence & Daily Reporting System</p>

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

        {loading ? (
          <p className="text-black">Generating report...</p>
        ) : (
          response && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg whitespace-pre-line text-black">
              {response}
            </div>
          )
        )}
      </div>
    </main>
  );
}
