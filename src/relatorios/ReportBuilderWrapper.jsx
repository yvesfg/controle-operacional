import React from "react";
const ReportBuilderLazy = React.lazy(() => import("./ReportBuilder.jsx"));
export default function ReportBuilderWrapper(props) {
  return (
    <React.Suspense fallback={null}>
      <ReportBuilderLazy {...props} />
    </React.Suspense>
  );
}
