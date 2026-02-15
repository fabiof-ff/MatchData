// --- Custom XY Chart ---
let customXYChart = null;
// Mappatura tra etichette user-friendly e chiavi dati dettagliati
const xyParamOptions = [
    { key: 'GOL', label: 'Gol Fatti' },
    { key: 'GOL Subiti', label: 'Gol Subiti' },
    { key: 'IPO', label: 'IPO (calcolato)' },
    { key: 'Pass. Chiave', label: 'Passaggi Chiave' },
    { key: 'OccGol', label: 'Occasioni da Gol' },
    { key: 'Az Prom', label: 'Azioni Promettenti' },
    { key: 'TiroTestaArea', label: 'Tiri Testa Area' },
    { key: 'TiroPiedeArea', label: 'Tiri Piede Area' },
    { key: 'TiroDaFuori', label: 'Tiri da Fuori' },
    { key: 'Corner', label: 'Corner' },
    { key: 'Cross', label: 'Cross' },
    { key: 'Rigore', label: 'Rigori' },
    { key: 'Fuorigioco', label: 'Fuorigioco' },
    // ...aggiungi altri parametri se servono
];

// Mappa per fallback tra vecchie chiavi e nuove chiavi dettagliate
const xyKeyMap = {
    'GOL fatti': 'GOL',
    'GOL Subiti': 'GOL Subiti',
    'Occasione da gol': 'OccGol',
    'Azione promettente': 'Az Prom',
    'Tiro testa in area': 'TiroTestaArea',
    'Tiro di piede Area': 'TiroPiedeArea',
    'Tiro da Fuori': 'TiroDaFuori',
};

function populateXYSelectors() {
    const xSel = document.getElementById('xy-x-selector');
    const ySel = document.getElementById('xy-y-selector');
    xSel.innerHTML = '';
    ySel.innerHTML = '';
    xyParamOptions.forEach(opt => {
        const xOpt = document.createElement('option');
        xOpt.value = opt.key;
        xOpt.textContent = opt.label;
        xSel.appendChild(xOpt);
        const yOpt = document.createElement('option');
        yOpt.value = opt.key;
        yOpt.textContent = opt.label;
        ySel.appendChild(yOpt.cloneNode(true));
    });
    xSel.value = 'IPO';
    ySel.value = 'Pass. Chiave';
}

function renderCustomXYChart() {
    const xKey = document.getElementById('xy-x-selector').value;
    const yKey = document.getElementById('xy-y-selector').value;
    const filteredData = getFilteredMatches().filter(d => d["Frazione"] === "2° T");
    const frosinone = "Accademia Frosinone";
    const data = filteredData.map(d => {
        // Calcola IPO se richiesto
        let xVal = 0, yVal = 0;
        const stats = findMatchStats(d.Data, d.Avversario);
        let fullStats = {};
        if (stats) {
            Object.values(stats).forEach(pStats => {
                for (const attr in pStats) {
                    if (!fullStats[attr]) fullStats[attr] = {};
                    for (const team in pStats[attr]) {
                        if (!fullStats[attr][team]) fullStats[attr][team] = 0;
                        fullStats[attr][team] += pStats[attr][team];
                    }
                }
            });
        }
        // Funzione per estrarre valore
        function getVal(key) {
            let mappedKey = xyKeyMap[key] || key;
            let sum = 0;
            if (mappedKey === 'IPO') {
                sum += calculateIPO(stats['1° T'] || {}, frosinone);
                sum += calculateIPO(stats['2° T'] || {}, frosinone);
                return sum;
            }
            if (mappedKey === 'GOL Subiti') {
                const avv = d.Avversario;
                ['1° T', '2° T'].forEach(frazione => {
                    if (stats[frazione]) {
                        ['GOL', 'Gol', 'gol'].forEach(golKey => {
                            if (stats[frazione][golKey] && stats[frazione][golKey][avv] !== undefined) {
                                sum += stats[frazione][golKey][avv];
                            }
                        });
                    }
                });
                return sum;
            }
            if (mappedKey === 'GOL') {
                ['1° T', '2° T'].forEach(frazione => {
                    if (stats[frazione]) {
                        ['GOL', 'Gol', 'gol'].forEach(golKey => {
                            if (stats[frazione][golKey] && stats[frazione][golKey][frosinone] !== undefined) {
                                sum += stats[frazione][golKey][frosinone];
                            }
                        });
                    }
                });
                return sum;
            }
            ['1° T', '2° T'].forEach(frazione => {
                if (stats[frazione] && stats[frazione][mappedKey] && stats[frazione][mappedKey][frosinone] !== undefined) {
                    sum += stats[frazione][mappedKey][frosinone];
                }
            });
            if (sum === 0) {
                const variants = [mappedKey, mappedKey.toLowerCase(), mappedKey.toUpperCase()];
                for (const v of variants) {
                    ['1° T', '2° T'].forEach(frazione => {
                        if (stats[frazione] && stats[frazione][v] && stats[frazione][v][frosinone] !== undefined) {
                            sum += stats[frazione][v][frosinone];
                        }
                    });
                }
            }
            return sum;
        }
        xVal = getVal(xKey);
        yVal = getVal(yKey);
        // Determina il risultato
        let risultato = 'P';
        let golFatti = getVal('GOL');
        let golSubiti = getVal('GOL Subiti');
        if (golFatti > golSubiti) risultato = 'V';
        else if (golFatti < golSubiti) risultato = 'S';
        // Colore in base al risultato
        let color = risultato === 'V' ? '#22c55e' : risultato === 'S' ? '#ef4444' : '#6b7280';
        return {
            x: xVal,
            y: yVal,
            label: `${d.Data.replace(' 00:00:00', '')} vs ${d.Avversario}`,
            backgroundColor: color,
            borderColor: color,
            risultato: risultato
        };
    });
    if (customXYChart) customXYChart.destroy();
    const ctx = document.getElementById('customXYChart').getContext('2d');
    customXYChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Partite',
                data: data,
                backgroundColor: data.map(d => d.backgroundColor),
                borderColor: data.map(d => d.borderColor),
                pointRadius: 7,
                pointHoverRadius: 11,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    position: 'nearest',
                    yAlign: 'top',
                    callbacks: {
                        label: function(context) {
                            const d = context.raw;
                            let res = d.risultato === 'V' ? 'Vittoria' : d.risultato === 'S' ? 'Sconfitta' : 'Pareggio';
                            return `${d.label}: (${d.x}, ${d.y}) - ${res}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: xKey },
                    grid: { color: 'rgba(0,0,0,0.08)' }
                },
                y: {
                    title: { display: true, text: yKey },
                    grid: { color: 'rgba(0,0,0,0.08)' }
                }
            }
        }
    });
}

// Inizializza i selector e il grafico custom dopo il caricamento
window.addEventListener('DOMContentLoaded', () => {
    populateXYSelectors();
    renderCustomXYChart();
    document.getElementById('xy-x-selector').addEventListener('change', renderCustomXYChart);
    document.getElementById('xy-y-selector').addEventListener('change', renderCustomXYChart);
});
let dashboardData = null;
let pointsChart = null;
let goalsChart = null;
let ipoTrendChart = null;
let comparisonChart = null;
let dangerMatrixChart = null;
let goalTimeChart = null;
let ipoDiffChart = null;
let keyPassDiffChart = null;
let selectedMatchKey = null; // Track the currently selected match
let selectedCompetition = 'Campionato';
let selectedPeriod = 'Tutta';
let selectedOpponent = '';
let selectedHomeAway = 'Tutte';
let selectedResult = 'Tutte';

// Register Chart.js DataLabels plugin
Chart.register(ChartDataLabels);

function init() {
            // Filtro risultato (Vittoria/Pareggio/Sconfitta)
            document.getElementById('result-selector').addEventListener('change', (e) => {
                selectedResult = e.target.value;
                updateDashboard(true);
                document.getElementById('match-details').classList.add('hidden');
                if (document.getElementById('match-placeholder')) {
                    document.getElementById('match-placeholder').classList.remove('hidden');
                }
                document.getElementById('match-selector').value = "";
            });
    try {
        // Use the global variable from data.js
        dashboardData = DASHBOARD_DATA;
        
        if (!dashboardData) {
            console.error('Dati non trovati in data.js');
            return;
        }

        updateDashboard(true);
        
        document.getElementById('competition-selector').addEventListener('change', (e) => {
            selectedCompetition = e.target.value;
            selectedOpponent = '';
            document.getElementById('opponent-selector').value = '';
            updateDashboard(true);
            // Hide details when filtering competition
            document.getElementById('match-details').classList.add('hidden');
            if (document.getElementById('match-placeholder')) {
                document.getElementById('match-placeholder').classList.remove('hidden');
            }
            document.getElementById('match-selector').value = "";
        });

        // Home/Away filter logic
        document.getElementById('homeaway-selector').addEventListener('change', (e) => {
            selectedHomeAway = e.target.value;
            updateDashboard(true);
            document.getElementById('match-details').classList.add('hidden');
            if (document.getElementById('match-placeholder')) {
                document.getElementById('match-placeholder').classList.remove('hidden');
            }
            document.getElementById('match-selector').value = "";
        });

        // Tab selection logic
        document.querySelectorAll('.period-tab').forEach(button => {
            button.addEventListener('click', () => {
                selectedPeriod = button.dataset.period;
                
                // Update buttons UI
                document.querySelectorAll('.period-tab').forEach(btn => {
                    btn.classList.remove('bg-blue-900', 'text-white');
                    btn.classList.add('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
                });
                button.classList.remove('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
                button.classList.add('bg-blue-900', 'text-white');

                const matchValue = document.getElementById('match-selector').value;
                if (matchValue) {
                    renderMatchDetails(matchValue, false);
                }
            });
        });

        document.getElementById('match-selector').addEventListener('change', (e) => {
            if (e.target.value) {
                selectedMatchKey = e.target.value;
                renderMatchDetails(e.target.value, true); // Scroll when selecting from dropdown
                renderSeasonCharts(); // Refresh to highlight
                renderPerformanceByMatchday(); // Refresh to highlight
                renderDangerMatrix(); // Refresh to highlight
                renderGoalTimeChart(); // Aggiorna distribuzione gol
            } else {
                selectedMatchKey = null;
                document.getElementById('match-details').classList.add('hidden');
                const placeholder = document.getElementById('match-placeholder');
                if (placeholder) placeholder.classList.remove('hidden');
                renderSeasonCharts();
                renderPerformanceByMatchday();
                renderDangerMatrix();
                renderGoalTimeChart(); // Aggiorna distribuzione gol
            }
        });

        // Nessuna partita selezionata all'avvio
        selectedMatchKey = null;

        // Add double-click to reset filters on ALL chart containers and boxes
        document.querySelectorAll('.bg-white.p-6.rounded-lg.shadow-md, .bg-white.p-4.rounded-lg.shadow-md').forEach(box => {
            box.addEventListener('dblclick', (e) => {
                // Prevent reset if clicking inside a filter/selector if any existed inside boxes
                if (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') return;
                resetFilters();
            });
            box.style.cursor = 'pointer';
        });
    } catch (error) {
        console.error('Errore nell\'inizializzazione della dashboard:', error);
    }
}

function resetFilters() {
    selectedMatchKey = null;
    const selector = document.getElementById('match-selector');
    if (selector) selector.value = "";
    
    document.getElementById('match-details').classList.add('hidden');
    const placeholder = document.getElementById('match-placeholder');
    if (placeholder) placeholder.classList.remove('hidden');
    
    updateDashboard();
}

function updateDashboard(repopulateSelector = false) {
    // Preserve scroll position across updates to prevent jumping
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    updateSummaryHeader();
    if (repopulateSelector) {
        populateMatchSelector();
    }
    renderSeasonCharts();
    renderLastResults();
    renderDangerMatrix();
    renderGoalTimeChart();
    renderPerformanceByMatchday();
    renderCombinedDiffChart();

    // Restore scroll position
    window.scrollTo(scrollX, scrollY);
}

function renderLastResults() {
    const listContainer = document.getElementById('last-results-list');
    listContainer.innerHTML = '';

    // Sync selectedMatchKey with match-selector value
    const matchSelectorValue = document.getElementById('match-selector').value;
    if (matchSelectorValue) selectedMatchKey = matchSelectorValue;

    // Calcola risultati da partite_dettagli
    const partiteDettagli = dashboardData.partite_dettagli;
    const matches = [];
    for (const matchKey in partiteDettagli) {
        // matchKey: Data_Avversario
        const [data, avversario] = matchKey.split('_');
        // Filter by match (Partita) first: if set, show only that match
        if (selectedMatchKey) {
            if (`${data}|${avversario}` !== selectedMatchKey) continue;
        } else {
            // Filter by opponent
            if (selectedOpponent && selectedOpponent !== '' && avversario !== selectedOpponent) continue;
            // Filter by competition
            if (selectedCompetition && selectedCompetition !== 'Tutte') {
                // Find the competition for this match
                const compRow = dashboardData.generale.find(d => d.Data === data && d.Avversario === avversario);
                if (!compRow || compRow.Competizione !== selectedCompetition) continue;
            }
        }
        let golFatti = 0;
        let golSubiti = 0;
        let casaTrasferta = "";
        // Somma i gol per Accademia Frosinone e avversario (sia 'GOL' che 'Gol')
        for (const frazione in partiteDettagli[matchKey]) {
            const stats = partiteDettagli[matchKey][frazione];
            // Cerca tutte le chiavi che corrispondono a 'GOL' o 'Gol' (case-insensitive)
            Object.keys(stats).forEach(key => {
                if (key.toLowerCase() === 'gol') {
                    const golObj = stats[key];
                    if (golObj["Accademia Frosinone"] !== undefined) golFatti += golObj["Accademia Frosinone"];
                    for (const team in golObj) {
                        if (team !== "Accademia Frosinone") golSubiti += golObj[team];
                    }
                }
            });
            // Trova se la squadra era in casa o trasferta
            if (stats["Casa / Trasferta"] && stats["Casa / Trasferta"]["Accademia Frosinone"] !== undefined) {
                casaTrasferta = stats["Casa / Trasferta"]["Accademia Frosinone"];
            }
        }
        // Applica filtro Casa/Trasferta
        if (selectedHomeAway && selectedHomeAway !== 'Tutte' && casaTrasferta !== selectedHomeAway) continue;
        // Applica filtro risultato
        let resultType = 'Tutte';
        if (golFatti > golSubiti) resultType = 'Vittoria';
        else if (golFatti < golSubiti) resultType = 'Sconfitta';
        else if (golFatti === golSubiti) resultType = 'Pareggio';
        if (selectedResult && selectedResult !== 'Tutte' && resultType !== selectedResult) continue;
        matches.push({
            Data: data,
            Avversario: avversario,
            "GOL fatti": golFatti,
            "GOL Subiti": golSubiti,
            "Casa / Trasferta": casaTrasferta,
            "Risultato": resultType
        });
    }
    // Ordina per data decrescente
    matches.sort((a, b) => new Date(b.Data) - new Date(a.Data));

    if (matches.length === 0) {
        listContainer.innerHTML = '<div class="text-center text-gray-400 py-4 italic text-sm">Nessuna partita trovata</div>';
        return;
    }

    matches.forEach(match => {
        const resultDiv = document.createElement('div');
        const matchValue = `${match.Data}|${match.Avversario}`;

        // Add highlight class if selected
        const isSelected = selectedMatchKey === matchValue;
        const bgClass = isSelected ? 'bg-blue-100' : 'bg-gray-50';
        const borderColor = getResultBorderColor(match);

        resultDiv.className = `flex items-center justify-between p-2 rounded ${bgClass} border-l-4 cursor-pointer hover:bg-white hover:shadow-sm transition-all ${borderColor}`;

        const date = match.Data.replace(' 00:00:00', '').substring(0, 10);
        const score = `${match["GOL fatti"]} - ${match["GOL Subiti"]}`;
        const opponent = match.Avversario;

        resultDiv.onclick = () => {
            selectedMatchKey = matchValue;
            const selector = document.getElementById('match-selector');
            if (selector) {
                selector.value = matchValue;
                renderMatchDetails(matchValue, true); // Scroll when clicking result
                updateDashboard(); // Refresh all highlights
                renderGoalTimeChart(); // Aggiorna distribuzione gol
            }
        };

        // Scegli simbolo
        let symbol = '';
        if (match["Casa / Trasferta"] === 'Casa') {
            // Casa: icona home stilizzata blu
            symbol = `<span title="Partita in casa" class="mr-1 align-middle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#2563eb" stroke="none"><path d="M12 3l9 9-1.5 1.5L12 6l-7.5 7.5L3 12z"/><rect x="7" y="13" width="10" height="7" rx="2" fill="#2563eb"/></svg>
            </span>`;
        } else if (match["Casa / Trasferta"] === 'Trasferta') {
            // Trasferta: icona pin/location arancione
            symbol = `<span title="Partita in trasferta" class="mr-1 align-middle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e42" stroke="none"><path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 7.25 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8zm0 10.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
            </span>`;
        }
        resultDiv.innerHTML = `
            <div class="flex flex-col">
                <span class="text-[10px] text-gray-500 font-semibold">${date}</span>
                <span class="flex items-center text-xs font-bold truncate max-w-[120px]">${symbol}<span>${opponent}</span></span>
            </div>
            <div class="text-sm font-black bg-white px-2 py-1 rounded shadow-sm border">
                ${score}
            </div>
        `;
        listContainer.appendChild(resultDiv);
    });
}

function getResultBorderColor(match) {
    const scored = match["GOL fatti"] || 0;
    const conceded = match["GOL Subiti"] || 0;
    if (scored > conceded) return 'border-green-500';
    if (scored < conceded) return 'border-red-500';
    return 'border-yellow-500';
}

function getFilteredMatches() {
    // Aggrega per partita (Data + Avversario)
    const partite = {};
    dashboardData.generale.forEach(d => {
        // Applica filtri base (competizione, avversario, casa/trasferta)
        if (selectedCompetition !== 'Tutte' && d["Competizione"] !== selectedCompetition) return;
        if (selectedOpponent && selectedOpponent !== '' && d["Avversario"] !== selectedOpponent) return;
        if (selectedHomeAway && selectedHomeAway !== 'Tutte' && d["Casa / Trasferta"] !== selectedHomeAway) return;
        const key = `${d.Data}|${d.Avversario}`;
        if (!partite[key]) {
            partite[key] = {
                Data: d.Data,
                Avversario: d.Avversario,
                "Competizione": d["Competizione"],
                "Casa / Trasferta": d["Casa / Trasferta"],
                "GOL fatti": 0,
                "GOL Subiti": 0,
                frazioni: [],
                "Frazione": d["Frazione"] // provvisoria, aggiornata sotto
            };
        }
        partite[key]["GOL fatti"] += Number(d["GOL fatti"] ?? d["Gol fatti"] ?? d["Gol Fatti"] ?? 0);
        partite[key]["GOL Subiti"] += Number(d["GOL Subiti"] ?? d["Gol Subiti"] ?? d["Gol subiti"] ?? 0);
        partite[key].frazioni.push(d);
        // Aggiorna la frazione se questa è "2° T" (preferita per i diagrammi)
        if (d["Frazione"] === "2° T") {
            partite[key]["Frazione"] = "2° T";
        }
    });
    // Applica filtro risultato a livello partita
    let matches = Object.values(partite);
    if (selectedResult && selectedResult !== 'Tutte') {
        matches = matches.filter(m => {
            let res = '';
            if (m["GOL fatti"] > m["GOL Subiti"]) res = 'Vittoria';
            else if (m["GOL fatti"] < m["GOL Subiti"]) res = 'Sconfitta';
            else res = 'Pareggio';
            return res === selectedResult;
        });
    }
    return matches;
}
// Populate opponent selector with unique teams
function populateOpponentSelector() {
    const selector = document.getElementById('opponent-selector');
    selector.innerHTML = '';
    const opponents = new Set();
    dashboardData.generale.forEach(d => {
        opponents.add(d.Avversario);
    });
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'Tutte';
    selector.appendChild(allOption);
    Array.from(opponents).sort().forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        selector.appendChild(option);
    });
}
        // Populate opponent filter after dashboardData is loaded
        setTimeout(populateOpponentSelector, 0);

        document.getElementById('opponent-selector').addEventListener('change', (e) => {
            selectedOpponent = e.target.value;
            updateDashboard(true);
            renderGoalTimeChart(); // Aggiorna distribuzione gol
            document.getElementById('match-details').classList.add('hidden');
            if (document.getElementById('match-placeholder')) {
                document.getElementById('match-placeholder').classList.remove('hidden');
            }
            document.getElementById('match-selector').value = "";
        });

function updateSummaryHeader() {
    const filteredData = getFilteredMatches();
    // Aggrega per partita (Data + Avversario) e somma i gol di tutte le frazioni
    const partite = {};
    filteredData.forEach(d => {
        const key = `${d.Data}|${d.Avversario}`;
        if (!partite[key]) {
            partite[key] = {
                Data: d.Data,
                Avversario: d.Avversario,
                golFatti: 0,
                golSubiti: 0
            };
        }
        partite[key].golFatti += Number(d["GOL fatti"] ?? d["Gol fatti"] ?? d["Gol Fatti"] ?? 0);
        partite[key].golSubiti += Number(d["GOL Subiti"] ?? d["Gol Subiti"] ?? d["Gol subiti"] ?? 0);
    });
    const matches = Object.values(partite);
    const totalMatches = matches.length;
    let totalGoals = 0;
    let totalPoints = 0;
    let totalConceded = 0;
    let totalWins = 0;
    let totalDraws = 0;
    let totalLosses = 0;
    matches.forEach(match => {
        let golFatti = match.golFatti;
        let golSubiti = match.golSubiti;
        // Se non ci sono dati gol per la partita, assegna 0-0
        if (isNaN(golFatti) || isNaN(golSubiti) || (golFatti === 0 && golSubiti === 0 && match.golFatti === 0 && match.golSubiti === 0)) {
            golFatti = 0;
            golSubiti = 0;
        }
        totalGoals += golFatti;
        totalConceded += golSubiti;
        if (golFatti > golSubiti) {
            totalPoints += 3;
            totalWins += 1;
        } else if (golFatti === golSubiti) {
            totalPoints += 1;
            totalDraws += 1;
        } else if (golFatti < golSubiti) {
            totalLosses += 1;
        }
    });

    document.getElementById('total-matches').textContent = totalMatches; // Total Matches
    document.getElementById('total-goals').textContent = totalGoals; // Total Goals
    document.getElementById('total-points').textContent = totalPoints; // Total Points
    document.getElementById('total-conceded').textContent = totalConceded; // Total Conceded
    document.getElementById('total-wins').textContent = totalWins; // Total Wins
    document.getElementById('total-draws').textContent = totalDraws; // Total Draws
    document.getElementById('total-losses').textContent = totalLosses; // Total Losses
}

function populateMatchSelector() {
    const selector = document.getElementById('match-selector');
    selector.innerHTML = '<option value="">Seleziona una partita</option>';
    
    const filteredData = getFilteredMatches();
    // Only unique matches (using Data and Avversario as key)
    const seenMatches = new Set();
    const matches = [];

    filteredData.forEach(d => {
        const matchKey = `${d.Data}|${d.Avversario}`;
        if (!seenMatches.has(matchKey)) {
            const stats = findMatchStats(d.Data, d.Avversario);
            if (stats) {
                seenMatches.add(matchKey);
                matches.push({
                    value: matchKey,
                    label: `${d.Data.replace(' 00:00:00', '')} vs ${d.Avversario}`
                });
            }
        }
    });
    
    matches.forEach(m => {
        const option = document.createElement('option');
        option.value = m.value;
        option.textContent = m.label;
        selector.appendChild(option);
    });
}

function findMatchStats(date, opponent) {
    // Normalizza la data in tutti i formati possibili
    let d = date;
    if (d.includes(' 00:00:00')) d = d.replace(' 00:00:00', '');
    // Se la data è in formato YYYY-MM-DD, converti in DD/MM/YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const [y, m, day] = d.split('-');
        d = `${day}/${m}/${y}`;
    }
    // Se la data è in formato YYYY-MM-DD 00:00:00, converti in DD/MM/YYYY
    if (/^\d{4}-\d{2}-\d{2} 00:00:00$/.test(date)) {
        const [y, m, day] = date.split(' ')[0].split('-');
        d = `${day}/${m}/${y}`;
    }
    // Prova tutte le combinazioni di chiave
    const keys = [
        `${date}_${opponent}`,
        `${d}_${opponent}`,
        `${d} 00:00:00_${opponent}`,
        `${date.replace(' 00:00:00', '')}_${opponent}`
    ];
    for (const key of keys) {
        if (dashboardData.partite_dettagli[key]) {
            return dashboardData.partite_dettagli[key];
        }
    }
    // Se non trova, cerca una chiave che contiene la data e l'avversario
    for (const k in dashboardData.partite_dettagli) {
        if (k.includes(opponent) && (k.includes(date) || k.includes(d))) {
            return dashboardData.partite_dettagli[k];
        }
    }
    return null;
}

function renderSeasonCharts() {
    const ctxPoints = document.getElementById('pointsChart').getContext('2d');
    const ctxGoals = document.getElementById('goalsChart').getContext('2d');
    const ctxIpoTrend = document.getElementById('ipoTrendChart').getContext('2d');
    
    // Filter "Generale" for 2° T rows
    const filteredData = getFilteredMatches();
    const seasonData = filteredData.filter(d => d["Frazione"] === "2° T");
    
    const labels = seasonData.map(d => d["Avversario"]);
    
    // Calcola Gol Fatti/Subiti solo da partite_dettagli
    let goalsMade = [];
    let goalsAgainst = [];
    let points = [];
    let ipoValues = [];
    const partiteDettagli = dashboardData.partite_dettagli;
    let runningGolFatti = 0;
    let runningGolSubiti = 0;
    let runningPoints = 0;
    seasonData.forEach(d => {
        const matchKey = `${d.Data}_${d.Avversario}`;
        let golFatti = 0;
        let golSubiti = 0;
        if (partiteDettagli[matchKey]) {
            for (const frazione in partiteDettagli[matchKey]) {
                const stats = partiteDettagli[matchKey][frazione];
                Object.keys(stats).forEach(key => {
                    if (key.toLowerCase() === 'gol') {
                        const golObj = stats[key];
                        if (golObj["Accademia Frosinone"] !== undefined) golFatti += golObj["Accademia Frosinone"];
                        for (const team in golObj) {
                            if (team !== "Accademia Frosinone") golSubiti += golObj[team];
                        }
                    }
                });
            }
        }
        runningGolFatti += golFatti;
        runningGolSubiti += golSubiti;
        goalsMade.push(runningGolFatti);
        goalsAgainst.push(runningGolSubiti);

        // Calcolo punti: 3 per vittoria, 1 per pareggio (anche 0-0), 0 per sconfitta
        let puntiPartita = 0;
        if (golFatti > golSubiti) puntiPartita = 3;
        else if (golFatti === golSubiti) puntiPartita = 1;
        runningPoints += puntiPartita;
        points.push(runningPoints);
    });

    // Calculate IPO for each match in the trend
    seasonData.forEach(d => {
        const rawStats = findMatchStats(d.Data, d.Avversario);
        if (rawStats) {
            // IPO Trend is always for the FULL match
            let fullStats = {};
            Object.values(rawStats).forEach(pStats => {
                for (const attr in pStats) {
                    if (!fullStats[attr]) fullStats[attr] = {};
                    for (const team in pStats[attr]) {
                        if (!fullStats[attr][team]) fullStats[attr][team] = 0;
                        fullStats[attr][team] += pStats[attr][team];
                    }
                }
            });
            ipoValues.push(calculateIPO(fullStats, "Accademia Frosinone"));
        } else {
            ipoValues.push(0);
        }
    });

    if (pointsChart) pointsChart.destroy();
    if (goalsChart) goalsChart.destroy();
    if (ipoTrendChart) ipoTrendChart.destroy();

        pointsChart = new Chart(ctxPoints, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Punti Totali',
                    data: points,
                    borderColor: 'rgb(30, 58, 138)',
                    backgroundColor: 'rgba(30, 58, 138, 0.1)',
                    fill: true,
                    tension: 0.1,
                    pointBackgroundColor: seasonData.map(d => {
                        const matchKey = `${d.Data}|${d.Avversario}`;
                        if (selectedMatchKey && matchKey !== selectedMatchKey) return 'rgba(200, 200, 200, 0.2)';
                        return 'rgb(30, 58, 138)';
                    }),
                    pointBorderColor: seasonData.map(d => {
                        const matchKey = `${d.Data}|${d.Avversario}`;
                        if (selectedMatchKey && matchKey !== selectedMatchKey) return 'rgba(200, 200, 200, 0.3)';
                        return 'rgb(30, 58, 138)';
                    }),
                    pointRadius: seasonData.map(d => {
                        const matchKey = `${d.Data}|${d.Avversario}`;
                        return matchKey === selectedMatchKey ? 8 : 4;
                    })
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const match = seasonData[index];
                        const matchKey = `${match.Data}|${match.Avversario}`;
                        selectedMatchKey = matchKey;
                        document.getElementById('match-selector').value = matchKey;
                        renderMatchDetails(matchKey, false); // Don't scroll when clicking diagram
                        updateDashboard();
                    }
                },
                plugins: {
                    legend: { display: false },
                    datalabels: { display: false }
                }
            }
        });

    ipoTrendChart = new Chart(ctxIpoTrend, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'IPO Acc. Frosinone',
                    data: ipoValues,
                    backgroundColor: seasonData.map(d => {
                        const matchKey = `${d.Data}|${d.Avversario}`;
                        if (selectedMatchKey && matchKey !== selectedMatchKey) return 'rgba(200, 200, 200, 0.2)';
                        return 'rgba(30, 58, 138, 0.8)';
                    }),
                    borderColor: seasonData.map(d => {
                        const matchKey = `${d.Data}|${d.Avversario}`;
                        if (selectedMatchKey && matchKey !== selectedMatchKey) return 'rgba(200, 200, 200, 0.4)';
                        return 'rgb(30, 58, 138)';
                    }),
                    borderWidth: 1
                },
                {
                    label: 'IPO Avversario',
                    data: seasonData.map(d => {
                        const rawStats = findMatchStats(d.Data, d.Avversario);
                        if (rawStats) {
                            let fullStats = {};
                            Object.values(rawStats).forEach(pStats => {
                                for (const attr in pStats) {
                                    if (!fullStats[attr]) fullStats[attr] = {};
                                    for (const team in pStats[attr]) {
                                        if (!fullStats[attr][team]) fullStats[attr][team] = 0;
                                        fullStats[attr][team] += pStats[attr][team];
                                    }
                                }
                            });
                            const teams = [];
                            Object.values(fullStats).forEach(attrObj => {
                                Object.keys(attrObj).forEach(t => {
                                    if(t !== "Accademia Frosinone" && t !== "NaN" && !teams.includes(t)) teams.push(t);
                                });
                            });
                            const oppTeam = teams[0] || "Avversario";
                            return calculateIPO(fullStats, oppTeam);
                        }
                        return 0;
                    }),
                    backgroundColor: seasonData.map(d => {
                        const matchKey = `${d.Data}|${d.Avversario}`;
                        if (selectedMatchKey && matchKey !== selectedMatchKey) return 'rgba(200, 200, 200, 0.2)';
                        return 'rgba(239, 68, 68, 0.8)';
                    }),
                    borderColor: seasonData.map(d => {
                        const matchKey = `${d.Data}|${d.Avversario}`;
                        if (selectedMatchKey && matchKey !== selectedMatchKey) return 'rgba(200, 200, 200, 0.4)';
                        return 'rgb(239, 68, 68)';
                    }),
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const match = seasonData[index];
                    const matchKey = `${match.Data}|${match.Avversario}`;
                    selectedMatchKey = matchKey;
                    document.getElementById('match-selector').value = matchKey;
                    renderMatchDetails(matchKey, false); // Don't scroll when clicking diagram
                    updateDashboard();
                }
            },
            scales: { y: { beginAtZero: true } },
            plugins: {
                datalabels: { display: false }
            }
        }
    });

    goalsChart = new Chart(ctxGoals, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Gol Fatti',
                    data: goalsMade,
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'transparent',
                    tension: 0.1,
                    pointBackgroundColor: seasonData.map(d => {
                        const matchKey = `${d.Data}|${d.Avversario}`;
                        if (selectedMatchKey && matchKey !== selectedMatchKey) return 'rgba(200, 200, 200, 0.2)';
                        return 'rgb(34, 197, 94)';
                    }),
                    pointRadius: seasonData.map(d => {
                        const matchKey = `${d.Data}|${d.Avversario}`;
                        return matchKey === selectedMatchKey ? 8 : 4;
                    }),
                    pointBorderColor: seasonData.map(d => {
                        const matchKey = `${d.Data}|${d.Avversario}`;
                        if (selectedMatchKey && matchKey !== selectedMatchKey) return 'transparent';
                        return 'white';
                    }),
                    borderWidth: 2
                },
                {
                    label: 'Gol Subiti',
                    data: goalsAgainst,
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'transparent',
                    tension: 0.1,
                    pointBackgroundColor: seasonData.map(d => {
                        const matchKey = `${d.Data}|${d.Avversario}`;
                        if (selectedMatchKey && matchKey !== selectedMatchKey) return 'rgba(200, 200, 200, 0.2)';
                        return 'rgb(239, 68, 68)';
                    }),
                    pointRadius: seasonData.map(d => {
                        const matchKey = `${d.Data}|${d.Avversario}`;
                        return matchKey === selectedMatchKey ? 8 : 4;
                    }),
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const match = seasonData[index];
                    const matchKey = `${match.Data}|${match.Avversario}`;
                    selectedMatchKey = matchKey;
                    document.getElementById('match-selector').value = matchKey;
                    renderMatchDetails(matchKey, false); // Don't scroll when clicking diagram
                    updateDashboard();
                }
            },
            plugins: {
                datalabels: { display: false }
            }
        }
    });
}

function calculateIPO(stats, team) {
    if (!stats) return 0;
    
    const getVal = (attrNames) => {
        for (const name of attrNames) {
            if (stats[name] && stats[name][team] !== undefined) {
                return parseFloat(stats[name][team]) || 0;
            }
        }
        return 0;
    };

    const rigore = getVal(["Rigore"]);
    const occGol = getVal(["Occasione da gol", "OccGol"]);
    const azProm = getVal(["Azione promettente", "Az Prom"]);
    const tiroTestaArea = getVal(["Tiro testa in area", "TiroTestaArea"]);
    const tiroPiedeArea = getVal(["Tiro di piede Area", "TiroPiedeArea"]);
    const tiroDaFuori = getVal(["Tiro da Fuori", "TiroDaFuori"]);
    const punCentr = getVal(["Punizione Centrale", "PunCentr"]);
    const punLat = getVal(["Punizione Laterale", "PunLat"]);
    const cross = getVal(["Cross"]);
    const corner = getVal(["Corner"]);

    const ipo = (15 * rigore) + 
                (10 * occGol) + 
                (4 * azProm) + 
                (2.1 * tiroTestaArea) + 
                (1.3 * tiroPiedeArea) + 
                (0.7 * tiroDaFuori) + 
                (1.8 * punCentr) + 
                (0.6 * punLat) + 
                (0.2 * cross) + 
                (0.6 * corner);
    
    return parseFloat(ipo.toFixed(1));
}

function renderPerformanceByMatchday() {
    // Diagrammi differenza IPO e Passaggi Chiave rimossi
}

function renderCombinedDiffChart() {
    const ctx = document.getElementById('combinedDiffChart').getContext('2d');
    if (window.combinedDiffChart && typeof window.combinedDiffChart.destroy === 'function') {
        window.combinedDiffChart.destroy();
    }

    const filteredData = getFilteredMatches();
    const seasonData = filteredData.filter(d => d["Frazione"] === "2° T");
    const labels = seasonData.map(d => d["Avversario"]);
    const frosinone = "Accademia Frosinone";
    const ipoDiffs = [];
    const passDiffs = [];

    seasonData.forEach(d => {
        const rawStats = findMatchStats(d.Data, d.Avversario);
        if (rawStats) {
            let fullStats = {};
            Object.values(rawStats).forEach(pStats => {
                for (const attr in pStats) {
                    if (!fullStats[attr]) fullStats[attr] = {};
                    for (const team in pStats[attr]) {
                        if (!fullStats[attr][team]) fullStats[attr][team] = 0;
                        fullStats[attr][team] += pStats[attr][team];
                    }
                }
            });
            let teams = [];
            Object.values(fullStats).forEach(attrObj => {
                Object.keys(attrObj).forEach(t => {
                    if(t !== frosinone && t !== "NaN" && !teams.includes(t)) teams.push(t);
                });
            });
            const oppTeam = teams[0] || "Avversario";
            const ipoMe = calculateIPO(fullStats, frosinone);
            const ipoOpp = calculateIPO(fullStats, oppTeam);
            ipoDiffs.push(+(ipoMe - ipoOpp).toFixed(1));
            let passMe = 0;
            let passOpp = 0;
            const passKeys = ["Pass. Chiave", "PassChiave"];
            passKeys.forEach(k => {
                if (fullStats[k]) {
                    passMe += fullStats[k][frosinone] || 0;
                    passOpp += fullStats[k][oppTeam] || 0;
                }
            });
            passDiffs.push(passMe - passOpp);
        } else {
            ipoDiffs.push(0);
            passDiffs.push(0);
        }
    });

    // Se non ci sono dati validi o le etichette sono vuote, mostra un messaggio
    if (
        labels.length === 0 ||
        ipoDiffs.length === 0 ||
        passDiffs.length === 0 ||
        (ipoDiffs.every(v => v === 0) && passDiffs.every(v => v === 0))
    ) {
        ctx.save();
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = '18px Arial';
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.fillText('Nessun dato disponibile per il grafico combinato', ctx.canvas.width / 2, ctx.canvas.height / 2);
        ctx.restore();
        console.warn('Nessun dato valido per Diff. IPO e Passaggi Chiave (Barre combinate)');
        return;
    }
    // Calcola min e max comuni per allineare lo zero
    const allValues = ipoDiffs.concat(passDiffs);
    const minY = Math.min(0, Math.floor(Math.min(...allValues)));
    const maxY = Math.max(0, Math.ceil(Math.max(...allValues)));
    window.combinedDiffChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Diff. IPO',
                    data: ipoDiffs,
                    backgroundColor: 'rgba(0, 191, 255, 0.7)', // celeste
                    borderColor: 'rgba(0, 191, 255, 1)',
                    borderWidth: 1,
                    yAxisID: 'y',
                },
                {
                    label: 'Diff. Passaggi Chiave',
                    data: passDiffs,
                    backgroundColor: 'rgba(50, 205, 50, 0.7)', // verdino
                    borderColor: 'rgba(50, 205, 50, 1)',
                    borderWidth: 1,
                    yAxisID: 'y2',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    min: minY,
                    max: maxY,
                    grid: {
                        color: (c) => c.tick.value === 0 ? '#000' : 'rgba(0,0,0,0.1)'
                    },
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Diff. IPO'
                    }
                },
                y2: {
                    beginAtZero: false,
                    min: minY,
                    max: maxY,
                    grid: {
                        drawOnChartArea: false
                    },
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Diff. Passaggi Chiave'
                    }
                }
            },
            plugins: {
                datalabels: {
                    display: false
                }
            }
        }
    });
}

function renderGoalTimeChart() {
    const ctx = document.getElementById('goalTimeChart').getContext('2d');
    if (goalTimeChart) goalTimeChart.destroy();

    const frosinone = "Accademia Frosinone";
    // Arricchisci ogni elemento con Casa/Trasferta
    const distribution = (dashboardData.distribuzione_gol || []).map(g => {
        // Cerca nel generale la partita corrispondente
        let casaTrasferta = undefined;
        const generaleRow = dashboardData.generale.find(row => {
            // Gestione formato data diverso
            let dataMatch = row.Data;
            let dataGol = g.Data;
            // Normalizza formato data
            if (dataMatch.length === 10 && dataGol.length > 10) dataGol = dataGol.substring(0, 10);
            if (dataGol.length === 10 && dataMatch.length > 10) dataMatch = dataMatch.substring(0, 10);
            return dataMatch === dataGol && row.Avversario === g.Avversario && row.Frazione === g.Frazione;
        });
        if (generaleRow) casaTrasferta = generaleRow["Casa / Trasferta"];
        return { ...g, "Casa / Trasferta": casaTrasferta };
    });

    let filtered = distribution;
    // Filtra per competizione
    if (selectedCompetition !== 'Tutte') {
        filtered = filtered.filter(g => g.Competizione === selectedCompetition);
    }
    // Filtra per squadra avversaria
    if (selectedOpponent && selectedOpponent !== '') {
        filtered = filtered.filter(g => g.Avversario === selectedOpponent);
    }
    // Filtra per partita selezionata
    if (selectedMatchKey) {
        const [data, avversario] = selectedMatchKey.split('|');
        filtered = filtered.filter(g => g.Data === data && g.Avversario === avversario);
    }
    // Filtra per Casa/Trasferta
    if (selectedHomeAway && selectedHomeAway !== 'Tutte') {
        filtered = filtered.filter(g => g["Casa / Trasferta"] === selectedHomeAway);
    }
    // Filtra per risultato (Vittoria/Pareggio/Sconfitta)
    if (selectedResult && selectedResult !== 'Tutte') {
        // Per ogni gol, trova la partita aggregata e calcola il risultato
        filtered = filtered.filter(g => {
            // Trova tutte le frazioni di questa partita
            const matchRows = dashboardData.generale.filter(row => row.Data === g.Data && row.Avversario === g.Avversario);
            let fatti = 0, subiti = 0;
            matchRows.forEach(row => {
                fatti += Number(row["GOL fatti"] ?? row["Gol fatti"] ?? row["Gol Fatti"] ?? 0);
                subiti += Number(row["GOL Subiti"] ?? row["Gol Subiti"] ?? row["Gol subiti"] ?? 0);
            });
            let res = '';
            if (fatti > subiti) res = 'Vittoria';
            else if (fatti < subiti) res = 'Sconfitta';
            else res = 'Pareggio';
            return res === selectedResult;
        });
    }

    // Updated labels with multi-line for axis grouping
    const labels = [
        ["0-10'", "1° T"], "10-20'", "20-30'", "30-40'", "40+'",
        ["0-10'", "2° T"], "10-20'", "20-30'", "30-40'", "40+'"
    ];
    const dataFrosinone = new Array(labels.length).fill(0);
    const dataOpponent = new Array(labels.length).fill(0);

    filtered.forEach(g => {
        let min = parseFloat(g.Minuto) || 0;
        let baseSlot = g.Frazione === "2° T" ? 5 : 0;
        
        // Calculate slot (0-10=0, 10-20=1, 20-30=2, 30-40=3, 40+=4)
        let slotInHalf = Math.floor(min / 10);
        if (slotInHalf > 4) slotInHalf = 4; // Max index 4 for 40+
        if (min >= 40) slotInHalf = 4;      // Ensure any 40+ goes to the last slot
        
        const slotIndex = baseSlot + slotInHalf;
        if (slotIndex >= 0 && slotIndex < labels.length) {
            if (g.Squadra === frosinone) {
                dataFrosinone[slotIndex]++;
            } else {
                dataOpponent[slotIndex]++;
            }
        }
    });

    goalTimeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Gol Fatti',
                    data: dataFrosinone,
                    backgroundColor: 'rgba(30, 58, 138, 0.8)',
                    borderColor: 'rgb(30, 58, 138)',
                    borderWidth: 1
                },
                {
                    label: 'Gol Subiti',
                    data: dataOpponent,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    title: { display: true, text: 'Numero di Gol' }
                },
                x: {
                    title: { display: false, text: 'Minuto di gioco' },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            },
            plugins: {
                legend: { display: false },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    display: (context) => context.dataset.data[context.dataIndex] > 0
                }
            }
        }
    });
}

function renderDangerMatrix() {
    const ctxMatrix = document.getElementById('dangerMatrixChart').getContext('2d');
    const filteredData = getFilteredMatches();
    const seasonData = filteredData.filter(d => d["Frazione"] === "2° T");
    
    if (dangerMatrixChart) dangerMatrixChart.destroy();

    const frosinone = "Accademia Frosinone";
    const scatterData = [];

    seasonData.forEach(d => {
        const rawStats = findMatchStats(d.Data, d.Avversario);
        if (rawStats) {
            let fullStats = {};
            Object.values(rawStats).forEach(pStats => {
                for (const attr in pStats) {
                    if (!fullStats[attr]) fullStats[attr] = {};
                    for (const team in pStats[attr]) {
                        if (!fullStats[attr][team]) fullStats[attr][team] = 0;
                        fullStats[attr][team] += pStats[attr][team];
                    }
                }
            });

            // Find opponent name
            let oppTeam = "Avversario";
            for (const attr in fullStats) {
                const teamNames = Object.keys(fullStats[attr]);
                const found = teamNames.find(t => t !== frosinone && t !== "NaN" && t !== "null");
                if (found) { oppTeam = found; break; }
            }

            // Calculate IPO Diff
            const ipoMe = calculateIPO(fullStats, frosinone);
            const ipoOpp = calculateIPO(fullStats, oppTeam);
            const ipoDiff = ipoMe - ipoOpp;

            // Calculate Passaggi Chiave Diff
            const passKeys = ["Pass. Chiave", "PassChiave"];
            let passMe = 0;
            let passOpp = 0;
            passKeys.forEach(k => {
                if (fullStats[k]) {
                    passMe += fullStats[k][frosinone] || 0;
                    passOpp += fullStats[k][oppTeam] || 0;
                }
            });
            const passDiff = passMe - passOpp;

            // Calcola risultato partita (sommando tutte le frazioni)
            let fatti = 0, subiti = 0;
            d.frazioni?.forEach(fz => {
                fatti += Number(fz["GOL fatti"] ?? fz["Gol fatti"] ?? fz["Gol Fatti"] ?? 0);
                subiti += Number(fz["GOL Subiti"] ?? fz["Gol Subiti"] ?? fz["Gol subiti"] ?? 0);
            });
            let resultType = '';
            if (fatti > subiti) resultType = 'Vittoria';
            else if (fatti < subiti) resultType = 'Sconfitta';
            else resultType = 'Pareggio';

            scatterData.push({
                x: passDiff,
                y: ipoDiff,
                match: `${d.Data.split(' ')[0]} vs ${d.Avversario}`,
                matchKey: `${d.Data}|${d.Avversario}`,
                resultType
            });
        }
    });

    dangerMatrixChart = new Chart(ctxMatrix, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Partite',
                data: scatterData,
                backgroundColor: scatterData.map(d => {
                    if (selectedMatchKey && d.matchKey !== selectedMatchKey) return 'rgba(200, 200, 200, 0.2)';
                    if (d.resultType === 'Vittoria') return 'rgba(34,197,94,0.8)'; // verde
                    if (d.resultType === 'Pareggio') return 'rgba(234,179,8,0.8)'; // giallo
                    if (d.resultType === 'Sconfitta') return 'rgba(239,68,68,0.8)'; // rosso
                    return 'rgba(30,58,138,0.8)'; // fallback blu
                }),
                pointRadius: scatterData.map(d => d.matchKey === selectedMatchKey ? 10 : 6),
                pointHoverRadius: 12,
                borderColor: scatterData.map(d => {
                    if (selectedMatchKey && d.matchKey !== selectedMatchKey) return 'rgba(200, 200, 200, 0.3)';
                    if (d.resultType === 'Vittoria') return 'rgba(34,197,94,1)';
                    if (d.resultType === 'Pareggio') return 'rgba(234,179,8,1)';
                    if (d.resultType === 'Sconfitta') return 'rgba(239,68,68,1)';
                    return 'rgb(30,58,138)';
                }),
                borderWidth: scatterData.map(d => d.matchKey === selectedMatchKey ? 3 : 0)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const matchKey = scatterData[index].matchKey;
                    selectedMatchKey = matchKey;
                    document.getElementById('match-selector').value = matchKey;
                    renderMatchDetails(matchKey, false); // Don't scroll when clicking diagram
                    updateDashboard();
                }
            },
            scales: {
                x: {
                    title: { display: false, text: 'Diff. Passaggi Chiave (Me - Avv)' },
                    grid: {
                        color: (context) => context.tick.value === 0 ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)',
                        lineWidth: (context) => context.tick.value === 0 ? 2 : 1
                    }
                },
                y: {
                    title: { display: true, text: 'Diff. IPO (Me - Avv)' },
                    grid: {
                        color: (context) => context.tick.value === 0 ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)',
                        lineWidth: (context) => context.tick.value === 0 ? 2 : 1
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const d = context.raw;
                            return [
                                `Partita: ${d.match}`,
                                `Diff. Passaggi: ${d.x}`,
                                `Diff. IPO: ${d.y.toFixed(1)}`
                            ];
                        }
                    }
                },
                datalabels: {
                    align: 'top',
                    offset: 5,
                    formatter: (value) => value.match.split(' vs ')[1], // Mostra solo l'avversario
                    font: { size: 9 },
                    display: 'auto'
                }
            }
        }
    });
}

function renderMatchDetails(matchValue, shouldScroll = true) {
    const detailsSection = document.getElementById('match-details');
    const placeholder = document.getElementById('match-placeholder');
    
    detailsSection.classList.remove('hidden');
    if (placeholder) placeholder.classList.add('hidden');

    if (shouldScroll) {
        detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    const [date, opponent] = matchValue.split('|');
    const rawStats = findMatchStats(date, opponent);
    
    if (!rawStats) {
        console.error('Statistiche non trovate per:', matchValue);
        return;
    }

    // Process stats based on selectedPeriod
    let stats = {};
    if (selectedPeriod === 'Tutta') {
        const periods = Object.keys(rawStats);
        periods.forEach(p => {
            const pStats = rawStats[p];
            for (const attr in pStats) {
                if (!stats[attr]) stats[attr] = {};
                for (const team in pStats[attr]) {
                    if (!stats[attr][team]) stats[attr][team] = 0;
                    stats[attr][team] += pStats[attr][team];
                }
            }
        });
    } else {
        stats = rawStats[selectedPeriod] || {};
    }

    const title = `${date.replace(' 00:00:00', '')} vs ${opponent} (${selectedPeriod})`;
    document.getElementById('match-title').textContent = `Dettagli: ${title}`;
    
    const frosinone = "Accademia Frosinone";
    let oppTeam = opponent; // Default to the name in the selector
    
    // Try to find the exact team name used in the stats if different from 'opponent'
    // Search in all attributes
    for (const attr in stats) {
        const teamNames = Object.keys(stats[attr]);
        const found = teamNames.find(t => t !== frosinone && t !== "NaN" && t !== "null");
        if (found) {
            oppTeam = found;
            break;
        }
    }

    // Attributes to compare
    const config = [
        { label: "GOL", key: ["GOL", "Gol"] },
        { label: "IPO (Calcolato)", isIPO: true },
        { label: "Passaggi Chiave", key: ["Pass. Chiave", "PassChiave"] },
        { label: "Rigore", key: ["Rigore"] },
        { label: "Occasione da Gol", key: ["Occasione da gol", "OccGol"] },
        { label: "Azione Promettente", key: ["Azione promettente", "Az Prom"] },
        { label: "Tiro Testa Area", key: ["Tiro testa in area", "TiroTestaArea"] },
        { label: "Tiro Piede Area", key: ["Tiro di piede Area", "TiroPiedeArea"] },
        { label: "Tiro da Fuori", key: ["Tiro da Fuori", "TiroDaFuori"] },
        { label: "Punizione Centrale", key: ["Punizione Centrale", "PunCentr"] },
        { label: "Punizione Laterale", key: ["Punizione Laterale", "PunLat"] },
        { label: "Cross", key: ["Cross"] },
        { label: "Corner", key: ["Corner"] },
        { label: "Fuorigioco", key: ["Fuorigioco"] }
    ];

    const labels = config.map(c => c.label);
    
    const getVal = (team, keys) => {
        if (!keys) return 0;
        for (const k of keys) {
            if (stats[k] && stats[k][team] !== undefined) return parseFloat(stats[k][team]) || 0;
        }
        return 0;
    };

    const frosinoneAbs = config.map(c => {
        const val = c.isIPO ? calculateIPO(stats, frosinone) : getVal(frosinone, c.key);
        return Math.floor(val);
    });

    const opponentAbs = config.map(c => {
        const val = c.isIPO ? calculateIPO(stats, oppTeam) : getVal(oppTeam, c.key);
        return Math.floor(val);
    });

    const frosinoneData = frosinoneAbs.map((v, i) => {
        const total = v + opponentAbs[i];
        return total > 0 ? parseFloat((v / total * 100).toFixed(1)) : 0;
    });

    const opponentData = opponentAbs.map((v, i) => {
        const total = v + frosinoneAbs[i];
        return total > 0 ? parseFloat((v / total * 100).toFixed(1)) : 0;
    });

    if (comparisonChart) comparisonChart.destroy();
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    
    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: frosinone,
                    data: frosinoneData,
                    backgroundColor: 'rgba(30, 58, 138, 0.8)',
                    borderColor: 'rgb(30, 58, 138)',
                    borderWidth: 1,
                    absValues: frosinoneAbs,
                    stack: 'total'
                },
                {
                    label: oppTeam,
                    data: opponentData,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 1,
                    absValues: opponentAbs,
                    stack: 'total'
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    beginAtZero: true,
                    max: 100,
                    title: { display: false, text: '% Incidenza' },
                    grid: { display: true }
                },
                y: {
                    stacked: true,
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { position: 'top' },
                tooltip: { 
                    callbacks: {
                        label: function(context) {
                            const abs = context.dataset.absValues[context.dataIndex];
                            return `${context.dataset.label}: ${context.raw}% (Assoluto: ${abs})`;
                        }
                    }
                },
                datalabels: {
                    display: (context) => context.dataset.data[context.dataIndex] > 5,
                    color: '#fff',
                    anchor: 'center',
                    align: 'center',
                    font: { weight: 'bold', size: 11 },
                    formatter: (value, context) => {
                        const abs = context.dataset.absValues[context.dataIndex];
                        return abs > 0 ? `(${abs})` : '';
                    }
                }
            }
        }
    });

    // Scroll to details
    detailsSection.scrollIntoView({ behavior: 'smooth' });
}

init();
