# 🚀 PDFCraft

<p align="center">
  <b>Privacy-first browser-based PDF toolkit</b><br/>
  Merge, split, convert, compress, edit, extract, and protect PDFs — all directly in your browser.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/Vite-8-purple?style=for-the-badge&logo=vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-Modern-06B6D4?style=for-the-badge&logo=tailwindcss" />
  <img src="https://img.shields.io/badge/Client--Side-Privacy-success?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Open%20Source-Project-black?style=for-the-badge" />
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-tool-usage">Tool Usage</a> •
  <a href="#-roadmap">Roadmap</a>
</p>

---

## ✨ Overview

**PDFCraft** is a modern, browser-based PDF toolkit designed for users who need a fast, clean, and privacy-focused way to work with PDF files.

Instead of relying on bulky desktop software or uploading sensitive files to external servers, **PDFCraft performs most processing directly in the browser**, giving users better privacy and control.

Whether you want to **merge documents**, **split pages**, **convert PDFs to images**, **extract text**, **edit PDFs**, or **protect files with passwords**, PDFCraft provides an all-in-one solution in a modern web interface.

---

## 🎯 Why PDFCraft?

- 🔒 **Privacy-first** — most operations run client-side
- ⚡ **Fast workflow** — simple UI, no unnecessary complexity
- 🧰 **All-in-one toolkit** — multiple PDF tools in one place
- 🌐 **Browser-based** — no desktop installation required
- 🧑‍💻 **Developer-friendly** — built with a modern frontend stack

---

## 🚀 Features

### Core PDF Tools
- 📷 **Image to PDF**
- 🖼️ **PDF to Image (PNG / JPEG)**
- 📑 **Merge PDF**
- ✂️ **Split PDF**
- ✍️ **Edit PDF**
- 🔐 **Protect PDF**
- 📝 **PDF to Text**
- 📄 **PDF to Document (DOCX)**

### Extra Utility
- 🗜️ **Compress Image**
- 🔍 **OCR mode for scanned documents**
- 📦 **ZIP export support for multiple outputs**
- 🛡️ **Password-protected PDF generation**

---

## 🖼️ Preview

> Add screenshots here for a stronger GitHub presentation.

```md
![Home UI](./screenshots/home.png)
![PDF Tools](./screenshots/tools.png)
![Editor](./screenshots/editor.png)
```

---

## 🛠 Tech Stack

### Frontend
- **React 19**
- **Vite 8**
- **React Router**
- **Tailwind CSS**

### PDF / Document Processing
- **pdfjs-dist**
- **pdf-lib**
- **jspdf**
- **docx**
- **jszip**
- **tesseract.js**

---

## 📂 Project Structure

```bash
pdf_tool/
│── public/
│── src/
│   ├── components/
│   ├── pages/
│   ├── tools/
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
│── package.json
│── vite.config.js
│── README.md
```

---

## 📦 Prerequisites

Before running the project locally, make sure you have:

- **Node.js** `^20.19.0` or `>=22.12.0`
- **npm**

---

## 📥 Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/princekumar1295/pdf_tool.git
cd pdf_tool
npm install
```

---

## ▶️ Run Locally

Start the development server:

```bash
npm run dev
```

Open the local URL shown in your terminal, usually:

```bash
http://localhost:5173
```

---

## 🏗 Build for Production

```bash
npm run build
npm run preview
```

---

## 🔄 User Workflow

Using **PDFCraft** is simple:

1. Open the application
2. Select a tool from the sidebar
3. Upload your files using drag & drop or file picker
4. Configure tool-specific options
5. Click the main action button
6. Download the processed output file

---

## 🧰 Tool Usage

### 📷 Image to PDF
Convert one or more images into a single PDF document.

**How it works:**
- Upload multiple images
- Choose page size
- Generate one PDF file

---

### 🖼️ PDF to Image
Convert each PDF page into image format.

**Supported formats:**
- PNG
- JPEG

**How it works:**
- Upload one PDF
- Select image format
- Download pages individually or as ZIP

---

### 📑 Merge PDF
Combine multiple PDF files into one.

**How it works:**
- Upload 2 or more PDFs
- Click merge
- Download merged PDF

---

### ✂️ Split PDF
Split a PDF into separate parts.

**Split options:**
- By page ranges
- Extract all pages

**How it works:**
- Upload one PDF
- Choose split mode
- Download outputs as files or ZIP

---

### ✍️ Edit PDF
Add content visually to a PDF.

**Editing options:**
- Add text
- Add images
- Add shapes
- Add signature

**How it works:**
- Upload a PDF
- Make edits
- Export updated PDF

---

### 🗜️ Compress Image
Reduce image size for easier sharing and storage.

**How it works:**
- Upload one image
- Adjust quality and size target
- Download compressed image

---

### 🔐 Protect PDF
Apply a real password lock to secure PDF files.

**How it works:**
- Upload one PDF
- Set and confirm password
- Download locked PDF

> **Important Note:**  
> This uses a **real open-password lock**.  
> For browser compatibility, pages may be rebuilt as images, so:
> - output size may increase
> - text may become non-selectable

---

### 📝 PDF to Text
Extract readable text content from a PDF.

**How it works:**
- Upload one PDF
- Extract text
- Download `.txt` output

---

### 📄 PDF to Document
Convert PDF files into editable **DOCX** format.

**Modes available:**
- **Preserve Layout** → best visual fidelity
- **OCR Editable Text** → better for scanned documents

**How it works:**
- Upload one PDF
- Choose conversion mode
- Download `.docx`

---

## 📜 Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Create production build
npm run preview  # Preview production build
npm run lint     # Run ESLint checks
```

---

## ⚠️ Troubleshooting

### If push to GitHub fails with `fetch first`

```bash
git fetch origin
git pull --rebase origin main
git push -u origin main
```

### Common issues

#### Conversion fails
Try:
- using a smaller file
- retrying the conversion
- switching to another mode

#### DOCX file does not open in Word
Try:
- converting again in **Preserve Layout** mode

#### Output looks incorrect
Try:
- re-uploading a cleaner source file
- using a different PDF reader

---

## 🌍 Use Cases

PDFCraft can be useful for:

- 🎓 Students
- 💼 Professionals
- 📑 Office workflows
- 🧾 Document management
- 🧠 OCR-based text extraction
- 📤 Quick PDF conversion tasks

---

## 🛣 Roadmap

Planned future improvements:

- [ ] Drag-and-drop page reordering
- [ ] Better OCR formatting
- [ ] Improved PDF compression
- [ ] Batch processing enhancements
- [ ] Multi-language support
- [ ] Cloud sync / export history
- [ ] Better mobile optimization

---

## 🤝 Contributing

Contributions are welcome.

If you'd like to improve PDFCraft:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Commit and push
5. Open a pull request

---

## 📄 License

This project is currently for **educational and practical use**.

If you want to publish it as an open-source project, consider adding a license such as:

- MIT License
- Apache 2.0
- GPL v3

---

## 👨‍💻 Author

**Prince Kumar Kapri**

- GitHub: [@princekumar1295](https://github.com/princekumar1295)

---

## ⭐ Support

If you like this project, consider:

- giving it a **star**
- sharing it with others
- contributing improvements

<p align="center">
  <b>Made with focus on privacy, usability, and modern web experience.</b>
</p>
