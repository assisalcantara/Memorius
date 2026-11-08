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
           Navbar (Header Sobreposto Glassmorphism)
           -------------------------------------------------- */
        .lp-navbar {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 90px;
          background: rgba(10, 17, 15, 0.50);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          z-index: 50;
          transition: background 0.2s ease, border-color 0.2s ease;
          box-sizing: border-box;
        }

        .lp-navbar-container {
          max-width: 1440px;
          width: calc(100% - 64px);
          margin-inline: auto;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          box-sizing: border-box;
        }

        .lp-logo-link {
          display: flex;
          align-items: center;
          text-decoration: none;
          flex-shrink: 0;
          z-index: 2;
        }

        .lp-logo-img {
          width: 245px;
          height: auto;
          max-height: 52px;
          object-fit: contain;
          display: block;
        }

        .lp-nav-center {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          pointer-events: auto;
        }

        .lp-nav-links {
          display: flex;
          align-items: center;
          gap: 40px;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .lp-nav-links a {
          color: #ffffff;
          text-decoration: none;
          font-size: 16px;
          font-weight: 500;
          letter-spacing: -0.01em;
          transition: color 200ms ease, opacity 200ms ease;
          white-space: nowrap;
        }

        .lp-nav-links a:hover {
          color: #F5C344;
        }

        .lp-nav-actions {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          z-index: 2;
        }

        .lp-btn-entrar {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 228px;
          height: 52px;
          color: #ffffff;
          text-decoration: none;
          font-size: 16px;
          font-weight: 600;
          border-radius: 14px;
          background: rgba(10, 17, 15, 0.40);
          border: 1px solid rgba(255, 255, 255, 0.35);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: all 200ms ease;
          box-sizing: border-box;
        }

        .lp-btn-entrar:hover {
          border-color: #F5C344;
          color: #F5C344;
          background: rgba(10, 17, 15, 0.65);
          transform: translateY(-1px);
        }

        .lp-menu-toggle {
          display: none;
          background: none;
          border: none;
          color: var(--color-white);
          cursor: pointer;
          padding: 0.5rem;
          z-index: 2;
        }

        /* --------------------------------------------------
           Hero Section (Novo Mockup 1920x800 com bg_hero.png)
           -------------------------------------------------- */
        .lp-hero-wrapper {
          position: relative;
          width: 100%;
          min-height: 800px;
          overflow: hidden;
          background-color: #070e17;
          background-image: url('/img/bg_hero.png');
          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
          display: flex;
          align-items: center;
        }

        /* Vinheta sutil adicional para contraste sem afetar os rostos da direita */
        .lp-hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            rgba(4, 18, 17, 0.78) 0%,
            rgba(4, 18, 17, 0.55) 38%,
            rgba(4, 18, 17, 0.18) 60%,
            rgba(4, 18, 17, 0.0) 80%
          );
          pointer-events: none;
          z-index: 1;
        }

        .lp-hero-container {
          position: relative;
          z-index: 10;
          max-width: 1530px;
          width: 100%;
          margin: 0 auto;
          padding: 160px 64px 80px 194px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .lp-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 18px;
          height: 42px;
          background: rgba(8, 15, 13, 0.72);
          border: 1px solid #F5C344;
          border-radius: 999px;
          color: #F5C344;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 34px;
          box-sizing: border-box;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        .lp-hero-badge-star {
          font-size: 15px;
          line-height: 1;
          color: #F5C344;
        }

        .lp-hero-title {
          max-width: 690px;
          font-size: 58px;
          font-weight: 800;
          line-height: 1.08;
          color: #ffffff;
          letter-spacing: -1.8px;
          margin-bottom: 24px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
        }

        .lp-hero-title-highlight {
          color: #F5C344;
          position: relative;
          display: inline-block;
          white-space: nowrap;
        }

        .lp-hero-title-curve {
          position: absolute;
          left: 0;
          bottom: -10px;
          width: 100%;
          height: 12px;
          overflow: visible;
          pointer-events: none;
        }

        .lp-hero-subtitle {
          max-width: 640px;
          font-size: 19px;
          line-height: 1.5;
          color: #F5F5F5;
          margin-bottom: 36px;
          font-weight: 400;
          text-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
        }

        .lp-hero-cta-group {
          display: flex;
          align-items: center;
          gap: 28px;
          margin-bottom: 42px;
          width: 100%;
          flex-wrap: wrap;
        }

        .lp-btn-cta-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 314px;
          height: 64px;
          background: linear-gradient(135deg, #F7CD58 0%, #E9AF27 100%);
          color: #12120E;
          font-size: 17px;
          font-weight: 700;
          border-radius: 15px;
          text-decoration: none;
          box-shadow: 0 8px 24px rgba(245, 195, 68, 0.28);
          transition: transform 200ms ease, box-shadow 200ms ease, filter 200ms ease;
          box-sizing: border-box;
        }

        .lp-btn-cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(245, 195, 68, 0.42);
          filter: brightness(1.04);
        }

        .lp-btn-cta-primary:active {
          transform: translateY(0);
        }

        .lp-btn-cta-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 280px;
          height: 64px;
          background: rgba(28, 30, 27, 0.58);
          border: 1px solid rgba(255, 255, 255, 0.28);
          color: #ffffff;
          font-size: 17px;
          font-weight: 600;
          border-radius: 15px;
          text-decoration: none;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          transition: all 200ms ease;
          box-sizing: border-box;
        }

        .lp-btn-cta-secondary:hover {
          background: rgba(28, 30, 27, 0.85);
          border-color: rgba(255, 255, 255, 0.6);
          color: #F5C344;
          transform: translateY(-2px);
        }

        .lp-btn-cta-secondary:active {
          transform: translateY(0);
        }

        /* Benefícios Lineares com Ícones Dourados */
        .lp-hero-benefits {
          display: flex;
          align-items: center;
          gap: 28px;
          list-style: none;
          margin: 0;
          padding: 0;
          flex-wrap: wrap;
        }

        .lp-hero-benefit-item {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: -0.01em;
          white-space: nowrap;
        }

        .lp-hero-benefit-icon {
          width: 24px;
          height: 24px;
          color: #F5C344;
          flex-shrink: 0;
        }

        .lp-hero-benefit-sep {
          width: 1px;
          height: 28px;
          background: rgba(245, 195, 68, 0.45);
        }

        /* --------------------------------------------------
           SEÇÃO 01: PROBLEMA (Verde-Escuro Premium)
           -------------------------------------------------- */
        .lp-problema-section {
          background: linear-gradient(180deg, #041C19 0%, #062320 100%);
          color: var(--color-white);
          padding: 84px 32px 64px;
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
          margin-bottom: 44px;
        }

        .lp-problema-title {
          font-size: clamp(32px, 3vw, 48px);
          font-weight: 800;
          color: #FFFFFF;
          letter-spacing: -0.03em;
          margin: 0 auto 1.25rem;
          line-height: 1.15;
          max-width: 1000px;
        }

        .lp-problema-title-highlight {
          color: #F5C344;
        }

        .lp-problema-subtitle {
          font-size: 18px;
          line-height: 1.6;
          color: #C7D8DD;
          max-width: 850px;
          margin: 0 auto;
          opacity: 1;
        }

        .lp-problema-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 26px;
        }

        .lp-problema-card {
          background: linear-gradient(145deg, #123A39 0%, #082826 100%);
          border: 1px solid rgba(245, 195, 68, 0.16);
          border-radius: 18px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
          transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }

        .lp-problema-card:hover {
          transform: translateY(-4px);
          border-color: rgba(245, 195, 68, 0.45);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35);
        }

        .lp-problema-card-icon-title {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .lp-problema-card-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(245, 195, 68, 0.12);
          border: 1px solid rgba(245, 195, 68, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #F5C344;
          flex-shrink: 0;
        }

        .lp-problema-card-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #FFFFFF;
        }

        .lp-problema-card-desc {
          font-size: 0.95rem;
          line-height: 1.6;
          color: #C7D8DD;
        }

        /* --------------------------------------------------
           SEÇÃO 02: SOLUÇÃO (Fundo Gradiente Petrol, 2 Colunas)
           -------------------------------------------------- */
        .lp-solucao-section {
          background: linear-gradient(135deg, #052e16 0%, #042125 50%, #083c44 100%);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding: 84px 32px;
          position: relative;
          z-index: 10;
        }

        .lp-solucao-container {
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1.05fr;
          gap: 4rem;
          align-items: center;
        }

        .lp-solucao-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .lp-solucao-title {
          font-size: clamp(32px, 3vw, 46px);
          font-weight: 800;
          line-height: 1.15;
          color: #FFFFFF;
          letter-spacing: -0.03em;
          margin-bottom: 1.5rem;
        }

        .lp-solucao-desc {
          font-size: 1.1rem;
          line-height: 1.7;
          color: #C7D8DD;
          margin-bottom: 2.5rem;
          max-width: 580px;
        }

        .lp-btn-solucao-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #F7CD58 0%, #E9AF27 100%);
          color: #12120E;
          font-size: 16px;
          font-weight: 700;
          border-radius: 14px;
          text-decoration: none;
          box-shadow: 0 8px 24px rgba(245, 195, 68, 0.28);
          transition: transform 200ms ease, box-shadow 200ms ease, filter 200ms ease;
          box-sizing: border-box;
        }

        .lp-btn-solucao-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(245, 195, 68, 0.42);
          filter: brightness(1.04);
        }

        /* Mockup Comercial Demonstrativo do Dashboard */
        .lp-solucao-mockup-wrapper {
          position: relative;
          width: 100%;
          max-width: 620px;
          background: linear-gradient(145deg, rgba(8, 35, 33, 0.95) 0%, rgba(4, 22, 20, 0.98) 100%);
          border: 1px solid rgba(245, 195, 68, 0.22);
          border-radius: 22px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          padding: 1.5rem;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .lp-solucao-mockup-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 0.85rem;
        }

        .lp-mockup-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.82rem;
          font-weight: 700;
          color: #FFFFFF;
          letter-spacing: 0.02em;
        }

        .lp-mockup-brand span {
          color: #F5C344;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          background: rgba(245, 195, 68, 0.12);
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
        }

        .lp-mockup-demo-pill {
          font-size: 0.68rem;
          font-weight: 600;
          color: #C7D8DD;
          background: rgba(255, 255, 255, 0.06);
          padding: 0.25rem 0.65rem;
          border-radius: 99px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* 4 Indicadores Rápidos do Dashboard */
        .lp-solucao-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
        }

        .lp-solucao-kpi-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 10px;
          padding: 0.75rem 0.65rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .lp-solucao-kpi-label {
          font-size: 0.68rem;
          color: #C7D8DD;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .lp-solucao-kpi-val {
          font-size: 1.05rem;
          font-weight: 800;
          color: #FFFFFF;
        }

        .lp-solucao-kpi-trend {
          font-size: 0.62rem;
          font-weight: 700;
          color: #2bc578;
        }

        .lp-solucao-kpi-trend.neutral {
          color: #F5C344;
        }

        /* Linha do Meio do Dashboard: Gráfico e Contratos Recentes */
        .lp-solucao-mockup-body {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 1rem;
        }

        .lp-solucao-chart-box {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 0.9rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .lp-solucao-chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .lp-solucao-chart-title {
          font-size: 0.74rem;
          font-weight: 700;
          color: #FFFFFF;
        }

        .lp-solucao-chart-legend {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          font-size: 0.62rem;
          color: #C7D8DD;
        }

        .lp-chart-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
        }

        .lp-solucao-chart-svg {
          width: 100%;
          height: 110px;
          margin-top: 0.5rem;
        }

        .lp-solucao-recents-box {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 0.9rem;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }

        .lp-solucao-recents-title {
          font-size: 0.74rem;
          font-weight: 700;
          color: #FFFFFF;
          margin-bottom: 0.15rem;
        }

        .lp-solucao-recent-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.45rem 0.55rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.025);
          font-size: 0.72rem;
        }

        .lp-solucao-recent-name {
          font-weight: 600;
          color: #FFFFFF;
          display: block;
        }

        .lp-solucao-recent-plan {
          font-size: 0.6rem;
          color: #C7D8DD;
        }

        .lp-solucao-mockup-status {
          font-size: 0.62rem;
          font-weight: 700;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          background: rgba(43, 197, 120, 0.15);
          color: #2bc578;
        }

        .lp-solucao-mockup-status.pending {
          background: rgba(245, 195, 68, 0.15);
          color: #F5C344;
        }

        /* --------------------------------------------------
           SEÇÃO: POR QUE ESCOLHER O MEMORIUS? (Diferenciais)
           -------------------------------------------------- */
        .lp-escolha-section {
          background: linear-gradient(180deg, #F3F7F6 0%, #E9F2F0 100%);
          color: var(--color-slate-900);
          padding: 84px 32px 64px;
          position: relative;
          z-index: 10;
        }

        .lp-escolha-container {
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4.5rem;
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
          font-size: clamp(30px, 2.8vw, 42px);
          font-weight: 800;
          color: #092D2B;
          letter-spacing: -0.03em;
          line-height: 1.18;
        }

        .lp-escolha-title-highlight {
          color: #A07818;
        }

        .lp-escolha-subtitle {
          font-size: 1.1rem;
          line-height: 1.65;
          color: #475569;
          margin-bottom: 1.25rem;
          max-width: 600px;
        }

        .lp-escolha-blocks {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }

        .lp-escolha-block {
          background: #ffffff;
          border: 1px solid rgba(11, 79, 89, 0.12);
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          box-shadow: 0 4px 15px rgba(11, 79, 89, 0.04);
          transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }

        .lp-escolha-block:hover {
          transform: translateY(-4px);
          border-color: #F5C344;
          box-shadow: 0 12px 25px rgba(11, 79, 89, 0.08);
        }

        .lp-escolha-block-icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: rgba(11, 79, 89, 0.08);
          border: 1px solid rgba(11, 79, 89, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0B4F59;
          flex-shrink: 0;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .lp-escolha-block:hover .lp-escolha-block-icon {
          background: #0B4F59;
          color: #F5C344;
        }

        .lp-escolha-block-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #092D2B;
        }

        .lp-escolha-block-text {
          font-size: 0.88rem;
          line-height: 1.5;
          color: #475569;
        }

        /* Mockup Ilustrativo da Coluna Esquerda (Diferenciais) */
        .lp-diferenciais-mockup {
          background: #ffffff;
          border: 1px solid rgba(11, 79, 89, 0.15);
          border-radius: 20px;
          padding: 1.5rem;
          box-shadow: 0 15px 40px rgba(11, 79, 89, 0.08);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .lp-dif-mockup-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #E2E8F0;
          padding-bottom: 0.85rem;
        }

        .lp-dif-mockup-brand {
          font-size: 0.82rem;
          font-weight: 800;
          color: #092D2B;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .lp-dif-mockup-brand span {
          background: rgba(11, 79, 89, 0.1);
          color: #0B4F59;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
        }

        .lp-dif-kpis {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.85rem;
        }

        .lp-dif-kpi-card {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .lp-dif-kpi-card.highlight {
          border-left: 3px solid #F5C344;
          background: #FFFDF7;
        }

        .lp-dif-kpi-label {
          font-size: 0.7rem;
          color: #64748B;
          font-weight: 600;
          text-transform: uppercase;
        }

        .lp-dif-kpi-val {
          font-size: 1.15rem;
          font-weight: 800;
          color: #092D2B;
        }

        .lp-dif-kpi-sub {
          font-size: 0.65rem;
          color: #16A34A;
          font-weight: 700;
        }

        .lp-dif-mockup-chart {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 1rem;
        }

        .lp-dif-chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .lp-dif-chart-title {
          font-size: 0.78rem;
          font-weight: 700;
          color: #092D2B;
        }

        .lp-dif-floating-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.85rem;
        }

        .lp-dif-float-item {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          font-size: 0.75rem;
        }

        .lp-dif-float-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #0B4F59;
          color: #F5C344;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-weight: 800;
        }

        .lp-escolha-badges-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 3.5rem;
          flex-wrap: wrap;
          width: 100%;
          z-index: 5;
          position: relative;
        }

        .lp-badge-item {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.55rem 1.25rem;
          background: #ffffff;
          border: 1px solid rgba(11, 79, 89, 0.15);
          border-radius: 99px;
          font-size: 0.88rem;
          font-weight: 700;
          color: #092D2B;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.03);
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .lp-badge-item:hover {
          border-color: #F5C344;
          transform: translateY(-2px);
        }

        /* --------------------------------------------------
           SEÇÃO 03: COMO FUNCIONA (Timeline / Fluxo)
           -------------------------------------------------- */
        .lp-timeline-section {
          background-color: #041C19;
          padding: 84px 32px;
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
          margin-top: 4.5rem;
          padding-bottom: 1.5rem;
        }

        .lp-timeline-line {
          position: absolute;
          top: 30px;
          left: 40px;
          right: 40px;
          height: 2px;
          background: linear-gradient(90deg, rgba(11, 79, 89, 0.2) 0%, rgba(245, 195, 68, 0.45) 50%, rgba(11, 79, 89, 0.2) 100%);
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
          transition: transform 0.2s ease;
        }

        .lp-timeline-step:hover {
          transform: translateY(-4px);
        }

        .lp-timeline-icon-box {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(11, 79, 89, 0.85);
          border: 2px solid rgba(255, 255, 255, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #F5C344;
          margin-bottom: 1.25rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .lp-timeline-step:hover .lp-timeline-icon-box {
          border-color: #F5C344;
          box-shadow: 0 0 16px rgba(245, 195, 68, 0.4);
          color: #ffffff;
        }

        .lp-timeline-step-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #FFFFFF;
          margin-bottom: 0.5rem;
        }

        .lp-timeline-step-desc {
          font-size: 0.75rem;
          line-height: 1.4;
          color: #C7D8DD;
        }

        /* --------------------------------------------------
           SEÇÃO 04: BENEFÍCIOS TECNOLÓGICOS (Grid 8 Cards)
           -------------------------------------------------- */
        .lp-beneficios-section {
          background: linear-gradient(180deg, #041C19 0%, #062623 100%);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding: 84px 32px;
          position: relative;
          z-index: 10;
        }

        .lp-beneficios-container {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .lp-beneficios-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .lp-beneficios-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 26px;
        }

        .lp-beneficios-card {
          background: linear-gradient(145deg, #123A39 0%, #082826 100%);
          border: 1px solid rgba(245, 195, 68, 0.16);
          border-radius: 18px;
          padding: 2rem 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
          transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }

        .lp-beneficios-card:hover {
          transform: translateY(-4px);
          border-color: rgba(245, 195, 68, 0.45);
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.3);
        }

        .lp-beneficios-card-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(245, 195, 68, 0.12);
          border: 1px solid rgba(245, 195, 68, 0.28);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #F5C344;
          transition: background 0.2s ease, color 0.2s ease;
          flex-shrink: 0;
        }

        .lp-beneficios-card:hover .lp-beneficios-card-icon {
          background: rgba(245, 195, 68, 0.22);
          color: #FFFFFF;
        }

        .lp-beneficios-card-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #FFFFFF;
        }

        .lp-beneficios-card-desc {
          font-size: 0.88rem;
          line-height: 1.55;
          color: #C7D8DD;
        }

        /* --------------------------------------------------
           SEÇÃO 04-B: PLANOS
           -------------------------------------------------- */
        .lp-planos-section {
          padding: 84px 32px 72px;
          background: linear-gradient(180deg, #062623 0%, #031715 100%);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          position: relative;
          z-index: 10;
        }

        .lp-planos-container {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .lp-planos-header {
          text-align: center;
          max-width: 900px;
          margin-inline: auto;
          margin-bottom: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .lp-planos-trial-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1.25rem;
          padding: 0.45rem 1.15rem;
          border-radius: 999px;
          background: rgba(197, 160, 43, 0.12);
          border: 1px solid rgba(197, 160, 43, 0.35);
          color: var(--color-gold-light);
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        .lp-planos-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          margin-top: 2.5rem;
          width: 100%;
        }

        .lp-plano-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
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
          border-color: rgba(255, 255, 255, 0.12);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
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
          margin-bottom: 0.25rem;
        }

        .lp-plano-price-wrapper {
          display: flex;
          align-items: baseline;
          gap: 0.35rem;
          margin-bottom: 0.75rem;
        }

        .lp-plano-currency {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--color-gold-light);
        }

        .lp-plano-price {
          font-size: 2.35rem;
          font-weight: 900;
          color: var(--color-white);
          letter-spacing: -0.02em;
        }

        .lp-plano-period {
          font-size: 0.88rem;
          color: var(--color-slate-400);
          font-weight: 500;
        }

        .lp-plano-subtitle-text {
          font-size: 0.88rem;
          color: var(--color-slate-400);
          margin-bottom: 1.75rem;
          line-height: 1.45;
          min-height: 38px;
        }

        /* Bloco de Capacidades */
        .lp-plano-capacities {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 12px;
          padding: 1.1rem 1.25rem;
          margin-bottom: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .lp-plano-card.highlighted .lp-plano-capacities {
          background: rgba(197, 160, 43, 0.08);
          border-color: rgba(197, 160, 43, 0.25);
        }

        .lp-plano-capacity-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.9rem;
        }

        .lp-plano-capacity-label {
          color: var(--color-slate-300);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .lp-plano-capacity-icon {
          color: var(--color-gold-light);
          flex-shrink: 0;
        }

        .lp-plano-capacity-value {
          color: var(--color-white);
          font-weight: 800;
          letter-spacing: 0.01em;
        }

        .lp-plano-divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1.25rem 0 1rem;
        }

        .lp-plano-divider-line {
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
        }

        .lp-plano-divider-label {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-slate-400);
          font-weight: 700;
        }

        .lp-plano-features {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          margin-bottom: 2.25rem;
          flex-grow: 1;
        }

        .lp-plano-feature-item {
          font-size: 0.88rem;
          color: var(--color-slate-300);
          display: flex;
          align-items: center;
          gap: 0.6rem;
          line-height: 1.35;
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
          margin-top: 3.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
          z-index: 5;
          position: relative;
        }

        .lp-planos-footer-text {
          font-size: 1.05rem;
          color: var(--color-slate-300);
          max-width: 620px;
          line-height: 1.55;
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
          padding: 84px 32px 72px;
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
          margin-top: 3rem;
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
           Footer
           -------------------------------------------------- */
        .lp-footer {
          background: rgba(2, 20, 10, 0.98);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding: 72px 32px 32px;
          position: relative;
          z-index: 10;
        }
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
        @media (max-width: 1440px) {
          .lp-navbar {
            padding: 0 48px;
          }
          .lp-nav-links {
            gap: 32px;
          }
          .lp-hero-container {
            padding: 150px 48px 70px 100px;
          }
          .lp-hero-title {
            font-size: clamp(42px, 3.6vw, 54px);
            max-width: 620px;
          }
        }

        @media (max-width: 1200px) {
          .lp-navbar {
            padding: 0 32px;
          }
          .lp-logo-img {
            width: 200px;
          }
          .lp-nav-links {
            gap: 24px;
          }
          .lp-nav-links a {
            font-size: 15px;
          }
          .lp-btn-entrar {
            width: 190px;
            height: 48px;
            font-size: 15px;
          }
          .lp-hero-container {
            padding: 140px 32px 60px 64px;
          }
          .lp-hero-title {
            font-size: 44px;
          }
        }

        @media (max-width: 1024px) {
          .lp-navbar {
            padding: 0 2rem;
            height: 80px;
          }
          .lp-nav-center {
            display: none;
          }
          .lp-hero-wrapper {
            min-height: 720px;
            background-position: 70% center;
          }
          .lp-hero-overlay {
            background: linear-gradient(
              90deg,
              rgba(4, 18, 17, 0.88) 0%,
              rgba(4, 18, 17, 0.75) 45%,
              rgba(4, 18, 17, 0.35) 75%,
              rgba(4, 18, 17, 0.1) 100%
            );
          }
          .lp-hero-container {
            padding: 130px 2rem 50px 2rem;
            max-width: 680px;
          }
          .lp-hero-title {
            font-size: 40px;
          }
          .lp-hero-subtitle {
            font-size: 18px;
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
          .lp-nav-links, .lp-nav-actions, .lp-nav-center {
            display: none;
          }
          
          .lp-menu-toggle {
            display: block;
          }

          .lp-navbar {
            height: 72px;
            padding: 0 1.25rem;
          }

          .lp-logo-img {
            width: 170px;
          }

          .lp-hero-wrapper {
            min-height: auto;
            background-position: 75% center;
            padding-bottom: 2rem;
          }

          .lp-hero-overlay {
            background: linear-gradient(
              180deg,
              rgba(4, 18, 17, 0.92) 0%,
              rgba(4, 18, 17, 0.82) 50%,
              rgba(4, 18, 17, 0.70) 100%
            );
          }

          .lp-hero-container {
            padding: 110px 1.25rem 3rem 1.25rem;
            max-width: 100%;
          }

          .lp-hero-badge {
            font-size: 12px;
            height: 36px;
            padding: 0 14px;
            margin-bottom: 22px;
          }

          .lp-hero-title {
            font-size: 34px;
            line-height: 1.15;
            letter-spacing: -1px;
            margin-bottom: 18px;
          }

          .lp-hero-subtitle {
            font-size: 16px;
            line-height: 1.5;
            margin-bottom: 28px;
          }

          .lp-hero-cta-group {
            flex-direction: column;
            width: 100%;
            gap: 14px;
            margin-bottom: 32px;
          }

          .lp-btn-cta-primary,
          .lp-btn-cta-secondary {
            width: 100%;
            height: 56px;
            font-size: 16px;
          }

          .lp-hero-benefits {
            flex-direction: column;
            align-items: flex-start;
            gap: 14px;
            width: 100%;
          }

          .lp-hero-benefit-sep {
            display: none;
          }

          /* Mobile Menu Overlay */
          .lp-nav-mobile {
            display: ${mobileMenuOpen ? "flex" : "none"};
            position: fixed;
            top: 72px;
            left: 0;
            width: 100%;
            height: calc(100vh - 72px);
            background: var(--color-green-deep);
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1.75rem;
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
            padding: 56px 1.5rem;
          }
          .lp-escolha-title {
            font-size: 2rem;
          }
          .lp-escolha-blocks {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }
          .lp-escolha-block:hover {
            transform: none;
          }

          .lp-diferenciais-mockup {
            padding: 1.25rem;
          }
          .lp-dif-kpis {
            grid-template-columns: 1fr;
          }
          .lp-dif-floating-cards {
            grid-template-columns: 1fr;
          }

          .lp-timeline-section {
            padding: 56px 1.5rem;
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
            font-size: 30px;
          }
          .lp-hero-subtitle {
            font-size: 15px;
          }
          .lp-hero-container {
            padding: 95px 1rem 2.5rem 1rem;
          }
          .lp-hero-badge {
            font-size: 11px;
            padding: 0 10px;
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
         Header Sobreposto / Glassmorphism
         -------------------------------------------------- */}
      <header className="lp-navbar">
        <div className="lp-navbar-container">
          <a href="#" className="lp-logo-link">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Memorius" className="lp-logo-img" />
          </a>

          <div className="lp-nav-center">
            <nav aria-label="Menu principal">
              <ul className="lp-nav-links">
                <li><a href="#problema">Problema</a></li>
                <li><a href="#solucao">Solução</a></li>
                <li><a href="#escolha">Diferenciais</a></li>
                <li><a href="#como-funciona">Como Funciona</a></li>
                <li><a href="#beneficios">Benefícios</a></li>
                <li><a href="#planos">Planos</a></li>
                <li><a href="#faq">FAQ</a></li>
              </ul>
            </nav>
          </div>

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
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div className="lp-nav-mobile">
        <a href="#problema" onClick={() => setMobileMenuOpen(false)}>Problema</a>
        <a href="#solucao" onClick={() => setMobileMenuOpen(false)}>Solução</a>
        <a href="#escolha" onClick={() => setMobileMenuOpen(false)}>Diferenciais</a>
        <a href="#como-funciona" onClick={() => setMobileMenuOpen(false)}>Como Funciona</a>
        <a href="#beneficios" onClick={() => setMobileMenuOpen(false)}>Benefícios</a>
        <a href="#planos" onClick={() => setMobileMenuOpen(false)}>Planos</a>
        <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
        <a href={loginUrl} onClick={() => setMobileMenuOpen(false)}>Acessar Plataforma</a>
        <a href="https://wa.me/5591981755021" target="_blank" rel="noopener noreferrer" className="lp-btn-mobile-demo" onClick={() => setMobileMenuOpen(false)}>
          Solicitar Demonstração
        </a>
      </div>

      {/* --------------------------------------------------
         Novo Hero Section (Conforme Mockup com bg_hero.png)
         -------------------------------------------------- */}
      <section className="lp-hero-wrapper" id="hero">
        <div className="lp-hero-overlay" />

        <div className="lp-hero-container">
          {/* 4.1. Badge Superior */}
          <div className="lp-hero-badge">
            <span className="lp-hero-badge-star" aria-hidden="true">✦</span>
            <span>PLATAFORMA SAAS PARA GESTÃO FUNERÁRIA</span>
          </div>
          
          {/* 4.2. Título Principal em 3 Linhas com Sublinhado Curvo Dourado */}
          <h1 className="lp-hero-title">
            Gestão inteligente para<br />
            Planos de Assistência<br />
            <span className="lp-hero-title-highlight">
              Familiar.
              <svg className="lp-hero-title-curve" viewBox="0 0 210 14" fill="none" preserveAspectRatio="none" aria-hidden="true">
                <path d="M2 10.5C55 2.5 155 2.5 208 10.5" stroke="#F5C344" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
          </h1>

          {/* 4.3. Texto de Apoio */}
          <p className="lp-hero-subtitle">
            Organiza clientes, contratos, mensalidades, atendimentos e cobranças em uma única plataforma segura, robusta e moderna.
          </p>

          {/* 4.4. Botões CTA */}
          <div className="lp-hero-cta-group">
            <a href="https://wa.me/5591981755021" target="_blank" rel="noopener noreferrer" className="lp-btn-cta-primary">
              Solicitar Demonstração →
            </a>
            <a href="#problema" className="lp-btn-cta-secondary">
              Conhecer a Plataforma
            </a>
          </div>

          {/* 4.5. Benefícios Lineares com Ícones Dourados */}
          <ul className="lp-hero-benefits" aria-label="Benefícios da plataforma">
            <li className="lp-hero-benefit-item">
              <svg className="lp-hero-benefit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>Sem instalação</span>
            </li>
            <li className="lp-hero-benefit-sep" aria-hidden="true" />
            <li className="lp-hero-benefit-item">
              <svg className="lp-hero-benefit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              <span>100% em nuvem</span>
            </li>
            <li className="lp-hero-benefit-sep" aria-hidden="true" />
            <li className="lp-hero-benefit-item">
              <svg className="lp-hero-benefit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
              </svg>
              <span>Suporte especializado</span>
            </li>
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------
         SEÇÃO 01: PROBLEMA
         -------------------------------------------------- */}
      <section id="problema" className="lp-problema-section">
        <div className="lp-problema-container">
          <div className="lp-problema-header">
            <h2 className="lp-problema-title">
              Sua empresa está crescendo...<br />mas sua gestão <span className="lp-problema-title-highlight">acompanha esse crescimento?</span>
            </h2>
            <p className="lp-problema-subtitle">
              Planilhas, contratos perdidos, cobranças esquecidas e informações espalhadas reduzem a produtividade da sua equipe e afetam sua lucratividade.
            </p>
          </div>

          <div className="lp-problema-grid">
            <div className="lp-problema-card">
              <div className="lp-problema-card-icon-title">
                <div className="lp-problema-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                </div>
                <h3 className="lp-problema-card-title">Contratos descentralizados</h3>
              </div>
              <p className="lp-problema-card-desc">
                Contratos em arquivos físicos ou pastas soltas no computador dificultam a consulta rápida e o controle de carências ou reajustes.
              </p>
            </div>

            <div className="lp-problema-card">
              <div className="lp-problema-card-icon-title">
                <div className="lp-problema-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <h3 className="lp-problema-card-title">Cobranças manuais</h3>
              </div>
              <p className="lp-problema-card-desc">
                Geração manual de carnês e cobranças gera erros frequentes, esquecimentos e aumento direto na taxa de inadimplência dos planos.
              </p>
            </div>

            <div className="lp-problema-card">
              <div className="lp-problema-card-icon-title">
                <div className="lp-problema-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <h3 className="lp-problema-card-title">Clientes sem histórico</h3>
              </div>
              <p className="lp-problema-card-desc">
                Dificuldade para identificar quais dependentes estão ativos, carências pendentes ou quais serviços foram consumidos por cada família.
              </p>
            </div>

            <div className="lp-problema-card">
              <div className="lp-problema-card-icon-title">
                <div className="lp-problema-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                  </svg>
                </div>
                <h3 className="lp-problema-card-title">Falta de indicadores</h3>
              </div>
              <p className="lp-problema-card-desc">
                Administrar a empresa sem ter clareza sobre o faturamento futuro projetado, índice de cancelamentos ou valores a receber no mês.
              </p>
            </div>

            <div className="lp-problema-card">
              <div className="lp-problema-card-icon-title">
                <div className="lp-problema-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                </div>
                <h3 className="lp-problema-card-title">Atendimento desorganizado</h3>
              </div>
              <p className="lp-problema-card-desc">
                Falhas no registro de ordens de serviço, atrasos em traslados ou falta de controle de estoque de urnas em momentos críticos de óbito.
              </p>
            </div>

            <div className="lp-problema-card">
              <div className="lp-problema-card-icon-title">
                <div className="lp-problema-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
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
            <a href="https://wa.me/5591981755021?text=Ol%C3%A1%21+Gostaria+de+solicitar+uma+demonstra%C3%A7%C3%A3o+do+Memorius." target="_blank" rel="noopener noreferrer" className="lp-btn-solucao-cta">
              Solicitar Demonstração →
            </a>
          </div>

          {/* Mockup Comercial Demonstrativo do Dashboard */}
          <div className="lp-solucao-mockup-wrapper">
            <div className="lp-solucao-mockup-topbar">
              <div className="lp-mockup-brand">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5C344" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                  <path d="M2 17l10 5 10-5"></path>
                  <path d="M2 12l10 5 10-5"></path>
                </svg>
                MEMORIUS <span>Visão Geral</span>
              </div>
              <span className="lp-mockup-demo-pill">● Modo Demonstração</span>
            </div>

            {/* Quatro Indicadores Principais */}
            <div className="lp-solucao-kpi-grid">
              <div className="lp-solucao-kpi-card">
                <span className="lp-solucao-kpi-label">Clientes Ativos</span>
                <span className="lp-solucao-kpi-val">1.480</span>
                <span className="lp-solucao-kpi-trend">▲ +12% mês</span>
              </div>
              <div className="lp-solucao-kpi-card">
                <span className="lp-solucao-kpi-label">Contratos Vigentes</span>
                <span className="lp-solucao-kpi-val">1.412</span>
                <span className="lp-solucao-kpi-trend">▲ 98.4%</span>
              </div>
              <div className="lp-solucao-kpi-card">
                <span className="lp-solucao-kpi-label">Recebimentos Mês</span>
                <span className="lp-solucao-kpi-val">R$ 52.8k</span>
                <span className="lp-solucao-kpi-trend">▲ +8.5%</span>
              </div>
              <div className="lp-solucao-kpi-card">
                <span className="lp-solucao-kpi-label">Inadimplência</span>
                <span className="lp-solucao-kpi-val">3.2%</span>
                <span className="lp-solucao-kpi-trend neutral">▼ sob controle</span>
              </div>
            </div>

            {/* Gráfico de Receita Mensal + Contratos Recentes */}
            <div className="lp-solucao-mockup-body">
              <div className="lp-solucao-chart-box">
                <div className="lp-solucao-chart-header">
                  <span className="lp-solucao-chart-title">Receita Mensal (Projeção)</span>
                  <div className="lp-solucao-chart-legend">
                    <span><span className="lp-chart-dot" style={{ background: "#2bc578" }}></span> Realizado</span>
                    <span><span className="lp-chart-dot" style={{ background: "#F5C344" }}></span> Previsto</span>
                  </div>
                </div>

                <svg className="lp-solucao-chart-svg" viewBox="0 0 280 110" preserveAspectRatio="none">
                  {/* Linhas de Grade */}
                  <line x1="0" y1="25" x2="280" y2="25" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  <line x1="0" y1="55" x2="280" y2="55" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  <line x1="0" y1="85" x2="280" y2="85" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

                  {/* Curva de Receita Realizada (Verde) */}
                  <path d="M 10 85 Q 70 70 140 45 T 270 20" fill="none" stroke="#2bc578" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Curva Projetada (Dourado) */}
                  <path d="M 10 95 Q 70 80 140 55 T 270 30" fill="none" stroke="#F5C344" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />

                  {/* Marcadores de Pontos */}
                  <circle cx="140" cy="45" r="4" fill="#2bc578" />
                  <circle cx="270" cy="20" r="4" fill="#2bc578" />

                  {/* Rótulos dos Meses */}
                  <text x="15" y="105" fill="#C7D8DD" fontSize="8" fontFamily="sans-serif">Jan</text>
                  <text x="80" y="105" fill="#C7D8DD" fontSize="8" fontFamily="sans-serif">Fev</text>
                  <text x="145" y="105" fill="#C7D8DD" fontSize="8" fontFamily="sans-serif">Mar</text>
                  <text x="210" y="105" fill="#C7D8DD" fontSize="8" fontFamily="sans-serif">Abr</text>
                  <text x="260" y="105" fill="#C7D8DD" fontSize="8" fontFamily="sans-serif">Mai</text>
                </svg>
              </div>

              {/* Lista Ilustrativa de Contratos Recentes */}
              <div className="lp-solucao-recents-box">
                <span className="lp-solucao-recents-title">Contratos Recentes</span>

                <div className="lp-solucao-recent-item">
                  <div>
                    <span className="lp-solucao-recent-name">Maria Helena S.</span>
                    <span className="lp-solucao-recent-plan">Plano Familiar Ouro</span>
                  </div>
                  <span className="lp-solucao-mockup-status">Ativo</span>
                </div>

                <div className="lp-solucao-recent-item">
                  <div>
                    <span className="lp-solucao-recent-name">Carlos Eduardo R.</span>
                    <span className="lp-solucao-recent-plan">Plano Individual Prata</span>
                  </div>
                  <span className="lp-solucao-mockup-status">Ativo</span>
                </div>

                <div className="lp-solucao-recent-item">
                  <div>
                    <span className="lp-solucao-recent-name">Fernanda Lima P.</span>
                    <span className="lp-solucao-recent-plan">Plano Familiar Bronze</span>
                  </div>
                  <span className="lp-solucao-mockup-status pending">Em emissão</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------
         SEÇÃO: POR QUE ESCOLHER O MEMORIUS? (Diferenciais)
         -------------------------------------------------- */}
      <section id="escolha" className="lp-escolha-section">
        <div className="lp-escolha-container">
          {/* Coluna Esquerda: Mockup Ilustrativo Limpo do Dashboard */}
          <div className="lp-diferenciais-mockup">
            <div className="lp-dif-mockup-header">
              <div className="lp-dif-mockup-brand">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0B4F59" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                PAINEL OPERACIONAL <span>Ao Vivo</span>
              </div>
              <span style={{ fontSize: "0.68rem", color: "#64748B", fontWeight: 600 }}>Sincronização Nuvem ✓</span>
            </div>

            <div className="lp-dif-kpis">
              <div className="lp-dif-kpi-card highlight">
                <span className="lp-dif-kpi-label">Carnês Processados</span>
                <span className="lp-dif-kpi-val">4.290</span>
                <span className="lp-dif-kpi-sub">Lote emitido</span>
              </div>
              <div className="lp-dif-kpi-card">
                <span className="lp-dif-kpi-label">Atendimentos OS</span>
                <span className="lp-dif-kpi-val">38 Concluídos</span>
                <span className="lp-dif-kpi-sub">Tempo: 4min</span>
              </div>
              <div className="lp-dif-kpi-card">
                <span className="lp-dif-kpi-label">Disponibilidade</span>
                <span className="lp-dif-kpi-val">99.9%</span>
                <span className="lp-dif-kpi-sub">100% Online</span>
              </div>
            </div>

            <div className="lp-dif-mockup-chart">
              <div className="lp-dif-chart-header">
                <span className="lp-dif-chart-title">Evolução da Carteira de Contratos</span>
                <span style={{ fontSize: "0.65rem", color: "#16A34A", fontWeight: 700 }}>▲ Crescimento Contínuo</span>
              </div>
              <svg viewBox="0 0 280 60" style={{ width: "100%", height: "60px" }}>
                <path d="M0 50 Q70 45 140 25 T280 8 L280 60 L0 60 Z" fill="rgba(11, 79, 89, 0.08)" />
                <path d="M0 50 Q70 45 140 25 T280 8" fill="none" stroke="#0B4F59" strokeWidth="2.5" />
              </svg>
            </div>

            <div className="lp-dif-floating-cards">
              <div className="lp-dif-float-item">
                <div className="lp-dif-float-icon">🛡️</div>
                <div>
                  <strong style={{ display: "block", color: "#092D2B" }}>Backup Contínuo</strong>
                  <span style={{ color: "#64748B", fontSize: "0.68rem" }}>Dados criptografados</span>
                </div>
              </div>
              <div className="lp-dif-float-item">
                <div className="lp-dif-float-icon">🏢</div>
                <div>
                  <strong style={{ display: "block", color: "#092D2B" }}>Multiempresa</strong>
                  <span style={{ color: "#64748B", fontSize: "0.68rem" }}>Matriz e filiais</span>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Informações e Diferenciais em Grade 2x2 */}
          <div className="lp-escolha-content">
            <h2 className="lp-escolha-title">
              Mais do que um software.<br />Uma plataforma para <span className="lp-escolha-title-highlight">organizar toda a operação.</span>
            </h2>
            <p className="lp-escolha-subtitle">
              O Memorius conecta clientes, contratos, mensalidades, atendimento, indicadores e gestão financeira em um único ambiente seguro e intuitivo.
            </p>

            <div className="lp-escolha-blocks">
              {/* Bloco 1 */}
              <div className="lp-escolha-block">
                <div className="lp-escolha-block-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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

        {/* 5 Benefícios em Pills */}
        <div className="lp-escolha-badges-row">
          <span className="lp-badge-item">✓ 100% em nuvem</span>
          <span className="lp-badge-item">✓ Multiempresa</span>
          <span className="lp-badge-item">✓ Seguro</span>
          <span className="lp-badge-item">✓ Atualizações constantes</span>
          <span className="lp-badge-item">✓ Suporte especializado</span>
        </div>
      </section>

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
          <div className="lp-section-header lp-beneficios-header">
            <span className="lp-section-eyebrow">Benefícios Tecnológicos</span>
            <h2 className="lp-section-title">Tecnologia que simplifica sua rotina.</h2>
          </div>

          <div className="lp-beneficios-grid">
            {/* Card 1 */}
            <div className="lp-beneficios-card">
              <div className="lp-beneficios-card-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          <div className="lp-section-header lp-planos-header">
            <span className="lp-section-eyebrow">Nossos Planos</span>
            <h2 className="lp-section-title">Preços transparentes, diferenciados apenas pela capacidade.</h2>
            <p className="lp-problema-subtitle" style={{ color: "#C7D8DD", marginTop: "1rem" }}>
              Todos os planos incluem 100% dos módulos e funcionalidades do sistema. Sem cobrança por excedente: ao atingir a capacidade, basta fazer o upgrade do seu plano.
            </p>
            <div>
              <span className="lp-planos-trial-pill">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                Teste grátis de 7 dias em qualquer plano — sem compromisso
              </span>
            </div>
          </div>

          <div className="lp-planos-grid">
            {/* Card 1: Essencial */}
            <div className="lp-plano-card">
              <div>
                <h3 className="lp-plano-name">Essencial</h3>
                <div className="lp-plano-price-wrapper">
                  <span className="lp-plano-currency">R$</span>
                  <span className="lp-plano-price">149,90</span>
                  <span className="lp-plano-period">/mês</span>
                </div>
                <p className="lp-plano-subtitle-text">Para empresas estruturando e organizando sua base inicial de contratos.</p>

                {/* Capacidade */}
                <div className="lp-plano-capacities">
                  <div className="lp-plano-capacity-row">
                    <span className="lp-plano-capacity-label">
                      <svg className="lp-plano-capacity-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      Usuários do sistema
                    </span>
                    <span className="lp-plano-capacity-value">Até 2</span>
                  </div>
                  <div className="lp-plano-capacity-row">
                    <span className="lp-plano-capacity-label">
                      <svg className="lp-plano-capacity-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      Associados cadastrados
                    </span>
                    <span className="lp-plano-capacity-value">Até 500</span>
                  </div>
                  <div className="lp-plano-capacity-row">
                    <span className="lp-plano-capacity-label">
                      <svg className="lp-plano-capacity-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                      Contratos ativos
                    </span>
                    <span className="lp-plano-capacity-value">Até 500</span>
                  </div>
                </div>

                <div className="lp-plano-divider">
                  <span className="lp-plano-divider-line"></span>
                  <span className="lp-plano-divider-label">Módulos Inclusos</span>
                  <span className="lp-plano-divider-line"></span>
                </div>
                
                <ul className="lp-plano-features">
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Clientes e Dependentes
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Planos e Contratos
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Mensalidades e Cobranças Integradas
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Financeiro e Fluxo de Caixa
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Dashboard Executivo e Relatórios
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Atendimento e Suporte Especializado
                  </li>
                </ul>
              </div>

              <a href="https://wa.me/5591981755021?text=Ol%C3%A1%21+Gostaria+de+iniciar+o+teste+gr%C3%A1tis+de+7+dias+do+plano+Essencial+do+Memorius." target="_blank" rel="noopener noreferrer" className="lp-plano-btn secondary">
                Iniciar Teste Grátis
              </a>
            </div>

            {/* Card 2: Profissional */}
            <div className="lp-plano-card highlighted">
              <span className="lp-plano-badge">Mais Escolhido</span>
              <div>
                <h3 className="lp-plano-name">Profissional</h3>
                <div className="lp-plano-price-wrapper">
                  <span className="lp-plano-currency">R$</span>
                  <span className="lp-plano-price">249,90</span>
                  <span className="lp-plano-period">/mês</span>
                </div>
                <p className="lp-plano-subtitle-text">Para empresas consolidadas e em franca expansão de carteira e equipe.</p>

                {/* Capacidade */}
                <div className="lp-plano-capacities">
                  <div className="lp-plano-capacity-row">
                    <span className="lp-plano-capacity-label">
                      <svg className="lp-plano-capacity-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      Usuários do sistema
                    </span>
                    <span className="lp-plano-capacity-value">Até 5</span>
                  </div>
                  <div className="lp-plano-capacity-row">
                    <span className="lp-plano-capacity-label">
                      <svg className="lp-plano-capacity-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      Associados cadastrados
                    </span>
                    <span className="lp-plano-capacity-value">Até 2.000</span>
                  </div>
                  <div className="lp-plano-capacity-row">
                    <span className="lp-plano-capacity-label">
                      <svg className="lp-plano-capacity-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                      Contratos ativos
                    </span>
                    <span className="lp-plano-capacity-value">Até 2.000</span>
                  </div>
                </div>

                <div className="lp-plano-divider">
                  <span className="lp-plano-divider-line"></span>
                  <span className="lp-plano-divider-label">Módulos Inclusos</span>
                  <span className="lp-plano-divider-line"></span>
                </div>
                
                <ul className="lp-plano-features">
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Clientes e Dependentes
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Planos e Contratos
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Mensalidades e Cobranças Integradas
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Financeiro e Fluxo de Caixa
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Dashboard Executivo e Relatórios
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Atendimento e Suporte Especializado
                  </li>
                </ul>
              </div>

              <a href="https://wa.me/5591981755021?text=Ol%C3%A1%21+Gostaria+de+iniciar+o+teste+gr%C3%A1tis+de+7+dias+do+plano+Profissional+do+Memorius." target="_blank" rel="noopener noreferrer" className="lp-plano-btn primary">
                Iniciar Teste Grátis
              </a>
            </div>

            {/* Card 3: Enterprise */}
            <div className="lp-plano-card">
              <div>
                <h3 className="lp-plano-name">Enterprise</h3>
                <div className="lp-plano-price-wrapper">
                  <span className="lp-plano-currency">R$</span>
                  <span className="lp-plano-price">499,90</span>
                  <span className="lp-plano-period">/mês</span>
                </div>
                <p className="lp-plano-subtitle-text">Para operações robustas, grandes carteiras e múltiplos operadores.</p>

                {/* Capacidade */}
                <div className="lp-plano-capacities">
                  <div className="lp-plano-capacity-row">
                    <span className="lp-plano-capacity-label">
                      <svg className="lp-plano-capacity-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      Usuários do sistema
                    </span>
                    <span className="lp-plano-capacity-value">Até 15</span>
                  </div>
                  <div className="lp-plano-capacity-row">
                    <span className="lp-plano-capacity-label">
                      <svg className="lp-plano-capacity-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      Associados cadastrados
                    </span>
                    <span className="lp-plano-capacity-value">Até 10.000</span>
                  </div>
                  <div className="lp-plano-capacity-row">
                    <span className="lp-plano-capacity-label">
                      <svg className="lp-plano-capacity-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                      Contratos ativos
                    </span>
                    <span className="lp-plano-capacity-value">Até 10.000</span>
                  </div>
                </div>

                <div className="lp-plano-divider">
                  <span className="lp-plano-divider-line"></span>
                  <span className="lp-plano-divider-label">Módulos Inclusos</span>
                  <span className="lp-plano-divider-line"></span>
                </div>
                
                <ul className="lp-plano-features">
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Clientes e Dependentes
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Planos e Contratos
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Mensalidades e Cobranças Integradas
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Financeiro e Fluxo de Caixa
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Dashboard Executivo e Relatórios
                  </li>
                  <li className="lp-plano-feature-item">
                    <span className="lp-plano-feature-check">✓</span> Atendimento e Suporte Especializado
                  </li>
                </ul>
              </div>

              <a href="https://wa.me/5591981755021?text=Ol%C3%A1%21+Gostaria+de+iniciar+o+teste+gr%C3%A1tis+de+7+dias+do+plano+Enterprise+do+Memorius." target="_blank" rel="noopener noreferrer" className="lp-plano-btn secondary">
                Iniciar Teste Grátis
              </a>
            </div>
          </div>

          {/* Dúvidas sobre Planos */}
          <div className="lp-planos-footer">
            <p className="lp-planos-footer-text">
              Ao atingir o limite de associados, contratos ativos ou usuários do seu plano, novos cadastros são pausados até o upgrade. Não cobramos valores adicionais por excedente.
            </p>
            <a href="https://wa.me/5591981755021?text=Ol%C3%A1%21+Tenho+d%C3%BAvidas+sobre+os+planos+do+Memorius." target="_blank" rel="noopener noreferrer" className="lp-btn-whatsapp-footer">
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
