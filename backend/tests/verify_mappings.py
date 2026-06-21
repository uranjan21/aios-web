import os
import re
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from fastapi.routing import APIRoute
from starlette.routing import Route, WebSocketRoute
from tests.test_api_mappings import normalize_path, get_frontend_endpoints, get_route_params

def main():
    frontend_endpoints = get_frontend_endpoints()
    print(f"Loaded {len(frontend_endpoints)} frontend endpoints.")

    backend_routes = {}
    for route in app.routes:
        if isinstance(route, Route):
            for method in route.methods:
                norm_path = normalize_path(route.path)
                backend_routes[(method.upper(), norm_path)] = route
        elif isinstance(route, WebSocketRoute):
            norm_path = normalize_path(route.path)
            backend_routes[("WEBSOCKET", norm_path)] = route

    print(f"Loaded {len(backend_routes)} backend routes.")

    errors = []
    matched_backend_routes = set()

    for ep in frontend_endpoints:
        method = ep['method']
        raw_path = ep['path']
        norm_path = normalize_path(raw_path, is_frontend=True)
        
        key = (method, norm_path)
        if key not in backend_routes:
            errors.append(f"No backend route found for {method} {norm_path} (raw: {raw_path}) in {ep['file']}")
            continue
            
        matched_backend_routes.add(key)
        route = backend_routes[key]
        
        if method == "WEBSOCKET":
            continue
            
        b_path_params, b_query_params, b_body_params = get_route_params(route)
        
        # 1. Path parameters matching
        f_param_count = raw_path.count('${')
        b_param_count = len(b_path_params)
        if f_param_count != b_param_count:
            errors.append(
                f"Path parameter mismatch for {method} {raw_path} in {ep['file']}: "
                f"Frontend uses {f_param_count} params, Backend expects {b_param_count} ({b_path_params})"
            )
            
        # 2. Body parameters matching
        if b_body_params and not ep['payload']:
            errors.append(
                f"Body parameter mismatch for {method} {raw_path} in {ep['file']}: "
                f"Backend expects body fields {b_body_params}, but frontend payload is empty."
            )

    unmapped_backend_routes = []
    ignored_routes = {
        ("POST", "/api/sync/force"),
        ("GET", "/api/sync/conflicts"),
        ("POST", "/api/sync/conflicts/{}/resolve"),
    }
    for key, route in backend_routes.items():
        method, path = key
        if path in ("/openapi.json", "/docs", "/redoc"):
            continue
        if key in ignored_routes:
            continue
        if key not in matched_backend_routes:
            unmapped_backend_routes.append(f"Unmapped backend route: {method} {path}")

    print("\n--- MATCHED ROUTES ---")
    for key in sorted(matched_backend_routes):
        print(f"Matched: {key[0]} {key[1]}")

    print("\n--- UNMAPPED BACKEND ROUTES ---")
    for ur in sorted(unmapped_backend_routes):
        print(ur)

    print("\n--- ERRORS ---")
    for err in errors:
        print(err)

if __name__ == "__main__":
    main()
