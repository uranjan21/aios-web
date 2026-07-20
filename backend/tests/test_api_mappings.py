import os
import re
import inspect
from pathlib import Path
import pytest
from fastapi.routing import APIRoute
from starlette.routing import Route, WebSocketRoute

from app.main import app

def normalize_path(path: str, is_frontend: bool = False) -> str:
    # 1. Strip query string if present
    path = path.split('?')[0]
    # 2. Normalize path parameters: replace ${...} or {...} with {}
    path = re.sub(r'\$\{[^}]+\}', '{}', path)
    path = re.sub(r'\{[^}]+\}', '{}', path)
    # 3. Add /api prefix for frontend routes if they don't have it and are not WebSockets
    if is_frontend:
        if not path.startswith('/ws/'):
            if not path.startswith('/api/'):
                if path.startswith('/'):
                    path = '/api' + path
                else:
                    path = '/api/' + path
    # Remove trailing slashes (except for root path)
    if path.endswith('/') and len(path) > 1:
        path = path[:-1]
    return path

def parse_frontend_file(file_content: str):
    endpoints = []
    # Find all api.<method>
    pos = 0
    while True:
        match = re.search(r'api\.(get|post|put|patch|delete)\b', file_content[pos:])
        if not match:
            break
        
        method = match.group(1)
        api_idx = pos + match.start()
        
        # 1. Walk forwards to find the call arguments
        call_end = -1
        call_start = api_idx + len("api.") + len(method)
        # Find the first '(' after api.method
        first_paren = file_content.find('(', call_start)
        if first_paren == -1:
            pos = call_start
            continue
            
        paren_count = 1
        for i in range(first_paren + 1, len(file_content)):
            char = file_content[i]
            if char == '(':
                paren_count += 1
            elif char == ')':
                paren_count -= 1
                if paren_count == 0:
                    call_end = i
                    break
        
        if call_end == -1:
            pos = call_start
            continue
            
        call_args_str = file_content[first_paren + 1 : call_end]
        
        # 2. Walk backwards to find the function name and arguments
        arrow_idx = file_content.rfind('=>', 0, api_idx)
        func_name = None
        func_args = ""
        if arrow_idx != -1 and api_idx - arrow_idx < 120:
            close_paren_idx = file_content.rfind(')', 0, arrow_idx)
            if close_paren_idx != -1:
                paren_count = 1
                open_paren_idx = -1
                for i in range(close_paren_idx - 1, -1, -1):
                    char = file_content[i]
                    if char == ')':
                        paren_count += 1
                    elif char == '(':
                        paren_count -= 1
                        if paren_count == 0:
                            open_paren_idx = i
                            break
                if open_paren_idx != -1:
                    func_args = file_content[open_paren_idx + 1 : close_paren_idx]
                    colon_idx = file_content.rfind(':', 0, open_paren_idx)
                    if colon_idx != -1:
                        # Extract the word right before colon
                        words = re.findall(r'\b[a-zA-Z0-9_]+\b', file_content[0:colon_idx])
                        if words:
                            func_name = words[-1]
                            
        # Parse path
        path_match = re.search(r'([`\'"])(.*?)\1', call_args_str, re.DOTALL)
        path = ""
        payload = ""
        if path_match:
            path = path_match.group(2).strip()
            remaining = call_args_str[path_match.end():].strip()
            if remaining.startswith(','):
                payload = remaining[1:].strip()
                
        endpoints.append({
            'func_name': func_name,
            'func_args': func_args,
            'method': method.upper(),
            'path': path,
            'payload': payload
        })
        
        pos = call_end + 1
        
    # Find WebSocket routes
    ws_matches = re.finditer(r'new\s+WebSocket\(\s*[`\'"](?:[^`\'"]*?)(/ws/[a-zA-Z0-9_-]+)', file_content)
    for m in ws_matches:
        endpoints.append({
            'func_name': 'ws_connection',
            'func_args': '',
            'method': 'WEBSOCKET',
            'path': m.group(1),
            'payload': ''
        })
        
    return endpoints

def extract_query_params_from_ts_args(func_args: str) -> list:
    braces_match = re.search(r'\{\s*([^}]+)\s*\}', func_args)
    if braces_match:
        content = braces_match.group(1)
        keys = []
        for item in re.split(r'[;,]', content):
            if ':' in item:
                key = item.split(':')[0].strip().replace('?', '')
                if key:
                    keys.append(key)
        return keys
    else:
        keys = []
        for item in func_args.split(','):
            if ':' in item:
                key = item.split(':')[0].strip().replace('?', '')
                if key:
                    keys.append(key)
            elif '=' in item:
                key = item.split('=')[0].strip()
                if key:
                    keys.append(key)
        return keys

def get_route_params(route):
    path_params = []
    query_params = []
    body_params = []
    
    # 1. Try route.dependant
    if hasattr(route, 'dependant') and route.dependant is not None:
        try:
            path_params = [p.name for p in route.dependant.path_params]
            query_params = [q.name for q in route.dependant.query_params]
            body_params = [b.name for b in route.dependant.body_params]
            return path_params, query_params, body_params
        except Exception:
            pass
            
    # 2. Fallback to inspect.signature
    if hasattr(route, 'endpoint') and route.endpoint is not None:
        try:
            sig = inspect.signature(route.endpoint)
            path_vars = re.findall(r'\{([^}]+)\}', route.path)
            for name, param in sig.parameters.items():
                default = param.default
                from fastapi.params import Depends, Body
                if isinstance(default, Depends) or 'Depends' in str(default):
                    continue
                if name in path_vars:
                    path_params.append(name)
                elif isinstance(default, Body) or 'Body' in str(default):
                    body_params.append(name)
                elif param.annotation not in (inspect.Parameter.empty, str, int, float, bool, None) and hasattr(param.annotation, 'model_fields'):
                    body_params.append(name)
                else:
                    if name not in ('db', 'current_user', 'settings', 'user', 'token', 'request', 'websocket'):
                        query_params.append(name)
        except Exception:
            pass
            
    return path_params, query_params, body_params

def strip_comments(text: str) -> str:
    # Remove block comments: /* ... */
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
    # Remove single line comments: // ... (make sure not to remove :// from URLs)
    lines = []
    for line in text.splitlines():
        # Match // not preceded by :
        clean_line = re.sub(r'(?<!:)\/\/.*', '', line)
        lines.append(clean_line)
    return '\n'.join(lines)


def get_frontend_endpoints():
    # Monorepo layout: frontend source lives in the shell/domain apps + shared package.
    repo_root = Path(__file__).parent.parent.parent
    src_dirs = [p / "src" for p in (repo_root / "apps").iterdir() if (p / "src").is_dir()]
    src_dirs.append(repo_root / "packages/shared/src")
    endpoints = []
    for base_dir in src_dirs:
        for root, _, files in os.walk(base_dir):
            for file in files:
                if file.endswith(('.ts', '.tsx')):
                    file_path = Path(root) / file
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    clean_content = strip_comments(content)
                    file_endpoints = parse_frontend_file(clean_content)
                    for ep in file_endpoints:
                        ep['file'] = str(file_path.relative_to(repo_root))
                        endpoints.append(ep)
    return endpoints

def test_api_mappings():
    frontend_endpoints = get_frontend_endpoints()
    assert len(frontend_endpoints) > 0, "No frontend endpoints found. Check frontend path."

    # Index backend routes
    backend_routes = {}
    for route in app.routes:
        if isinstance(route, Route):
            for method in route.methods:
                norm_path = normalize_path(route.path)
                backend_routes[(method.upper(), norm_path)] = route
        elif isinstance(route, WebSocketRoute):
            norm_path = normalize_path(route.path)
            backend_routes[("WEBSOCKET", norm_path)] = route

    errors = []
    matched_backend_routes = set()

    for ep in frontend_endpoints:
        method = ep['method']
        raw_path = ep['path']
        norm_path = normalize_path(raw_path, is_frontend=True)
        
        # Check matching route
        key = (method, norm_path)
        if key not in backend_routes:
            # Special case for some routes or parameters
            errors.append(f"No backend route found for {method} {norm_path} (raw: {raw_path}) in {ep['file']}")
            continue
            
        matched_backend_routes.add(key)
        route = backend_routes[key]
        
        # Verify signature
        if method == "WEBSOCKET":
            continue
            
        b_path_params, b_query_params, b_body_params = get_route_params(route)
        
        # 1. Path parameters matching
        # Count parameter placeholders
        f_param_count = raw_path.count('${')
        b_param_count = len(b_path_params)
        if f_param_count != b_param_count:
            errors.append(
                f"Path parameter mismatch for {method} {raw_path} in {ep['file']}: "
                f"Frontend uses {f_param_count} params, Backend expects {b_param_count} ({b_path_params})"
            )
            
        # 2. Body parameters matching
        # If backend expects body parameters, frontend should pass a payload
        if b_body_params and not ep['payload']:
            # Exception: some delete or get requests shouldn't have body, but let's check
            errors.append(
                f"Body parameter mismatch for {method} {raw_path} in {ep['file']}: "
                f"Backend expects body fields {b_body_params}, but frontend payload is empty."
            )
            
        # 3. Query parameters matching
        # If frontend passes query params, check that backend supports them (if we can parse them)
        if 'params' in ep['payload']:
            f_query_params = []
            param_var_match = re.search(r'params\s*:\s*([a-zA-Z0-9_]+)\b', ep['payload'])
            if param_var_match and param_var_match.group(1) not in ('undefined', 'null', 'true', 'false'):
                var_name = param_var_match.group(1)
                # Check if this variable name is defined as an inline object type in func_args
                var_type_match = re.search(r'\b' + var_name + r'\s*:\s*\{\s*([^}]+)\s*\}', ep['func_args'])
                if var_type_match:
                    content = var_type_match.group(1)
                    for item in re.split(r'[;,]', content):
                        if ':' in item:
                            key_param = item.split(':')[0].strip().replace('?', '')
                            if key_param:
                                f_query_params.append(key_param)
                else:
                    # `params: <var>` where <var> is typed by a *named* interface
                    # (e.g. `filters: ContentItemFilters`) — its keys aren't inline,
                    # so we can't statically resolve them. Skip rather than mistake
                    # the argument name for a query param (per "if we can parse them").
                    f_query_params = []
            else:
                match = re.search(r'params\s*:\s*\{\s*([^}]+)\s*\}', ep['payload'])
                if match:
                    f_query_params = [p.split(':')[0].strip() for p in match.group(1).split(',') if p.strip()]
            
            # Check if frontend parameters are present in backend query parameters
            for fp in f_query_params:
                # Skip pagination defaults/customs or optional client-only stuff if any
                if fp not in b_query_params:
                    errors.append(
                        f"Query parameter mismatch for {method} {raw_path} in {ep['file']}: "
                        f"Frontend sends query param '{fp}', but Backend only supports {b_query_params}"
                    )

    # Two-way check: verify that all backend routes are mapped in the frontend
    # Exclude default/automated routes (docs, redoc, openapi.json) and known unmapped routes
    unmapped_backend_routes = []
    ignored_routes = {
        ("POST", "/api/sync/force"),
        ("GET", "/api/sync/conflicts"),
        ("POST", "/api/sync/conflicts/{}/resolve"),
        ("GET", "/health"),
        # Called inline from pages (LoginPage), not via an api/ module, so the
        # mapping scanner doesn't see them. signup UI shipped (M3); profile +
        # change-password screens still pending.
        ("POST", "/api/auth/signup"),
        ("PATCH", "/api/auth/profile"),
        ("POST", "/api/auth/change-password"),
        # Stripe calls this server-to-server; never a frontend caller.
        ("POST", "/api/billing/webhook"),
    }
    for key, route in backend_routes.items():
        method, path = key
        # Skip automatic OpenAPI/Docs routes
        if path in ("/openapi.json", "/docs", "/redoc", "/docs/oauth2-redirect"):
            continue
        # Skip websocket/ignored routes
        if key in ignored_routes:
            continue
        if key not in matched_backend_routes:
            unmapped_backend_routes.append(f"Unmapped backend route: {method} {path}")

    if unmapped_backend_routes:
        errors.extend(unmapped_backend_routes)

    if errors:
        pytest.fail("\n".join(errors))
