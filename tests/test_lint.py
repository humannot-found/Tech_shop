"""A name used but never imported only fails at the moment that line of code
actually runs, which a mocked-out unit test can sail past. This caught a real
bug (list_available_parts in services/repairs.py referenced Product without
importing it) that a full test suite still passed, because the test that
exercises that endpoint mocks the service function it lives in.
"""

import ast
from pathlib import Path

from pyflakes import messages as pyflakes_messages
from pyflakes.checker import Checker

BACKEND_ROOT = Path(__file__).resolve().parent.parent / "backend"

# Message classes worth failing the build over: names that don't exist at all.
# Unused imports/variables are noisy and harmless, so they're left to the
# editor rather than enforced here.
FATAL_MESSAGE_TYPES = (
    pyflakes_messages.UndefinedName,
    pyflakes_messages.UndefinedExport,
    pyflakes_messages.UndefinedLocal,
)


def _iter_python_files():
    for path in BACKEND_ROOT.rglob("*.py"):
        if "__pycache__" in path.parts:
            continue
        yield path


def test_backend_has_no_undefined_names() -> None:
    failures = []
    for path in _iter_python_files():
        source = path.read_text(encoding="utf-8")
        try:
            tree = ast.parse(source, filename=str(path))
        except SyntaxError as exc:
            failures.append(f"{path}: {exc}")
            continue
        checker = Checker(tree, filename=str(path))
        for message in checker.messages:
            if isinstance(message, FATAL_MESSAGE_TYPES):
                failures.append(str(message))
    assert not failures, "undefined names found:\n" + "\n".join(failures)
