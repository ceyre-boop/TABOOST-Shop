import os
import json
import base64
import urllib.request
from urllib.error import HTTPError

token = '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'
owner = 'ceyre-boop'
repo = 'TABOOST-Shop'
branch = 'main'

ignored_paths = ['.git', '.github', 'node_modules', 'react-dashboard', '.DS_Store', '.gemini', 'github-deploy.js', 'github_deploy.py']

def get_all_files(dir_path):
    file_list = []
    for root, dirs, files in os.walk(dir_path):
        dirs[:] = [d for d in dirs if not any(ign in d for ign in ignored_paths)]
        for file in files:
            if any(ign in file for ign in ignored_paths): continue
            file_list.append(os.path.join(root, file))
    return file_list

def github_fetch(url, method='GET', body=None):
    headers = {
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Python-Deploy-Script'
    }
    data = json.dumps(body).encode('utf-8') if body else None
    if body:
        headers['Content-Type'] = 'application/json'
        
    req = urllib.request.Request(f'https://api.github.com{url}', data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except HTTPError as e:
        err_msg = e.read().decode()
        print(f"Error {e.code} on {method} {url}: {err_msg}")
        raise

def deploy():
    print('Scanning files...')
    files = get_all_files('.')
    print(f'Found {len(files)} files to upload.')
    
    base_tree_sha = None
    parent_commit_sha = None
    
    try:
        ref_data = github_fetch(f'/repos/{owner}/{repo}/git/refs/heads/{branch}')
        parent_commit_sha = ref_data['object']['sha']
        commit_data = github_fetch(f'/repos/{owner}/{repo}/git/commits/{parent_commit_sha}')
        base_tree_sha = commit_data['tree']['sha']
        print(f'[INFO] Found existing branch {branch}. Base tree: {base_tree_sha}')
    except HTTPError as e:
        if e.code == 404:
            print(f'[INFO] Branch {branch} not found. Assuming empty repository.')
        else:
            raise
            
    tree = []
    count = 0
    for file_path in files:
        count += 1
        print(f'[{count}/{len(files)}] Generating blob for {file_path}...')
        with open(file_path, 'rb') as f:
            content = f.read()
        
        base64_content = base64.b64encode(content).decode('utf-8')
        
        blob_data = github_fetch(f'/repos/{owner}/{repo}/git/blobs', 'POST', {
            'content': base64_content,
            'encoding': 'base64'
        })
        
        gh_path = file_path.replace('\\', '/')
        if gh_path.startswith('./'):
            gh_path = gh_path[2:]
            
        tree.append({
            'path': gh_path,
            'mode': '100644',
            'type': 'blob',
            'sha': blob_data['sha']
        })
        
    print('\\n[INFO] Creating comprehensive tree matrix...')
    tree_payload = {'tree': tree}
    if base_tree_sha:
        tree_payload['base_tree'] = base_tree_sha
        
    tree_data = github_fetch(f'/repos/{owner}/{repo}/git/trees', 'POST', tree_payload)
    
    print('[INFO] Finalizing commit signature...')
    commit_payload = {
        'message': 'Fix final Dashboard bugs: calendar, manager badge, TAP goals, member since',
        'tree': tree_data['sha']
    }
    if parent_commit_sha:
        commit_payload['parents'] = [parent_commit_sha]
        
    commit_result = github_fetch(f'/repos/{owner}/{repo}/git/commits', 'POST', commit_payload)
    
    print('[INFO] Synchronizing main ref...')
    if parent_commit_sha:
        github_fetch(f'/repos/{owner}/{repo}/git/refs/heads/{branch}', 'PATCH', {
            'sha': commit_result['sha'],
            'force': True
        })
    else:
        github_fetch(f'/repos/{owner}/{repo}/git/refs', 'POST', {
            'ref': f'refs/heads/{branch}',
            'sha': commit_result['sha']
        })
        
    print('\\n✅ SECURE DEPLOYMENT SUCCESSFUL! Codebase is LIVE on ceyre-boop/TABOOST-Shop')

if __name__ == '__main__':
    deploy()
