"""Streamlit dashboard: browse the families, preview a post, download it.

    uv run streamlit run services/analytics/src/brh_analytics/app.py

The chart engine stays matplotlib on purpose: what you see here is the exact
pixel output that gets posted, not a lookalike that has to be reproduced
elsewhere. The page knows nothing about any particular family — it renders what
`families.FAMILIES` exposes.
"""

from __future__ import annotations

from datetime import date
from io import BytesIO

import streamlit as st

from brh_analytics import families, palette, posts

st.set_page_config(page_title="BRH Analytics", page_icon="📊", layout="wide")


@st.cache_resource(show_spinner="Lecture des données…")
def _findings(slug: str):
    return next(family for family in families.FAMILIES if family.slug == slug).build()


@st.cache_resource(show_spinner="Lecture des données…")
def _tables(slug: str):
    family = next(family for family in families.FAMILIES if family.slug == slug)
    return family.tables() if family.tables else {}


def main() -> None:
    labels = {family.slug: f"{family.title} — {family.subtitle}" for family in families.FAMILIES}

    with st.sidebar:
        st.header("Le post")
        family_slug = st.selectbox("Famille", options=list(labels), format_func=labels.get)
        found = _findings(family_slug)
        slug = st.selectbox(
            "Angle",
            options=[finding.slug for finding in found],
            format_func=lambda value: next(f.headline for f in found if f.slug == value),
        )
        size = st.radio("Format", options=sorted(posts.POST_SIZES), horizontal=True)
        stamp = st.date_input("Date affichée", value=date.today())

    finding = next(f for f in found if f.slug == slug)
    image = posts.render(finding, size=size, on=stamp)

    left, right = st.columns([3, 2], gap="large")
    with left:
        st.image(image, caption=f"{family_slug}/{finding.slug} · {size}", use_container_width=True)
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        st.download_button(
            "Télécharger le PNG",
            data=buffer.getvalue(),
            file_name=f"{finding.slug}-{size}.png",
            mime="image/png",
            type="primary",
        )

    with right:
        st.subheader(finding.headline)
        st.metric(finding.figure_label, finding.figure)
        st.text_area("Texte du post", value=finding.caption, height=180)

    st.divider()
    views = _tables(family_slug)
    tab_names = [*views, "Palette"]
    tabs = st.tabs(tab_names)
    for tab, rows in zip(tabs, views.values(), strict=False):
        with tab:
            st.table(rows)
    with tabs[-1]:
        st.caption("Voir DESIGN.md. Les ratios sont mesurés sur blanc.")
        for name, ratio in palette.check().items():
            st.write(f"`{name}` — {ratio:.2f}:1")


main()
