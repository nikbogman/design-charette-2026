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

app.get("/drawings/:key", async (c) => {
    const obj = await c.env.BUCKET.get(c.req.param("key"));
    if (!obj) return c.notFound();
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    return new Response(obj.body as ReadableStream, { headers });
});

export default app;
