import React from "react";

const PageRoot = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return <div className={`bg-background font-body ${className || ""}`}>{children}</div>;
};

export default PageRoot;

