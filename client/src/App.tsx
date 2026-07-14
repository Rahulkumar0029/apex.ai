import { RouterProvider } from 'react-router-dom';
import { createRouter } from '@/routes';
import { Toaster } from '@/components/ui/toaster';

export default function App() {
  return (
    <>
      <RouterProvider router={createRouter()} />
      <Toaster />
    </>
  );
}
