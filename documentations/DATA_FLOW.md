# Chart Engine — Full Data Flow Documentation

## Table of Contents

1. [Stage 0 — Raw CSV](#stage-0--raw-csv)
2. [Stage 1 — File Upload](#stage-1--file-upload)
3. [Stage 2 — PapaParse](#stage-2--papaparse)
4. [Stage 3 — Global Formatter](#stage-3--global-formatter)
5. [Stage 4 — Zustand Store](#stage-4--zustand-store)
6. [Stage 5 — DrillDownRenderer](#stage-5--drilldownrenderer)
7. [Stage 6 — Chart Click](#stage-6--chart-click)
8. [Stage 7 — drillInto](#stage-7--drillinto)
9. [Stage 8 — Re-render](#stage-8--re-render)
10. [Stage 9 — Navigate Back](#stage-9--navigate-back)
11. [End-to-End Shape Summary](#end-to-end-shape-summary)

## Stage 0 — Raw CSV

**File:** `frontend/src/constants/csv/employee_survey_200k.csv`

Plain text file. Row 1 is headers, rows 2–N are data. All values are comma-separated strings — no types, no hierarchy.

```
employee_id,country,department,seniority_level,education_level,gender,
employment_type,quarter,age,age_group,monthly_salary,overall_satisfaction,...

EMP0188825,Netherlands,Customer Success,Senior,Bachelor,Male,Remote,Q4-2022,47,40-49,4916,9.6,...
EMP0150950,Finland,Product,Mid,High School,Female,Full-time,Q1-2022,36,30-39,2960,6.4,...
```

---

## Stage 1 — File Upload

**File:** `frontend/src/components/upload-csv/index.jsx`

User drops or selects a `.csv`, `.data`, or `.txt` file. The component:

1. Validates file extension.
2. Sets `isLoading = true`, `uploadProgress = 0` in the store.
3. Calls `uploadCSV(file, onProgress)`.

What is passed forward — a native browser `File` object (not yet text):

```
File { name: "employee_survey_200k.csv", size: 28349210, type: "text/csv" }
```

---

## Stage 2 — PapaParse

**File:** `frontend/src/services/local-analytics/index.js`

PapaParse reads the `File` as a stream in `chunk` mode so large files do not freeze the browser. Progress is emitted on each chunk (capped at 90%), then 95% on complete.

**Config:**

| Option           | Value   | Effect                                              |
|------------------|---------|-----------------------------------------------------|
| `header`         | `true`  | First row becomes the key for every object          |
| `skipEmptyLines` | `true`  | Blank rows are dropped                              |
| `dynamicTyping`  | `false` | All values stay as **strings** — no auto-conversion |
| `chunk`          | fn      | Processes blocks, collects rows into array          |

**Output — `rows`: `Array<{ [columnName]: string }>`**

```json
[
  {
    "employee_id": "EMP0188825",
    "country": "Netherlands",
    "department": "Customer Success",
    "seniority_level": "Senior",
    "education_level": "Bachelor",
    "gender": "Male",
    "employment_type": "Remote",
    "quarter": "Q4-2022",
    "age": "47",
    "age_group": "40-49",
    "monthly_salary": "4916",
    "overall_satisfaction": "9.6",
    "turnover_risk_score": "1.7"
  },
  { "...row 2..." },
  { "...row 200000..." }
]
```
---

## Stage 3 — Global Formatter

**File:** `frontend/src/services/global-formatter/index.js`

`formatCSV(rows)` turns flat rows into a structured analytics model in three steps.

### 3a — Detect Dimensions (categorical columns)

Samples first 500 rows. A column is a **dimension** if:
- Less than 80% of its values parse as numbers.
- It has between **2 and 50 unique values**.

Sorted ascending by cardinality, max 4 kept:

```
["gender", "employment_type", "seniority_level", "education_level"]
    3 vals       4 vals              5 vals              5 vals
```

These become the **hierarchy levels** — Level 0, 1, 2, 3.

### 3b — Detect Metrics (numeric columns)

A column is a **metric** if ≥ 80% of sampled values parse as numbers:

```
["age", "years_at_company", "monthly_salary", "bonus_pct",
 "commute_time_min", "overall_satisfaction", "work_life_balance",
 "career_growth", "management_satisfaction", "team_collaboration",
 "compensation_satisfaction", "turnover_risk_score"]
```

The **first metric** (`monthly_salary`) becomes the primary chart value.

### 3c — Build Hierarchy Tree

Rows are grouped recursively by each dimension. For each group:
- `value` = **average** of the primary metric across rows in that group.
- `count` = number of rows in that group.
- `metrics` = average of every metric.
- `children` = sub-groups from the next dimension.

```json
{
  "name": "root",
  "value": 0,
  "count": 200000,
  "metrics": { "monthly_salary": 27431.22, "overall_satisfaction": 6.48 },
  "children": [
    {
      "name": "Male",
      "value": 27800.55,
      "count": 99543,
      "metrics": { "monthly_salary": 27800.55, "overall_satisfaction": 6.51 },
      "children": [
        {
          "name": "Full-time",
          "value": 28100.10,
          "count": 72100,
          "children": [
            {
              "name": "Senior",
              "value": 41200.00,
              "count": 18300,
              "children": [
                {
                  "name": "Bachelor",
                  "value": 39800.00,
                  "count": 9100,
                  "children": []
                }
              ]
            }
          ]
        }
      ]
    },
    { "name": "Female", "...": "..." },
    { "name": "Non-binary", "...": "..." }
  ]
}
```

### 3d — Final output of `formatCSV`

```json
{
  "tree": { "...full nested tree..." },
  "dimensions": ["gender", "employment_type", "seniority_level", "education_level"],
  "metrics": ["monthly_salary", "overall_satisfaction", "..."],
  "rows": [ "...all 200000 original parsed rows..." ]
}
```

> `rows` is kept alongside the tree because the **Scatter chart** bypasses the
> tree entirely and filters raw rows directly for x/y coordinate plotting.

---

## Stage 4 — Zustand Store

**Files:**
- `frontend/src/services/api/index.js`
- `frontend/src/store/features/data/index.js`
- `frontend/src/store/features/drill/index.js`
- `frontend/src/store/features/ui/index.js`

After `formatCSV`, three store writes happen in sequence:

```
store.setGlobalData(globalData)   → saves tree, dimensions, metrics, rows
store.setTotalRows(rows.length)   → saves 200000
store.resetDrill()                → clears drillPath to []
onProgress(100)                   → progress bar completes
```

**Full app state immediately after upload:**

```json
{
  "globalData": {
    "tree": { "..." : "..." },
    "dimensions": ["gender", "employment_type", "seniority_level", "education_level"],
    "metrics": ["monthly_salary", "overall_satisfaction", "..."],
    "rows": ["..."]
  },
  "totalRows": 200000,
  "drillPath": [],
  "chartTypeByDepth": {},
  "isLoading": false,
  "uploadProgress": 100
}
```

---

## Stage 5 — DrillDownRenderer

**File:** `frontend/src/libs/drill-down/ui/drill-down-renderer/index.jsx`

On every render the component derives what to show from state:

| Derived value     | Formula                                       | Value at depth 0 |
|-------------------|-----------------------------------------------|------------------|
| `chartType`       | `chartTypeByDepth[drillPath.length] ?? 'bar'` | `'bar'`          |
| `currentNode`     | `getNodeAtPath(tree, drillPath)`              | root node        |
| `atLeaf`          | `isLeaf(currentNode)`                         | `false`          |
| `currentColumn`   | `dimensions[drillPath.length]`                | `'gender'`       |
| `currentRowCount` | `currentNode.count`                           | `200000`         |

`formatForChart(currentNode, chartType, rows, drillPath, metrics)` from
`frontend/src/libs/drill-down/hooks/engine/index.js` maps the current node's
children into chart-ready objects:

```json
[
  { "name": "Male",       "value": 27800.55, "count": 99543 },
  { "name": "Female",     "value": 26900.12, "count": 91234 },
  { "name": "Non-binary", "value": 25100.88, "count": 9223  }
]
```

This array is passed as `data` to `<BarChart>`. Each item becomes one bar.

---

## Stage 6 — Chart Click

**Files:** `bar-chart`, `pie-chart`, `line-chart`, `scatter-chart` under `frontend/src/components/`

Each chart registers a native ECharts click listener via `onEvents`.

**How each chart extracts the clicked label:**

| Chart   | ECharts event property | Passed to callback |
|---------|------------------------|--------------------|
| Bar     | `p.name`               | category label     |
| Pie     | `p.name`               | slice label        |
| Line    | `p.name`               | point label        |
| Scatter | `p.seriesName`         | group/series name  |

Example: user clicks the **"Male"** bar.
- ECharts fires: `{ name: "Male", value: 27800.55, ... }`
- BarChart calls: `onBarClick("Male")`
- DrillDownRenderer receives: `handleClick("Male")`

---

## Stage 7 — drillInto

**File:** `frontend/src/libs/drill-down/ui/drill-down-renderer/index.jsx`

`handleClick` runs three guards before committing state:

```js
if (!atLeaf && name && currentColumn) drillInto(name, currentColumn)
```

| Guard           | Meaning                                          |
|-----------------|--------------------------------------------------|
| `!atLeaf`       | Current node has children — drilling is possible |
| `name`          | A real label was clicked, not empty              |
| `currentColumn` | A valid dimension exists at this depth           |

**File:** `frontend/src/store/features/drill/index.js`

`drillInto("Male", "gender")` appends one step to `drillPath`:

```js
drillPath: [...state.drillPath, { column: "gender", value: "Male" }]
```

**State after clicking "Male":**

```json
{
  "drillPath": [
    { "column": "gender", "value": "Male" }
  ]
}
```

---

## Stage 8 — Re-render

`drillPath` changed in the store, so DrillDownRenderer re-renders automatically.

**Everything recomputed at depth 1:**

| Derived value     | Before click      | After clicking "Male"               |
|-------------------|-------------------|-------------------------------------|
| `currentNode`     | root              | `root.children["Male"]`             |
| `atLeaf`          | `false`           | `false` (still has children)        |
| `currentColumn`   | `"gender"`        | `"employment_type"` (depth 1)       |
| `currentRowCount` | `200000`          | `99543`                             |
| chart data        | 3 gender groups   | employment types for Male rows only |

New chart data passed to BarChart:

```json
[
  { "name": "Full-time", "value": 28100.10, "count": 72100 },
  { "name": "Part-time", "value": 24300.55, "count": 15200 },
  { "name": "Remote",    "value": 31200.00, "count": 12243 }
]
```

Breadcrumb updates to:
```
All Data  ›  Male    (99,543 rows)
```

Floating badge shows: `LEVEL 1`

Each further click deepens the path:

```json
"drillPath": [
  { "column": "gender",          "value": "Male"     },
  { "column": "employment_type", "value": "Full-time" },
  { "column": "seniority_level", "value": "Senior"   }
]
```

---

## Stage 9 — Navigate Back

**File:** `frontend/src/libs/drill-down/ui/drill-down-breadcrumb/index.jsx`

Breadcrumb renders one button per step in `drillPath` plus a root "All Data" button.
Clicking any of them calls `drillBackTo(depth)`.

**File:** `frontend/src/store/features/drill/index.js`

`drillBackTo(depth)` slices `drillPath` back to that depth:

```js
drillPath: state.drillPath.slice(0, depth)
```

| User action                         | Calls                                     | Result                        |
|-------------------------------------|-------------------------------------------|-------------------------------|
| Click "All Data"                    | `drillBackTo(0)`                          | `drillPath = []`              |
| Click "Male" in breadcrumb (step 1) | `drillBackTo(1)`                          | keeps only first step         |
| Click Back button                   | `drillBackTo(drillPath.length - 1)`       | one step up                   |

---

## End-to-End Shape Summary

```
RAW CSV TEXT  (flat string, no types)
  ↓  PapaParse — local-analytics/index.js
ROWS: Array<{ [columnName]: string }>
  All values are strings. 200,000 objects.

  ↓  formatCSV — global-formatter/index.js
GLOBAL DATA: {
  tree:       nested nodes grouped by dimension (built once),
  dimensions: string[]    ← up to 4 drill levels,
  metrics:    string[]    ← numeric columns for chart values,
  rows:       original rows kept for scatter chart
}

  ↓  store.setGlobalData + resetDrill — api/index.js
ZUSTAND STATE: {
  globalData,
  totalRows:        200000,
  drillPath:        [],     ← starts empty, grows with each click
  chartTypeByDepth: {}
}

  ↓  DrillDownRenderer derives chart data — engine/index.js
CHART DATA: Array<{ name, value, count }>
  One item per bar / slice / point.

  ↓  ECharts renders → user clicks bar "Male"
CLICK: p.name = "Male"

  ↓  handleClick → drillInto — drill-down-renderer + drill store
DRILL STEP appended: { column: "gender", value: "Male" }

  ↓  drillPath mutated in store → component re-renders
NEW CHART DATA: children of "Male" node, grouped by next dimension

  ↓  repeat until isLeaf === true
LEAF: no children → click guard blocks → analysis complete
     user navigates back via breadcrumb / Back button
```

> **Core design principle:** The tree is built **once** at upload time.
> Every click only mutates `drillPath` — a lightweight array of steps.
> All navigation is instant: no API calls, no re-parsing.
