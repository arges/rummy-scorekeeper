import { Hono } from "https://deno.land/x/hono@v3.11.7/mod.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const app = new Hono();
const kv = await Deno.openKv(); // Use Deno's built-in database for statefulness

const layout = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Concentration Rummy Scorekeeper</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-100 min-h-screen p-4">
    <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        <div class="lg:col-span-2 space-y-6 order-1 lg:order-2">
            <div class="bg-indigo-900 text-white p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold mb-4 border-b border-indigo-400 pb-2 text-indigo-200">Round Requirements</h2>
                <ol class="space-y-1 text-sm">
                    <li class="p-2 bg-indigo-800 rounded border-s-4 border-green-400"><span class="font-bold mr-2">1.</span> 2 Aces and 1 Set of 3</li>
                    <li class="p-2 bg-indigo-800 rounded border-s-4 border-green-400"><span class="font-bold mr-2">2.</span> 2 Sets of 3</li>
                    <li class="p-2 bg-indigo-800 rounded border-s-4 border-green-400"><span class="font-bold mr-2">3.</span> 1 Set of 3 and 1 Run of 4</li>
                    <li class="p-2 bg-indigo-800 rounded border-s-4 border-green-400"><span class="font-bold mr-2">4.</span> 2 Runs of 4</li>
                    <li class="p-2 bg-indigo-800 rounded border-s-4 border-green-400"><span class="font-bold mr-2">5.</span> 3 Sets of 3</li>
                    <li class="p-2 bg-indigo-800 rounded border-s-4 border-green-400"><span class="font-bold mr-2">6.</span> 1 Run of 4, 2 Sets of 3</li>
                    <li class="p-2 bg-indigo-800 rounded border-s-4 border-green-400"><span class="font-bold mr-2">7.</span> 2 Runs of 4, 1 Set of 3</li>
                    <li class="p-2 bg-indigo-800 rounded border-s-4 border-green-400"><span class="font-bold mr-2">8.</span> 1 Run of 5, 1 Run of 6</li>
                    <li class="p-2 bg-indigo-800 rounded border-s-4 border-green-400"><span class="font-bold mr-2">9.</span> 4 Sets of 3</li>
                    <li class="p-2 bg-indigo-800 rounded border-s-4 border-green-400"><span class="font-bold mr-2">10.</span> 1 Run of 7, 1 Set of 3</li>
                    <li class="p-2 bg-indigo-800 rounded border-s-4 border-green-400"><span class="font-bold mr-2">11.</span> 3 Runs of 4</li>
                    <li class="p-2 bg-indigo-800 rounded border-s-4 border-green-400"><span class="font-bold mr-2">12.</span> 1 Run of 4, 1 Run of 8</li>
                </ol>
            </div>

            <div class="bg-indigo-950 text-white p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold mb-4 border-b border-indigo-500 pb-2">Card Point Values</h2>
                <ul class="space-y-2 text-sm">
                    <li class="flex justify-between"><span>2s & Aces</span> <span class="font-mono bg-indigo-800 px-2 rounded">20 pts</span></li>
                    <li class="flex justify-between"><span>Face Cards & 10s</span> <span class="font-mono bg-indigo-800 px-2 rounded">10 pts</span></li>
                    <li class="flex justify-between"><span>3 - 9</span> <span class="font-mono bg-indigo-800 px-2 rounded">5 pts</span></li>
                </ul>
            </div>
        </div>

        <div class="lg:col-span-2 bg-white shadow-xl rounded-lg p-4 md:p-6 order-2 lg:order-1">
            <h1 class="text-3xl font-bold text-indigo-600 mb-6 text-center">Scoreboard</h1>
            ${content}
        </div>

    </div>
</body>
</html>
`;

// Helper: Get data from DB
const getGame = async () => (await kv.get(["game_state"])).value || { players: [], rounds: [] };

app.get("/", (c) => {
    return c.html(layout(`
        <form action="/names" method="POST" class="space-y-4">
            <label class="block text-lg font-medium text-slate-700">How many players are joining?</label>
            <input type="number" name="count" min="1" max="8" value="2" class="border-2 border-indigo-100 p-3 rounded-lg w-full text-lg">
            <button type="submit" class="bg-indigo-600 text-white px-4 py-3 rounded-lg w-full font-bold shadow-md">Next: Set Names</button>
        </form>
    `));
});

app.post("/names", async (c) => {
    const body = await c.req.parseBody();
    const count = parseInt(body.count as string);
    const inputs = Array.from({ length: count }, (_, i) => `
        <input type="text" name="player_${i}" placeholder="Player ${i+1}" class="border-2 border-slate-200 p-3 rounded-lg w-full mb-3 shadow-sm focus:border-indigo-500 outline-none" required>
    `).join('');

    return c.html(layout(`
        <form action="/start" method="POST" class="space-y-4">
            <h2 class="text-xl font-bold text-slate-800">Who is playing?</h2>
            ${inputs}
            <button type="submit" class="bg-green-600 text-white px-4 py-3 rounded-lg w-full font-bold shadow-md">Start Game</button>
        </form>
    `));
});

app.post("/start", async (c) => {
    const body = await c.req.parseBody();
    const players = Object.keys(body).filter(k => k.startsWith('player_')).map(k => body[k] as string);
    await kv.set(["game_state"], { players, rounds: [] }); // Save to DB
    return c.redirect("/game");
});

app.get("/game", async (c) => {
    const gameState = await getGame();
    if (gameState.players.length === 0) return c.redirect("/");
    
    const totals = gameState.players.map((_, i) => 
        gameState.rounds.reduce((sum, r) => sum + (Number(r[i]) || 0), 0)
    );

    return c.html(layout(`
        <div class="overflow-x-auto mb-6 rounded-lg border border-slate-200">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-slate-800 text-white">
                        <th class="p-3 border-b text-xs uppercase">Rnd</th>
                        ${gameState.players.map(p => `<th class="p-3 border-b font-bold truncate">${p}</th>`).join('')}
                    </tr>
                </thead>
                <tbody class="text-slate-700">
                    ${gameState.rounds.map((round, idx) => `
                        <tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}">
                            <td class="p-3 border-b text-slate-400 font-mono text-xs">#${idx + 1}</td>
                            ${round.map(s => `<td class="p-3 border-b">${s}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot class="bg-indigo-50 font-black text-lg">
                    <tr>
                        <td class="p-3 border-t">SUM</td>
                        ${totals.map(t => `<td class="p-3 border-t text-indigo-700">${t}</td>`).join('')}
                    </tr>
                </tfoot>
            </table>
        </div>

        <form action="/add-round" method="POST" class="bg-indigo-50 p-6 rounded-xl border-2 border-indigo-200 shadow-inner">
            <h3 class="font-bold mb-4 text-indigo-900 flex items-center">
                <span class="bg-indigo-600 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-2 text-xs">${gameState.rounds.length + 1}</span>
                Enter Round Scores
            </h3>
            <div class="grid grid-cols-2 gap-4 mb-6">
                ${gameState.players.map((p, i) => `
                    <div>
                        <label class="block text-[10px] font-bold text-indigo-700 uppercase mb-1 truncate">${p}</label>
                        <input type="number" name="score_${i}" value="0" class="border-2 border-white p-2 w-full rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 outline-none">
                    </div>
                `).join('')}
            </div>
            <div class="space-y-3">
                <button type="submit" class="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold text-lg shadow-lg active:scale-95 transition-transform">Save Round Score</button>
                <a href="/" onclick="return confirm('Erase everything and start a new game?')" class="block w-full text-center text-red-500 text-xs py-2 hover:underline font-medium">Reset Entire Game</a>
            </div>
        </form>
    `));
});

app.post("/add-round", async (c) => {
    const gameState = await getGame();
    const body = await c.req.parseBody();
    const newRound = gameState.players.map((_, i) => parseInt(body[`score_${i}`] as string || "0"));
    gameState.rounds.push(newRound);
    await kv.set(["game_state"], gameState); // Persist to DB
    return c.redirect("/game");
});

serve(app.fetch);
