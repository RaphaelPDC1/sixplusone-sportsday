with open('server/_core/klaviyo.ts', 'r') as f:
    content = f.read()

# Remove duplicate lines
lines = content.split('\n')
new_lines = []
skip_until_next_func = False
for i, line in enumerate(lines):
    if skip_until_next_func:
        if line.strip().startswith('/**') and i > 0:
            skip_until_next_func = False
        else:
            continue
    
    # Check for duplicate closing braces
    if line.strip() == '}' and i > 0 and lines[i-1].strip() == '}':
        # Skip this duplicate
        continue
    
    new_lines.append(line)

with open('server/_core/klaviyo.ts', 'w') as f:
    f.write('\n'.join(new_lines))

print("✅ Fixed duplicate code")
