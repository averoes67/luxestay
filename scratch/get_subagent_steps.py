import json

transcript_path = r"C:\Users\LEGION 5 PRO\.gemini\antigravity-ide\brain\fe51bc35-9de0-4060-b9db-3ba60ae70f6f\.system_generated\logs\transcript_full.jsonl"
out_path = r"C:\Users\LEGION 5 PRO\.gemini\antigravity-ide\brain\fe51bc35-9de0-4060-b9db-3ba60ae70f6f\scratch\subagent_report.txt"

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if data.get("step_index") == 118:
            content = data.get("content", "")
            with open(out_path, 'w', encoding='utf-8') as out_f:
                out_f.write(content)
            print("Wrote subagent report to scratch/subagent_report.txt")
            break
