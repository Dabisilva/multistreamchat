import React from "react";
import { Link } from "react-router-dom";

export const AppFooter: React.FC = () => {
  return (
    <footer className="mt-8 pt-6 border-t border-dark-border flex flex-wrap items-center justify-center gap-4 text-sm">
      <Link
        to="/privacy"
        className="text-dark-text-secondary hover:text-dark-text-primary transition-colors no-underline"
      >
        Política de Privacidade
      </Link>
      <span className="text-dark-text-muted" aria-hidden="true">
        ·
      </span>
      <Link
        to="/terms"
        className="text-dark-text-secondary hover:text-dark-text-primary transition-colors no-underline"
      >
        Termos de Serviço
      </Link>
    </footer>
  );
};
