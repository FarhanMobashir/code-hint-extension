import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import './App.css'

function App() {
  const [problemText, setProblemText] = useState("");
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchHint = async (level) => {
    if (!problemText) {
      setHint("Please enter a problem description.");
      return;
    }

    setLoading(true);
    setHint("");

    try {
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "myllama",
          prompt: `System: You are a coding tutor. You Job is to provide hints and only hints. No code examples.
User: Hint level: ${level}
User: ${problemText}`,
          stream: true,
          options: { temperature: 0.1 }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedResponse = "";

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode the chunk
          const chunk = decoder.decode(value);
          // Split by newlines in case multiple JSON objects are in the chunk
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const parsedLine = JSON.parse(line);

              if (parsedLine.done) {
                setLoading(false);
                return;
              }

              // Extract content from the response field
              if (parsedLine.response) {
                streamedResponse += parsedLine.response;
                setHint(streamedResponse);
              }
            } catch (parseError) {
              console.error('Error parsing chunk:', parseError, line);
              continue;
            }
          }
        }
      } catch (error) {
        console.error('Error in stream processing:', error);
      }

    } catch (error) {
      console.error('Error:', error);
      setHint(`Error fetching hint: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Coding Hint Extension</h1>

        <textarea
          value={problemText}
          onChange={(e) => setProblemText(e.target.value)}
          placeholder="Enter coding problem description"
          className="w-full p-4 border rounded-lg mb-4 h-40 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => fetchHint("broad level hints")}
            disabled={loading}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            Low Hint
          </button>
          <button
            onClick={() => fetchHint("little bit technical hints")}
            disabled={loading}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            Medium Hint
          </button>
          <button
            onClick={() => fetchHint("explain the approach very simply, step by step")}
            disabled={loading}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            Spoonfeed Hint
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          {loading && hint === "" ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <ReactMarkdown
              children={hint}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <SyntaxHighlighter
                      {...props}
                      children={String(children).replace(/\n$/, "")}
                      style={dracula}
                      language={match[1]}
                      PreTag="div"
                      wrapLines={true}
                      wrapLongLines={true}
                    />
                  ) : (
                    <code {...props} className={className}>
                      {children}
                    </code>
                  );
                },
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;