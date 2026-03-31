import os
from typing import Optional


def _is_available(module_name: str) -> bool:
    try:
        __import__(module_name)
        return True
    except Exception:
        return False


def get_deepseek_chat_model(model: str = "deepseek-chat", temperature: float = 0.2):
    """
    Returns a DeepSeek-compatible chat model for orchestration code.

    Preferred order:
    1) langchain_openai.ChatOpenAI (with DeepSeek base URL)
    2) agno.models.openai.OpenAIChat (if available)
    """
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise ValueError("Missing DEEPSEEK_API_KEY in environment.")

    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")

    if _is_available("langchain_openai"):
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=base_url,
            temperature=temperature,
        )

    if _is_available("agno"):
        from agno.models.openai import OpenAIChat

        return OpenAIChat(
            id=model,
            api_key=api_key,
            base_url=base_url,
            temperature=temperature,
        )

    raise ImportError(
        "No supported chat backend found. Install langchain-openai or agno."
    )


def get_tavily_client():
    """
    Returns Tavily client if package + key are available.
    """
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        return None

    if not _is_available("tavily"):
        return None

    from tavily import TavilyClient

    return TavilyClient(api_key=api_key)

