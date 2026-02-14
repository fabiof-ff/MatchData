let dashboardData = null;
let pointsChart = null;
let goalsChart = null;
let ipoTrendChart = null;
let matchStatsChart = null;
let possessionChart = null;
let ipoChart = null;
let selectedCompetition = 'Tutte';

function init() {
    try {
        // Use the global variable from data.js
        dashboardData = DASHBOARD_DATA;
        
        if (!dashboardData) {
            console.error('Dati non trovati in data.js');
            return;
        }

        updateDashboard();
        
        document.getElementById('competition-selector').addEventListener('change', (e) => {
            selectedCompetition = e.target.value;
            updateDashboard();
            // Hide details when filtering competition
            document.getElementById('match-details').classList.add('hidden');
            document.getElementById('match-selector').value = "";
        });

        document.getElementById('match-selector').addEventListener('change', (e) => {
            if (e.target.value) {
                renderMatchDetails(e.target.value);
            } else {
                document.getElementById('match-details').classList.add('hidden');
            }
        });
    } catch (error) {
        console.error('Errore nell\'inizializzazione della dashboard:', error);
    }
}

function updateDashboard() {
    updateSummaryHeader();
    populateMatchSelector();
    renderSeasonCharts();
    renderLastResults();
}

function renderLastResults() {
    const listContainer = document.getElementById('last-results-list');
    listContainer.innerHTML = '';
    
    // Get last matches from filtered data (2nd half rows only)
    const filteredData = getFilteredGenerale().filter(d => d["Frazione"] === "2° T");
    const lastMatches = filteredData.slice(-5).reverse(); // Last 5, most recent first

    if (lastMatches.length === 0) {
        listContainer.innerHTML = '<div class="text-center text-gray-400 py-4 italic text-sm">Nessuna partita trovata</div>';
        return;
    }

    lastMatches.forEach(match => {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'flex items-center justify-between p-2 rounded bg-gray-50 border-l-4 ' + getResultBorderColor(match);
        
        const date = match.Data.replace(' 00:00:00', '').substring(0, 10);
        const score = `${match["GOL fatti"]} - ${match["GOL Subiti"]}`;
        const opponent = match.Avversario;
        
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
    
    document.getElementById('total-matches').textContent = totalMatches;
    document.getElementById('total-goals').textContent = totalGoals;
    document.getElementById('total-points').textContent = totalPoints;
    document.getElementById('total-conceded').textContent = totalConceded;
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
    
    // Calculate cumulative values
    let points = [];
    let goalsMade = [];
    let goalsAgainst = [];
    let ipoValues = [];

    if (selectedCompetition === 'Tutte') {
        points = seasonData.map(d => d["Punti (tot)"] || 0);
        goalsMade = seasonData.map(d => d["Gol Fatti (tot)"] || 0);
        goalsAgainst = seasonData.map(d => d["Gol Subiti (tot)"] || 0);
    } else {
        let runningP = 0;
        let runningG = 0;
        let runningC = 0;
        seasonData.forEach(d => {
            runningP += (d["Punti"] || 0);
            runningG += (d["GOL fatti"] || 0);
            runningC += (d["GOL Subiti"] || 0);
            points.push(runningP);
            goalsMade.push(runningG);
            goalsAgainst.push(runningC);
        });
    }

    // Calculate IPO for each match in the trend
    seasonData.forEach(d => {
        const stats = findMatchStats(d.Data, d.Avversario);
        if (stats) {
            ipoValues.push(calculateIPO(stats, "Accademia Frosinone"));
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
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    ipoTrendChart = new Chart(ctxIpoTrend, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'IPO Acc. Frosinone',
                    data: ipoValues,
                    borderColor: 'rgb(30, 58, 138)',
                    backgroundColor: 'rgba(30, 58, 138, 0.1)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'IPO Avversario',
                    data: seasonData.map(d => {
                        const stats = findMatchStats(d.Data, d.Avversario);
                        if (stats) {
                            const teams = Object.keys(stats["GOL"] || {});
                            const oppTeam = teams.find(t => t !== "Accademia Frosinone") || "Avversario";
                            return calculateIPO(stats, oppTeam);
                        }
                        return 0;
                    }),
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
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
                    tension: 0.1
                },
                {
                    label: 'Gol Subiti',
                    data: goalsAgainst,
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'transparent',
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
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

function renderMatchDetails(matchValue) {
    const detailsSection = document.getElementById('match-details');
    detailsSection.classList.remove('hidden');
    
    const [date, opponent] = matchValue.split('|');
    const stats = findMatchStats(date, opponent);
    
    if (!stats) {
        console.error('Statistiche non trovate per:', matchValue);
        return;
    }

    const title = `${date.replace(' 00:00:00', '')} vs ${opponent}`;
    document.getElementById('match-title').textContent = `Dettagli: ${title}`;
    
    const teams = Object.keys(stats["GOL"] || {}); // Get team names
    const frosinone = "Accademia Frosinone";
    const homeTeam = teams.find(t => t !== frosinone) || "Avversario";

    // Prepare data for Bar chart (comparison)
    const attributes = ["GOL", "OccGol", "TiroPiedeArea", "TiroDaFuori", "Pass. Chiave", "Corner", "Fuorigioco"];
    const frosinoneStats = attributes.map(attr => (stats[attr] && stats[attr][frosinone]) || 0);
    const opponentStats = attributes.map(attr => (stats[attr] && stats[attr][homeTeam]) || 0);

    if (matchStatsChart) matchStatsChart.destroy();
    const ctxMatch = document.getElementById('matchStatsChart').getContext('2d');
    matchStatsChart = new Chart(ctxMatch, {
        type: 'bar',
        data: {
            labels: attributes,
            datasets: [
                {
                    label: frosinone,
                    data: frosinoneStats,
                    backgroundColor: 'rgba(30, 58, 138, 0.8)'
                },
                {
                    label: homeTeam,
                    data: opponentStats,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)'
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Possession Donut
    if (possessionChart) possessionChart.destroy();
    const posFrosinone = (stats["Poss(%)"] && stats["Poss(%)"][frosinone]) || 0;
    // The data seems to have % as a difference or absolute? 
    // Let's check "Poss(min)" for a better share
    const minFro = (stats["Poss(min)"] && stats["Poss(min)"][frosinone]) || 0;
    const minOpp = (stats["Poss(min)"] && stats["Poss(min)"][homeTeam]) || 0;
    const totalMin = minFro + minOpp || 1;

    const ctxPos = document.getElementById('possessionChart').getContext('2d');
    possessionChart = new Chart(ctxPos, {
        type: 'doughnut',
        data: {
            labels: [frosinone, homeTeam],
            datasets: [{
                data: [minFro, minOpp],
                backgroundColor: ['rgb(30, 58, 138)', 'rgb(239, 68, 68)']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // IPO Chart
    if (ipoChart) ipoChart.destroy();
    const ipoFro = calculateIPO(stats, frosinone);
    const ipoOpp = calculateIPO(stats, homeTeam);
    const ctxIpo = document.getElementById('ipoChart').getContext('2d');
    ipoChart = new Chart(ctxIpo, {
        type: 'bar',
        data: {
            labels: [frosinone, homeTeam],
            datasets: [{
                label: 'IPO',
                data: [ipoFro, ipoOpp],
                backgroundColor: ['rgb(30, 58, 138)', 'rgb(239, 68, 68)']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });

    // Scroll to details
    detailsSection.scrollIntoView({ behavior: 'smooth' });
}

init();
