import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Loader from '../components/common/Loader';
import { ROUTES } from '../utils/constants';

const Home = lazy(() => import('../features/home/Home'));
const ImageToPdf = lazy(() => import('../features/imageToPdf/ImageToPdf'));
const EditPdf = lazy(() => import('../features/editPdf/EditPdf'));
const PdfToImage = lazy(() => import('../features/pdfToImage/PdfToImage'));
const MergePdf = lazy(() => import('../features/mergePdf/MergePdf'));
const SplitPdf = lazy(() => import('../features/splitPdf/SplitPdf'));
const CompressImage = lazy(() => import('../features/compress/CompressImage'));
const ProtectPdf = lazy(() => import('../features/protectPdf/ProtectPdf'));
const PdfToWord = lazy(() => import('../features/pdfToWord/PdfToWord'));
const PdfToDocument = lazy(() => import('../features/pdfToDocument/PdfToDocument'));

function RouteFallback() {
  return <Loader label="Loading tool..." />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path={ROUTES.HOME} element={<Home />} />
        <Route path={ROUTES.IMAGE_TO_PDF} element={<ImageToPdf />} />
        <Route path={ROUTES.EDIT_PDF} element={<EditPdf />} />
        <Route path={ROUTES.PDF_TO_IMAGE} element={<PdfToImage />} />
        <Route path={ROUTES.MERGE_PDF} element={<MergePdf />} />
        <Route path={ROUTES.SPLIT_PDF} element={<SplitPdf />} />
        <Route path={ROUTES.COMPRESS} element={<CompressImage />} />
        <Route path={ROUTES.PROTECT_PDF} element={<ProtectPdf />} />
        <Route path={ROUTES.PDF_TO_WORD} element={<PdfToWord />} />
        <Route path={ROUTES.PDF_TO_DOCUMENT} element={<PdfToDocument />} />
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </Suspense>
  );
}
