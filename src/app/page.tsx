"use client";

import { useState, useEffect } from "react";

export default function LandingPage() {
  const [loginUrl, setLoginUrl] = useState("/login");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
      if (!isLocal) {
        setTimeout(() => {
          setLoginUrl("https://app.memorius.com.br");
        }, 0);
      }
    }
  }, []);

  const handleFaqToggle = (index: number) => {
    setActiveFaqIndex(activeFaqIndex === index ? null : index);
  };

  const faqItems = [
    {
      q: "O Memorius é instalado no computador?",
      a: "Não. O Memorius é 100% em nuvem. Sua equipe acessa pelo navegador, com segurança e sem necessidade de qualquer instalação ou manutenção física."
    },
    {
      q: "O sistema serve para empresas de assistência familiar?",
      a: "Sim. O Memorius foi pensado especificamente para empresas que trabalham com planos de assistência familiar, contratos recorrentes, mensalidades, atendimentos e relacionamento com clientes."
    },
    {
      q: "Posso controlar contratos e mensalidades?",
      a: "Sim. Você pode cadastrar clientes titulares e dependentes, gerar termos de adesão customizados, controlar carências, emitir carnês, acompanhar pagamentos pendentes e projetar receitas."
    },
    {
      q: "O Memorius possui cobrança integrada?",
      a: "Sim. A plataforma já possui integração nativa com o ASAAS para geração automática de cobranças recorrentes e baixa automática de mensalidades via webhook."
    },
    {
      q: "Posso cadastrar minha equipe?",
      a: "Sim. O administrador principal pode cadastrar colaboradores com diferentes níveis de acesso e permissões estruturadas no sistema, como ADMIN (acesso completo) e OPERADOR (operação básica)."
    },
    {
      q: "O sistema possui modelos de contrato?",
      a: "Sim. É possível criar modelos de contrato customizados com variáveis dinâmicas em nosso editor e imprimir documentos preenchidos automaticamente com os dados do cliente titular."
    },
    {
      q: "Meus dados ficam seguros?",
      a: "Sim. O Memorius utiliza criptografia SSL, controle rígido de perfis de acesso, isolamento completo de banco de dados por empresa e servidores em nuvem seguros."
    },
    {
      q: "Como faço para começar?",
      a: "Você pode solicitar uma demonstração rápida pelo WhatsApp. Nossa equipe apresentará os recursos operacionais do sistema e indicará o plano ideal para sua funerária."
    }
  ];

  return (
    <div className="lp-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        /* --------------------------------------------------
           CSS Reset & Tokens
           -------------------------------------------------- */
        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        :root {
          --font-primary: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;
          --font-secondary: 'Inter', sans-serif;
          
          --color-petrol: #0b4f59;
          --color-petrol-light: #115e6b;
          --color-petrol-dark: #083c44;
          --color-petrol-deep: #05262c;
          --color-green-dark: #052e16;
          --color-green-deep: #02140a;
          --color-gold: #c5a02b;
          --color-gold-light: #dfc059;
          --color-white: #ffffff;
          --color-slate-50: #f8fafc;
          --color-slate-100: #f1f5f9;
          --color-slate-200: #e2e8f0;
          --color-slate-300: #cbd5e1;
          --color-slate-400: #94a3b8;
          --color-slate-500: #64748b;
          --color-slate-700: #334155;
          --color-slate-900: #0f172a;
          
          --transition-smooth: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          font-family: var(--font-primary);
          background-color: var(--color-green-deep);
          color: var(--color-slate-100);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* --------------------------------------------------
           Layout Helpers
           -------------------------------------------------- */
        .lp-container {
          position: relative;
          min-height: 100vh;
          background: linear-gradient(135deg, #042125 0%, #02140a 50%, #031c11 100%);
          display: flex;
          flex-direction: column;
        }

        .lp-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.012) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.012) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          opacity: 0.8;
          z-index: 1;
        }

        .lp-orb-1 {
          position: absolute;
          top: -100px;
          left: 10%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(11, 79, 89, 0.25) 0%, transparent 70%);
          filter: blur(120px);
          pointer-events: none;
          z-index: 1;
        }

        .lp-orb-2 {
          position: absolute;
          top: 40%;
          right: -100px;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(197, 160, 43, 0.06) 0%, transparent 70%);
          filter: blur(100px);
          pointer-events: none;
          z-index: 1;
        }

        /* Separadores Orgânicos SVG */
        .lp-separator {
          width: 100%;
          height: 80px;
          overflow: hidden;
          line-height: 0;
          background: transparent;
          pointer-events: none;
          z-index: 5;
          position: relative;
        }
        .lp-separator svg {
          width: 100%;
          height: 100%;
          display: block;
        }

        /* --------------------------------------------------
           Navbar
           -------------------------------------------------- */
        .lp-navbar {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 4rem;
          background: rgba(4, 33, 37, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          z-index: 100;
          transition: var(--transition-smooth);
        }

        .lp-logo-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          color: var(--color-white);
          font-weight: 800;
          font-size: 1.4rem;
          letter-spacing: -0.02em;
        }

        .lp-logo-symbol {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, var(--color-petrol-light), var(--color-gold));
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: var(--color-green-deep);
          font-size: 1.1rem;
          box-shadow: 0 4px 10px rgba(11, 79, 89, 0.3);
        }

        .lp-logo-text {
          font-family: var(--font-primary);
          color: var(--color-white);
        }

        .lp-nav-links {
          display: flex;
          align-items: center;
          gap: 2.25rem;
          list-style: none;
        }

        .lp-nav-links a {
          color: var(--color-slate-300);
          text-decoration: none;
          font-size: 0.95rem;
          font-weight: 500;
          transition: var(--transition-smooth);
        }

        .lp-nav-links a:hover {
          color: var(--color-white);
        }

        .lp-nav-actions {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .lp-btn-entrar {
          color: var(--color-white);
          text-decoration: none;
          font-size: 0.95rem;
          font-weight: 600;
          padding: 0.65rem 1.25rem;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: var(--transition-smooth);
        }

        .lp-btn-entrar:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .lp-btn-demo {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-green-deep);
          background: linear-gradient(135deg, var(--color-gold-light) 0%, var(--color-gold) 100%);
          text-decoration: none;
          font-size: 0.95rem;
          font-weight: 700;
          padding: 0.65rem 1.5rem;
          border-radius: 10px;
          box-shadow: 0 4px 14px rgba(197, 160, 43, 0.25);
          transition: var(--transition-smooth);
        }

        .lp-btn-demo:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(197, 160, 43, 0.4);
          filter: brightness(1.05);
        }

        .lp-btn-demo:active {
          transform: translateY(0);
        }

        .lp-menu-toggle {
          display: none;
          background: none;
          border: none;
          color: var(--color-white);
          cursor: pointer;
        }

        /* --------------------------------------------------
           Hero Section
           -------------------------------------------------- */
        .lp-hero-section {
          padding: 10rem 4rem 6rem;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 5rem;
          align-items: center;
          position: relative;
          z-index: 10;
        }

        .lp-hero-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .lp-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 1rem;
          background: rgba(197, 160, 43, 0.08);
          border: 1px solid rgba(197, 160, 43, 0.2);
          border-radius: 999px;
          color: var(--color-gold-light);
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 2rem;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05);
        }

        .lp-hero-badge-dot {
          width: 6px;
          height: 6px;
          background-color: var(--color-gold);
          border-radius: 50%;
          box-shadow: 0 0 8px var(--color-gold);
          animation: badge-pulse 2s infinite;
        }

        .lp-hero-title {
          font-size: 3.5rem;
          font-weight: 800;
          line-height: 1.15;
          color: var(--color-white);
          letter-spacing: -0.03em;
          margin-bottom: 1.5rem;
        }

        .lp-hero-title span {
          background: linear-gradient(135deg, var(--color-white) 30%, var(--color-gold-light) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .lp-hero-subtitle {
          font-size: 1.15rem;
          line-height: 1.65;
          color: var(--color-slate-300);
          margin-bottom: 3rem;
          max-width: 580px;
        }

        .lp-hero-buttons {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 2.5rem;
          width: 100%;
        }

        .lp-btn-hero-demo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          color: var(--color-green-deep);
          background: linear-gradient(135deg, var(--color-gold-light) 0%, var(--color-gold) 100%);
          text-decoration: none;
          font-size: 1.05rem;
          font-weight: 700;
          padding: 1rem 2rem;
          border-radius: 12px;
          box-shadow: 0 6px 20px rgba(197, 160, 43, 0.2);
          transition: var(--transition-smooth);
        }

        .lp-btn-hero-demo:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(197, 160, 43, 0.35);
          filter: brightness(1.05);
        }

        .lp-btn-hero-recursos {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--color-white);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          text-decoration: none;
          font-size: 1.05rem;
          font-weight: 600;
          padding: 1rem 2rem;
          border-radius: 12px;
          transition: var(--transition-smooth);
        }

        .lp-btn-hero-recursos:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .lp-hero-microcopy {
          font-family: var(--font-secondary);
          font-size: 0.85rem;
          color: var(--color-slate-400);
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .lp-hero-microcopy span {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .lp-hero-microcopy span::before {
          content: "•";
          color: var(--color-petrol-light);
          font-weight: bold;
        }

        /* --------------------------------------------------
           Hero Right Column: Dashboard Mockup (Premium CSS)
           -------------------------------------------------- */
        .lp-hero-visual {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
        }

        .lp-mockup-wrapper {
          position: relative;
          width: 100%;
          max-width: 580px;
          height: 420px;
          background: rgba(5, 38, 44, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          box-shadow:
            0 20px 50px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 1.5rem;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        /* Mockup Top Bar */
        .lp-mockup-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding-bottom: 1rem;
        }

        .lp-mockup-dots {
          display: flex;
          gap: 0.35rem;
        }

        .lp-mockup-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .lp-mockup-dot.red { background-color: #ff5f56; }
        .lp-mockup-dot.yellow { background-color: #ffbd2e; }
        .lp-mockup-dot.green { background-color: #27c93f; }

        .lp-mockup-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-slate-400);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        /* Mockup Grid Area */
        .lp-mockup-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          flex-grow: 1;
        }

        .lp-mockup-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.1rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: var(--transition-smooth);
        }

        .lp-mockup-card:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.08);
        }

        .lp-mockup-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .lp-mockup-card-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-slate-400);
        }

        .lp-mockup-card-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-gold);
        }

        .lp-mockup-card-value {
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--color-white);
          letter-spacing: -0.01em;
        }

        .lp-mockup-card-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.15rem 0.45rem;
          border-radius: 99px;
          font-size: 0.65rem;
          font-weight: 700;
          background: rgba(43, 197, 120, 0.1);
          color: #2bc578;
        }

        /* Large Card (Chart) */
        .lp-mockup-card-full {
          grid-column: span 2;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 160px;
        }

        .lp-mockup-chart-svg {
          width: 100%;
          height: 70px;
          margin-top: 0.75rem;
        }

        /* Float Cards (Glassmorphism Overlay) */
        .lp-float-card {
          position: absolute;
          background: rgba(11, 79, 89, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 0.9rem 1.1rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          z-index: 20;
          transition: var(--transition-smooth);
        }

        .lp-float-card:hover {
          transform: translateY(-4px);
          background: rgba(11, 79, 89, 0.5);
          border-color: rgba(197, 160, 43, 0.25);
        }

        .lp-float-card-1 {
          top: -20px;
          right: -10px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-left: 3px solid var(--color-gold);
        }

        .lp-float-card-2 {
          bottom: -20px;
          left: -20px;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          width: 180px;
        }

        .lp-float-title {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--color-slate-300);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .lp-float-value {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--color-white);
        }

        .lp-float-subtitle {
          font-size: 0.65rem;
          color: var(--color-slate-400);
        }

        /* --------------------------------------------------
           SEÇÃO 01: PROBLEMA (Fundo Branco, Muito espaço)
           -------------------------------------------------- */
        .lp-problema-section {
          background-color: var(--color-white);
          color: var(--color-slate-900);
          padding: 8rem 4rem;
          position: relative;
          z-index: 10;
        }

        .lp-problema-container {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .lp-problema-header {
          text-align: center;
          margin-bottom: 5rem;
        }

        .lp-problema-title {
          font-size: 2.85rem;
          font-weight: 800;
          color: var(--color-slate-900);
          letter-spacing: -0.03em;
          margin-bottom: 1.5rem;
          line-height: 1.2;
        }

        .lp-problema-subtitle {
          font-size: 1.2rem;
          line-height: 1.65;
          color: var(--color-slate-500);
          max-width: 760px;
          margin: 0 auto;
        }

        .lp-problema-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }

        .lp-problema-card {
          background-color: var(--color-slate-50);
          border: 1px solid var(--color-slate-200);
          border-radius: 16px;
          padding: 2.25rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.03);
          transition: var(--transition-smooth);
        }

        .lp-problema-card:hover {
          transform: translateY(-6px);
          background-color: var(--color-white);
          border-color: var(--color-petrol-light);
          box-shadow: 0 12px 25px rgba(11, 79, 89, 0.08);
        }

        .lp-problema-card-icon-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .lp-problema-card-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .lp-problema-card-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--color-slate-900);
        }

        .lp-problema-card-desc {
          font-size: 0.95rem;
          line-height: 1.6;
          color: var(--color-slate-500);
        }

        /* --------------------------------------------------
           SEÇÃO 02: SOLUÇÃO (Fundo Gradiente Petrol, 2 Colunas)
           -------------------------------------------------- */
        .lp-solucao-section {
          background: linear-gradient(135deg, #052e16 0%, #042125 50%, #083c44 100%);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding: 8rem 4rem 10rem;
          position: relative;
          z-index: 10;
        }

        .lp-solucao-container {
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 6rem;
          align-items: center;
        }

        .lp-solucao-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .lp-solucao-title {
          font-size: 3rem;
          font-weight: 800;
          line-height: 1.15;
          color: var(--color-white);
          letter-spacing: -0.03em;
          margin-bottom: 1.5rem;
        }

        .lp-solucao-desc {
          font-size: 1.15rem;
          line-height: 1.7;
          color: var(--color-slate-300);
          margin-bottom: 3rem;
          max-width: 580px;
        }

        /* Mockup Premium Lado Direito (Solução) */
        .lp-solucao-mockup-wrapper {
          position: relative;
          width: 100%;
          max-width: 580px;
          height: 440px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 1.5rem;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .lp-solucao-mockup-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding-bottom: 0.75rem;
        }

        .lp-solucao-mockup-search {
          height: 24px;
          width: 140px;
          background: rgba(255,255,255,0.05);
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.08);
          font-size: 0.65rem;
          color: rgba(255,255,255,0.4);
          display: flex;
          align-items: center;
          padding-left: 0.5rem;
        }

        .lp-solucao-mockup-body {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          flex-grow: 1;
        }

        .lp-solucao-mockup-left {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .lp-solucao-mockup-item {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 10px;
          padding: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.75rem;
          transition: var(--transition-smooth);
        }

        .lp-solucao-mockup-item:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(197, 160, 43, 0.15);
        }

        .lp-solucao-mockup-status {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          background: rgba(43, 197, 120, 0.1);
          color: #2bc578;
        }

        .lp-solucao-mockup-status.pending {
          background: rgba(197, 160, 43, 0.1);
          color: var(--color-gold-light);
        }

        .lp-solucao-mockup-right {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .lp-solucao-chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .lp-solucao-chart-svg {
          width: 100%;
          height: 120px;
          margin-top: 1rem;
        }

        /* --------------------------------------------------
           SEÇÃO: POR QUE ESCOLHER O MEMORIUS?
           -------------------------------------------------- */
        .lp-escolha-section {
          background: linear-gradient(180deg, #ffffff 0%, #f0f7f9 100%);
          color: var(--color-slate-900);
          padding: 8rem 4rem;
          position: relative;
          z-index: 10;
        }

        .lp-escolha-container {
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5rem;
          align-items: center;
          position: relative;
          z-index: 5;
        }

        .lp-escolha-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .lp-escolha-title {
          font-size: 2.75rem;
          font-weight: 800;
          color: var(--color-slate-900);
          letter-spacing: -0.03em;
          line-height: 1.15;
        }

        .lp-escolha-subtitle {
          font-size: 1.15rem;
          line-height: 1.65;
          color: var(--color-slate-500);
          margin-bottom: 2rem;
          max-width: 600px;
        }

        .lp-escolha-blocks {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .lp-escolha-block {
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(11, 79, 89, 0.08);
          border-radius: 16px;
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          box-shadow: 0 4px 15px rgba(11, 79, 89, 0.02);
          transition: var(--transition-smooth);
        }

        .lp-escolha-block:hover {
          background: #ffffff;
          border-color: var(--color-petrol-light);
          transform: translateY(-4px);
          box-shadow: 0 12px 25px rgba(11, 79, 89, 0.06);
        }

        .lp-escolha-block-icon {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          background: rgba(11, 79, 89, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-petrol);
          flex-shrink: 0;
          transition: var(--transition-smooth);
        }

        .lp-escolha-block:hover .lp-escolha-block-icon {
          background: var(--color-petrol);
          color: var(--color-white);
        }

        .lp-escolha-block-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--color-slate-900);
        }

        .lp-escolha-block-text {
          font-size: 0.88rem;
          line-height: 1.5;
          color: var(--color-slate-500);
        }

        /* 3D Mockup Styling */
        .lp-3d-container {
          position: relative;
          width: 100%;
          height: 480px;
          perspective: 1000px;
          z-index: 5;
        }

        .lp-3d-base {
          position: absolute;
          top: 10%;
          left: 5%;
          width: 75%;
          height: 75%;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(11, 79, 89, 0.08);
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
          transform: rotateY(-10deg) rotateX(10deg);
          transition: var(--transition-smooth);
          z-index: 2;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .lp-3d-container:hover .lp-3d-base {
          transform: rotateY(-5deg) rotateX(5deg) translateY(-4px);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.08);
        }

        .lp-3d-floating-card {
          position: absolute;
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-radius: 12px;
          padding: 0.85rem;
          box-shadow: 0 15px 35px rgba(11, 79, 89, 0.12);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .lp-3d-card-title {
          font-size: 0.65rem;
          color: var(--color-slate-400);
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 0.25rem;
        }

        .lp-3d-card-value {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--color-slate-900);
        }

        .lp-3d-card-clientes {
          top: 0;
          right: 5%;
          z-index: 10;
          width: 140px;
          transform: translateZ(40px) rotateY(-10deg) rotateX(10deg);
        }
        .lp-3d-container:hover .lp-3d-card-clientes {
          transform: translateZ(65px) rotateY(-5deg) rotateX(5deg) translate(-5px, -5px);
          box-shadow: 0 20px 45px rgba(11, 79, 89, 0.18);
        }

        .lp-3d-card-receita {
          bottom: 5%;
          left: -2%;
          z-index: 12;
          width: 155px;
          border-left: 3px solid var(--color-gold);
          transform: translateZ(60px) rotateY(-10deg) rotateX(10deg);
        }
        .lp-3d-container:hover .lp-3d-card-receita {
          transform: translateZ(85px) rotateY(-5deg) rotateX(5deg) translate(5px, 5px);
          box-shadow: 0 22px 48px rgba(11, 79, 89, 0.2);
        }

        .lp-3d-card-mensalidades {
          bottom: 15%;
          right: -2%;
          z-index: 14;
          width: 160px;
          transform: translateZ(30px) rotateY(-10deg) rotateX(10deg);
        }
        .lp-3d-container:hover .lp-3d-card-mensalidades {
          transform: translateZ(55px) rotateY(-5deg) rotateX(5deg) translate(-2px, 2px);
          box-shadow: 0 18px 40px rgba(11, 79, 89, 0.16);
        }

        .lp-3d-card-atendimento {
          top: 35%;
          left: -5%;
          z-index: 11;
          width: 135px;
          transform: translateZ(25px) rotateY(-10deg) rotateX(10deg);
        }
        .lp-3d-container:hover .lp-3d-card-atendimento {
          transform: translateZ(45px) rotateY(-5deg) rotateX(5deg) translate(2px, -2px);
          box-shadow: 0 15px 35px rgba(11, 79, 89, 0.14);
        }

        .lp-3d-badge {
          position: absolute;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.35rem 0.75rem;
          border-radius: 99px;
          font-size: 0.65rem;
          font-weight: 700;
          box-shadow: 0 8px 20px rgba(0,0,0,0.04);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .lp-3d-badge-online {
          top: 15%;
          left: 12%;
          background: rgba(43, 197, 120, 0.12);
          border: 1px solid rgba(43, 197, 120, 0.25);
          color: #1e8a52;
          z-index: 15;
          transform: translateZ(35px) rotateY(-10deg) rotateX(10deg);
        }
        .lp-3d-container:hover .lp-3d-badge-online {
          transform: translateZ(60px) rotateY(-5deg) rotateX(5deg) translate(-2px, -3px);
        }

        .lp-3d-badge-backup {
          bottom: 30%;
          left: 20%;
          background: rgba(11, 79, 89, 0.1);
          border: 1px solid rgba(11, 79, 89, 0.2);
          color: var(--color-petrol);
          z-index: 16;
          transform: translateZ(45px) rotateY(-10deg) rotateX(10deg);
        }
        .lp-3d-container:hover .lp-3d-badge-backup {
          transform: translateZ(75px) rotateY(-5deg) rotateX(5deg) translate(1px, 2px);
        }

        .lp-3d-badge-multi {
          top: 55%;
          right: 12%;
          background: rgba(197, 160, 43, 0.12);
          border: 1px solid rgba(197, 160, 43, 0.25);
          color: #9c7f1f;
          z-index: 17;
          transform: translateZ(30px) rotateY(-10deg) rotateX(10deg);
        }
        .lp-3d-container:hover .lp-3d-badge-multi {
          transform: translateZ(50px) rotateY(-5deg) rotateX(5deg) translate(-1px, 1px);
        }

        .lp-escolha-badges-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1.5rem;
          margin-top: 5rem;
          flex-wrap: wrap;
          width: 100%;
          z-index: 5;
          position: relative;
        }

        .lp-badge-item {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.5rem 1.25rem;
          background: rgba(11, 79, 89, 0.05);
          border: 1px solid rgba(11, 79, 89, 0.1);
          border-radius: 99px;
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--color-petrol-dark);
          box-shadow: 0 4px 6px rgba(0,0,0,0.01);
          transition: var(--transition-smooth);
        }

        .lp-badge-item:hover {
          background: rgba(11, 79, 89, 0.08);
          border-color: var(--color-gold);
          transform: scale(1.03);
        }

        /* --------------------------------------------------
           SEÇÃO 03: COMO FUNCIONA (Timeline)
           -------------------------------------------------- */
        .lp-timeline-section {
          background-color: var(--color-green-deep);
          padding: 8rem 4rem;
          position: relative;
          z-index: 10;
        }

        .lp-timeline-container {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .lp-timeline-flow {
          display: flex;
          justify-content: space-between;
          position: relative;
          margin-top: 6rem;
          padding-bottom: 2rem;
        }

        .lp-timeline-line {
          position: absolute;
          top: 30px;
          left: 40px;
          right: 40px;
          height: 2px;
          background: linear-gradient(90deg, rgba(11, 79, 89, 0.1) 0%, rgba(197, 160, 43, 0.4) 50%, rgba(11, 79, 89, 0.1) 100%);
          z-index: 1;
        }

        .lp-timeline-step {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          width: 130px;
          transition: var(--transition-smooth);
        }

        .lp-timeline-step:hover {
          transform: translateY(-4px);
        }

        .lp-timeline-icon-box {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(11, 79, 89, 0.8);
          border: 2px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-gold-light);
          margin-bottom: 1.25rem;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          transition: var(--transition-smooth);
        }

        .lp-timeline-step:hover .lp-timeline-icon-box {
          border-color: var(--color-gold);
          box-shadow: 0 0 15px rgba(197, 160, 43, 0.4);
          color: var(--color-white);
        }

        .lp-timeline-step-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--color-white);
          margin-bottom: 0.5rem;
        }

        .lp-timeline-step-desc {
          font-size: 0.75rem;
          line-height: 1.4;
          color: var(--color-slate-400);
        }

        /* --------------------------------------------------
           SEÇÃO 04: BENEFÍCIOS (Grid 8 Cards)
           -------------------------------------------------- */
        .lp-beneficios-section {
          background: linear-gradient(180deg, rgba(2, 20, 10, 0.8) 0%, rgba(4, 33, 37, 0.9) 100%);
          border-top: 1px solid rgba(255, 255, 255, 0.03);
          padding: 8rem 4rem;
          position: relative;
          z-index: 10;
        }

        .lp-beneficios-container {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .lp-beneficios-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
        }

        .lp-beneficios-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 16px;
          padding: 2.25rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          transition: var(--transition-smooth);
        }

        .lp-beneficios-card:hover {
          transform: translateY(-6px);
          background: rgba(11, 79, 89, 0.15);
          border-color: rgba(197, 160, 43, 0.2);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
        }

        .lp-beneficios-card-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-gold-light);
          transition: var(--transition-smooth);
        }

        .lp-beneficios-card:hover .lp-beneficios-card-icon {
          background: rgba(197, 160, 43, 0.1);
          border-color: var(--color-gold);
          color: var(--color-white);
        }

        .lp-beneficios-card-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--color-white);
        }

        .lp-beneficios-card-desc {
          font-size: 0.88rem;
          line-height: 1.55;
          color: var(--color-slate-400);
        }

        /* --------------------------------------------------
           SEÇÃO 04-B: PLANOS
           -------------------------------------------------- */
        .lp-planos-section {
          padding: 8rem 4rem;
          background: linear-gradient(180deg, rgba(4, 33, 37, 0.9) 0%, rgba(2, 20, 10, 0.95) 100%);
          border-top: 1px solid rgba(255, 255, 255, 0.03);
          position: relative;
          z-index: 10;
        }

        .lp-planos-container {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .lp-planos-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          margin-top: 4rem;
          width: 100%;
        }

        .lp-plano-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 3.5rem 2.25rem 3rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          transition: var(--transition-smooth);
        }

        .lp-plano-card:hover {
          transform: translateY(-8px);
          background: rgba(11, 79, 89, 0.1);
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        /* Plano em Destaque */
        .lp-plano-card.highlighted {
          border: 2px solid var(--color-gold);
          background: rgba(11, 79, 89, 0.15);
          box-shadow: 0 15px 30px rgba(197, 160, 43, 0.1);
        }

        .lp-plano-card.highlighted:hover {
          background: rgba(11, 79, 89, 0.22);
          box-shadow: 0 25px 45px rgba(197, 160, 43, 0.15);
        }

        .lp-plano-badge {
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, var(--color-gold-light), var(--color-gold));
          color: var(--color-green-deep);
          padding: 0.35rem 1rem;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .lp-plano-name {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--color-white);
          margin-bottom: 0.5rem;
        }

        .lp-plano-subtitle-text {
          font-size: 0.9rem;
          color: var(--color-slate-400);
          margin-bottom: 2.5rem;
          line-height: 1.5;
          min-height: 42px;
        }

        .lp-plano-features {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 3rem;
          flex-grow: 1;
        }

        .lp-plano-feature-item {
          font-size: 0.95rem;
          color: var(--color-slate-300);
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .lp-plano-feature-check {
          color: var(--color-gold-light);
          flex-shrink: 0;
          font-weight: bold;
        }

        .lp-plano-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.9rem;
          border-radius: 12px;
          font-size: 0.98rem;
          font-weight: 700;
          text-decoration: none;
          transition: var(--transition-smooth);
        }

        .lp-plano-btn.secondary {
          color: var(--color-white);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .lp-plano-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .lp-plano-btn.primary {
          color: var(--color-green-deep);
          background: linear-gradient(135deg, var(--color-gold-light), var(--color-gold));
          box-shadow: 0 4px 14px rgba(197, 160, 43, 0.2);
        }

        .lp-plano-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(197, 160, 43, 0.35);
          filter: brightness(1.05);
        }

        .lp-plano-btn.primary:active {
          transform: translateY(0);
        }

        /* Rodapé de Planos */
        .lp-planos-footer {
          text-align: center;
          margin-top: 5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          z-index: 5;
          position: relative;
        }

        .lp-planos-footer-text {
          font-size: 1.1rem;
          color: var(--color-slate-300);
          max-width: 500px;
          line-height: 1.5;
        }

        .lp-btn-whatsapp-footer {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          color: var(--color-white);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          text-decoration: none;
          font-size: 0.98rem;
          font-weight: 700;
          padding: 0.85rem 2rem;
          border-radius: 12px;
          transition: var(--transition-smooth);
        }

        .lp-btn-whatsapp-footer:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--color-gold);
          transform: translateY(-2px);
        }

        /* --------------------------------------------------
           SEÇÃO: FAQ (Sprint 05)
           -------------------------------------------------- */
        .lp-faq-section {
          padding: 8rem 4rem;
          background: linear-gradient(180deg, #f0f7f9 0%, #ffffff 100%);
          color: var(--color-slate-900);
          position: relative;
          z-index: 10;
        }

        .lp-faq-container {
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
        }

        .lp-faq-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 4rem;
        }

        .lp-faq-item {
          background: #ffffff;
          border: 1px solid var(--color-slate-200);
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.02);
          transition: var(--transition-smooth);
        }

        .lp-faq-item:hover {
          border-color: var(--color-petrol-light);
          box-shadow: 0 10px 20px rgba(11, 79, 89, 0.04);
        }

        .lp-faq-trigger {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          background: none;
          border: none;
          text-align: left;
          font-family: inherit;
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--color-slate-900);
          cursor: pointer;
          gap: 1.5rem;
        }

        .lp-faq-arrow {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          color: var(--color-slate-400);
          flex-shrink: 0;
        }

        .lp-faq-item.active .lp-faq-arrow {
          transform: rotate(180deg);
          color: var(--color-petrol);
        }

        .lp-faq-content {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
          font-size: 0.95rem;
          line-height: 1.6;
          color: var(--color-slate-500);
        }

        .lp-faq-item.active .lp-faq-content {
          max-height: 200px;
          opacity: 1;
          padding-top: 1rem;
        }

        /* --------------------------------------------------
           SEÇÃO 05: CTA PREMIUM
           -------------------------------------------------- */
        .lp-cta-section {
          padding: 6rem 4rem;
          max-width: 1200px;
          margin: 0 auto 8rem;
          width: 100%;
          position: relative;
          z-index: 10;
        }

        .lp-cta-wrapper {
          background: linear-gradient(135deg, rgba(11, 79, 89, 0.45) 0%, rgba(5, 46, 22, 0.45) 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 5rem 4rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2.5rem;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .lp-cta-title {
          font-size: 3rem;
          font-weight: 800;
          color: var(--color-white);
          letter-spacing: -0.02em;
          max-width: 800px;
        }

        .lp-cta-bullets {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .lp-cta-bullet-item {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1.25rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 99px;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--color-slate-300);
        }

        .lp-cta-bullet-dot {
          width: 6px;
          height: 6px;
          background-color: var(--color-gold);
          border-radius: 50%;
        }

        .lp-cta-buttons {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        /* --------------------------------------------------
           Footer
           -------------------------------------------------- */
        .lp-footer {
          background: rgba(2, 20, 10, 0.95);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding: 4rem 4rem 2rem;
          position: relative;
          z-index: 10;
        }

        .lp-footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 4rem;
          margin-bottom: 3rem;
        }

        .lp-footer-brand {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .lp-footer-desc {
          font-size: 0.9rem;
          line-height: 1.6;
          color: var(--color-slate-400);
          max-width: 320px;
        }

        .lp-footer-links-col {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .lp-footer-col-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--color-white);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .lp-footer-links {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          list-style: none;
        }

        .lp-footer-links a {
          color: var(--color-slate-400);
          text-decoration: none;
          font-size: 0.9rem;
          transition: var(--transition-smooth);
        }

        .lp-footer-links a:hover {
          color: var(--color-white);
        }

        .lp-footer-bottom {
          max-width: 1200px;
          margin: 0 auto;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .lp-footer-copy {
          font-size: 0.85rem;
          color: var(--color-slate-500);
        }

        /* --------------------------------------------------
           Responsive Styles
           -------------------------------------------------- */
        @media (max-width: 1024px) {
          .lp-navbar {
            padding: 0 2rem;
          }
          .lp-hero-section {
            grid-template-columns: 1fr;
            padding: 8rem 2rem 4rem;
            gap: 4rem;
            text-align: center;
          }
          .lp-hero-content {
            align-items: center;
          }
          .lp-hero-title {
            font-size: 2.85rem;
          }
          .lp-hero-buttons {
            justify-content: center;
          }
          
          .lp-problema-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
          }

          .lp-solucao-container {
            grid-template-columns: 1fr;
            gap: 4rem;
            text-align: center;
          }
          .lp-solucao-content {
            align-items: center;
          }
          .lp-solucao-mockup-wrapper {
            margin: 0 auto;
          }

          .lp-escolha-container {
            grid-template-columns: 1fr;
            gap: 4rem;
            text-align: center;
          }
          .lp-3d-container {
            margin: 0 auto;
          }

          .lp-timeline-flow {
            flex-wrap: wrap;
            justify-content: center;
            gap: 3rem;
          }
          .lp-timeline-line {
            display: none;
          }

          .lp-beneficios-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
          }

          .lp-planos-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
          }

          .lp-footer-content {
            grid-template-columns: 1.5fr 1fr 1fr;
            gap: 2rem;
          }
        }

        @media (max-width: 768px) {
          .lp-nav-links, .lp-nav-actions {
            display: none;
          }
          
          .lp-menu-toggle {
            display: block;
          }

          .lp-navbar {
            height: 70px;
          }

          /* Mobile Menu Overlay */
          .lp-nav-mobile {
            display: ${mobileMenuOpen ? "flex" : "none"};
            position: fixed;
            top: 70px;
            left: 0;
            width: 100%;
            height: calc(100vh - 70px);
            background: var(--color-green-deep);
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2rem;
            z-index: 90;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            animation: slide-in 0.3s ease-out;
          }

          @keyframes slide-in {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .lp-nav-mobile a {
            color: var(--color-white);
            text-decoration: none;
            font-size: 1.25rem;
            font-weight: 600;
          }

          .lp-btn-mobile-demo {
            color: var(--color-green-deep);
            background: linear-gradient(135deg, var(--color-gold-light) 0%, var(--color-gold) 100%);
            padding: 0.85rem 2rem;
            border-radius: 10px;
            font-weight: 700;
          }

          .lp-problema-section {
            padding: 6rem 2rem;
          }
          .lp-problema-title {
            font-size: 2.25rem;
          }
          .lp-problema-grid {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }

          .lp-solucao-section {
            padding: 6rem 2rem;
          }
          .lp-solucao-title {
            font-size: 2.25rem;
          }

          /* Por que Escolher (Mobile) */
          .lp-escolha-section {
            padding: 6rem 2rem;
          }
          .lp-escolha-title {
            font-size: 2.25rem;
          }
          .lp-escolha-blocks {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }
          .lp-escolha-block:hover {
            transform: none;
          }

          /* Simplificação Automática do Mockup 3D no Mobile */
          .lp-3d-container {
            height: auto;
            perspective: none;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            align-items: center;
          }
          .lp-3d-base {
            position: relative;
            top: 0; left: 0;
            width: 100%;
            height: auto;
            transform: none !important;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
          }
          .lp-3d-floating-card {
            position: relative;
            top: 0; left: 0; right: 0; bottom: 0;
            width: 100% !important;
            transform: none !important;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05) !important;
          }
          .lp-3d-badge {
            position: relative;
            top: 0; left: 0; right: 0; bottom: 0;
            transform: none !important;
            display: inline-flex;
            justify-content: center;
            width: 100%;
          }

          .lp-timeline-section {
            padding: 6rem 2rem;
          }
          .lp-timeline-flow {
            flex-direction: column;
            align-items: flex-start;
            gap: 2rem;
            padding-left: 2rem;
            margin-top: 4rem;
          }
          
          .lp-timeline-flow::before {
            content: "";
            position: absolute;
            top: 20px;
            bottom: 20px;
            left: 50px;
            width: 2px;
            background: linear-gradient(180deg, var(--color-petrol-light) 0%, var(--color-gold) 50%, var(--color-petrol-light) 100%);
            z-index: 1;
          }

          .lp-timeline-step {
            flex-direction: row;
            text-align: left;
            width: 100%;
            gap: 1.5rem;
          }
          .lp-timeline-icon-box {
            margin-bottom: 0;
            flex-shrink: 0;
            width: 50px;
            height: 50px;
          }
          .lp-timeline-step-content {
            display: flex;
            flex-direction: column;
          }

          .lp-beneficios-section {
            padding: 6rem 2rem;
          }
          .lp-beneficios-grid {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }

          /* Planos Mobile */
          .lp-planos-section {
            padding: 6rem 2rem;
          }
          .lp-planos-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          .lp-plano-card {
            padding: 3rem 1.5rem 2.5rem;
          }
          .lp-plano-subtitle-text {
            min-height: auto;
            margin-bottom: 1.5rem;
          }

          /* FAQ Mobile */
          .lp-faq-section {
            padding: 6rem 2rem;
          }
          .lp-faq-trigger {
            font-size: 1rem;
          }
          .lp-faq-content {
            font-size: 0.9rem;
          }
          .lp-faq-item {
            padding: 1.25rem;
          }

          .lp-cta-wrapper {
            padding: 3rem 1.5rem;
          }
          .lp-cta-title {
            font-size: 1.85rem;
          }
          .lp-cta-bullets {
            flex-direction: column;
            gap: 0.75rem;
            width: 100%;
          }
          .lp-cta-bullet-item {
            width: 100%;
            justify-content: center;
          }
          .lp-cta-buttons {
            flex-direction: column;
            width: 100%;
            gap: 1rem;
          }
          .lp-cta-buttons a {
            width: 100%;
          }

          .lp-footer-content {
            grid-template-columns: 1fr;
            gap: 2.5rem;
          }

          .lp-float-card-2 {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .lp-hero-title {
            font-size: 2.25rem;
          }
          .lp-hero-buttons {
            flex-direction: column;
            width: 100%;
          }
          .lp-btn-hero-demo, .lp-btn-hero-recursos {
            width: 100%;
          }
          .lp-hero-microcopy {
            flex-direction: column;
            gap: 0.5rem;
            align-items: center;
          }
          .lp-mockup-wrapper {
            height: 360px;
          }
          .lp-float-card-1 {
            display: none;
          }
        }
      `}</style>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Memorius",
            "url": "https://www.memorius.com.br",
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+55 91 98175-5021",
              "contactType": "sales"
            }
          })
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Memorius",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "description": "CRM em nuvem para empresas de assistência familiar e planos funerários."
          })
        }}
      />

      <div className="lp-grid" />
      <div className="lp-orb-1" />
      <div className="lp-orb-2" />

      {/* --------------------------------------------------
         Navbar
         -------------------------------------------------- */}
      <nav className="lp-navbar">
        <a href="#" className="lp-logo-link">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Memorius" style={{ height: "42px", width: "auto", objectFit: "contain" }} />
        </a>

        <ul className="lp-nav-links">
          <li><a href="#problema">Problema</a></li>
          <li><a href="#solucao">Solução</a></li>
          <li><a href="#escolha">Diferenciais</a></li>
          <li><a href="#como-funciona">Como funciona</a></li>
          <li><a href="#beneficios">Benefícios</a></li>
          <li><a href="#planos">Planos</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>

        <div className="lp-nav-actions">
          <a href={loginUrl} className="lp-btn-entrar">Acessar Plataforma</a>
        </div>

        <button 
          className="lp-menu-toggle" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          aria-label={mobileMenuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className="lp-nav-mobile">
        <a href="#problema" onClick={() => setMobileMenuOpen(false)}>Problema</a>
        <a href="#solucao" onClick={() => setMobileMenuOpen(false)}>Solução</a>
        <a href="#escolha" onClick={() => setMobileMenuOpen(false)}>Diferenciais</a>
        <a href="#como-funciona" onClick={() => setMobileMenuOpen(false)}>Como funciona</a>
        <a href="#beneficios" onClick={() => setMobileMenuOpen(false)}>Benefícios</a>
        <a href="#planos" onClick={() => setMobileMenuOpen(false)}>Planos</a>
        <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
        <a href={loginUrl} onClick={() => setMobileMenuOpen(false)}>Acessar Plataforma</a>
        <a href="https://wa.me/5591981755021" target="_blank" rel="noopener noreferrer" className="lp-btn-mobile-demo" onClick={() => setMobileMenuOpen(false)}>
          Solicitar Demonstração
        </a>
      </div>

      {/* --------------------------------------------------
         Hero Section
         -------------------------------------------------- */}
      <header className="lp-hero-section">
        <div className="lp-hero-content">
          <div className="lp-hero-badge">
            <span className="lp-hero-badge-dot" />
            Plataforma SaaS para Gestão Funerária
          </div>
          
          <h1 className="lp-hero-title">
            Gestão inteligente para <span>Planos de Assistência Familiar.</span>
          </h1>

          <p className="lp-hero-subtitle">
            Organize clientes, contratos, mensalidades, atendimentos e cobranças em uma única plataforma segura, robusta e moderna.
          </p>

          <div className="lp-hero-buttons">
            <a href="https://wa.me/5591981755021" target="_blank" rel="noopener noreferrer" className="lp-btn-hero-demo">
              Solicitar Demonstração
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
            <a href="#problema" className="lp-btn-hero-recursos">
              Conhecer a Plataforma
            </a>
          </div>

          <div className="lp-hero-microcopy">
            <span>Sem instalação</span>
            <span>100% em nuvem</span>
            <span>Suporte especializado</span>
          </div>
        </div>

        <div className="lp-hero-visual">
          {/* Glassmorphism float cards */}
          <div className="lp-float-card lp-float-card-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2bc578" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <div>
              <div className="lp-float-title">Mensalidade Paga</div>
              <div className="lp-float-subtitle">Contrato #3049 - Hoje às 16:45</div>
            </div>
          </div>

          <div className="lp-float-card lp-float-card-2">
            <span className="lp-float-title">Faturamento Recente</span>
            <span className="lp-float-value">R$ 48.910,00</span>
            <span className="lp-float-subtitle" style={{ color: "#2bc578" }}>▲ 18.2% este mês</span>
          </div>

          {/* Core Mockup Container */}
          <div className="lp-mockup-wrapper">
            <div className="lp-mockup-header">
              <div className="lp-mockup-dots">
                <span className="lp-mockup-dot red" />
                <span className="lp-mockup-dot yellow" />
                <span className="lp-mockup-dot green" />
              </div>
              <div className="lp-mockup-title">Memorius Dashboard</div>
              <div style={{ width: 36 }} />
            </div>

            <div className="lp-mockup-grid">
              {/* Stat Card 1 */}
              <div className="lp-mockup-card">
                <div className="lp-mockup-card-header">
                  <span className="lp-mockup-card-title">Clientes Ativos</span>
                  <div className="lp-mockup-card-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                </div>
                <div className="lp-mockup-card-value">1.482</div>
                <div>
                  <span className="lp-mockup-card-pill">▲ 12.4%</span>
                </div>
              </div>

              {/* Stat Card 2 */}
              <div className="lp-mockup-card" style={{ borderLeft: "2px solid var(--color-gold)" }}>
                <div className="lp-mockup-card-header">
                  <span className="lp-mockup-card-title">Contratos de Planos</span>
                  <div className="lp-mockup-card-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                  </div>
                </div>
                <div className="lp-mockup-card-value">98.6%</div>
                <div>
                  <span className="lp-mockup-card-pill" style={{ background: "rgba(197, 160, 43, 0.15)", color: "var(--color-gold-light)" }}>Adimplentes</span>
                </div>
              </div>

              {/* Chart Card */}
              <div className="lp-mockup-card lp-mockup-card-full">
                <div className="lp-mockup-card-header" style={{ marginBottom: 0 }}>
                  <span className="lp-mockup-card-title">Cobranças & Arrecadação (Semanal)</span>
                  <span className="lp-mockup-card-title" style={{ color: "var(--color-gold-light)" }}>Meta: R$ 50k</span>
                </div>
                
                {/* SVG spline chart */}
                <svg className="lp-mockup-chart-svg" viewBox="0 0 500 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(11, 79, 89, 0.4)" />
                      <stop offset="100%" stopColor="rgba(11, 79, 89, 0)" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  
                  {/* Area path */}
                  <path d="M 0 90 Q 80 50 150 70 T 300 30 T 420 45 T 500 15 L 500 100 L 0 100 Z" fill="url(#chartGradient)" />
                  
                  {/* Stroke path */}
                  <path d="M 0 90 Q 80 50 150 70 T 300 30 T 420 45 T 500 15" fill="none" stroke="var(--color-gold-light)" strokeWidth="2.5" strokeLinecap="round" />
                  
                  {/* Pulse dot at the end */}
                  <circle cx="500" cy="15" r="4" fill="var(--color-white)" />
                  <circle cx="500" cy="15" r="8" fill="var(--color-gold-light)" opacity="0.4" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------
         SEÇÃO 01: PROBLEMA
         -------------------------------------------------- */}
      <section id="problema" className="lp-problema-section">
        <div className="lp-problema-container">
          <div className="lp-problema-header">
            <h2 className="lp-problema-title">
              Sua empresa está crescendo...<br />mas sua gestão acompanha esse crescimento?
            </h2>
            <p className="lp-problema-subtitle">
              Planilhas, contratos perdidos, cobranças esquecidas e informações espalhadas reduzem a produtividade da sua equipe e afetam sua lucratividade.
            </p>
          </div>

          <div className="lp-problema-grid">
            <div className="lp-problema-card">
              <div className="lp-problema-card-icon-title">
                <span className="lp-problema-card-icon">📄</span>
                <h3 className="lp-problema-card-title">Contratos descentralizados</h3>
              </div>
              <p className="lp-problema-card-desc">
                Contratos em arquivos físicos ou pastas soltas no computador dificultam a consulta rápida e o controle de carências ou reajustes.
              </p>
            </div>

            <div className="lp-problema-card">
              <div className="lp-problema-card-icon-title">
                <span className="lp-problema-card-icon">💰</span>
                <h3 className="lp-problema-card-title">Cobranças manuais</h3>
              </div>
              <p className="lp-problema-card-desc">
                Geração manual de carnês e cobranças gera erros frequentes, esquecimentos e aumento direto na taxa de inadimplência dos planos.
              </p>
            </div>

            <div className="lp-problema-card">
              <div className="lp-problema-card-icon-title">
                <span className="lp-problema-card-icon">👥</span>
                <h3 className="lp-problema-card-title">Clientes sem histórico</h3>
              </div>
              <p className="lp-problema-card-desc">
                Dificuldade para identificar quais dependentes estão ativos, carências pendentes ou quais serviços foram consumidos por cada família.
              </p>
            </div>

            <div className="lp-problema-card">
              <div className="lp-problema-card-icon-title">
                <span className="lp-problema-card-icon">📊</span>
                <h3 className="lp-problema-card-title">Falta de indicadores</h3>
              </div>
              <p className="lp-problema-card-desc">
                Administrar a empresa sem ter clareza sobre o faturamento futuro projetado, índice de cancelamentos ou valores a receber no mês.
              </p>
            </div>

            <div className="lp-problema-card">
              <div className="lp-problema-card-icon-title">
                <span className="lp-problema-card-icon">☎️</span>
                <h3 className="lp-problema-card-title">Atendimento desorganizado</h3>
              </div>
              <p className="lp-problema-card-desc">
                Falhas no registro de ordens de serviço, atrasos em traslados ou falta de controle de estoque de urnas em momentos críticos de óbito.
              </p>
            </div>

            <div className="lp-problema-card">
              <div className="lp-problema-card-icon-title">
                <span className="lp-problema-card-icon">📁</span>
                <h3 className="lp-problema-card-title">Informações espalhadas</h3>
              </div>
              <p className="lp-problema-card-desc">
                Dados divididos em cadernos físicos, planilhas de Excel soltas e mensagens do WhatsApp, tornando o fluxo de informação lento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------
         SEÇÃO 02: SOLUÇÃO
         -------------------------------------------------- */}
      <section id="solucao" className="lp-solucao-section">
        <div className="lp-solucao-container">
          <div className="lp-solucao-content">
            <h2 className="lp-solucao-title">
              Uma única plataforma para controlar toda a operação.
            </h2>
            <p className="lp-solucao-desc">
              O Memorius foi desenhado especificamente para a gestão funerária e de planos de assistência familiar. Nós integramos todas as pontas do seu negócio em uma interface rápida, segura e baseada em nuvem, eliminando planilhas e o retrabalho de sua equipe.
            </p>
            <a href="https://wa.me/5591981755021" target="_blank" rel="noopener noreferrer" className="lp-btn-hero-demo">
              Solicitar Demonstração
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>

          <div className="lp-solucao-mockup-wrapper">
            <div className="lp-solucao-mockup-header">
              <div className="lp-mockup-dots">
                <span className="lp-mockup-dot red" />
                <span className="lp-mockup-dot yellow" />
                <span className="lp-mockup-dot green" />
              </div>
              <div className="lp-solucao-mockup-search">🔍 Buscar cliente...</div>
            </div>

            <div className="lp-solucao-mockup-body">
              <div className="lp-solucao-mockup-left">
                <div className="lp-solucao-mockup-item">
                  <div>
                    <strong>Maria S. Oliveira</strong>
                    <div style={{ fontSize: "0.6rem", opacity: 0.6 }}>Plano Familiar Bronze</div>
                  </div>
                  <span className="lp-solucao-mockup-status">Ativo</span>
                </div>

                <div className="lp-solucao-mockup-item">
                  <div>
                    <strong>Roberto Carlos Silva</strong>
                    <div style={{ fontSize: "0.6rem", opacity: 0.6 }}>Plano Individual Prata</div>
                  </div>
                  <span className="lp-solucao-mockup-status">Ativo</span>
                </div>

                <div className="lp-solucao-mockup-item">
                  <div>
                    <strong>Amanda Mendes K.</strong>
                    <div style={{ fontSize: "0.6rem", opacity: 0.6 }}>Plano Familiar Ouro</div>
                  </div>
                  <span className="lp-solucao-mockup-status pending">Pendente</span>
                </div>
              </div>

              <div className="lp-solucao-mockup-right">
                <div className="lp-solucao-chart-header">
                  <span style={{ fontSize: "0.7rem", color: "var(--color-slate-400)", fontWeight: 700 }}>Inadimplência vs Recebimento</span>
                </div>
                
                {/* SVG double line chart */}
                <svg className="lp-solucao-chart-svg" viewBox="0 0 250 120" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="30" x2="250" y2="30" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                  <line x1="0" y1="60" x2="250" y2="60" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                  <line x1="0" y1="90" x2="250" y2="90" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                  
                  {/* Recebimento (Green line going up) */}
                  <path d="M 0 100 Q 50 80 100 50 T 200 40 T 250 20" fill="none" stroke="#2bc578" strokeWidth="2" strokeLinecap="round" />
                  
                  {/* Inadimplência (Gold line going down) */}
                  <path d="M 0 30 Q 50 45 100 65 T 200 85 T 250 95" fill="none" stroke="var(--color-gold-light)" strokeWidth="2" strokeLinecap="round" />
                  
                  {/* Legend inside mockup */}
                  <circle cx="20" cy="115" r="3" fill="#2bc578" />
                  <text x="28" y="118" fill="rgba(255,255,255,0.5)" fontSize="6" fontFamily="sans-serif">Recebido</text>
                  
                  <circle cx="90" cy="115" r="3" fill="var(--color-gold-light)" />
                  <text x="98" y="118" fill="rgba(255,255,255,0.5)" fontSize="6" fontFamily="sans-serif">Atrasos</text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Separador Orgânico Superior (Solução -> Por Que Escolher) */}
      <div className="lp-separator" style={{ backgroundColor: "#ffffff" }}>
        <svg viewBox="0 0 1440 120" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 120C240 40 480 0 720 0C960 0 1200 40 1440 120V0H0V120Z" fill="#083c44" />
        </svg>
      </div>

      {/* --------------------------------------------------
         SEÇÃO: POR QUE ESCOLHER O MEMORIUS?
         -------------------------------------------------- */}
      <section id="escolha" className="lp-escolha-section">
        <div className="lp-escolha-grid-overlay" />
        <div className="lp-escolha-orb" style={{ top: "10%", left: "5%" }} />
        <div className="lp-escolha-orb" style={{ bottom: "10%", right: "5%", background: "radial-gradient(circle, rgba(197, 160, 43, 0.03) 0%, transparent 70%)" }} />

        <div className="lp-escolha-container">
          {/* Coluna Esquerda: Mockup 3D Flutuante */}
          <div className="lp-3d-container">
            {/* Badges de Destaque Técnico */}
            <span className="lp-3d-badge lp-3d-badge-online">
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#27c93f", boxShadow: "0 0 6px #27c93f" }} />
              Plataforma Online
            </span>

            <span className="lp-3d-badge lp-3d-badge-backup">
              🛡️ Backup Automático
            </span>

            <span className="lp-3d-badge lp-3d-badge-multi">
              🏢 Suporte Multiempresa
            </span>

            {/* Base do Mockup */}
            <div className="lp-3d-base">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(11, 79, 89, 0.06)", paddingBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--color-petrol)", letterSpacing: "0.05em" }}>OPERACIONAL</span>
                <span style={{ fontSize: "0.55rem", background: "#f1f5f9", padding: "0.15rem 0.35rem", borderRadius: 4, color: "#475569" }}>Atualizado</span>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flexGrow: 1, justifyContent: "center" }}>
                <div style={{ height: 6, width: "60%", background: "#cbd5e1", borderRadius: 3 }} />
                <div style={{ height: 6, width: "85%", background: "#e2e8f0", borderRadius: 3 }} />
                <div style={{ height: 6, width: "45%", background: "#e2e8f0", borderRadius: 3 }} />
              </div>

              {/* Mini SVG Graph Inside Base */}
              <svg viewBox="0 0 100 30" style={{ width: "100%", height: 30, opacity: 0.6 }}>
                <path d="M0 25 Q25 10 50 20 T100 5 L100 30 L0 30 Z" fill="rgba(11, 79, 89, 0.05)" />
                <path d="M0 25 Q25 10 50 20 T100 5" fill="none" stroke="var(--color-petrol)" strokeWidth="1.5" />
              </svg>
            </div>

            {/* Floating Card: Clientes Ativos */}
            <div className="lp-3d-floating-card lp-3d-card-clientes">
              <span className="lp-3d-card-title">Clientes Ativos</span>
              <div className="lp-3d-card-value">1.482</div>
              <div style={{ fontSize: "0.55rem", color: "#2bc578", fontWeight: 700, marginTop: "0.15rem" }}>▲ 12.4% este mês</div>
            </div>

            {/* Floating Card: Receita Mensal */}
            <div className="lp-3d-floating-card lp-3d-card-receita">
              <span className="lp-3d-card-title">Receita Projetada</span>
              <div className="lp-3d-card-value" style={{ color: "var(--color-petrol-dark)" }}>R$ 48.910</div>
              <div style={{ fontSize: "0.55rem", color: "var(--color-slate-500)", marginTop: "0.15rem" }}>Previsão de caixa estável</div>
            </div>

            {/* Floating Card: Mensalidades */}
            <div className="lp-3d-floating-card lp-3d-card-mensalidades">
              <span className="lp-3d-card-title">Carnês Gerados</span>
              <div className="lp-3d-card-value">4.290</div>
              <div style={{ fontSize: "0.55rem", color: "#2bc578", fontWeight: 700, marginTop: "0.15rem" }}>✓ Lote processado</div>
            </div>

            {/* Floating Card: Atendimento */}
            <div className="lp-3d-floating-card lp-3d-card-atendimento">
              <span className="lp-3d-card-title">Chamados OS</span>
              <div className="lp-3d-card-value">32 Atendidos</div>
              <div style={{ fontSize: "0.55rem", color: "var(--color-slate-500)", marginTop: "0.15rem" }}>Tempo de resposta: 4min</div>
            </div>
          </div>

          {/* Coluna Direita: Informações e Diferenciais */}
          <div className="lp-escolha-content">
            <h2 className="lp-escolha-title">
              Mais do que um software.<br />Uma plataforma para organizar toda a operação.
            </h2>
            <p className="lp-escolha-subtitle">
              O Memorius conecta clientes, contratos, mensalidades, atendimento, indicadores e gestão financeira em um único ambiente seguro e intuitivo.
            </p>

            <div className="lp-escolha-blocks">
              {/* Bloco 1 */}
              <div className="lp-escolha-block">
                <div className="lp-escolha-block-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </svg>
                </div>
                <div>
                  <h3 className="lp-escolha-block-title">CRM Inteligente</h3>
                  <p className="lp-escolha-block-text">Centralize clientes, dependentes e histórico completo em tela única.</p>
                </div>
              </div>

              {/* Bloco 2 */}
              <div className="lp-escolha-block">
                <div className="lp-escolha-block-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div>
                  <h3 className="lp-escolha-block-title">Contratos Digitais</h3>
                  <p className="lp-escolha-block-text">Modelos personalizados com impressão instantânea e timbre dinâmico.</p>
                </div>
              </div>

              {/* Bloco 3 */}
              <div className="lp-escolha-block">
                <div className="lp-escolha-block-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
                <div>
                  <h3 className="lp-escolha-block-title">Cobrança Integrada</h3>
                  <p className="lp-escolha-block-text">Geração automática de cobranças recorrentes e controle financeiro.</p>
                </div>
              </div>

              {/* Bloco 4 */}
              <div className="lp-escolha-block">
                <div className="lp-escolha-block-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </div>
                <div>
                  <h3 className="lp-escolha-block-title">Dashboard Executivo</h3>
                  <p className="lp-escolha-block-text">Indicadores claros e faturamento futuro projetado para tomada de decisão.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Badges de Destaque Final da Seção */}
        <div className="lp-escolha-badges-row">
          <span className="lp-badge-item">✓ 100% em nuvem</span>
          <span className="lp-badge-item">✓ Multiempresa</span>
          <span className="lp-badge-item">✓ Seguro</span>
          <span className="lp-badge-item">✓ Atualizações constantes</span>
          <span className="lp-badge-item">✓ Suporte especializado</span>
        </div>
      </section>

      {/* Separador Orgânico Inferior (Por Que Escolher -> Como Funciona) */}
      <div className="lp-separator" style={{ backgroundColor: "#02140a" }}>
        <svg viewBox="0 0 1440 120" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0C240 80 480 120 720 120C960 120 1200 80 1440 0V120H0V0Z" fill="#f0f7f9" />
        </svg>
      </div>

      {/* --------------------------------------------------
         SEÇÃO 03: COMO FUNCIONA (Timeline)
         -------------------------------------------------- */}
      <section id="como-funciona" className="lp-timeline-section">
        <div className="lp-timeline-container">
          <div className="lp-section-header">
            <span className="lp-section-eyebrow">Fluxo de Trabalho</span>
            <h2 className="lp-section-title">Como funciona a gestão integrada?</h2>
          </div>

          <div className="lp-timeline-flow">
            <div className="lp-timeline-line" />

            {/* Step 1 */}
            <div className="lp-timeline-step">
              <div className="lp-timeline-icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
              </div>
              <div className="lp-timeline-step-content">
                <h3 className="lp-timeline-step-title">1. Cliente</h3>
                <p className="lp-timeline-step-desc">Cadastro rápido do titular e dependentes com carências estruturadas.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="lp-timeline-step">
              <div className="lp-timeline-icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div className="lp-timeline-step-content">
                <h3 className="lp-timeline-step-title">2. Contrato</h3>
                <p className="lp-timeline-step-desc">Emissão automática do termo de adesão assinado com timbre comercial.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="lp-timeline-step">
              <div className="lp-timeline-icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="16" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div className="lp-timeline-step-content">
                <h3 className="lp-timeline-step-title">3. Mensalidade</h3>
                <p className="lp-timeline-step-desc">Geração recorrente automática das mensalidades do plano no sistema.</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="lp-timeline-step">
              <div className="lp-timeline-icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <div className="lp-timeline-step-content">
                <h3 className="lp-timeline-step-title">4. Cobrança</h3>
                <p className="lp-timeline-step-desc">Acompanhamento e alertas de atrasos, baixas rápidas e conciliação.</p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="lp-timeline-step">
              <div className="lp-timeline-icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
              <div className="lp-timeline-step-content">
                <h3 className="lp-timeline-step-title">5. Atendimento</h3>
                <p className="lp-timeline-step-desc">Registro rápido de serviços funerários prestados e ordens de serviço.</p>
              </div>
            </div>

            {/* Step 6 */}
            <div className="lp-timeline-step">
              <div className="lp-timeline-icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
              <div className="lp-timeline-step-content">
                <h3 className="lp-timeline-step-title">6. Relatórios</h3>
                <p className="lp-timeline-step-desc">Auditoria financeira de fluxos, cancelamentos e metas alcançadas.</p>
              </div>
            </div>

            {/* Step 7 */}
            <div className="lp-timeline-step">
              <div className="lp-timeline-icon-box" style={{ background: "linear-gradient(135deg, var(--color-petrol-light) 0%, var(--color-gold) 100%)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-green-deep)" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div className="lp-timeline-step-content">
                <h3 className="lp-timeline-step-title">7. Gestão Completa</h3>
                <p className="lp-timeline-step-desc">Controle administrativo e operacional em um só lugar.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------
         SEÇÃO 04: BENEFÍCIOS (Grid 8 Cards)
         -------------------------------------------------- */}
      <section id="beneficios" className="lp-beneficios-section">
        <div className="lp-beneficios-container">
          <div className="lp-section-header">
            <span className="lp-section-eyebrow">Benefícios Tecnológicos</span>
            <h2 className="lp-section-title">Tecnologia que simplifica sua rotina.</h2>
          </div>

          <div className="lp-beneficios-grid">
            {/* Card 1 */}
            <div className="lp-beneficios-card">
              <div className="lp-beneficios-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
              </div>
              <h3 className="lp-beneficios-card-title">CRM Inteligente</h3>
              <p className="lp-beneficios-card-desc">
                Gerencie com facilidade titulares, dependentes, carências e históricos em uma única tela de acesso.
              </p>
            </div>

            {/* Card 2 */}
            <div className="lp-beneficios-card">
              <div className="lp-beneficios-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <h3 className="lp-beneficios-card-title">Modelos de Contratos</h3>
              <p className="lp-beneficios-card-desc">
                Criação automática de termos com tags dinâmicas e layouts com logotipo e informações comerciais.
              </p>
            </div>

            {/* Card 3 */}
            <div className="lp-beneficios-card">
              <div className="lp-beneficios-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <h3 className="lp-beneficios-card-title">Cobrança Integrada</h3>
              <p className="lp-beneficios-card-desc">
                Controle automático de carnês, conciliação simplificada e monitoramento ativo de pagamentos atrasados.
              </p>
            </div>

            {/* Card 4 */}
            <div className="lp-beneficios-card">
              <div className="lp-beneficios-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
              <h3 className="lp-beneficios-card-title">Dashboard Executivo</h3>
              <p className="lp-beneficios-card-desc">
                Dados e gráficos consolidados para o gestor acompanhar o faturamento e o progresso das metas comerciais.
              </p>
            </div>

            {/* Card 5 */}
            <div className="lp-beneficios-card">
              <div className="lp-beneficios-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="9"/>
                  <rect x="14" y="3" width="7" height="5"/>
                  <rect x="14" y="12" width="7" height="9"/>
                  <rect x="3" y="16" width="7" height="5"/>
                </svg>
              </div>
              <h3 className="lp-beneficios-card-title">Multiempresa</h3>
              <p className="lp-beneficios-card-desc">
                Gerencie múltiplas filiais, funerárias ou empresas com fluxos separados de dados a partir de uma conta.
              </p>
            </div>

            {/* Card 6 */}
            <div className="lp-beneficios-card">
              <div className="lp-beneficios-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <line x1="12" y1="4" x2="12" y2="20"/>
                </svg>
              </div>
              <h3 className="lp-beneficios-card-title">Controle Financeiro</h3>
              <p className="lp-beneficios-card-desc">
                Gestão simplificada de entradas de caixa, auditoria de recebimentos manuais e projeção de faturamento.
              </p>
            </div>

            {/* Card 7 */}
            <div className="lp-beneficios-card">
              <div className="lp-beneficios-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                </svg>
              </div>
              <h3 className="lp-beneficios-card-title">Relatórios</h3>
              <p className="lp-beneficios-card-desc">
                Relatórios consolidados de vendas de planos, inadimplência e auditoria de usuários em formato de fácil leitura.
              </p>
            </div>

            {/* Card 8 */}
            <div className="lp-beneficios-card">
              <div className="lp-beneficios-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
              </div>
              <h3 className="lp-beneficios-card-title">Suporte Especializado</h3>
              <p className="lp-beneficios-card-desc">
                Equipe qualificada e disponível via chat ou WhatsApp para guiar sua empresa e resolver dúvidas no dia a dia.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------
         SEÇÃO 04-B: PLANOS
         -------------------------------------------------- */}
      <section id="planos" className="lp-planos-section">
        <div className="lp-planos-container">
          <div className="lp-section-header">
            <span className="lp-section-eyebrow">Nossos Planos</span>
            <h2 className="lp-section-title">Planos simples para cada fase da sua empresa.</h2>
            <p className="lp-problema-subtitle" style={{ color: "var(--color-slate-400)", marginTop: "1rem" }}>
              Comece com o essencial e evolua conforme sua operação cresce.
            </p>
          </div>

          <div className="lp-planos-grid">
            {/* Card 1: Essencial */}
            <div className="lp-plano-card">
              <div>
                <h3 className="lp-plano-name">Essencial</h3>
                <p className="lp-plano-subtitle-text">Para empresas que querem sair das planilhas e organizar a base.</p>
                
                <ul className="lp-plano-features">
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Cadastro de clientes
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Contratos
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Mensalidades
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Relatórios básicos
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> 1 usuário administrador
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Suporte por tickets
                  </li>
                </ul>
              </div>

              <a href="https://wa.me/5591981755021" target="_blank" rel="noopener noreferrer" className="lp-plano-btn secondary">
                Solicitar Demonstração
              </a>
            </div>

            {/* Card 2: Profissional */}
            <div className="lp-plano-card highlighted">
              <span className="lp-plano-badge">Mais Escolhido</span>
              <div>
                <h3 className="lp-plano-name">Profissional</h3>
                <p className="lp-plano-subtitle-text">Para empresas em amplo crescimento operacional e comercial.</p>
                
                <ul className="lp-plano-features">
                  <li className="lp-plano-feature-item" style={{ fontWeight: 600, color: "var(--color-white)" }}>
                    <span className="lp-plano-feature-check">★</span> Tudo do Essencial
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Cobrança integrada
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Modelos de contratos
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Dashboard executivo
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Usuários operadores
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Suporte por Whatsapp
                  </li>
                </ul>
              </div>

              <a href="https://wa.me/5591981755021" target="_blank" rel="noopener noreferrer" className="lp-plano-btn primary">
                Solicitar Demonstração
              </a>
            </div>

            {/* Card 3: Enterprise */}
            <div className="lp-plano-card">
              <div>
                <h3 className="lp-plano-name">Enterprise</h3>
                <p className="lp-plano-subtitle-text">Para grupos, funerárias integradas e operações multiempresa.</p>
                
                <ul className="lp-plano-features">
                  <li className="lp-plano-feature-item" style={{ fontWeight: 600, color: "var(--color-white)" }}>
                    <span className="lp-plano-feature-check">★</span> Tudo do Profissional
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Multiempresa
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Auditoria avançada
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Relatórios gerenciais
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Consultoria de implantação
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Suporte prioritário
                  </li>
                </ul>
              </div>

              <a href="https://wa.me/5591981755021" target="_blank" rel="noopener noreferrer" className="lp-plano-btn secondary">
                Falar com Consultor
              </a>
            </div>
          </div>

          {/* Dúvidas sobre Planos */}
          <div className="lp-planos-footer">
            <p className="lp-planos-footer-text">
              Não sabe qual plano escolher? Fale com nossa equipe e receba uma recomendação personalizada para seu negócio.
            </p>
            <a href="https://wa.me/5591981755021" target="_blank" rel="noopener noreferrer" className="lp-btn-whatsapp-footer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
              Conversar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------
         SEÇÃO: FAQ (Sprint 05)
         -------------------------------------------------- */}
      <section id="faq" className="lp-faq-section">
        <div className="lp-faq-container">
          <div className="lp-section-header">
            <span className="lp-section-eyebrow">Perguntas Comuns</span>
            <h2 className="lp-section-title" style={{ color: "var(--color-slate-900)" }}>Dúvidas frequentes</h2>
            <p className="lp-problema-subtitle" style={{ color: "var(--color-slate-500)", marginTop: "1rem" }}>
              Respostas rápidas para ajudar sua empresa a decidir com segurança.
            </p>
          </div>

          <div className="lp-faq-list">
            {faqItems.map((item, idx) => (
              <div 
                key={idx} 
                className={`lp-faq-item ${activeFaqIndex === idx ? "active" : ""}`}
              >
                <button 
                  id={`faq-trigger-${idx}`}
                  className="lp-faq-trigger" 
                  onClick={() => handleFaqToggle(idx)}
                  aria-expanded={activeFaqIndex === idx}
                  aria-controls={`faq-content-${idx}`}
                >
                  <span>{item.q}</span>
                  <svg className="lp-faq-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                <div 
                  id={`faq-content-${idx}`}
                  className="lp-faq-content"
                  role="region"
                  aria-labelledby={`faq-trigger-${idx}`}
                  aria-hidden={activeFaqIndex !== idx}
                >
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------
         SEÇÃO 05: CTA PREMIUM
         -------------------------------------------------- */}
      <section className="lp-cta-section">
        <div className="lp-cta-wrapper">
          <h2 className="lp-cta-title">
            Pronto para modernizar sua operação?
          </h2>
          
          <div className="lp-cta-bullets">
            <span className="lp-cta-bullet-item">
              <span className="lp-cta-bullet-dot" /> Mais organização
            </span>
            <span className="lp-cta-bullet-item">
              <span className="lp-cta-bullet-dot" /> Mais produtividade
            </span>
            <span className="lp-cta-bullet-item">
              <span className="lp-cta-bullet-dot" /> Mais controle
            </span>
            <span className="lp-cta-bullet-item">
              <span className="lp-cta-bullet-dot" /> Menos retrabalho
            </span>
          </div>

          <div className="lp-cta-buttons">
            <a href="https://wa.me/5591981755021" target="_blank" rel="noopener noreferrer" className="lp-btn-hero-demo">
              Solicitar Demonstração
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
            <a href={loginUrl} className="lp-btn-hero-recursos">
              Entrar no Sistema
            </a>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------
         Footer
         -------------------------------------------------- */}
      <footer className="lp-footer">
        <div className="lp-footer-content">
          <div className="lp-footer-brand">
            <a href="#" className="lp-logo-link">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Memorius" style={{ height: "42px", width: "auto", objectFit: "contain", marginBottom: "0.5rem" }} />
            </a>
            <p className="lp-footer-desc">
              CRM especializado em Gestão de Planos de Assistência Familiar e Funerárias. Modernidade e segurança para o seu negócio.
            </p>
          </div>

          <div className="lp-footer-links-col">
            <span className="lp-footer-col-title">Links Rápidos</span>
            <ul className="lp-footer-links">
              <li><a href="#problema">Problema</a></li>
              <li><a href="#solucao">Solução</a></li>
              <li><a href="#escolha">Diferenciais</a></li>
              <li><a href="#como-funciona">Como funciona</a></li>
              <li><a href="#beneficios">Benefícios</a></li>
              <li><a href="#planos">Planos</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>

          <div className="lp-footer-links-col">
            <span className="lp-footer-col-title">Acesso</span>
            <ul className="lp-footer-links">
              <li><a href={loginUrl}>Entrar no Sistema</a></li>
              <li><a href="https://wa.me/5591981755021" target="_blank" rel="noopener noreferrer">Suporte no WhatsApp</a></li>
            </ul>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <span className="lp-footer-copy">
            © 2026 Memorius Tecnologia. Todos os direitos reservados.
          </span>
          <span className="lp-footer-copy">
            Feito com excelência.
          </span>
        </div>
      </footer>
    </div>
  );
}
