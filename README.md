# claude-multi-agent-dev (general branch)

Claude Code multi-agent workspace untuk **kebutuhan akademik umum — dosen dan mahasiswa**: menulis paper, bikin slide, ngoding Python, analisis data, dan riset literatur.

Cukup ketik perintah seperti *"perbaiki paragraf abstrak ini"* atau *"buatkan slide Beamer 15 menit dari paper saya"*, dan **main Claude session (Lead Engineer)** akan meneruskannya ke spesialis yang tepat — writer, slide-engineer, data-engineer, latex-engineer, dst. Koordinasi **ad-hoc** (tanpa GitHub issues / PRs / branch per task); main session mendelegasikan langsung lewat `Task` tool.

> **Kenapa main session jadi Lead?** Claude Code tidak mengizinkan nested `Task` (subagent tidak bisa nge-spawn subagent lain). Jadi koordinator harus main session — dia baca `CLAUDE.md`, pilih spesialis dari routing table, lalu Task mereka (paralel kalau disjoint, sekuensial kalau output yang satu jadi input yang berikutnya).

> **Versi AV.** Branch `main` / `av-dev` punya roster 10-spesialis untuk pengembangan kendaraan otonom (Autoware). Branch ini (`general`) adalah versi umum untuk pekerjaan akademik.

---

## Arsitektur

```
                           ┌──────────────────┐
                           │   Lead Engineer  │  (routes each request)
                           └──┬────────────┬──┘
             ┌────────────────┤            ├────────────────┐
             │                │            │                │
   ┌─────────┼─────────┐      │            │     ┌─────────┼─────────┐
   ▼         ▼         ▼      ▼            ▼     ▼         ▼         ▼
┌────────┐┌───────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌──────┐
│Researcher││LaTeX││Python ││ Data   ││ Coder  ││ Writer ││ Slides ││ Math │
└────────┘└───────┘└────────┘└────────┘└────────┘└────────┘└────────┘└──────┘
```

| Agent | Peran |
|---|---|
| **main session** (Lead Engineer) | Baca tiap permintaan, route ke spesialis lewat `Task`, lalu ringkas hasilnya. Tidak menulis konten domain sendiri. |
| **researcher** | Literature review, perbandingan library, API docs, SOTA survey. Output ke `docs/research/`. |
| **latex-engineer** | LaTeX typesetting — `.tex`, `.bib`, paket, build pipeline, fix compile error. |
| **python-engineer** | Python umum — script, CLI, ML kecil, scientific computing, packaging. |
| **data-engineer** | Analisis data & statistik — Jupyter notebook, pandas, R, plot, uji statistik. |
| **coder** | Catch-all non-Python — bash, SQL, JS/TS, C/C++, Makefile, CMake, glue script. |
| **writer-editor** | Prosa — essay, abstrak, proposal skripsi, draft jurnal, edit paragraf. Bahasa + English. |
| **slide-engineer** | Presentasi — Beamer, Marp, reveal.js, outline PowerPoint. Lengkap dengan speaker notes. |
| **math-engineer** | Derivasi, bukti, verifikasi sympy, formulasi optimasi. Output LaTeX math snippet. |

---

## Prerequisites

- **Ubuntu 22.04** (tested) atau Ubuntu 20.04. Linux-only — Windows / macOS belum didukung.
- **Claude Code CLI** — install dari https://docs.claude.com/claude-code
- **Node.js** (untuk dashboard + hooks)
- **Python 3.10+** (untuk python-engineer, data-engineer, math-engineer)
- **TeX Live** (untuk latex-engineer dan slide-engineer Beamer):
  ```bash
  sudo apt install texlive-full   # paling lengkap, ~5 GB
  # atau yang minimal:
  sudo apt install texlive-latex-extra texlive-bibtex-extra latexmk
  ```
- **R 4.x** (opsional, untuk data-engineer jika pakai R):
  ```bash
  sudo apt install r-base
  ```
- **Marp CLI** (opsional, untuk slide-engineer format Marp):
  ```bash
  npm install -g @marp-team/marp-cli
  ```

---

## Instalasi

```bash
# 1. Clone & pindah ke branch general
git clone <repo-url> claude-multi-agent-dev
cd claude-multi-agent-dev
git checkout general

# 2. Setup dependencies (npm install untuk dashboard + hooks)
bash scripts/setup.sh

# 3. Copy .env (kalau belum ada)
cp .env.example .env
# Edit DASHBOARD_PORT kalau port 3456 sudah dipakai

# 4. Lint routing table — pastikan semua agent terdaftar
bash scripts/check-agents.sh
```

---

## Quickstart

```bash
# 1. Jalankan dashboard (opsional tapi recommended)
bash scripts/start-dashboard.sh
# → http://localhost:3456

# 2. Buka Claude Code di direktori ini
claude

# 3. Kick off dengan /start
/start tolong buatkan slide Beamer 15 menit untuk seminar tentang topik X
```

Main Claude session (sebagai Lead) baca permintaanmu, pilih spesialis yang tepat, dan delegasi. Kamu lihat semua aktivitasnya di dashboard: agent aktif, log aktivitas, delegasi terakhir.

---

## Contoh penggunaan

### 1. Satu spesialis — permintaan langsung

```
> tolong buatkan script Python untuk rename file batch berdasarkan regex
```
→ Lead route ke `python-engineer`, dia tulis script dan jalanin sample run.

```
> perbaiki paragraf intro paper saya di intro.md, biar lebih flow
```
→ Lead route ke `writer-editor`, dia edit langsung dengan menampilkan before → after.

```
> analisis dataset survei.csv: cari korelasi antara kepuasan dan IPK
```
→ Lead route ke `data-engineer`, dia buat notebook dengan eksplorasi + uji statistik + plot.

### 2. Paralel — permintaan disjoint

```
> sambil riset library scraping Python, perbaiki paragraf abstrak saya
```
→ Lead nge-Task `researcher` + `writer-editor` **secara paralel** (di satu pesan dengan dua tool call).

### 3. Sekuensial — output spesialis A jadi input B

```
> bikin slide 15 menit dari paper transformer di docs/paper-transformer.pdf
```
→ Step 1: `researcher` ringkas paper ke `docs/research/transformer-summary.md`.
→ Step 2: `slide-engineer` baca ringkasan itu, buat deck Beamer / Marp dengan speaker notes.

```
> tulis bagian metodologi paper yang berisi turunan gradient loss function
```
→ Step 1: `math-engineer` derive gradient, verifikasi dengan sympy, output LaTeX math snippet.
→ Step 2: `writer-editor` tulis prosa metodologi yang menjelaskan rumus tsb.
→ Step 3: `latex-engineer` bungkus prosa + math ke `.tex` di template paper.

### 4. Riset → ngoding

```
> bandingkan library OCR Python yang akurat untuk dokumen Bahasa Indonesia, lalu implementasikan yang terbaik
```
→ Step 1: `researcher` buat `docs/research/ocr-bahasa.md` dengan perbandingan + rekomendasi.
→ Step 2: `python-engineer` implementasikan pipeline OCR pakai library yang direkomendasikan.

---

## Routing table

| Kategori permintaan | Spesialis |
|---|---|
| Literature / web / API / library comparison / SOTA survey | `researcher` |
| LaTeX `.tex`, BibTeX, compile error, paket, layout figure/tabel | `latex-engineer` |
| Python script / CLI / ML kecil / scientific computing / packaging | `python-engineer` |
| Analisis data, uji statistik, plot, notebook, pandas, R | `data-engineer` |
| Bash / SQL / JS/TS / C/C++ / Makefile / CMake / glue script (non-Python) | `coder` |
| Prosa: essay, abstrak, proposal skripsi, draft jurnal, edit paragraf | `writer-editor` |
| Slide: Beamer, Marp, reveal.js, outline PowerPoint | `slide-engineer` |
| Math: derivasi, bukti, sympy, formulasi optimasi | `math-engineer` |

Routing table autoritatif ada di `CLAUDE.md`. `scripts/check-agents.sh` linting otomatis kalau ada agent yang hilang.

---

## Konfigurasi

| File | Fungsi |
|---|---|
| `.env` | Cuma `DASHBOARD_PORT` yang wajib. Default 3456 kalau tidak ada. |
| `.mcp.json` | Kosong by default. Block `_examples` jadi template untuk integrasi MCP server eksternal. |
| `.claude/agents/*.md` | System prompt per spesialis. Edit untuk ubah scope / aturan. |
| `CLAUDE.md` | Routing table yang dibaca Lead. Sentinel HTML comment `<!-- routing-table: -->` ... `<!-- end routing-table -->` jangan diubah — `scripts/check-agents.sh` parse block ini. |
| `.claude/hooks/emit.mjs` | Emit setiap tool call / prompt / handoff ke dashboard. |
| `.claude/hooks/ensure-dashboard.mjs` | Auto-spawn dashboard saat session start kalau belum jalan. |
| `.claude/skills/linux-debug/` | Skill untuk debug masalah Linux (journalctl, network, dependency hell). |

---

## Dashboard

Buka di browser:

```
http://localhost:${DASHBOARD_PORT:-3456}
```

Yang ditampilkan:

- **Agent graph 9-node** — Lead di tengah, 8 spesialis melingkar. Node yang aktif menyala.
- **Activity log** — ~60 event terakhir (tool call, prompt, handoff).
- **Delegations panel** — daftar `Task` handoff terbaru.

Event main session di-tag sebagai `lead-engineer` (default `emit.mjs` kalau tidak ada subagent context), jadi keputusan routing kamu nyala di node Lead.

---

## MCP roadmap

Workspace ini siap dikonek ke **MCP server eksternal** apapun (misal untuk akses Notion, Google Drive, Zotero, dll. via MCP). Edit `.mcp.json` — block `_examples` punya template stdio dan HTTP. Spesialis akan otomatis pakai tool MCP yang relevan kalau registrasinya rapi.

---

## Pengembangan & customisasi

- **Tambah spesialis baru**: buat `.claude/agents/<nama>.md` dengan frontmatter yang sama gayanya seperti `researcher.md`, lalu tambahkan baris di routing table `CLAUDE.md` (di dalam sentinel comment). Update dashboard di `dashboard/public/index.html` — array `SPECIALISTS` di sekitar baris 370 — kalau mau muncul di graph.
- **Edit scope spesialis**: ubah file `.claude/agents/<nama>.md`. Hard rules dan output convention adalah bagian paling penting.
- **Mode diskusi (read-only)**: pakai skill `/diskusi` kalau cuma mau brainstorming tanpa eksekusi.

---

## Why this layout

Desain 9-role ini fokus ke alur kerja akademik: riset → tulis → kode → analisis → presentasi. Lihat `./plans/general.plan.md` untuk dokumen desain yang melatari struktur ini.

---

## License

MIT — lihat `LICENSE`.
