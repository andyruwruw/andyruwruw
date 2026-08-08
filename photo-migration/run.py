#!/usr/bin/env python3
"""Launch the API + frontend.

    python run.py            # http://127.0.0.1:8000
    PM_PORT=9000 python run.py
"""

import os

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.api:app",
        host=os.environ.get("PM_HOST", "127.0.0.1"),
        port=int(os.environ.get("PM_PORT", "8000")),
        reload=False,
    )
