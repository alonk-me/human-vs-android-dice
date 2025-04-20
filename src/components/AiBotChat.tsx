
import React, { useState } from "react";
import { askAiBot } from "@/utils/aiBot";
import { Button } from "@/components/ui/button";

export default function AiBotChat() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: "system", content: "You are a helpful game assistant who can explain rules or provide fun facts about Liar's Dice. Keep your answers short and friendly!" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const userMsgs = [
      ...messages,
      { role: "user", content: input },
    ];
    setMessages(userMsgs);
    setInput("");
    try {
      const reply = await askAiBot(userMsgs);
      setResponse(reply);
      setMessages([
        ...userMsgs,
        { role: "assistant", content: reply },
      ]);
    } catch (err) {
      setResponse("Sorry, something went wrong.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto border rounded-md p-4 bg-white shadow">
      <h3 className="font-bold mb-2">💬 Ask the AI Bot</h3>
      <div className="mb-2 text-sm">
        {messages.slice(1).map((m, i) =>
          <div key={i} className={m.role === "user" ? "text-right mb-1" : "text-left mb-1"}>
            <span className={`inline-block px-2 py-1 rounded ${m.role === "user" ? "bg-primary text-white" : "bg-gray-100 text-black"}`}>
              {m.content}
            </span>
          </div>
        )}
      </div>
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleSend()}
        className="border rounded px-2 py-1 w-full mb-2"
        placeholder="Ask something..."
        disabled={loading}
      />
      <Button onClick={handleSend} disabled={loading || !input.trim()}>
        {loading ? "Thinking..." : "Send"}
      </Button>
      {response && (
        <div className="mt-3 p-2 rounded bg-secondary text-muted-foreground">
          <b>AI:</b> {response}
        </div>
      )}
    </div>
  );
}
