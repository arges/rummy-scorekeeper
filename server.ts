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
    <script>
        // Persistence Engine
        const saveState = (state) => localStorage.setItem('rummy_state', JSON.stringify(state));
        const getState = () => JSON.parse(localStorage.getItem('rummy_state')) || { players: [], rounds: [] };
    </script>
</head>
<body class="bg-slate-100 min-h-screen p-4">
    <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        <div class="lg:col-span-2 space-y-6 order-1 lg:order-2">
            <div class="bg-indigo-900 text-white p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold mb-4 border-b border-indigo-400 pb-2 text-indigo-200 text-center lg:text-left">Round Requirements</h2>
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

        <div class="lg:col-span-2 bg-white shadow-xl rounded-lg p-4 md:p-6 order-2 lg:order-1">
            <div id="ui-mount">
                ${content}
            </div>
        </div>

    </div>

    <script>
        function showNameEntry() {
            const count = document.getElementById('pCount').value;
            let html = '<h2 class="text-2xl font-bold text-slate-800 mb-6">Player Names</h2><div class="space-y-3">';
            for(let i=0; i<count; i++) {
                html += '<input type="text" id="pName_'+i+'" placeholder="Player '+(i+1)+'" class="border-2 border-slate-200 p-3 rounded-lg w-full shadow-sm focus:border-indigo-500 outline-none">';
            }
            html += '</div><button onclick="finalizeGame('+count+')" class="mt-6 w-full bg-green-600 text-white p-4 rounded-lg font-bold shadow-md active:scale-95 transition-transform">Start Scoring</button>';
            document.getElementById('ui-mount').innerHTML = html;
        }

        function finalizeGame(count) {
            const players = [];
            for(let i=0; i<count; i++) {
                players.push(document.getElementById('pName_'+i).value || 'Player '+(i+1));
            }
            const state = { players, rounds: [] };
            saveState(state);
            renderDashboard();
        }

        function addRound() {
            const state = getState();
            const currentRound = state.players.map((_, i) => parseInt(document.getElementById('inScore_'+i).value || 0));
            state.rounds.push(currentRound);
            saveState(state);
            renderDashboard();
        }

        function deleteLast() {
            if(!confirm('Delete the last round entered?')) return;
            const state = getState();
            state.rounds.pop();
            saveState(state);
            renderDashboard();
        }

        function resetGame() {
            if(!confirm('Erase all scores and names to start over?')) return;
            localStorage.clear();
            location.reload();
        }

        function renderDashboard() {
            const state = getState();
            if (state.players.length === 0) return;

            const totals = state.players.map((_, i) => state.rounds.reduce((sum, r) => sum + r[i], 0));

            let html = '<h1 class="text-3xl font-bold text-indigo-600 mb-6 text-center">Scoreboard</h1>';
            
            // Table
            html += '<div class="overflow-x-auto mb-6 rounded-lg border border-slate-200 shadow-sm">';
            html += '<table class="w-full text-left border-collapse"><thead class="bg-slate-800 text-white text-xs uppercase">';
            html += '<tr><th class="p-3">Rnd</th>';
            state.players.forEach(p => html += '<th class="p-3 truncate">'+p+'</th>');
            html += '</tr></thead><tbody>';

            state.rounds.forEach((round, idx) => {
                html += '<tr class="'+(idx % 2 === 0 ? 'bg-white' : 'bg-slate-50')+' border-b">';
                html += '<td class="p-3 text-slate-400 font-mono text-xs">#'+(idx+1)+'</td>';
                round.forEach(s => html += '<td class="p-3 font-medium">'+s+'</td>');
                html += '</tr>';
            });

            html += '<tr class="bg-indigo-50 font-black text-lg"> <td class="p-3 border-t">SUM</td>';
            totals.forEach(t => html += '<td class="p-3 border-t text-indigo-700">'+t+'</td>');
            html += '</tr></tbody></table></div>';

            // Entry Form
            html += '<div class="bg-indigo-50 p-6 rounded-xl border-2 border-indigo-200">';
            html += '<h3 class="font-bold mb-4 text-indigo-900 flex items-center"><span class="bg-indigo-600 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-2 text-xs">'+(state.rounds.length + 1)+'</span>Next Round Scores</h3>';
            html += '<div class="grid grid-cols-2 gap-4 mb-6">';
            state.players.forEach((p, i) => {
                html += '<div><label class="block text-[10px] font-bold text-indigo-700 uppercase mb-1 truncate">'+p+'</label>';
                html += '<input type="number" id="inScore_'+i+'" value="0" class="border-2 border-white p-2 w-full rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 outline-none"></div>';
            });
            html += '</div>';
            
            html += '<div class="space-y-3">';
            html += '<button onclick="addRound()" class="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold text-lg shadow-lg active:scale-95 transition-transform">Save Round</button>';
            html += '<div class="flex gap-2">';
            html += '<button onclick="deleteLast()" class="flex-1 bg-amber-500 text-white py-2 rounded-lg text-xs font-bold shadow-md">Undo Last</button>';
            html += '<button onclick="resetGame()" class="flex-1 bg-white border border-red-200 text-red-500 py-2 rounded-lg text-xs font-bold hover:bg-red-50">Reset Game</button>';
            html += '</div></div></div>';

            document.getElementById('ui-mount').innerHTML = html;
        }

        // Initialize on Load
        const current = getState();
        if(current.players.length > 0) renderDashboard();
    </script>
</body>
</html>
`;

app.get("/", (c) => {
    return c.html(layout(`
        <div class="max-w-md mx-auto py-10 text-center">
            <h1 class="text-3xl font-bold text-indigo-600 mb-6">New Game</h1>
            <label class="block text-lg font-medium text-slate-700 mb-4">How many players?</label>
            <input type="number" id="pCount" min="1" max="8" value="2" class="border-2 border-indigo-100 p-4 rounded-xl w-full text-2xl text-center mb-6">
            <button onclick="showNameEntry()" class="bg-indigo-600 text-white px-8 py-4 rounded-xl w-full font-bold text-xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-transform">
                Get Started
            </button>
        </div>
    `));
});

serve(app.fetch);
