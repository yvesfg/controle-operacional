import React from "react";
const DashboardAVBLazy = React.lazy(() => import("./DashboardAVB.jsx"));
export default function DashboardAVBWrapper(props) {
  return (
    <React.Suspense fallback={null}>
      <DashboardAVBLazy {...props} />
    </React.Suspense>
  );
}
