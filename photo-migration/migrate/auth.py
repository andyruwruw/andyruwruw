"""OAuth handling for Drive + Photos.

Runs the installed-app OAuth flow the first time, caches the token, and
refreshes it automatically thereafter. Returns both a Drive API client
and an authorized :class:`requests.Session` for the Photos upload calls.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from google.auth.transport.requests import AuthorizedSession, Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

from . import config


@dataclass
class Clients:
    """Bundle of authorized clients used across the pipeline."""

    drive: object  # googleapiclient Resource
    photos: AuthorizedSession


def _load_or_authorize(client_secret: str, token_file: str) -> Credentials:
    creds: Credentials | None = None

    if os.path.exists(token_file):
        creds = Credentials.from_authorized_user_file(token_file, config.SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(client_secret):
                raise FileNotFoundError(
                    f"OAuth client secret not found at '{client_secret}'. "
                    "Download it from the Google Cloud Console (OAuth client "
                    "of type 'Desktop app') and point --client-secret at it."
                )
            flow = InstalledAppFlow.from_client_secrets_file(client_secret, config.SCOPES)
            # Opens a browser / prints a URL for consent.
            creds = flow.run_local_server(port=0)

        with open(token_file, "w", encoding="utf-8") as handle:
            handle.write(creds.to_json())

    return creds


def get_clients(
    client_secret: str = config.DEFAULT_CLIENT_SECRET,
    token_file: str = config.DEFAULT_TOKEN_FILE,
) -> Clients:
    """Authorize once and return Drive + Photos clients."""
    creds = _load_or_authorize(client_secret, token_file)
    drive = build("drive", "v3", credentials=creds, cache_discovery=False)
    photos = AuthorizedSession(creds)
    return Clients(drive=drive, photos=photos)
