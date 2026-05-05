import csv
import os

SRC = os.path.join('frontend', 'src', 'constants', 'csv', 'employee_survey_200k.csv')
OUT = os.path.join('frontend', 'src', 'constants', 'csv', 'employee_survey_500k.csv')
TARGET = 500_000

def is_number(s):
    try:
        float(s)
        return True
    except:
        return False

with open(SRC, newline='', encoding='utf-8') as f_in:
    reader = csv.DictReader(f_in)
    header = reader.fieldnames
    src_rows = [row for row in reader]

n_src = len(src_rows)
if n_src == 0:
    raise SystemExit('Source CSV appears empty')

with open(OUT, 'w', newline='', encoding='utf-8') as f_out:
    writer = csv.DictWriter(f_out, fieldnames=header)
    writer.writeheader()

    for i in range(TARGET):
        base = src_rows[i % n_src]
        new = base.copy()

        # make a unique employee_id
        new['employee_id'] = f"EMP{1000000 + i:07d}"

        # small deterministic variation based on repetition index
        repeat_idx = (i // n_src) % 21  # 0..20
        small_pct = (repeat_idx - 10) / 100.0  # -0.10 .. +0.10

        for k, v in base.items():
            if k == 'employee_id':
                continue
            if is_number(v):
                try:
                    num = float(v)
                except:
                    continue
                varied = num * (1.0 + small_pct)
                # keep integer-looking values as ints
                if v.isdigit():
                    new[k] = str(int(round(varied)))
                else:
                    # preserve one or two decimals reasonably
                    if '.' in v:
                        # decide decimals from original
                        decs = len(v.split('.')[-1])
                        decs = min(max(decs,1),3)
                        fmt = f"{{:.{decs}f}}"
                        new[k] = fmt.format(varied)
                    else:
                        new[k] = str(int(round(varied)))
            else:
                # keep categorical/text columns the same
                new[k] = v

        writer.writerow(new)

        if (i+1) % 50000 == 0:
            print(f'Wrote {i+1} rows...')

print('Generation complete:', OUT)
print('Source rows:', n_src)
print('Target rows:', TARGET)
