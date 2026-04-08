export const APP_NAME = 'PDFCraft';
export const APP_TAGLINE = 'All-in-one PDF toolkit, right in your browser';

export const ROUTES = {
  HOME: '/',
  IMAGE_TO_PDF: '/image-to-pdf',
  PDF_TO_IMAGE: '/pdf-to-image',
  MERGE_PDF: '/merge-pdf',
  SPLIT_PDF: '/split-pdf',
  EDIT_PDF: '/edit-pdf',
  COMPRESS: '/compress',
  PROTECT_PDF: '/protect-pdf',
  PDF_TO_WORD: '/pdf-to-word',
  PDF_TO_DOCUMENT: '/pdf-to-document',
};

export const TOOLS = [
  {
    id: 'image-to-pdf',
    label: 'Image to PDF',
    route: ROUTES.IMAGE_TO_PDF,
    icon: 'Image',
    description: 'Convert JPG, PNG, WEBP images into a single PDF document',
    color: '#7c3aed',
    acceptedFiles: 'image/*',
    badge: null,
  },
  {
    id: 'edit-pdf',
    label: 'Edit PDF',
    route: ROUTES.EDIT_PDF,
    icon: 'Layers',
    description: 'Add images to your existing PDF documents instantly',
    color: '#d4af37',
    acceptedFiles: '.pdf,image/*',
    badge: 'New',
  },
  {
    id: 'pdf-to-image',
    label: 'PDF to Image',
    route: ROUTES.PDF_TO_IMAGE,
    icon: 'FileImage',
    description: 'Export every PDF page as a high-quality PNG or JPEG image',
    color: '#9333ea',
    acceptedFiles: '.pdf',
    badge: null,
  },
  {
    id: 'merge-pdf',
    label: 'Merge PDF',
    route: ROUTES.MERGE_PDF,
    icon: 'Layers',
    description: 'Combine multiple PDF files into one document in seconds',
    color: '#6d28d9',
    acceptedFiles: '.pdf',
    badge: null,
  },
  {
    id: 'split-pdf',
    label: 'Split PDF',
    route: ROUTES.SPLIT_PDF,
    icon: 'Scissors',
    description: 'Extract pages or split a PDF into multiple files',
    color: '#7c3aed',
    acceptedFiles: '.pdf',
    badge: null,
  },
  {
    id: 'compress',
    label: 'Compress Image',
    route: ROUTES.COMPRESS,
    icon: 'Minimize2',
    description: 'Reduce image file size while maintaining visual quality',
    color: '#a855f7',
    acceptedFiles: 'image/*',
    badge: 'Popular',
  },
  {
    id: 'protect-pdf',
    label: 'Protect PDF',
    route: ROUTES.PROTECT_PDF,
    icon: 'Lock',
    description: 'Encrypt your PDF with a password to restrict access',
    color: '#8b5cf6',
    acceptedFiles: '.pdf',
    badge: null,
  },
  {
    id: 'pdf-to-word',
    label: 'PDF to Word',
    route: ROUTES.PDF_TO_WORD,
    icon: 'FileText',
    description: 'Extract text content from PDF and export as a document',
    color: '#7c3aed',
    acceptedFiles: '.pdf',
    badge: null,
  },
  {
    id: 'pdf-to-document',
    label: 'PDF to Document',
    route: ROUTES.PDF_TO_DOCUMENT,
    icon: 'FileText',
    description: 'Convert any PDF to DOCX while preserving the original page layout',
    color: '#8b5cf6',
    acceptedFiles: '.pdf',
    badge: 'New',
  },
];

export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
export const ACCEPTED_PDF_TYPE = 'application/pdf';
