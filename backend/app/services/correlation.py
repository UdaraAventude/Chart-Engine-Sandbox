import pandas as pd

def get_correlation_matrix(df):
    numeric = df.select_dtypes(include='number').drop(columns=['num'], errors='ignore')
    corr = numeric.corr().round(2)
    cols = list(corr.columns)
    result = []
    for i, c1 in enumerate(cols):
        for j, c2 in enumerate(cols):
            result.append({"x": c1, "y": c2, "value": float(corr.loc[c1, c2])})
    return {"columns": cols, "matrix": result}
