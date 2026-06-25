# /// script
# requires-python = ">=3.9"
# dependencies = [
#   "presidio-analyzer",
#   "presidio-anonymizer",
#   "spacy",
#   "click",
#   "en_core_web_lg @ https://github.com/explosion/spacy-models/releases/download/en_core_web_lg-3.8.0/en_core_web_lg-3.8.0-py3-none-any.whl",
# ]
# ///
"""
claude-mem Presidio anonymizer sidecar.

A long-lived JSON-lines service over stdin/stdout, spawned by PresidioManager.ts
via `uv run`. It performs the OPTIONAL ML PII pass for the redaction layer.

Protocol (one JSON object per line):
  in : {"id": <int>, "text": <str>, "entities": [<str>...], "threshold": <float>}
  out: {"id": <int>, "text": <anonymized str>, "counts": {"PERSON": 2, ...}}

On startup, prints {"ready": true} once the models are loaded.
On a per-request error, returns the ORIGINAL text plus an "error" field — it never
emits the matched values. Counts only; never logs the input text.
"""

import json
import sys


def _emit(obj):
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()


def main():
    try:
        from presidio_analyzer import AnalyzerEngine
        from presidio_anonymizer import AnonymizerEngine
        from presidio_anonymizer.entities import OperatorConfig
    except Exception as exc:  # import / install failure
        _emit({"ready": False, "error": f"import failed: {type(exc).__name__}"})
        return

    try:
        analyzer = AnalyzerEngine()
        anonymizer = AnonymizerEngine()
    except Exception as exc:
        _emit({"ready": False, "error": f"engine init failed: {type(exc).__name__}"})
        return

    _emit({"ready": True})

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        req_id = None
        try:
            req = json.loads(line)
            req_id = req.get("id")
            text = req.get("text", "")
            entities = req.get("entities")
            threshold = float(req.get("threshold", 0.5))

            # An explicit empty list means "redact no ML entities" (operator
            # narrowed the set to nothing); only an ABSENT key means "all".
            if entities is not None and len(entities) == 0:
                _emit({"id": req_id, "text": text, "counts": {}})
                continue

            results = analyzer.analyze(text=text, entities=entities, language="en")
            results = [r for r in results if r.score >= threshold]

            counts = {}
            operators = {}
            for r in results:
                counts[r.entity_type] = counts.get(r.entity_type, 0) + 1
                operators[r.entity_type] = OperatorConfig(
                    "replace", {"new_value": f"[REDACTED:{r.entity_type}]"}
                )

            anonymized = anonymizer.anonymize(
                text=text, analyzer_results=results, operators=operators
            ).text

            _emit({"id": req_id, "text": anonymized, "counts": counts})
        except Exception as exc:
            # Fail safe: return input unchanged; never leak values into the error.
            _emit({"id": req_id, "text": req.get("text", "") if "req" in dir() else "",
                   "counts": {}, "error": type(exc).__name__})


if __name__ == "__main__":
    main()
