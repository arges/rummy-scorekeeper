import { Hono } from "https://deno.land/x/hono@v3.11.7/mod.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const app = new Hono();

// Initialize Deno KV (Requires --unstable-kv flag locally)
let kv: any;
try {
  kv = await Deno.openKv();
} catch (e) {
  console.error("KV not available. Run with --unstable-kv or deploy to Deno Deploy.");
}

const layout = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Concentration Rummy Rooms</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-100 min-h-screen p-4">
    <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        <div class="lg:col-span-2 space-y-6 order-1 lg:order-2">
            <div class="bg-indigo-900 text-white p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold mb-4 border-b border-indigo-400 pb-2 text-indigo-200">Round Requirements</h2>
                <ol class="space-y-1 text-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-1">
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

        <div class="lg:col-span-2 bg-white shadow-xl rounded-lg p-6 order-2 lg:order-1">
            ${content}
        </div>
    </div>
</body>
</html>
`;

// Helper: Get Game State
const getGame = async (code: string) => (await kv.get(["rooms", code])).value;

// --- ROUTES ---

app.get("/", (c) => {
  return c.html(layout(`
    <div class="text-center py-10">
        <h1 class="text-4xl font-black text-indigo-600 mb-2 italic">RUMMY ROOMS</h1>
        <p class="text-slate-500 mb-8 font-medium">Shared scoring for Concentration Rummy</p>
        
        <div class="grid gap-6 text-left max-w-md mx-auto">
            <div class="p-6 border-2 border-indigo-100 rounded-2xl bg-indigo-50 shadow-sm">
                <h2 class="font-bold text-indigo-900 mb-3">Host a Game</h2>
                <form action="/create-room" method="POST">
                    <button class="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform">Create New Room</button>
                </form>
            </div>
            
            <div class="p-6 border-2 border-slate-100 rounded-2xl bg-white shadow-sm">
                <h2 class="font-bold text-slate-800 mb-3">Join a Game</h2>
                <form action="/join-room" method="POST" class="flex gap-2">
                    <input name="roomCode" placeholder="CODE" class="flex-1 border-2 border-slate-200 p-4 rounded-xl uppercase font-mono text-center text-xl focus:border-indigo-400 outline-none">
                    <button class="bg-slate-800 text-white px-6 rounded-xl font-bold active:scale-95 transition-transform">Join</button>
                </form>
            </div>
        </div>
    </div>
  `));
});

app.post("/create-room", async (c) => {
  const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
  await kv.set(["rooms", roomCode], { players: [], rounds: [], roomCode });
  return c.redirect(`/room/${roomCode}/setup`);
});

app.get("/room/:code/setup", async (c) => {
  const code = c.req.param("code");
  return c.html(layout(`
    <h2 class="text-2xl font-bold mb-6 text-slate-800">Set Up Room: <span class="text-indigo-600">${code}</span></h2>
    <form action="/room/${code}/names" method="POST" class="space-y-6">
        <div>
            <label class="block text-sm font-bold text-slate-500 uppercase mb-2">Number of Players</label>
            <input type="number" name="count" min="1" max="8" value="2" class="w-full border-2 p-4 rounded-xl text-xl">
        </div>
        <button class="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold shadow-lg">Next: Enter Names</button>
    </form>
  `));
});

app.post("/room/:code/names", async (c) => {
  const code = c.req.param("code");
  const body = await c.req.parseBody();
  const count = parseInt(body.count as string);
  
  let inputs = `<h2 class="text-2xl font-bold mb-6">Player Names</h2>`;
  for(let i=0; i<count; i++) {
    inputs += `<input name="p_${i}" placeholder="Player ${i+1}" class="w-full border-2 p-4 mb-3 rounded-xl focus:border-indigo-500 outline-none" required>`;
  }
  
  return c.html(layout(`
    <form action="/room/${code}/finalize" method="POST">
        ${inputs}
        <button class="w-full bg-green-600 text-white p-4 mt-4 rounded-xl font-bold shadow-lg">Start Game</button>
    </form>
  `));
});

app.post("/room/:code/finalize", async (c) => {
  const code = c.req.param("code");
  const body = await c.req.parseBody();
  const players = Object.keys(body).filter(k => k.startsWith('p_')).map(k => body[k]);
  
  const roomData = await getGame(code);
  roomData.players = players;
  await kv.set(["rooms", code], roomData);
  
  return c.redirect(`/room/${code}`);
});

app.post("/join-room", async (c) => {
  const body = await c.req.parseBody();
  const code = (body.roomCode as string).toUpperCase();
  const room = await getGame(code);
  if (!room) return c.text("Room not found!", 404);
  return c.redirect(`/room/${code}`);
});

app.get("/room/:code", async (c) => {
  const code = c.req.param("code");
  const data = await getGame(code);
  if (!data) return c.redirect("/");
  if (!data.players.length) return c.redirect(`/room/${code}/setup`);

  const totals = data.players.map((_, i) => data.rounds.reduce((sum, r) => sum + (Number(r[i]) || 0), 0));

  return c.html(layout(`
    <div class="flex justify-between items-end mb-8">
        <div>
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Room</span>
            <h1 class="text-4xl font-black text-indigo-600 leading-none">${code}</h1>
        </div>
        <button onclick="location.reload()" class="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-xs font-bold border border-indigo-100 hover:bg-indigo-100 transition-colors">🔄 Refresh Scores</button>
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 shadow-sm mb-8">
        <table class="w-full text-left border-collapse">
            <thead class="bg-slate-800 text-white text-[10px] uppercase tracking-wider">
                <tr><th class="p-3">Rnd</th>${data.players.map(p => `<th class="p-3 truncate">${p}</th>`).join('')}</tr>
            </thead>
            <tbody class="text-slate-700">
                ${data.rounds.map((r, i) => `
                    <tr class="border-b ${i%2===0?'bg-white':'bg-slate-50/50'}">
                        <td class="p-3 text-slate-400 font-mono text-[10px]">#${i+1}</td>
                        ${r.map(s => `<td class="p-3 font-semibold">${s}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
            <tfoot class="bg-indigo-50 font-black text-lg">
                <tr><td class="p-3 text-sm">SUM</td>${totals.map(t => `<td class="p-3 text-indigo-700">${t}</td>`).join('')}</tr>
            </tfoot>
        </table>
    </div>

    <form action="/room/:code/add-score" method="POST" class="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 shadow-inner">
        <h3 class="font-bold mb-4 text-slate-800 flex items-center">
             <span class="bg-indigo-600 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-2 text-[10px] font-bold">${data.rounds.length + 1}</span>
             Enter Round Scores
        </h3>
        <div class="grid grid-cols-2 gap-4 mb-6">
            ${data.players.map((p, i) => `
                <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1 truncate">${p}</label>
                    <input type="number" name="s_${i}" value="0" class="w-full p-3 rounded-xl border-2 border-white focus:border-indigo-400 outline-none shadow-sm">
                </div>
            `).join('')}
        </div>
        <button formAction="/room/${code}/add-score" class="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform">Submit to Room</button>
        <div class="flex gap-2 mt-4">
            <button formAction="/room/${code}/undo" class="flex-1 bg-amber-500 text-white py-2 rounded-lg text-xs font-bold shadow-md">Undo Last</button>
            <a href="/" class="flex-1 bg-white border border-red-200 text-red-500 py-2 rounded-lg text-xs font-bold text-center">Exit Game</a>
        </div>
    </form>
  `));
});

// Logic: Add Score
app.post("/room/:code/add-score", async (c) => {
  const code = c.req.param("code");
  const body = await c.req.parseBody();
  const data = await getGame(code);
  const newRound = data.players.map((_, i) => parseInt(body[`s_${i}`] || 0));
  data.rounds.push(newRound);
  await kv.set(["rooms", code], data);
  return c.redirect(`/room/${code}`);
});

// Logic: Undo Last Round
app.post("/room/:code/undo", async (c) => {
  const code = c.req.param("code");
  const data = await getGame(code);
  data.rounds.pop();
  await kv.set(["rooms", code], data);
  return c.redirect(`/room/${code}`);
});

serve(app.fetch);
