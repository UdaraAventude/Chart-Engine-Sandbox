import pandas as pd
from typing import Dict, List

def get_dataset_profile(df: pd.DataFrame) -> Dict:
    return {
        "columns": df.columns.tolist(),
        "dtypes": df.dtypes.apply(lambda x: str(x)).to_dict(),
        "row_count": len(df)
    }
