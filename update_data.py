import pandas as pd
import json
import os

def excel_to_json(file_path):
    xl = pd.ExcelFile(file_path)
    
    # Process 'Generale' - Match results and progression
    df_generale = xl.parse('Generale')
    # Clean data (remove rows with all NaNs)
    df_generale = df_generale.dropna(how='all')
    generale_data = df_generale.to_dict(orient='records')
    
    # Process 'Partite' - Detailed stats per match
    df_partite = xl.parse('Partite')
    df_partite = df_partite.dropna(how='all')
    
    # Extract goal distribution data
    goal_distribution = []
    goal_rows = df_partite[(df_partite['Attributo'].str.upper() == 'GOL') & (df_partite['Valore'] > 0)]
    for _, row in goal_rows.iterrows():
        goal_distribution.append({
            "Data": str(row['Data']),
            "Avversario": row['Avversario'],
            "Competizione": row['Competizione'],
            "Squadra": row['Squadra'],
            "Minuto": row['Timer'],
            "Frazione": row['Frazione']
        })

    # We need to preserve 'Frazione' (1° T, 2° T)
    partite_grouped = df_partite.groupby(['Data', 'Avversario', 'Frazione'])
    
    matches_details = {}
    for (date, opponent, period), group in partite_grouped:
        # Create a key that includes the period if needed
        # We'll store stats in a nested structure: match_key -> period -> stats
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
        
        matches_details[match_key][period] = stats

    # Process 'Squadra' - Player stats
    df_squadra = xl.parse('Squadra')
    # Filter only relevant columns for player summary
    player_cols = ['GIOCATORE', 'Unnamed: 1', 'RUOLO', 'PRESENZE', 'MIN GIOCATI', 'GOAL', 'ASSIST', 'GIALLO', 'ROSSO']
    # Check if they exist
    existing_cols = [c for c in player_cols if c in df_squadra.columns]
    df_players = df_squadra[existing_cols].dropna(subset=['GIOCATORE'])
    # Combine first and last name if possible
    if 'GIOCATORE' in df_players.columns and 'Unnamed: 1' in df_players.columns:
        df_players['Nome'] = df_players['GIOCATORE'].astype(str) + " " + df_players['Unnamed: 1'].astype(str)
    else:
        df_players['Nome'] = df_players['GIOCATORE']
        
    players_data = df_players.to_dict(orient='records')

    # Final combined data
    data = {
        "generale": generale_data,
        "partite_dettagli": matches_details,
        "giocatori": players_data,
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
