import pandas as pd

DATASET_CONFIGS = {
    "cleveland": {
        "chart_type": "scatter",
        "x_axis": "age",
        "y_axis": "chol",
        "title": "Age vs Cholesterol",
        "correlation_score": 0.21
    },
    "superstore": {
        "chart_type": "scatter",
        "x_axis": "Sales",
        "y_axis": "Profit",
        "title": "Sales vs Profit",
        "correlation_score": 0.48
    },
    'ecommerce': {
        'chart_type': 'sunburst',
        'x_axis': 'Revenue',
        'y_axis': 'Profit',
        'title': 'Global E-Commerce Revenue Breakdown',
        'correlation_score': 0.87
    },
    'employee_survey': {
        'chart_type':         'sunburst',
        'x_axis':             'monthly_salary',
        'y_axis':             'overall_satisfaction',
        'title':              'Employee Satisfaction & Salary Analysis',
        'correlation_score':  0.41,
        'drill_hierarchy':    ['country', 'department', 'seniority_level', 'education_level'],
        'measure_col':        'monthly_salary',
        'size_col':           'turnover_risk_score',
    }
}

def get_mock_chart_config(df: pd.DataFrame) -> dict:
    cols_lower = [c.lower() for c in df.columns]

    # Detect dataset by column fingerprint
    if "age" in cols_lower and "chol" in cols_lower:
        return DATASET_CONFIGS["cleveland"]

    if "sales" in cols_lower and "profit" in cols_lower:
        return DATASET_CONFIGS["superstore"]

    if 'region' in cols_lower and 'revenue' in cols_lower and 'sub_category' in cols_lower:
        return DATASET_CONFIGS['ecommerce']

    if 'overall_satisfaction' in cols_lower and 'seniority_level' in cols_lower and 'municipality' in cols_lower:
        return DATASET_CONFIGS['employee_survey']

    # Fallback — pick first two numeric columns automatically
    numeric_cols = df.select_dtypes(include='number').columns.tolist()
    if len(numeric_cols) >= 2:
        return {
            "chart_type": "scatter",
            "x_axis": numeric_cols[0],
            "y_axis": numeric_cols[1],
            "title": f"{numeric_cols[0]} vs {numeric_cols[1]}",
            "correlation_score": round(
                float(df[numeric_cols[0]].corr(df[numeric_cols[1]])), 2
            )
        }

    # Second fallback - try any two columns
    all_cols = df.columns.tolist()
    if len(all_cols) >= 2:
        return {
            "chart_type": "scatter",
            "x_axis": all_cols[0],
            "y_axis": all_cols[1],
            "title": f"{all_cols[0]} vs {all_cols[1]}",
            "correlation_score": 0.0
        }

    raise ValueError("Dataset has fewer than 2 columns")
