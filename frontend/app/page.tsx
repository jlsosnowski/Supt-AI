"use client";

import { useEffect, useState } from "react";

const API_BASE = "https://supt-ai-backend.onrender.com";

type EquipmentItem = {
  timestamp: string;
  equipment: string;
  tag: string;
  location: string;
  status: string;
};

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState("");

  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const [equipment, setEquipment] = useState("");
  const [equipmentTag, setEquipmentTag] = useState("");
  const [equipmentLocation, setEquipmentLocation] = useState("");
  const [equipmentReport, setEquipmentReport] = useState("");
  const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("supt_ai_user");
    const savedReport = localStorage.getItem("supt_ai_report");
    const savedEquipmentReport = localStorage.getItem("supt_ai_equipment_report");

    if (savedUser) {
      setUser(savedUser);
      setIsLoggedIn(true);
    }

    if (savedReport) {
      setResponse(savedReport);
    }

    if (savedEquipmentReport) {
      setEquipmentReport(savedEquipmentReport);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && user) {
      fetchEquipmentList();
    }
  }, [isLoggedIn, user]);

  const fetchEquipmentList = async () => {
    if (!user) return;

    setEquipmentLoading(true);

    try {
      const res = await fetch(`${API_BASE}/equipment-list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user }),
      });

      if (!res.ok) throw new Error("Failed to load equipment list.");

      const data = await res.json();
      setEquipmentItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error(error);
      setEquipmentItems([]);
    } finally {
      setEquipmentLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!username.trim() || !password.trim()) {
      alert("Username and password are required.");
      return;
    }

    try {
      const endpoint = authMode === "login" ? "/login" : "/register";

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Authentication failed");
      }

      if (authMode === "register") {
        alert("User created. Please log in.");
        setAuthMode("login");
        return;
      }

      setUser(data.user);
      setIsLoggedIn(true);
      localStorage.setItem("supt_ai_user", data.user);
      setPassword("");
    } catch (error: any) {
      alert(error.message || "Authentication failed.");
    }
  };

  const addStickyNote = async () => {
    if (!prompt.trim()) {
      alert("Please enter a field note first.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: prompt,
          user,
        }),
      });

      if (!res.ok) throw new Error("Failed to save sticky note.");

      alert("Sticky note saved.");
      setPrompt("");
      fetchEquipmentList();
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
          user,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(text);
        throw new Error("Failed to generate report.");
      }

      const data = await res.json();
      const reportText = data.text ?? "No report returned.";
      setResponse(reportText);
      localStorage.setItem("supt_ai_report", reportText);
    } catch (error) {
      console.error(error);
      setResponse("Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  const saveEquipment = async () => {
    if (!equipment.trim() || !equipmentLocation.trim()) {
      alert("Equipment and location are required.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/equipment-log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user,
          equipment,
          tag: equipmentTag,
          location: equipmentLocation,
        }),
      });

      if (!res.ok) throw new Error("Failed to save equipment.");

      alert("Equipment saved.");
      setEquipment("");
      setEquipmentTag("");
      setEquipmentLocation("");
      fetchEquipmentList();
    } catch (error) {
      console.error(error);
      alert("Failed to save equipment.");
    }
  };

  const generateEquipmentReport = async () => {
    try {
      const res = await fetch(`${API_BASE}/equipment-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate equipment report.");

      const data = await res.json();
      const equipmentText = data.text ?? "No equipment report returned.";
      setEquipmentReport(equipmentText);
      localStorage.setItem("supt_ai_equipment_report", equipmentText);
      fetchEquipmentList();
    } catch (error) {
      console.error(error);
      setEquipmentReport("Failed to generate equipment report.");
    }
  };

  const startVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Voice input unsupported in this browser. Use Chrome on Android or Safari on iPhone."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: any) => {
      let transcript = event.results?.[0]?.[0]?.transcript ?? "";

      transcript = transcript
        .replace(/\b(cra|craw|kraw|c rah)\b/gi, "CRAH")
        .replace(/\b(rtu|r t u|rtup|r two|r to)\b/gi, "RTU")
        .replace(/\b(ups|u p s|up's|yups|stupid)\b/gi, "UPS")
        .replace(/\b(idf|i d f)\b/gi, "IDF")
        .replace(/\b(mdf|m d f)\b/gi, "MDF");

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

  const logout = () => {
    localStorage.removeItem("supt_ai_user");
    localStorage.removeItem("supt_ai_report");
    localStorage.removeItem("supt_ai_equipment_report");

    setIsLoggedIn(false);
    setUser("");
    setUsername("");
    setPassword("");
    setPrompt("");
    setResponse("");
    setEquipment("");
    setEquipmentTag("");
    setEquipmentLocation("");
    setEquipmentReport("");
    setEquipmentItems([]);
  };

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-5 border">
          <h1 className="text-4xl font-bold text-blue-700">Sup’t AI</h1>
          <p className="text-gray-500">Sign in to continue</p>

          <div className="flex gap-2">
            <button
              onClick={() => setAuthMode("login")}
              className={`flex-1 px-4 py-2 rounded-lg ${
                authMode === "login"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-black"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode("register")}
              className={`flex-1 px-4 py-2 rounded-lg ${
                authMode === "register"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-black"
              }`}
            >
              Register
            </button>
          </div>

          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border p-3 rounded text-black"
            placeholder="Username"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-3 rounded text-black"
            placeholder="Password"
          />

          <button
            onClick={handleAuth}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg"
          >
            {authMode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto p-6 bg-white rounded-2xl shadow-xl space-y-6 border mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-blue-700">Sup’t AI</h1>
            <p className="text-gray-500">
              Field Intelligence & Daily Reporting System
            </p>
            <p className="text-sm text-gray-600 mt-1">Signed in as: {user}</p>
          </div>

          <button
            onClick={logout}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg"
          >
            Logout
          </button>
        </div>

        <div className="p-4 border rounded-xl bg-gray-50 space-y-4">
          <h2 className="text-2xl font-bold text-blue-700">Daily Journal</h2>

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
            <div className="mt-4 p-4 bg-white rounded-lg whitespace-pre-line text-black border">
              {response}
            </div>
          )}
        </div>

        <div className="p-4 border rounded-xl bg-gray-50 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-blue-700">Equipment Log</h2>
            <button
              onClick={fetchEquipmentList}
              className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm"
            >
              Refresh Table
            </button>
          </div>

          <input
            type="text"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            className="w-full border p-3 rounded text-black"
            placeholder="Equipment (example: CRAH Unit)"
          />

          <input
            type="text"
            value={equipmentTag}
            onChange={(e) => setEquipmentTag(e.target.value)}
            className="w-full border p-3 rounded text-black"
            placeholder="Tag (example: 1350-7)"
          />

          <input
            type="text"
            value={equipmentLocation}
            onChange={(e) => setEquipmentLocation(e.target.value)}
            className="w-full border p-3 rounded text-black"
            placeholder="Location (example: IDF Room 2A)"
          />

          <div className="flex gap-2">
            <button
              onClick={saveEquipment}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Save Equipment
            </button>

            <button
              onClick={generateEquipmentReport}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg"
            >
              Generate Equipment Report
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <h3 className="text-lg font-semibold text-black mb-2">
              Live Equipment Table
            </h3>

            {equipmentLoading ? (
              <p className="text-black">Loading equipment...</p>
            ) : equipmentItems.length === 0 ? (
              <p className="text-black">No equipment logged yet.</p>
            ) : (
              <table className="w-full border border-gray-300 bg-white text-black">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-left">
                      Equipment
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left">
                      Tag
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left">
                      Location
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left">
                      Status
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentItems.map((item, index) => (
                    <tr key={`${item.timestamp}-${item.equipment}-${index}`}>
                      <td className="border border-gray-300 px-3 py-2">
                        {item.equipment || "-"}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {item.tag || "-"}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {item.location || "-"}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {item.status || "-"}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {item.timestamp || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {equipmentReport && (
            <div className="mt-4 p-4 bg-white rounded-lg whitespace-pre-line text-black border">
              {equipmentReport}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
