import React from "react";
const AdminViewLazy = React.lazy(() => import("./AdminView.jsx"));
export default function AdminViewWrapper(props) {
  return (
    <React.Suspense fallback={null}>
      <AdminViewLazy {...props} />
    </React.Suspense>
  );
}
