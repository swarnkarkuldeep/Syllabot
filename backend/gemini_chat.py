"""Custom LangChain chat model wrapper for Google Gemini.

Uses the modern ``google-genai`` SDK (>= 2.x) directly, which properly
supports the new "AQ." API key format and hits the standard
``generativelanguage.googleapis.com`` endpoint.

This replaces the legacy ``langchain-google-genai`` package which depends on
the outdated ``google-generativeai`` SDK that rejects "AQ." keys and may
route requests through incompatible endpoints.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Optional, Sequence

from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.outputs import ChatGeneration, ChatResult

log = logging.getLogger(__name__)


class ChatGemini(BaseChatModel):
    """LangChain chat model backed by the modern google-genai SDK.

    Supports "AQ." and legacy "AIza" API keys.  Hits the standard Google
    Generative AI endpoint — no OpenAI-compatibility wrapper, no proxies.
    """

    model: str = "gemini-2.5-flash"
    google_api_key: Optional[str] = None
    temperature: float = 0.1
    max_tokens: int = 900
    thinking_enabled: bool = False
    request_timeout: float = 120.0
    max_retries: int = 3

    _client: Any = None  # google-genai Client instance

    class Config:
        arbitrary_types_allowed = True

    def _get_client(self):
        """Lazily initialise the google-genai Client."""
        if self._client is None:
            try:
                from google import genai
            except ImportError:
                raise ImportError(
                    "Please install the modern google-genai SDK: "
                    "pip install google-genai>=2.0.0"
                )

            kwargs: dict[str, Any] = {}
            if self.google_api_key:
                kwargs["api_key"] = self.google_api_key

            self._client = genai.Client(**kwargs)
        return self._client

    @property
    def _llm_type(self) -> str:
        return "chat-gemini"

    @property
    def _identifying_params(self) -> dict[str, Any]:
        return {
            "model": self.model,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }

    def _convert_messages(self, messages: Sequence[BaseMessage]) -> tuple[str, list[dict]]:
        """Convert LangChain messages to google-genai format.

        Returns:
            (system_instruction, contents) — the system instruction is a
            separate parameter in the google-genai API, not part of contents.
        """
        system_parts: list[str] = []
        contents: list[dict] = []

        for msg in messages:
            if isinstance(msg, SystemMessage):
                system_parts.append(msg.content)
            elif isinstance(msg, HumanMessage):
                contents.append({"role": "user", "parts": [msg.content]})
            elif isinstance(msg, AIMessage):
                contents.append({"role": "model", "parts": [msg.content]})
            elif isinstance(msg, ToolMessage):
                contents.append({"role": "user", "parts": [msg.content]})

        # Merge multiple system messages into one instruction
        system_instruction = "\n\n".join(system_parts) if system_parts else ""
        return system_instruction, contents

    def _generate(
        self,
        messages: Sequence[BaseMessage],
        stop: Optional[list[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        client = self._get_client()
        system_instruction, contents = self._convert_messages(messages)

        # Build request config
        config: dict[str, Any] = {
            "temperature": self.temperature,
            "max_output_tokens": self.max_tokens,
        }
        if system_instruction:
            config["system_instruction"] = system_instruction
        if stop:
            config["stop_sequences"] = stop
        if not self.thinking_enabled:
            config["thinking_config"] = {"thinking_budget": 0}

        # Retry with exponential backoff (handles transient network errors)
        last_exc: Optional[Exception] = None
        for attempt in range(self.max_retries):
            try:
                response = client.models.generate_content(
                    model=self.model,
                    contents=contents,
                    config=config,
                )
                text = response.text or ""
                return ChatResult(
                    generations=[
                        ChatGeneration(message=AIMessage(content=text))
                    ],
                    llm_output={
                        "model": self.model,
                        "token_usage": {
                            "prompt_tokens": getattr(
                                response.usage_metadata,
                                "prompt_token_count",
                                0,
                            ),
                            "completion_tokens": getattr(
                                response.usage_metadata,
                                "candidates_token_count",
                                0,
                            ),
                            "total_tokens": getattr(
                                response.usage_metadata,
                                "total_token_count",
                                0,
                            ),
                        },
                    },
                )
            except Exception as exc:
                last_exc = exc
                # Only retry on transient network errors
                is_transient = any(
                    keyword in str(exc).lower()
                    for keyword in ("connect", "timeout", "refused", "reset", "timed out")
                )
                if is_transient and attempt < self.max_retries - 1:
                    wait = 2**attempt
                    log.warning(
                        "Gemini request failed (attempt %d/%d, retry in %ds): %s",
                        attempt + 1,
                        self.max_retries,
                        wait,
                        exc,
                    )
                    time.sleep(wait)
                    continue
                raise

        raise last_exc  # type: ignore[misc]  # unreachable but keeps mypy happy
