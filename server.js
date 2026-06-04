const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_URL = "https://gemini.googleapis.com/v1/models/gemini-1.5:predict";

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".txt": "text/plain",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

const serveFile = (filePath, res) => {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }
    const ext = path.extname(filePath);
    const type = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": `${type}; charset=utf-8` });
    res.end(data);
  });
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  if (req.method === "POST" && pathname === "/api/gemini") {
    if (!GEMINI_API_KEY) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "GEMINI_API_KEY ist nicht gesetzt. Setze die Umgebungsvariable GEMINI_API_KEY und starte den Server neu." }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const response = await fetch(GEMINI_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GEMINI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body
        });

        const data = await response.text();
        res.writeHead(response.status, {
          "Content-Type": response.headers.get("content-type") || "application/json"
        });
        res.end(data);
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error.message }));
      }
    });

    return;
  }

  let filePath = pathname === "/" ? path.join(__dirname, "index.html") : path.join(__dirname, pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  serveFile(filePath, res);
});

server.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
  console.log("Starte den Server mit GEMINI_API_KEY=dein_key node server.js");
});
