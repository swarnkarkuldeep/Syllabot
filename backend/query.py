#!/usr/bin/env python3
"""CLI script to ask a question against the RAG pipeline.

Usage:
    python query.py "What is a stack?"
    python query.py --provider groq "What is a stack?"
    python query.py --json "What is a stack?"
    python query.py                 # interactive multi-turn mode

Prints the grounded answer + sources for manual testing. Interactive mode
keeps a conversation history so follow-up questions are condensed properly.
"""

from __future__ import annotations

import argparse
import json
import sys

from rag_chain import rag_answer

# Windows consoles default to the cp1252 codec, which can't encode unicode
# (box-drawing chars, em-dashes, quotes in LLM answers). Force UTF-8 so output
# never crashes on a UnicodeEncodeError.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def _print_result(result, json_output: bool = False) -> None:
    """Render a RAGResult to the terminal (human or JSON)."""
    if json_output:
        print(json.dumps({
            "answer": result.answer,
            "sources": result.sources,
            "confidence": result.confidence,
            "condensed_query": result.condensed_query,
            "latency_ms": result.latency_ms,
        }, indent=2))
        return

    print(f"\n[confidence: {result.confidence.upper()}] [{result.latency_ms:.0f} ms]")
    print("─" * 72)
    print(result.answer)
    print("─" * 72)

    if result.sources:
        print("SOURCES:")
        for i, src in enumerate(result.sources, 1):
            print(f"  {i}. {src['file']}  (similarity {src['score']:.4f})")
            if src.get("excerpt"):
                print(f"     \"{src['excerpt']}\"")
    else:
        print("(no sources retrieved)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Query the RAG pipeline.")
    parser.add_argument(
        "question", nargs="?",
        help="The question to ask. Omit to enter interactive multi-turn mode.",
    )
    parser.add_argument("--json", action="store_true", help="Output as JSON.")
    parser.add_argument(
        "--provider", choices=["ollama", "groq"],
        help="Override LLM_PROVIDER for this run (e.g. --provider groq).",
    )
    args = parser.parse_args()

    # Allow provider override without editing .env
    if args.provider:
        import config
        config.LLM_PROVIDER = args.provider

    if args.question:
        result = rag_answer(args.question)
        _print_result(result, json_output=args.json)
        return

    # Interactive multi-turn mode
    print("AI Teaching Assistant — interactive mode. Type 'exit' / 'quit' to stop.")
    history: list[dict] = []
    while True:
        try:
            q = input("\nYou> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye!")
            return

        if q.lower() in {"exit", "quit", "q"}:
            print("Bye!")
            return
        if not q:
            continue

        result = rag_answer(q, history=history)
        _print_result(result, json_output=args.json)

        # Record the turn so follow-ups are condensed with context
        history.append({"role": "user", "content": q})
        history.append({"role": "assistant", "content": result.answer})


if __name__ == "__main__":
    main()