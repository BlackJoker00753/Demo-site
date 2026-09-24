import os
import tempfile
from pathlib import Path

import pytest

# Тесты работают на отдельной временной базе, собранной из настоящего контента.
_TMP = Path(tempfile.mkdtemp(prefix="horologium-test-"))
os.environ["HOROLOGIUM_DB"] = str(_TMP / "test.sqlite3")


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient

    from horologium.db.build import ensure_database
    from horologium.main import app

    ensure_database(force=True)
    with TestClient(app) as c:
        yield c
