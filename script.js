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

// Register Chart.js DataLabels plugin
Chart.register(ChartDataLabels);

function init() {
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
            updateDashboard(true);
            // Hide details when filtering competition
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
            } else {
                selectedMatchKey = null;
                document.getElementById('match-details').classList.add('hidden');
                const placeholder = document.getElementById('match-placeholder');
                if (placeholder) placeholder.classList.remove('hidden');
                renderSeasonCharts();
                renderPerformanceByMatchday();
                renderDangerMatrix();
            }
        });

        // Set default match to the latest one
        const seasonData = getFilteredGenerale().filter(d => d["Frazione"] === "2° T");
        if (seasonData.length > 0) {
            const lastMatch = seasonData[seasonData.length - 1];
            const lastMatchValue = `${lastMatch.Data}|${lastMatch.Avversario}`;
            selectedMatchKey = lastMatchValue;
            
            // Populate the selector and render details
            setTimeout(() => {
                const selector = document.getElementById('match-selector');
                if (selector) {
                    selector.value = lastMatchValue;
                    renderMatchDetails(lastMatchValue, false); // Don't scroll on init
                    renderSeasonCharts();
                    renderPerformanceByMatchday();
                    renderDangerMatrix();
                }
            }, 100);
        }

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

    // Restore scroll position
    window.scrollTo(scrollX, scrollY);
}

function renderLastResults() {
    const listContainer = document.getElementById('last-results-list');
    listContainer.innerHTML = '';

    // Calcola risultati da partite_dettagli
    const partiteDettagli = dashboardData.partite_dettagli;
    const matches = [];
    for (const matchKey in partiteDettagli) {
        // matchKey: Data_Avversario
        const [data, avversario] = matchKey.split('_');
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
        matches.push({
            Data: data,
            Avversario: avversario,
            "GOL fatti": golFatti,
            "GOL Subiti": golSubiti,
            "Casa / Trasferta": casaTrasferta
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
            }
        };

        resultDiv.innerHTML = `
            <div class="flex flex-col">
                <span class="text-[10px] text-gray-500 font-semibold">${date}</span>
                <span class="text-xs font-bold truncate max-w-[100px]">${opponent}</span>
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

function getFilteredGenerale() {
    if (selectedCompetition === 'Tutte') {
        return dashboardData.generale;
    }
    return dashboardData.generale.filter(d => d["Competizione"] === selectedCompetition);
}

function updateSummaryHeader() {
    const filteredData = getFilteredGenerale();
    // Filter for 2° T rows
    const sessionEndData = filteredData.filter(d => d["Frazione"] === "2° T");
    
    const totalMatches = sessionEndData.length;
    let totalGoals = 0;
    let totalPoints = 0;
    let totalConceded = 0;

    if (selectedCompetition === 'Tutte') {
        const lastRow = sessionEndData[sessionEndData.length - 1] || {};
        totalGoals = lastRow["Gol Fatti (tot)"] || 0;
        totalPoints = lastRow["Punti (tot)"] || 0;
        totalConceded = lastRow["Gol Subiti (tot)"] || 0;
    } else {
        // Recalculate totals for specific competition since (tot) fields are global cumulative in the CSV usually
        // Actually, looking at the data, it might be better to sum up individual match results if they are relative
        // Let's check data.js again if (tot) is global or per competition.
        // Usually these are global. Let's sum "GOL fatti", "GOL Subiti" and "Punti".
        sessionEndData.forEach(row => {
            totalGoals += (row["GOL fatti"] || 0);
            totalConceded += (row["GOL Subiti"] || 0);
            totalPoints += (row["Punti"] || 0);
        });
    }
    
        document.getElementById('total-matches').textContent = totalMatches; // Total Matches
        document.getElementById('total-goals').textContent = totalGoals; // Total Goals
        document.getElementById('total-points').textContent = totalPoints; // Total Points
        document.getElementById('total-conceded').textContent = totalConceded; // Total Conceded
}

function populateMatchSelector() {
    const selector = document.getElementById('match-selector');
    selector.innerHTML = '<option value="">Seleziona una partita</option>';
    
    const filteredData = getFilteredGenerale();
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
    const cleanDate = date.replace(' 00:00:00', '');
    const keys = [
        `${date}_${opponent}`,
        `${cleanDate}_${opponent}`,
        `${cleanDate} 00:00:00_${opponent}`
    ];
    
    for (const key of keys) {
        if (dashboardData.partite_dettagli[key]) {
            return dashboardData.partite_dettagli[key];
        }
    }
    return null;
}

function renderSeasonCharts() {
    const ctxPoints = document.getElementById('pointsChart').getContext('2d');
    const ctxGoals = document.getElementById('goalsChart').getContext('2d');
    const ctxIpoTrend = document.getElementById('ipoTrendChart').getContext('2d');
    
    // Filter "Generale" for 2° T rows
    const filteredData = getFilteredGenerale();
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

        // Calcolo punti: 3 per vittoria, 1 per pareggio, 0 per sconfitta
        let puntiPartita = 0;
        if (golFatti > golSubiti) puntiPartita = 3;
        else if (golFatti === golSubiti && (golFatti > 0 || golSubiti > 0)) puntiPartita = 1;
        // Se entrambi 0, nessun punto (partita non giocata)
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
    const ctxIpoDiff = document.getElementById('ipoDiffChart').getContext('2d');
    const ctxPassDiff = document.getElementById('keyPassDiffChart').getContext('2d');
    
    if (ipoDiffChart) ipoDiffChart.destroy();
    if (keyPassDiffChart) keyPassDiffChart.destroy();

    const filteredData = getFilteredGenerale();
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

            // Opponent name
            let teams = [];
            Object.values(fullStats).forEach(attrObj => {
                Object.keys(attrObj).forEach(t => {
                    if(t !== frosinone && t !== "NaN" && !teams.includes(t)) teams.push(t);
                });
            });
            const oppTeam = teams[0] || "Avversario";

            // IPO Diff
            const ipoMe = calculateIPO(fullStats, frosinone);
            const ipoOpp = calculateIPO(fullStats, oppTeam);
            ipoDiffs.push(+(ipoMe - ipoOpp).toFixed(1));

            // Pass Diff
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

    const createChart = (ctx, label, data, color) => {
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: seasonData.map((d, i) => {
                        const matchKey = `${d.Data}|${d.Avversario}`;
                        if (selectedMatchKey && matchKey !== selectedMatchKey) return 'rgba(200, 200, 200, 0.2)'; // Faded gray
                        return data[i] >= 0 ? 'rgba(30, 58, 138, 0.8)' : 'rgba(239, 68, 68, 0.8)';
                    }),
                    borderColor: seasonData.map((d, i) => {
                        const matchKey = `${d.Data}|${d.Avversario}`;
                        if (selectedMatchKey && matchKey !== selectedMatchKey) return 'rgba(200, 200, 200, 0.4)';
                        return data[i] >= 0 ? 'rgb(30, 58, 138)' : 'rgb(239, 68, 68)';
                    }),
                    borderWidth: 1
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
                scales: {
                    y: { 
                        beginAtZero: true,
                        grid: {
                            color: (c) => c.tick.value === 0 ? '#000' : 'rgba(0,0,0,0.1)'
                        }
                    }
                },
                plugins: {
                    datalabels: {
                        anchor: (context) => context.dataset.data[context.dataIndex] >= 0 ? 'end' : 'start',
                        align: (context) => context.dataset.data[context.dataIndex] >= 0 ? 'top' : 'bottom',
                        display: 'auto',
                        font: { size: 10, weight: 'bold' }
                    }
                }
            }
        });
    };

    ipoDiffChart = createChart(ctxIpoDiff, 'Diff. IPO (Me - Avv)', ipoDiffs);
    keyPassDiffChart = createChart(ctxPassDiff, 'Diff. Passaggi Chiave (Me - Avv)', passDiffs);
}

function renderGoalTimeChart() {
    const ctx = document.getElementById('goalTimeChart').getContext('2d');
    if (goalTimeChart) goalTimeChart.destroy();

    const frosinone = "Accademia Frosinone";
    const distribution = dashboardData.distribuzione_gol || [];
    
    // Filter by competition if not 'Tutte'
    const filtered = selectedCompetition === 'Tutte' 
        ? distribution 
        : distribution.filter(g => g.Competizione === selectedCompetition);

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
    const filteredData = getFilteredGenerale();
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

            scatterData.push({
                x: passDiff,
                y: ipoDiff,
                match: `${d.Data.split(' ')[0]} vs ${d.Avversario}`,
                matchKey: `${d.Data}|${d.Avversario}`
            });
        }
    });

    dangerMatrixChart = new Chart(ctxMatrix, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Partite',
                data: scatterData,
                backgroundColor: scatterData.map(d => 
                    selectedMatchKey && d.matchKey !== selectedMatchKey ? 'rgba(200, 200, 200, 0.2)' : 'rgba(30, 58, 138, 0.8)'
                ),
                pointRadius: scatterData.map(d => d.matchKey === selectedMatchKey ? 10 : 6),
                pointHoverRadius: 12,
                borderColor: scatterData.map(d => 
                    selectedMatchKey && d.matchKey !== selectedMatchKey ? 'rgba(200, 200, 200, 0.3)' : 'rgb(30, 58, 138)'
                ),
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
