const answers = [];
const queue   = [];   // drawings waiting for LED animation

const server = Bun.serve({
    port: 3000,

    routes: {
        "/": Bun.file("input.html"),
        "/input.html": Bun.file("input.html"),
        "/output.html": Bun.file("output.html"),
        "/esp_demo.html": Bun.file("esp_demo.html"),

        "/submit": {
            POST: async (req) => {
                const body = await req.formData();
                const answer = body.get("answer")?.trim();
                if (answer) queue.push(answer);
                return new Response(null, { status: 204 });
            },
        },

        "/answers": {
            GET: () => Response.json({ answers, queued: queue[0] ?? null }),
        },

        "/commit": {
            POST: () => {
                const item = queue.shift();
                if (item) answers.push(item);
                return new Response(null, { status: 204 });
            },
        },
    },

    error(err) {
        console.error(err);
        return new Response("Internal Server Error", { status: 500 });
    },
});

console.log(`Server running at http://localhost:${server.port}`);
