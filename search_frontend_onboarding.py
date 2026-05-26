import os

keywords = ['onboarding', 'fiscal/onboarding', 'sync-issuer', 'sync-cert', 'config/validate']
exclude_dirs = ['node_modules', '.git', 'dist', '__pycache__']

def search_files(directory):
    for root, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for f in files:
            if f.endswith(('.ts', '.tsx', '.js', '.jsx', '.json')):
                filepath = os.path.join(root, f)
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as file:
                        content = file.read()
                        if any(kw in content.lower() for kw in keywords):
                            print(f"Found match: {filepath}")
                except Exception as e:
                    print(f"Error reading {filepath}: {e}")

if __name__ == '__main__':
    search_files('.')
