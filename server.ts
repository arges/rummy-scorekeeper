import { Hono } from "https://deno.land/x/hono@v3.11.7/mod.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const app = new Hono();

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
        
        <div class="lg:col-span-2 bg-white shadow-lg rounded-lg p-6 order-2 lg:order-1">
            <h1 class="text-3xl font-bold text-indigo-600 mb-6 text-center">Concentration Rummy</h1>
            ${content}
        </div>

        <div class="lg:col-span-2 space-y-6 order-1 lg:order-2">
            <div class="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                <h2 class="text-xl font-bold mb-4 text-slate-800">Round Requirements</h2>
                <ol class="space-y-2 text-slate-700">
                    <li class="p-2 bg-slate-50 rounded border-s-2 border-slate-300"><span class="font-bold mr-2">1.</span> 2 Aces and 1 Set of 3</li>
                    <li class="p-2 bg-slate-50 rounded border-s-2 border-slate-300"><span class="font-bold mr-2">2.</span> 2 Sets of 3</li>
                    <li class="p-2 bg-slate-50 rounded border-s-2 border-slate-300"><span class="font-bold mr-2">3.</span> 1 Set of 3 and 1 Run of 4</li>
                    <li class="p-2 bg-slate-50 rounded border-s-2 border-slate-300"><span class="font-bold mr-2">4.</span> 2 Runs of 4</li>
                </ol>
            </div>

            <div class="bg-indigo-900 text-white p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold mb-4 border-b border-indigo-400 pb-2">Card Point Values</h2>
                <ul class="space-y-3 text-sm">
                    <li class="flex justify-between"><span>2s</span> <span class="font-mono bg-indigo-800 px-2 rounded">20 pts</span></li>
                    <li class="flex justify-between"><span>Aces</span> <span class="font-mono bg-indigo-800 px-2 rounded">20 pts</span></li>
                    <li class="flex justify-between"><span>Face Cards (K, Q, J)</span> <span class="font-mono bg-indigo-800 px-2 rounded">10 pts</span></li>
                    <li class="flex justify-between"><span>10s</span> <span class="font-mono bg-indigo-800 px-2 rounded">10 pts</span></li>
                    <li class="flex justify-between"><span>3 - 9</span> <span class="font-mono bg-indigo-800 px-2 rounded">5 pts</span></li>
                </ul>
            </div>
        </div>
    </div>
</body>
</html>
`;

let gameState = {
  players: [] as string[],
  rounds: [] as number[][],
};

// Step 1: Ask for player count
app.get("/", (c) => {
  return c.html(layout(`
    <form action="/names" method="POST" class="space-y-4">
        <label class="block text-lg font-medium">How many players?</label>
        <input type="number" name="count" min="1" max="8" value="2" class="border p-2 rounded w-full">
        <button type="submit" class="bg-indigo-500 text-white px-4 py-2 rounded w-full">Next: Set Names</button>
    </form>
  `));
});

// Step 2: Edit Names
app.post("/names", async (c) => {
  const body = await c.req.parseBody();
  const count = parseInt(body.count as string);
  const inputs = Array.from({ length: count }, (_, i) => `
    <input type="text" name="player_${i}" value="Player ${i+1}" class="border p-2 rounded w-full mb-2" required>
  `).join('');

  return c.html(layout(`
    <form action="/start" method="POST" class="space-y-4">
        <h2 class="text-xl font-bold">Edit Player Names</h2>
        ${inputs}
        <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded w-full">Start Scoring</button>
    </form>
  `));
});

// Step 3: Initialize Game
app.post("/start", async (c) => {
  const body = await c.req.parseBody();
  gameState.players = Object.keys(body)
    .filter(k => k.startsWith('player_'))
    .map(k => body[k] as string);
  gameState.rounds = [];
  return c.redirect("/game");
});

// Game Dashboard
app.get("/game", (c) => {
  if (gameState.players.length === 0) return c.redirect("/");
  const totals = gameState.players.map((_, i) => gameState.rounds.reduce((sum, r) => sum + r[i], 0));

  return c.html(layout(`
    <div class="overflow-x-auto mb-6">
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="bg-slate-200">
                    <th class="p-2 border">Round</th>
                    ${gameState.players.map(p => `<th class="p-2 border font-bold">${p}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${gameState.rounds.map((round, idx) => `
                    <tr>
                        <td class="p-2 border text-slate-500">#${idx + 1}</td>
                        ${round.map(s => `<td class="p-2 border">${s}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
            <tr class="bg-indigo-50 font-bold text-lg">
                <td class="p-2 border">TOTAL</td>
                ${totals.map(t => `<td class="p-2 border text-indigo-700">${t}</td>`).join('')}
            </tr>
        </table>
    </div>

    <form action="/add-round" method="POST" class="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <h3 class="font-bold mb-4">Enter Round Scores</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            ${gameState.players.map((p, i) => `
                <div>
                    <label class="block text-xs font-bold text-slate-600 uppercase">${p}</label>
                    <input type="number" name="score_${i}" value="0" class="border p-2 w-full rounded focus:ring-2 focus:ring-indigo-400 outline-none">
                </div>
            `).join('')}
        </div>
        <div class="flex gap-2">
            <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 rounded font-bold">Add Round</button>
            <a href="/" class="px-4 py-2 border border-red-200 text-red-500 rounded hover:bg-red-50 text-center">Reset</a>
        </div>
    </form>
  `));
});

app.post("/add-round", async (c) => {
  const body = await c.req.parseBody();
  const newRound = gameState.players.map((_, i) => parseInt(body[`score_${i}`] as string || "0"));
  gameState.rounds.push(newRound);
  return c.redirect("/game");
});

serve(app.fetch);
