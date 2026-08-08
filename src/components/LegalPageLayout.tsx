import React from "react";
import { Link } from "react-router-dom";
import { AppFooter } from "./AppFooter";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({
  title,
  lastUpdated,
  children,
}) => {
  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-5 font-sans">
      <div className="bg-dark-bg-secondary rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-10 md:p-6 border border-dark-border w-full max-w-3xl my-8">
        <Link
          to="/"
          className="inline-block text-sm text-dark-text-secondary hover:text-dark-text-primary transition-colors no-underline mb-6"
        >
          ← Voltar ao início
        </Link>

        <h1 className="text-3xl md:text-2xl font-bold m-0 mb-2 bg-gradient-to-br from-indigo-500 to-purple-600 bg-clip-text text-transparent">
          {title}
        </h1>
        <p className="text-dark-text-muted text-sm m-0 mb-8">
          Última atualização: {lastUpdated}
        </p>

        <div className="flex flex-col gap-6 text-dark-text-secondary text-base leading-relaxed [&_h2]:text-dark-text-primary [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:m-0 [&_h2]:mb-2 [&_ul]:m-0 [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_p]:m-0 [&_a]:text-indigo-400 [&_a]:hover:text-indigo-300">
          {children}
        </div>

        <AppFooter />
      </div>
    </div>
  );
};
