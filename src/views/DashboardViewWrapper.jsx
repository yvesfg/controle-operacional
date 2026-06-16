import React from "react";
const DashboardViewLazy = React.lazy(() => import("./DashboardView.jsx"));
export default function DashboardViewWrapper(props) {
  return (
    <React.Suspense fallback={null}>
      <DashboardViewLazy {...props} />
    </React.Suspense>
  );
}
