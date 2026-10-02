import os

def extract_files(input_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    current_file = None
    current_content = []
    in_code_block = False
    
    for line in lines:
        if line.startswith("## ") and "`" in line:
            # Extract filename
            parts = line.split("`")
            if len(parts) >= 3:
                # Save previous file
                if current_file and current_content:
                    save_file(current_file, current_content)
                
                filename = parts[1]
                if filename == "migrations/004_homework_base_xp.sql":
                    filename = "migrations/005_homework_base_xp.sql"
                
                current_file = filename
                current_content = []
                in_code_block = False
                continue
                
        if current_file:
            if line.startswith("```"):
                if not in_code_block:
                    in_code_block = True
                    continue
                else:
                    in_code_block = False
                    # End of file
                    save_file(current_file, current_content)
                    current_file = None
                    current_content = []
                    continue
            
            if in_code_block:
                current_content.append(line)

def save_file(filepath, content):
    filepath = filepath.replace('/', os.sep)
    print(f"Writing {filepath}...")
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(content)

import sys

if __name__ == "__main__":
    if len(sys.argv) > 1:
        extract_files(sys.argv[1])
    else:
        extract_files(r"C:\Trading Bot\Trial Scripts\batch7.txt")
