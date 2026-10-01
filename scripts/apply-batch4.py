import re
import os

def apply_batch():
    with open(r'C:\Trading Bot\Trial Scripts\batch4-2.txt', 'r', encoding='utf-8') as f:
        content = f.read()

    # Modified regex to handle "Create or replace"
    pattern = re.compile(r'###? \d*\.?\s*(?:Create|Replace|Update|Create or replace) `([^`]+)`\n.*?(?:```(?:ts|tsx|sql|css)\n)(.*?)(?:```)', re.DOTALL | re.IGNORECASE)
    
    matches = pattern.findall(content)
    
    print(f"Found {len(matches)} files to update.")
    
    for filename, code in matches:
        filepath = os.path.join(r'C:\Users\Yash Ola\cipher-lab', filename.strip())
        
        # Ensure directories exist
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        with open(filepath, 'w', encoding='utf-8') as out_f:
            out_f.write(code.strip() + '\n')
        
        print(f"Wrote {filepath}")

if __name__ == '__main__':
    apply_batch()
