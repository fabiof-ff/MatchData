import pandas as pd

file_path = 'Stats_Frosinone_U16_25-26.xlsx'
df_partite = pd.read_excel(file_path, sheet_name='Partite')
# Try different date formats or just search by opponent and then filter by date if needed
savio_stats = df_partite[df_partite['Avversario'].str.contains('Savio', na=False)]
print("Available dates for Savio:")
print(savio_stats['Data'].unique())
print("\nStats for all Savio matches:")
print(savio_stats.groupby(['Data', 'Attributo', 'Squadra'])['Valore'].sum().to_string())
