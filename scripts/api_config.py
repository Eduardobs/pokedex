"""Shared PokéAPI REST configuration for fixture refresh scripts.

Export VITE_POKEAPI_REST_URL to override the application default.
"""
import json
import os
from pathlib import Path
from urllib.parse import urlsplit


def rest_api_url():
    defaults = json.loads(
        (Path(__file__).resolve().parents[1] / 'src/config/api-defaults.json').read_text()
    )
    url = os.environ.get('VITE_POKEAPI_REST_URL', '').strip() or defaults['restUrl']
    parsed = urlsplit(url)
    if (parsed.scheme != 'https' or not parsed.hostname or parsed.username
            or parsed.password or parsed.query or parsed.fragment):
        raise ValueError('VITE_POKEAPI_REST_URL must be an absolute HTTPS URL without credentials, query, or fragment')
    return url.rstrip('/')
