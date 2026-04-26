from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Dict, Any

class ChartConfig(BaseModel):
    chart_type: Literal["line", "bar", "scatter", "bubble", "heatmap", "histogram", "sunburst", "correlation", "pie"]
    x_axis: str
    y_axis: str
    title: str
    correlation_score: Optional[float] = None
    drill_hierarchy: Optional[List[str]] = None
    measure_col: Optional[str] = None
    size_col: Optional[str] = None

class DatasetMetadata(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Any]]
    chart_config: ChartConfig
    correlation_matrix: Optional[Dict[str, Any]] = None
    total_rows: Optional[int] = None
    file_size_mb: Optional[float] = None
    processing_ms: Optional[float] = None
    aggregations: Optional[Dict[str, Any]] = None
