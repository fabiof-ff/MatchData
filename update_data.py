import pandas as pd
import json
import os

def excel_to_json(file_path):
    xl = pd.ExcelFile(file_path)
    df_partite = xl.parse('Partite')
    df_partite = df_partite.dropna(how='all')

    # GENERALE: Ricava dati aggregati per ogni partita (Data, Avversario, Competizione, Casa/Trasferta, Frazione, GOL fatti, GOL Subiti)
    generale_data = []
    grouped = df_partite.groupby(['Data', 'Avversario', 'Competizione', 'Casa / Trasferta', 'Frazione'])
    for (data, avversario, competizione, casa_trasferta, frazione), group in grouped:
        gol_fatti = 0
        gol_subiti = 0
        for _, row in group.iterrows():
            if str(row['Attributo']).upper() == 'GOL':
                if row['Squadra'] == 'Accademia Frosinone':
                    gol_fatti += row['Valore'] if pd.notna(row['Valore']) else 0
                else:
                    gol_subiti += row['Valore'] if pd.notna(row['Valore']) else 0
        generale_data.append({
            'Data': str(data),
            'Avversario': avversario,
            'Competizione': competizione,
            'Casa / Trasferta': casa_trasferta,
            'Frazione': frazione,
            'GOL fatti': gol_fatti,
            'GOL Subiti': gol_subiti
        })

    # PARTITE_DETTAGLI: Raggruppa per partita e frazione, aggrega tutti gli attributi
    partite_grouped = df_partite.groupby(['Data', 'Avversario', 'Frazione'])
    matches_details = {}
    for (date, opponent, period), group in partite_grouped:
        match_key = f"{date}_{opponent}"
        if match_key not in matches_details:
            matches_details[match_key] = {}
        stats = {}
        for _, row in group.iterrows():
            attr = row['Attributo']
            team = row['Squadra']
            val = row['Valore'] if pd.notna(row['Valore']) else 0
            if attr not in stats:
                stats[attr] = {}
            if team not in stats[attr]:
                stats[attr][team] = 0
            stats[attr][team] += val
        # Aggiungi info Casa/Trasferta
        stats['Casa / Trasferta'] = { 'Accademia Frosinone': group['Casa / Trasferta'].iloc[0] }
        matches_details[match_key][period] = stats

    # DISTRIBUZIONE_GOL: Ricava i gol con timer
    goal_distribution = []
    goal_rows = df_partite[(df_partite['Attributo'].str.upper() == 'GOL') & (df_partite['Valore'] > 0)]
    for _, row in goal_rows.iterrows():
        goal_distribution.append({
            "Data": str(row['Data']),
            "Avversario": row['Avversario'],
            "Competizione": row['Competizione'],
            "Squadra": row['Squadra'],
            "Minuto": row['Timer'],
            "Frazione": row['Frazione'],
            "Casa / Trasferta": row['Casa / Trasferta']
        })

    # GIOCATORI: Ricava elenco giocatori e statistiche base (se presenti)
    giocatori = []
    if 'GIOCATORE' in df_partite.columns:
        player_cols = ['GIOCATORE', 'RUOLO', 'PRESENZE', 'MIN GIOCATI', 'GOAL', 'ASSIST', 'GIALLO', 'ROSSO']
        existing_cols = [c for c in player_cols if c in df_partite.columns]
        df_players = df_partite[existing_cols].dropna(subset=['GIOCATORE'])
        giocatori = df_players.to_dict(orient='records')

    # Final combined data
    data = {
        "generale": generale_data,
        "partite_dettagli": matches_details,
        "giocatori": giocatori,
        "distribuzione_gol": goal_distribution
    }

    # Handle NaNs by converting to None (which becomes null in JSON)
    def clean_data(obj):
        if isinstance(obj, list):
            return [clean_data(i) for i in obj]
        elif isinstance(obj, dict):
            return {k: clean_data(v) for k, v in obj.items()}
        elif isinstance(obj, float) and (pd.isna(obj)):
            return None
        return obj

    data = clean_data(data)

    # Save as JS variable to avoid CORS issues when opening index.html locally
    with open('data.js', 'w', encoding='utf-8') as f:
        f.write("const DASHBOARD_DATA = ")
        json.dump(data, f, ensure_ascii=False, indent=4, default=str)
        f.write(";")

    # Also keep JSON for reference
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4, default=str)

    print("data.js and data.json created successfully.")

if __name__ == "__main__":
    excel_to_json('Stats_Frosinone_U16_25-26.xlsx')
