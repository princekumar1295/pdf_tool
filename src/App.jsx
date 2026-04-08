import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/useApp';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import AppRoutes from './routes/AppRoutes';
import GlobalLoader from './components/common/GlobalLoader';
import './styles/global.css';
import './App.css';

function ToastContainer() {
  const { notifications, removeNotification } = useApp();
  return (
    <div className="toast-container">
      {notifications.map((n) => (
        <div key={n.id} className={`toast toast--${n.type}`} onClick={() => removeNotification(n.id)}>
          {n.message}
        </div>
      ))}
    </div>
  );
}

function AppLayout() {
  const { sidebarOpen } = useApp();
  return (
    <div className="page-wrapper">
      <GlobalLoader />
      <Sidebar />
      <div className={`main-content${sidebarOpen ? '' : ' main-content--collapsed'}`}>
        <Navbar />
        <div className="content-area">
          <AppRoutes />
        </div>
        <Footer />
      </div>
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppLayout />
      </AppProvider>
    </BrowserRouter>
  );
}
