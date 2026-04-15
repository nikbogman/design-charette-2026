import { Hono } from "hono";
import { serveStatic } from "hono/bun";

const answers = [];
const queue   = [];

const app = new Hono();

app.get("/",            serveStatic({ path: "./input.html" }));
app.get("/input.html",  serveStatic({ path: "./input.html" }));
app.get("/output.html", serveStatic({ path: "./output.html" }));
app.get("/esp_demo.html", serveStatic({ path: "./esp_demo.html" }));

app.get("/answers", (c) => c.json({ answers, queued: queue[0] ?? null }));

app.post("/submit", async (c) => {
    const body   = await c.req.formData();
    const answer = body.get("answer")?.trim();
    if (answer) queue.push(answer);
    return c.body(null, 204);
});

app.post("/commit", (c) => {
    const item = queue.shift();
    if (item) answers.push(item);
    return c.body(null, 204);
});

export default {
    port: 3000,
    fetch: app.fetch,
};
