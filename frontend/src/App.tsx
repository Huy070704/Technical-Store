import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

const App = () => <RouterProvider router={router} />;
import AdminProductManagement from './pages/admin/AdminProductManagement';

const App = () => {
  return <AdminProductManagement />;
};

export default App;