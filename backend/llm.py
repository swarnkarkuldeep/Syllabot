"""LLM provider abstraction — Gemini primary, Groq fallback, Ollama last resort.

Design intent: students shouldn't wait. Gemini free tier is fast and generous,
Groq is a solid backup, and Ollama keeps the stack at $0 even offline.

Provider selection (via ``get_llm(provider=...)`` or ``LLM_PROVIDER`` env var):
  - ``gemini`` → Gemini first → Groq fallback → Ollama (default if key present)
  - ``groq``   → Groq first → Ollama fallback (unchanged)
  - ``ollama`` → Ollama only (fully offline, no key needed)

If the chosen primary has no API key or is unreachable, we transparently fall
back to the next provider — the pipeline just works.
"""

from __future__ import annotations

import logging
from typing import Optional

from langchain_core.language_models import BaseChatModel
from langchain_core.outputs import ChatResult

import config

log = logging.getLogger(__name__)


# ── Fallback wrapper ─────────────────────────────────────────────────────────

class FallbackChatModel(BaseChatModel):
    """A chat model that tries a *primary* backend and falls back to a backup.

    Wraps two LangChain chat models. The ``invoke`` path first calls the
    primary; if it raises (rate limit, network error, bad key), we log the
    failure and retry with the fallback.
    """

    primary: BaseChatModel
    fallback: BaseChatModel

    def _generate(self, messages, stop=None, run_manager=None, **kwargs) -> ChatResult:
        try:
            return self.primary._generate(messages, stop=stop, run_manager=run_manager, **kwargs)
        except Exception as exc:
            log.warning(
                "Primary LLM (%s) failed (%s) — falling back to %s",
                getattr(self.primary, "model", "?"),
                exc,
                getattr(self.fallback, "model", "?"),
            )
            return self.fallback._generate(messages, stop=stop, run_manager=run_manager, **kwargs)

    @property
    def _llm_type(self) -> str:
        return "fallback"


class TripleFallbackChatModel(BaseChatModel):
    """A chat model with primary → secondary → last-resort fallback."""

    primary: BaseChatModel
    secondary: BaseChatModel
    last_resort: BaseChatModel

    def _generate(self, messages, stop=None, run_manager=None, **kwargs) -> ChatResult:
        try:
            return self.primary._generate(messages, stop=stop, run_manager=run_manager, **kwargs)
        except Exception as exc:
            log.warning(
                "Primary LLM (%s) failed (%s) — trying secondary %s",
                getattr(self.primary, "model", "?"),
                exc,
                getattr(self.secondary, "model", "?"),
            )
            try:
                return self.secondary._generate(messages, stop=stop, run_manager=run_manager, **kwargs)
            except Exception as exc2:
                log.warning(
                    "Secondary LLM (%s) failed (%s) — falling back to %s",
                    getattr(self.secondary, "model", "?"),
                    exc2,
                    getattr(self.last_resort, "model", "?"),
                )
                return self.last_resort._generate(messages, stop=stop, run_manager=run_manager, **kwargs)

    @property
    def _llm_type(self) -> str:
        return "triple-fallback"


# ── Provider factories ───────────────────────────────────────────────────────

def _make_gemini() -> BaseChatModel:
    from langchain_google_genai import ChatGoogleGenerativeAI

    log.info("Using Gemini: model=%s", config.GEMINI_MODEL)
    return ChatGoogleGenerativeAI(
        model=config.GEMINI_MODEL,
        google_api_key=config.GEMINI_API_KEY,
        temperature=0.1,
        max_tokens=900,
    )


def _make_groq() -> BaseChatModel:
    try:
        from langchain_groq import ChatGroq
    except ImportError:
        from langchain_community.chat_models import ChatGroq

    log.info("Using Groq: model=%s", config.GROQ_MODEL)
    return ChatGroq(
        model=config.GROQ_MODEL,
        groq_api_key=config.GROQ_API_KEY,
        temperature=0.1,
        max_tokens=900,
    )


def _make_ollama() -> BaseChatModel:
    try:
        from langchain_ollama import ChatOllama
    except ImportError:
        from langchain_community.chat_models import ChatOllama

    log.info("Using Ollama: model=%s base_url=%s", config.OLLAMA_MODEL, config.OLLAMA_BASE_URL)
    return ChatOllama(
        model=config.OLLAMA_MODEL,
        base_url=config.OLLAMA_BASE_URL,
        temperature=0.1,
        num_ctx=2048,
    )


# ── Resolvers per provider chain ─────────────────────────────────────────────

def _resolve_gemini() -> BaseChatModel:
    """Gemini → Groq → Ollama."""
    if not config.GEMINI_API_KEY:
        log.warning("GEMINI_API_KEY not set — skipping Gemini, trying Groq")
        return _resolve_groq()

    gemini = _make_gemini()

    if config.GROQ_API_KEY:
        return TripleFallbackChatModel(
            primary=gemini,
            secondary=_make_groq(),
            last_resort=_make_ollama(),
        )

    log.info("GROQ_API_KEY not set — Gemini → Ollama fallback only")
    return FallbackChatModel(primary=gemini, fallback=_make_ollama())


def _resolve_groq() -> BaseChatModel:
    """Groq → Ollama."""
    if not config.GROQ_API_KEY:
        log.warning("GROQ_API_KEY not set — falling back to Ollama")
        return _make_ollama()

    return FallbackChatModel(primary=_make_groq(), fallback=_make_ollama())


def _resolve_ollama() -> BaseChatModel:
    """Ollama only."""
    return _make_ollama()


# ── Public API ───────────────────────────────────────────────────────────────

# Valid provider names (for the per-request override from the UI).
VALID_PROVIDERS = {"gemini", "groq", "ollama"}


def get_llm(provider: Optional[str] = None) -> BaseChatModel:
    """Return the configured LLM chat model with fallback resolution.

    Args:
        provider: Optional per-request override (``"gemini"``, ``"groq"``, or
                  ``"ollama"``).  When *None*, falls back to the
                  ``LLM_PROVIDER`` env var (default ``"ollama"``).

    Fallback chains:
      - gemini → Gemini → Groq → Ollama
      - groq   → Groq → Ollama
      - ollama → Ollama only
    """
    name = (provider or config.LLM_PROVIDER).lower().strip()

    if name == "gemini":
        return _resolve_gemini()
    if name == "groq":
        return _resolve_groq()
    if name == "ollama":
        return _resolve_ollama()

    log.warning("Unknown provider %r — falling back to Ollama", name)
    return _make_ollama()
