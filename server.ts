import { Hono } from "https://deno.land/x/hono@v3.11.7/mod.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const app = new Hono();

// Initialize Deno KV
let kv: any;
try {
  kv = await Deno.openKv();
} catch (e) {
  console.error("KV not available. Run with --unstable-kv or deploy to Deno Deploy.");
}

const layout = (content: string, currentRound: number = 0) => {
  const requirements = [
    "2 Aces and 1 Set of 3", "2 Sets of 3", "1 Set of 3 and 1 Run of 4", "2 Runs of 4",
    "3 Sets of 3", "1 Run of 4, 2 Sets of 3", "2 Runs of 4, 1 Set of 3", "1 Run of 5, 1 Run of 6",
    "4 Sets of 3", "1 Run of 7, 1 Set of 3", "3 Runs of 4", "1 Run of 4, 1 Run of 8"
  ];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Concentration Rummy Rooms</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { opacity: 1; height: 30px; }
    </style>
</head>
<body class="bg-slate-100 min-h-screen p-4">
    <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        <div class="lg:col-span-2 space-y-6 order-1 lg:order-2">
            <div class="bg-indigo-900 text-white p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold mb-4 border-b border-indigo-400 pb-2 text-indigo-200">Round Requirements</h2>
                <ol class="space-y-1 text-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-1">
                    ${requirements.map((req, i) => `
                        <li class="p-2 rounded border-s-4 transition-all duration-500 ${currentRound === i ? 'bg-green-600 border-white scale-105 shadow-md font-bold' : 'bg-indigo-800 border-green-400 opacity-60'}">
                            <span class="mr-2">${i + 1}.</span> ${req}
                            ${currentRound === i ? ' <span class="float-right">★</span>' : ''}
                        </li>
                    `).join('')}
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

        <div class="lg:col-span-2 bg-white shadow-xl rounded-lg p-6 order-2 lg:order-1">
            ${content}
        </div>
    </div>
</body>
</html>
`;
};

// Helper: Get Game State
const getGame = async (code: string) => (await kv.get(["rooms", code])).value;

// --- ROUTES ---

app.get("/", (c) => c.html(layout(`
    <div class="text-center py-10">
        <h1 class="text-4xl font-black text-indigo-600 mb-2 italic tracking-tighter">RUMMY ROOMS</h1>
        <div class="grid gap-6 text-left max-w-md mx-auto">
            <form action="/create-room" method="POST" class="p-6 border-2 border-indigo-100 rounded-2xl bg-indigo-50 shadow-sm">
                <h2 class="font-bold text-indigo-900 mb-3 text-sm uppercase">Host a Game</h2>
                <button class="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform">Create New Room</button>
            </form>
            <form action="/join-room" method="POST" class="p-6 border-2 border-slate-100 rounded-2xl bg-white shadow-sm flex gap-2">
                <input name="roomCode" placeholder="CODE" class="flex-1 border-2 border-slate-200 p-4 rounded-xl uppercase font-mono text-center text-xl focus:border-indigo-400 outline-none">
                <button class="bg-slate-800 text-white px-6 rounded-xl font-bold">Join</button>
            </form>
        </div>
    </div>
`)));

app.post("/create-room", async (c) => {
  const code = Math.random().toString(36).substring(2, 6).toUpperCase();
  await kv.set(["rooms", code], { players: [], rounds: [], roomCode: code });
  return c.redirect(`/room/${code}/setup`);
});

app.get("/room/:code/setup", async (c) => {
  const code = c.req.param("code");
  return c.html(layout(`
    <h2 class="text-2xl font-bold mb-6 text-slate-800 italic">Room: ${code}</h2>
    <form action="/room/${code}/names" method="POST" class="space-y-6">
        <label class="block text-sm font-bold text-slate-500 uppercase">Number of Players</label>
        <input type="number" name="count" min="1" max="8" value="2" class="w-full border-2 p-4 rounded-xl text-xl">
        <button class="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold">Next</button>
    </form>
  `));
});

app.post("/room/:code/names", async (c) => {
  const code = c.req.param("code");
  const count = parseInt((await c.req.parseBody()).count as string);
  let inputs = `<h2 class="text-2xl font-bold mb-6 italic">Enter Names</h2>`;
  for(let i=0; i<count; i++) inputs += `<input name="p_${i}" placeholder="Player ${i+1}" class="w-full border-2 p-4 mb-3 rounded-xl" required>`;
  return c.html(layout(`<form action="/room/${code}/finalize" method="POST">${inputs}<button class="w-full bg-green-600 text-white p-4 mt-4 rounded-xl font-bold">Start Game</button></form>`));
});

app.post("/room/:code/finalize", async (c) => {
  const code = c.req.param("code");
  const body = await c.req.parseBody();
  const players = Object.keys(body).filter(k => k.startsWith('p_')).map(k => body[k]);
  const data = await getGame(code);
  data.players = players;
  await kv.set(["rooms", code], data);
  return c.redirect(`/room/${code}`);
});

app.post("/join-room", async (c) => {
  const code = ((await c.req.parseBody()).roomCode as string).toUpperCase();
  return (await getGame(code)) ? c.redirect(`/room/${code}`) : c.text("Not found", 404);
});

app.get("/room/:code", async (c) => {
  const code = c.req.param("code");
  const data = await getGame(code);
  if (!data) return c.redirect("/");
  const totals = data.players.map((_, i) => data.rounds.reduce((sum, r) => sum + r[i], 0));

  return c.html(layout(`
    <div class="flex justify-between items-end mb-6">
        <div><h1 class="text-4xl font-black text-indigo-600">${code}</h1></div>
        <button onclick="location.reload()" class="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-xs font-bold border border-indigo-100">🔄 Refresh</button>
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 shadow-sm mb-6">
        <table class="w-full text-left">
            <thead class="bg-slate-800 text-white text-[10px] uppercase">
                <tr><th class="p-3">Rnd</th>${data.players.map(p => `<th class="p-3 truncate">${p}</th>`).join('')}</tr>
            </thead>
            <tbody>
                ${data.rounds.map((r, i) => `<tr class="border-b ${i%2===0?'bg-white':'bg-slate-50'}"><td class="p-3 text-slate-400 font-mono text-[10px]">#${i+1}</td>${r.map(s => `<td class="p-3 font-semibold">${s}</td>`).join('')}</tr>`).join('')}
            </tbody>
            <tfoot class="bg-indigo-50 font-black text-lg italic">
                <tr><td class="p-3 text-sm">TOTAL</td>${totals.map(t => `<td class="p-3 text-indigo-700">${t}</td>`).join('')}</tr>
            </tfoot>
        </table>
    </div>

    <form method="POST" class="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200">
        <h3 class="font-bold mb-4 text-slate-800">Round ${data.rounds.length + 1} Scores</h3>
        <div class="grid grid-cols-2 gap-4 mb-6">
            ${data.players.map((p, i) => `
                <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">${p}</label>
                    <input type="number" name="s_${i}" value="0" step="5" class="w-full p-4 rounded-xl border-2 border-white focus:border-indigo-400 outline-none shadow-sm text-xl font-bold">
                </div>
            `).join('')}
        </div>
        <button formAction="/room/${code}/add-score" class="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg">Save Round</button>
        <div class="flex gap-2 mt-4">
            <button formAction="/room/${code}/undo" class="flex-1 bg-amber-500 text-white py-2 rounded-lg text-xs font-bold">Undo</button>
            <a href="/" class="flex-1 bg-white border border-red-200 text-red-500 py-2 rounded-lg text-xs font-bold text-center">Exit</a>
        </div>
    </form>
  `, data.rounds.length));
});

app.post("/room/:code/add-score", async (c) => {
  const code = c.req.param("code");
  const body = await c.req.parseBody();
  const data = await getGame(code);
  
  // Convert to Multiples of 5 (rounding)
  const newRound = data.players.map((_, i) => {
    const rawValue = parseInt(body[`s_${i}`] || 0);
    return Math.round(rawValue / 5) * 5;
  });
  
  data.rounds.push(newRound);
  await kv.set(["rooms", code], data);
  return c.redirect(`/room/${code}`);
});

app.post("/room/:code/undo", async (c) => {
  const code = c.req.param("code");
  const data = await getGame(code);
  data.rounds.pop();
  await kv.set(["rooms", code], data);
  return c.redirect(`/room/${code}`);
});

serve(app.fetch);
