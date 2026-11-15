"""Restore the complete text source in ORBITAL_COMPLETE_SOURCE_PROMPT.md."""
import argparse, hashlib, json, pathlib, re, shutil

def parse(prompt):
    with pathlib.Path(prompt).open(encoding='utf-8', newline='') as stream:
        text = stream.read()
    files = []
    pattern = r'^<!-- ORBITAL_FILE ([^\n]+) -->\n(`{5,})[^\n]*\n(.*?)\n\2\n<!-- ORBITAL_END -->'
    for match in re.finditer(pattern, text, re.S | re.M):
        meta = json.loads(match[1]); content = match[3]
        raw = content.encode('utf-8')
        if hashlib.sha256(raw).hexdigest() != meta['sha256']:
            raise ValueError('Damaged source block: ' + meta['path'])
        files.append((meta['path'], raw))
    assets = json.loads(re.search(r'<!-- ORBITAL_ASSETS -->\n```json\n(.*?)\n```', text, re.S)[1])
    if not files: raise ValueError('No source blocks found')
    return files, assets

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('prompt'); p.add_argument('destination'); p.add_argument('--copy-assets', action='store_true')
    args = p.parse_args(); root = pathlib.Path(args.destination).resolve()
    if root.exists() and any(root.iterdir()): raise SystemExit('Use a new empty destination; existing projects are never overwritten.')
    files, assets = parse(args.prompt)
    def safe(relative):
        target = (root / relative).resolve()
        if not target.is_relative_to(root): raise ValueError('Path escapes destination')
        return target
    # Validate every requested binary before writing anything.
    if args.copy_assets:
        for asset in assets:
            source = pathlib.Path(asset['source'])
            if not source.is_file() or hashlib.sha256(source.read_bytes()).hexdigest() != asset['sha256']:
                raise ValueError('Missing or changed asset: ' + str(source))
    for name, raw in files:
        target = safe(name); target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(raw)
    if args.copy_assets:
        for asset in assets:
            target = safe(asset['path']); target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(asset['source'], target)
    (root / 'BINARY_ASSETS.json').write_text(json.dumps(assets, indent=2), encoding='utf-8')
    print(f'Restored {len(files)} text files; {len(assets)} binary assets ' + ('copied and verified.' if args.copy_assets else 'listed in BINARY_ASSETS.json.'))

if __name__ == '__main__': main()
