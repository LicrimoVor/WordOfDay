from __future__ import annotations

import re
import unicodedata


LATIN_ROOTS = {
    "spam",
    "pizd",
    "huy",
    "hui",
    "blya",
    "ebat",
    "eban",
    "pidor",
    "mudak",
}

CYRILLIC_ROOTS = {
    "спам",
    "пизд",
    "хуй",
    "хуе",
    "хуи",
    "бля",
    "еба",
    "ёба",
    "ебн",
    "ёбн",
    "пидор",
    "пидар",
    "мудак",
    "гандон",
}

LOOKALIKE_TO_CYRILLIC = str.maketrans(
    {
        "a": "а",
        "@": "а",
        "6": "б",
        "b": "в",
        "e": "е",
        "3": "з",
        "k": "к",
        "m": "м",
        "h": "н",
        "o": "о",
        "0": "о",
        "p": "р",
        "c": "с",
        "t": "т",
        "y": "у",
        "x": "х",
    }
)


def _compact(text: str) -> str:
    normalized = unicodedata.normalize("NFKC", text).lower().replace("ё", "е")
    return re.sub(r"[^0-9a-zа-я]+", "", normalized)


def has_bad_words(text: str) -> bool:
    compact = _compact(text)
    cyrillic_lookalike = compact.translate(LOOKALIKE_TO_CYRILLIC)
    return any(root in compact for root in LATIN_ROOTS) or any(
        root in cyrillic_lookalike for root in CYRILLIC_ROOTS
    )
