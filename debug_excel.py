import pandas as pd

file_path = 'Stats_Frosinone_U16_25-26.xlsx'
try:
    xl = pd.ExcelFile(file_path)
    print(f"Sheets: {xl.sheet_names}")
    for sheet_name in xl.sheet_names:
        df = xl.parse(sheet_name)
        print(f"\nSheet: {sheet_name}")
        print(f"Shape: {df.shape}")
        print("Columns:", df.columns.tolist())
        # Print first non-empty rows
        print(df.dropna(how='all').head(10))
except Exception as e:
    print(f"Error: {e}")
