import json

with open(r'C:\Users\Yash Ola\Downloads\playground-config-2026-10-01.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

messages = data.get('messages', [])
print(f'Total messages: {len(messages)}')
total_chars = sum(len(m.get('content', '')) for m in messages)
print(f'Total content chars: {total_chars}')

for i, m in enumerate(messages):
    print(f"Message {i}: {m.get('role')} - {len(m.get('content', ''))} chars")
