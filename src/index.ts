import { Hono } from "hono";
import { Fetcher, KVNamespace, R2Bucket } from "@cloudflare/workers-types"

type Bindings = {
    ASSETS: Fetcher;
    BUCKET: R2Bucket;
    KVDB: KVNamespace;
};

type Answer =
    | { type: "text"; value: string; submittedAt: string }
    | { type: "drawing"; key: string; submittedAt: string };

const KVDB_ANSWERS = "answers";

async function kvGetAnswers(kv: KVNamespace): Promise<Answer[]> {
    const raw = await kv.get(KVDB_ANSWERS);
    return raw ? JSON.parse(raw) : [];
}

const app = new Hono<{ Bindings: Bindings }>();

app.get("/answers", async (c) => {
    const answers = await kvGetAnswers(c.env.KVDB);
    answers.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
    return c.json(answers);
});

app.get("/answers/length", async (c) => {
    const answers = await kvGetAnswers(c.env.KVDB);
    return c.text(answers.length.toString());
})

app.post("/submit", async (c) => {
    const body = await c.req.formData();
    const field = body.get("answer");

    let answer: Answer | null = null;
    const submittedAt = new Date().toISOString();

    if (field instanceof File) {
        const key = crypto.randomUUID();
        await c.env.BUCKET.put(key, await field.arrayBuffer(), {
            httpMetadata: { contentType: field.type },
        });
        answer = { type: "drawing", key, submittedAt };
    } else {
        const value = field?.toString().trim();
        if (value) answer = { type: "text", value, submittedAt };
    }

    if (answer) {
        const answers = await kvGetAnswers(c.env.KVDB);
        answers.push(answer);
        await c.env.KVDB.put(KVDB_ANSWERS, JSON.stringify(answers));
    }

    return c.body(null, 204);
});

app.delete("/answers/:submittedAt", async (c) => {
    const submittedAt = decodeURIComponent(c.req.param("submittedAt"));
    const answers = await kvGetAnswers(c.env.KVDB);
    const index = answers.findIndex((a) => a.submittedAt === submittedAt);
    if (index === -1) return c.notFound();

    const [removed] = answers.splice(index, 1);
    if (removed.type === "drawing") {
        await c.env.BUCKET.delete(removed.key);
    }

    await c.env.KVDB.put(KVDB_ANSWERS, JSON.stringify(answers));
    return c.body(null, 204);
});

app.get("/drawings/:key", async (c) => {
    const obj = await c.env.BUCKET.get(c.req.param("key"));
    if (!obj) return c.notFound();
    const raw = new Headers();
    obj.writeHttpMetadata(raw);
    const headers: Record<string, string> = {};
    raw.forEach((value, key) => { headers[key] = value; });
    return c.body(obj.body as ReadableStream, 200, headers);
});

export default app;
