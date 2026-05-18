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
/start coba riset tentang pythagoras, buatkan aku aplikasi tkinter tentang pythagoras, buatkan aku paper tentang pythagoras 6 halaman standard IEEE
```

Main Claude session (sebagai Lead) baca permintaanmu, pecah jadi langkah-langkah, lalu delegasi ke spesialis — paralel kalau bisa, sekuensial kalau ada dependency. Semua kelihatan di dashboard.

---

## Contoh penggunaan

Multi-agent paling berguna pas satu permintaan butuh **banyak spesialis berurutan**. Berikut beberapa skenario lengkap.

### Skenario 1 — Pythagoras: riset + aplikasi + paper IEEE

```
> coba riset tentang pythagoras, buatkan aku aplikasi tkinter tentang pythagoras,
  buatkan aku paper tentang pythagoras 6 halaman standard IEEE
```

Lead pecah permintaan ini jadi rantai 5 langkah:

1. **`researcher`** → kumpulkan materi (sejarah, pembuktian, aplikasi modern), tulis ke `docs/research/pythagoras.md` dengan sitasi.
2. **`math-engineer`** (paralel dengan #3) → derive beberapa bukti teorema (geometris + aljabar), verifikasi dengan sympy, output LaTeX math snippet.
3. **`python-engineer`** (paralel dengan #2) → bikin aplikasi Tkinter: input dua sisi → output hipotenusa + visualisasi segitiga. Jalanin sample run buat memastikan jalan.
4. **`writer-editor`** → tulis prosa paper IEEE 6 halaman (abstract, intro, related work, method, demo aplikasi, conclusion) berdasarkan output riset + math.
5. **`latex-engineer`** → ambil template IEEE (`IEEEtran.cls`), bungkus prosa + math + screenshot aplikasi, build PDF dengan `latexmk`. Fix compile error kalau ada.

Hasil akhir: folder dengan `pythagoras_app.py` yang bisa dijalankan + `paper/paper.pdf` 6 halaman IEEE + `docs/research/pythagoras.md` sebagai referensi.

### Skenario 2 — Dataset survei skripsi

```
> aku punya data.csv hasil survei skripsi tentang kepuasan mahasiswa terhadap PJJ,
  analisis lengkap dan tulis bab 4 skripsi-nya
```

1. **`data-engineer`** → load `data.csv`, eksplorasi (missing values, distribusi), uji statistik (chi-square / korelasi / regresi sesuai tipe variabel), bikin plot. Output: notebook `analysis.ipynb` + summary `docs/research/survei-pjj.md`.
2. **`math-engineer`** (kalau perlu) → formulasikan rumus statistik yang dipakai (effect size, CI) dalam LaTeX.
3. **`writer-editor`** → tulis bab 4 (Hasil dan Pembahasan) berdasarkan output notebook + summary. Bahasa formal akademik.
4. **`latex-engineer`** → bungkus ke template skripsi kampus, sisipkan plot dari notebook, build PDF.

### Skenario 3 — Slide kuliah dari paper

```
> bikin slide kuliah 50 menit tentang transformer, basisnya dari paper "Attention is All You Need"
```

1. **`researcher`** → baca PDF paper, tulis ringkasan terstruktur ke `docs/research/transformer.md` (motivasi, arsitektur, hasil, kritik).
2. **`slide-engineer`** → baca ringkasan, buat deck Beamer atau Marp dengan ±25 slide (asumsi ~2 menit/slide), lengkap dengan speaker notes per slide. Struktur: hook → masalah RNN/LSTM → self-attention → arsitektur encoder-decoder → eksperimen → diskusi.

### Skenario 4 — Bikin tool kecil dengan referensi

```
> bandingkan library OCR Python untuk dokumen Bahasa Indonesia, lalu bikin CLI tool yang OCR-in file PDF
```

1. **`researcher`** → bandingkan Tesseract, EasyOCR, PaddleOCR di dokumen Bahasa Indonesia. Output `docs/research/ocr-bahasa.md` + rekomendasi.
2. **`python-engineer`** → implementasi CLI tool (`argparse` / `typer`) pakai library yang direkomendasikan, baca PDF → keluarkan teks. Test dengan sample PDF.

### Skenario 5 — Permintaan paralel disjoint

```
> sambil riset library scraping Python yang terbaik, edit paragraf abstrak paper saya di abstract.md
```

Karena dua permintaan independen, Lead nge-Task **paralel** (satu pesan, dua tool call):

- **`researcher`** → tulis perbandingan ke `docs/research/python-scraping.md`.
- **`writer-editor`** → edit `abstract.md` langsung dengan before → after.

### Skenario 6 — Satu spesialis aja

Buat permintaan fokus, Lead langsung route ke satu spesialis:

| Permintaan | Spesialis yang dipanggil |
|---|---|
| `tulis script Python rename file batch pakai regex` | `python-engineer` |
| `perbaiki grammar paragraf ini` | `writer-editor` |
| `turunkan gradient dari fungsi loss MSE` | `math-engineer` |
| `bikin Makefile untuk project C kecil` | `coder` |
| `compile error: ! Package biblatex Error: ...` | `latex-engineer` |

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
