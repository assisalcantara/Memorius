/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useStorage } from "@/hooks/useStorage";
import { useTenant } from "@/context/TenantContext";
import { clientesSupabaseService } from "@/services/clientes.supabase.service";
import { contratosSupabaseService } from "@/services/contratos.supabase.service";
import { mensalidadesSupabaseService } from "@/services/mensalidades.supabase.service";
import { atendimentosSupabaseService } from "@/services/atendimentos.supabase.service";
import { agregadosSupabaseService } from "@/services/agregados.supabase.service";
import { usuariosSupabaseService } from "@/services/usuarios.supabase.service";
import { usePermission } from "@/context/PermissionContext";
import { Cliente, Contrato, Mensalidade, Agregado, Atendimento, Profile } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type FilterType = "HOJE" | "7_DIAS" | "30_DIAS" | "90_DIAS" | "ANO_ATUAL";

function isWithinDateRange(dateStr: string | undefined | null, filter: FilterType): boolean {
  if (!dateStr) return false;
  try {
    const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const parts = datePart.split("-");
    if (parts.length !== 3) return false;

    const recordDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(recordDate.getTime())) return false;

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const recordMidnight = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());

    const diffTime = todayMidnight.getTime() - recordMidnight.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (filter === "HOJE") {
      return diffDays === 0;
    }
    if (filter === "7_DIAS") {
      return diffDays >= 0 && diffDays <= 7;
    }
    if (filter === "30_DIAS") {
      return diffDays >= 0 && diffDays <= 30;
    }
    if (filter === "90_DIAS") {
      return diffDays >= 0 && diffDays <= 90;
    }
    if (filter === "ANO_ATUAL") {
      return recordDate.getFullYear() === today.getFullYear();
    }
  } catch {
    return false;
  }
  return true;
}

export default function DashboardPage() {
  const { tenant, userProfile } = useTenant();
  const { data: clientes } = useStorage<Cliente>(clientesSupabaseService as any);
  const { data: contratos } = useStorage<Contrato>(contratosSupabaseService as any);
  const { data: mensalidades } = useStorage<Mensalidade>(mensalidadesSupabaseService as any);
  const { data: atendimentos } = useStorage<Atendimento>(atendimentosSupabaseService as any);
  const { data: agregados } = useStorage<Agregado>(agregadosSupabaseService as any);

  const { roleName } = usePermission();
  const [filter, setFilter] = useState<FilterType>("30_DIAS");

  const isFullView = roleName === "ADMIN" || roleName === "GERENTE";
  const isAtendente = roleName === "ATENDENTE";
  const isFinanceiro = roleName === "FINANCEIRO";
  const isConsulta = roleName === "CONSULTA";

  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    if (isFullView) {
      usuariosSupabaseService.getAll().then(data => {
        setProfiles(data);
      });
    }
  }, [isFullView]);

  // Filter lists based on date
  const filteredClientes = clientes.filter(c => isWithinDateRange(c.dataCadastro, filter));
  const filteredContratos = contratos.filter(c => isWithinDateRange(c.dataInicio, filter));
  const filteredMensalidades = mensalidades.filter(m => isWithinDateRange(m.dataVencimento, filter));
  const filteredAtendimentos = atendimentos.filter(a => isWithinDateRange(a.data, filter));

  // 1. Clientes Ativos
  const clientesAtivos = filteredClientes.filter(c => c.status === "Ativo").length;

  // 2. Contratos Ativos
  const contratosAtivos = filteredContratos.filter(c => c.status === "Ativo").length;

  // 3. Total de Agregados
  const totalAgregados = agregados.length;

  // 4. Mensalidades em Aberto
  const mensalidadesAbertoQtd = filteredMensalidades.filter(m => m.status === "EM_ABERTO").length;

  // 5. Valor Total em Aberto
  const valorEmAberto = filteredMensalidades
    .filter(m => m.status === "EM_ABERTO")
    .reduce((acc, m) => acc + Number(m.valor || 0), 0);

  // 6. Valor Recebido
  const valorRecebido = filteredMensalidades
    .filter(m => m.status === "PAGO")
    .reduce((acc, m) => acc + Number(m.valorRecebido || m.valor || 0), 0);

  // 7. Atendimentos do Mês
  const atendimentosQtd = filteredAtendimentos.length;

  // 8. Taxa de Inadimplência
  const totalMensalidadesFiltered = filteredMensalidades.filter(m => m.status !== "CANCELADO").length;
  const inadimplenciaTaxa = totalMensalidadesFiltered > 0
    ? Math.round((mensalidadesAbertoQtd / totalMensalidadesFiltered) * 100)
    : 0;

  // 9. User Metrics
  const activeUsers = profiles.filter(p => p.status === "ATIVO").length;
  const inactiveUsers = profiles.filter(p => p.status === "INATIVO").length;
  const pendingInvites = profiles.filter(p => p.status === "CONVIDADO").length;

  // Permission Checks for Quick Actions
  const canAddCliente = roleName === "ADMIN" || roleName === "GERENTE" || roleName === "ATENDENTE";
  const canAddContrato = roleName === "ADMIN" || roleName === "GERENTE";
  const canGerarMensalidade = roleName === "ADMIN" || roleName === "GERENTE" || roleName === "FINANCEIRO";
  const canAddAtendimento = roleName === "ADMIN" || roleName === "GERENTE" || roleName === "ATENDENTE";
  const canVerRelatorios = roleName === "ADMIN" || roleName === "GERENTE" || roleName === "FINANCEIRO";
  const canAddUsuario = roleName === "ADMIN";

  // Alerts calculations
  const vencidasList = mensalidades.filter(m => m.status === "EM_ABERTO" && new Date(m.dataVencimento) < new Date());
  const totalMensalidadesVencidasQtd = vencidasList.length;
  const totalValorAtraso = vencidasList.reduce((acc, m) => acc + Number(m.valor || 0), 0);

  const contratosCancelados30Dias = contratos.filter(c => c.status === "Cancelado" && isWithinDateRange(c.dataInicio, "30_DIAS")).length;

  const convitesAguardandoSeteDias = profiles.filter(p => {
    if (p.status !== "CONVIDADO" || !p.created_at) return false;
    const diff = new Date().getTime() - new Date(p.created_at).getTime();
    return diff > 7 * 24 * 60 * 60 * 1000;
  }).length;

  const totalUsuariosInativos = profiles.filter(p => p.status === "INATIVO").length;
  const totalAtendimentosAbertos = atendimentos.filter(a => a.status === "Aberto").length;

  const hasAlerts = totalMensalidadesVencidasQtd > 0 ||
    contratosCancelados30Dias > 0 ||
    convitesAguardandoSeteDias > 0 ||
    totalUsuariosInativos > 0 ||
    totalAtendimentosAbertos > 0;

  // Lists
  const ultimosContratos = [...contratos].slice(-5).reverse();
  const ultimosAtendimentos = [...atendimentos].slice(-5).reverse();
  const mensalidadesVencidas = mensalidades
    .filter(m => m.status === "EM_ABERTO" && new Date(m.dataVencimento) < new Date())
    .slice(-5)
    .reverse();

  // Chart 1: Contratos por Plano
  const planCounts: Record<string, number> = {};
  filteredContratos.forEach(c => {
    const name = c.planoNome || "Sem Plano";
    planCounts[name] = (planCounts[name] || 0) + 1;
  });
  const planEntries = Object.entries(planCounts);
  const maxPlanCount = Math.max(...Object.values(planCounts), 1);

  // Chart 2: Mensalidades Status
  const paidCount = filteredMensalidades.filter(m => m.status === "PAGO").length;
  const openCount = filteredMensalidades.filter(m => m.status === "EM_ABERTO").length;
  const cancelCount = filteredMensalidades.filter(m => m.status === "CANCELADO").length;
  const maxMensalidadeCount = Math.max(paidCount, openCount, cancelCount, 1);

  // Chart 3: Atendimentos por Mês
  const monthCounts: Record<string, number> = {};
  atendimentos.forEach(a => {
    if (a.data) {
      const parts = a.data.split("-");
      if (parts.length >= 2) {
        const monthYear = `${parts[1]}/${parts[0]}`;
        monthCounts[monthYear] = (monthCounts[monthYear] || 0) + 1;
      }
    }
  });
  const sortedMonths = Object.keys(monthCounts).sort((a, b) => {
    const [mA, yA] = a.split("/").map(Number);
    const [mB, yB] = b.split("/").map(Number);
    return yA !== yB ? yA - yB : mA - mB;
  }).slice(-6);
  const maxMonthCount = Math.max(...sortedMonths.map(m => monthCounts[m]), 1);
  const linePoints = sortedMonths.map((m, index) => {
    const x = 50 + index * 45;
    const y = 150 - (monthCounts[m] / maxMonthCount) * 100;
    return { x, y, label: m, value: monthCounts[m] };
  });
  const polylinePoints = linePoints.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <div className="premium-dashboard">
      <style>{`
        /* Premium Variables */
        :root {
          --d-brand: #0b4f59;
          --d-brand-hover: #07353c;
          --d-accent: #118c7e;
          --d-dark-green: #062e26;
          --d-border: rgba(226, 232, 240, 0.8);
          --d-shadow: 0 10px 30px -10px rgba(11, 79, 89, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02);
          --d-shadow-hover: 0 20px 40px -12px rgba(11, 79, 89, 0.1), 0 4px 12px rgba(0, 0, 0, 0.03);
          --d-radius: 20px;
        }

        .premium-dashboard {
          animation: fade-in-dashboard 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes fade-in-dashboard {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── HERO ── */
        .db-hero {
          background: linear-gradient(135deg, #0b4f59 0%, #062e26 100%);
          padding: 2.5rem 3rem;
          border-radius: var(--d-radius);
          color: white;
          margin-bottom: 2rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 12px 35px -10px rgba(11, 79, 89, 0.3);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 2rem;
        }
        .db-hero::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 80% 20%, rgba(255,255,255,0.06), transparent 50%);
          pointer-events: none;
        }
        .db-hero-left {
          position: relative;
          z-index: 5;
        }
        .db-hero-title {
          font-size: 1.85rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .db-hero-desc {
          color: rgba(255, 255, 255, 0.7);
          font-size: 1rem;
          font-weight: 500;
        }
        .db-hero-empresa {
          color: #00ffaa;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .db-hero-right {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          position: relative;
          z-index: 5;
          flex-wrap: wrap;
        }
        .db-hero-badge {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 99px;
          padding: 0.5rem 1.1rem;
          font-size: 0.85rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .db-badge-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
        }
        .db-badge-dot.active {
          background: #00ffaa;
          box-shadow: 0 0 8px #00ffaa;
        }
        .db-badge-dot.pending {
          background: #ffb700;
          box-shadow: 0 0 8px #ffb700;
        }

        /* Period filter */
        .db-filter-bar {
          display: flex;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.25rem;
          border-radius: 12px;
          gap: 0.15rem;
        }
        .db-filter-btn {
          padding: 0.45rem 0.9rem;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.7);
          background: transparent;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .db-filter-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
        }
        .db-filter-btn.active {
          background: #ffffff;
          color: #0b4f59;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        /* ── CARDS PREMIUM ── */
        .db-card {
          background: #ffffff;
          border-radius: var(--d-radius);
          border: 1px solid var(--d-border);
          box-shadow: var(--d-shadow);
          padding: 1.5rem 1.75rem;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .db-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--d-shadow-hover);
          border-color: rgba(11, 79, 89, 0.15);
        }

        /* ── HIERARQUIA DOS KPIS ── */
        .db-kpis-container {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 2rem;
        }
        .db-kpi-row-1 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.25rem;
        }
        .db-kpi-row-2 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.25rem;
        }
        .db-kpi-row-3 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1.25rem;
        }

        /* Row 1 Main KPIs Accent */
        .db-card-main {
          border-top: 4px solid var(--d-brand);
          position: relative;
        }
        .db-card-main::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 100%;
          background: linear-gradient(180deg, rgba(11,79,89,0.015) 0%, transparent 100%);
          pointer-events: none;
        }
        .db-kpi-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: block;
          margin-bottom: 0.5rem;
        }
        .db-kpi-val {
          font-size: 2rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.03em;
          line-height: 1;
        }
        .db-kpi-val-main {
          font-size: 2.25rem;
          color: #0b4f59;
        }

        /* ── CENTRAL DE PENDÊNCIAS ── */
        .db-alerts-box {
          background: #ffffff;
          border-radius: var(--d-radius);
          border: 1px solid var(--d-border);
          box-shadow: var(--d-shadow);
          padding: 1.75rem 2rem;
          margin-bottom: 2rem;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .db-alerts-box:hover {
          box-shadow: var(--d-shadow-hover);
        }
        .db-alerts-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.25rem;
        }
        .db-alerts-header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .db-alerts-icon-wrap {
          width: 48px; height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }
        .db-alerts-icon-wrap.has-alerts {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .db-alerts-icon-wrap.no-alerts {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .db-alerts-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.01em;
          margin-bottom: 0.25rem;
        }
        .db-alerts-subtitle {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 500;
        }
        .db-alerts-btn {
          background: #0b4f59;
          color: white;
          border: none;
          padding: 0.65rem 1.35rem;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(11, 79, 89, 0.15);
        }
        .db-alerts-btn:hover {
          background: #07353c;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(11, 79, 89, 0.25);
        }
        .db-alerts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1rem;
          margin-top: 1.5rem;
          border-top: 1px solid var(--d-border);
          padding-top: 1.25rem;
          animation: fade-in-dashboard 0.3s ease;
        }
        .db-alert-item {
          background: #f8fafc;
          border: 1px solid var(--d-border);
          border-radius: 12px;
          padding: 0.85rem 1.1rem;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }
        .db-alert-item-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #ef4444;
          margin-top: 6px;
          flex-shrink: 0;
        }
        .db-alert-item-content {
          font-size: 0.88rem;
          color: #334155;
          font-weight: 600;
        }
        .db-alert-item-subtext {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.15rem;
          font-weight: 500;
        }

        /* ── AÇÕES RÁPIDAS PREMIUM ── */
        .db-actions-title {
          font-size: 1.2rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 1.25rem;
          letter-spacing: -0.01em;
        }
        .db-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .db-action-card {
          background: #ffffff;
          border: 1px solid var(--d-border);
          border-radius: 16px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          text-decoration: none;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 12px -5px rgba(11,79,89,0.04);
        }
        .db-action-card:hover {
          transform: translateY(-2px) scale(1.02);
          border-color: #0b4f59;
          box-shadow: 0 10px 20px -8px rgba(11,79,89,0.12);
        }
        .db-action-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          background: rgba(11, 79, 89, 0.06);
          color: #0b4f59;
          font-size: 1.35rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .db-action-card:hover .db-action-icon {
          background: #0b4f59;
          color: #ffffff;
        }
        .db-action-meta {
          display: flex;
          flex-direction: column;
        }
        .db-action-title-text {
          font-size: 0.9rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.15rem;
        }
        .db-action-desc {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 500;
        }

        /* ── EMPTY STATES PREMIUM ── */
        .db-empty-state {
          padding: 2.5rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          height: 100%;
          min-height: 180px;
        }
        .db-empty-icon {
          font-size: 2rem;
          margin-bottom: 0.75rem;
          filter: drop-shadow(0 4px 10px rgba(11,79,89,0.1));
        }
        .db-empty-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #334155;
          margin-bottom: 0.35rem;
        }
        .db-empty-desc {
          font-size: 0.8rem;
          color: #64748b;
          max-width: 250px;
          line-height: 1.5;
          margin-bottom: 1rem;
        }
        .db-empty-btn {
          background: rgba(11, 79, 89, 0.08);
          color: #0b4f59;
          border: none;
          padding: 0.45rem 1rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .db-empty-btn:hover {
          background: #0b4f59;
          color: white;
        }

        /* Chart card title styling */
        .db-chart-card-title {
          color: #0f172a;
          margin-bottom: 1.25rem;
          font-size: 1.05rem;
          font-weight: 800;
          border-bottom: 1px solid var(--d-border);
          padding-bottom: 0.75rem;
        }

        /* General table adjustments */
        .premium-dashboard table th {
          background: #f8fafc;
          border-bottom: 1px solid var(--d-border);
          color: #475569;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.65rem 0.5rem;
        }
        .premium-dashboard table td {
          padding: 0.65rem 0.5rem;
          font-size: 0.82rem;
          border-bottom: 1px solid #f1f5f9;
        }
        .premium-dashboard table tr:hover td {
          background-color: #f8fafc;
        }

        /* Sidebar enhancement classes */
        /* These override global style definitions dynamically */
        .sidebar-menu-item a {
          border-radius: 12px;
          margin: 0.15rem 0.5rem;
          transition: all 0.2s ease;
          font-weight: 500;
          color: #94a3b8;
        }
        .sidebar-menu-item:hover a {
          background: rgba(255, 255, 255, 0.04) !important;
          color: #ffffff !important;
        }
        .sidebar-menu-item.active a {
          background: linear-gradient(135deg, #0b4f59 0%, #118c7e 100%) !important;
          color: #ffffff !important;
          box-shadow: 0 4px 12px rgba(11, 79, 89, 0.25);
          font-weight: 700;
        }
      `}</style>

      {/* ── 1. HERO SECTION ── */}
      <div className="db-hero">
        <div className="db-hero-left">
          <h1 className="db-hero-title">
            Bom dia, {userProfile?.nome || "Proprietária"} 👋
          </h1>
          <p className="db-hero-desc">
            Bem-vindo ao painel de gestão da <span className="db-hero-empresa">{tenant?.empresa || "sua empresa"}</span>
          </p>
        </div>

        <div className="db-hero-right">
          <div className="db-hero-badge">
            <span className="db-badge-dot active" />
            <strong>{clientesAtivos}</strong> clientes ativos
          </div>
          <div className="db-hero-badge">
            <span className="db-badge-dot active" />
            <strong>{contratosAtivos}</strong> contratos ativos
          </div>
          {isFullView && pendingInvites > 0 && (
            <div className="db-hero-badge">
              <span className="db-badge-dot pending" />
              <strong>{pendingInvites}</strong> convite pendente
            </div>
          )}

          {/* Period Filter Selector */}
          <div className="db-filter-bar">
            {(["HOJE", "7_DIAS", "30_DIAS", "90_DIAS", "ANO_ATUAL"] as FilterType[]).map((opt) => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`db-filter-btn ${filter === opt ? "active" : ""}`}
              >
                {opt === "HOJE" && "Hoje"}
                {opt === "7_DIAS" && "7 Dias"}
                {opt === "30_DIAS" && "30 Dias"}
                {opt === "90_DIAS" && "90 Dias"}
                {opt === "ANO_ATUAL" && "Ano"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2. CENTRAL DE PENDÊNCIAS (INTELLIGENT ALERTS) ── */}
      <div className="db-alerts-box">
        <div className="db-alerts-header">
          <div className="db-alerts-header-left">
            <div className={`db-alerts-icon-wrap ${hasAlerts ? "has-alerts" : "no-alerts"}`}>
              {hasAlerts ? "⚠️" : "✨"}
            </div>
            <div>
              <h4 className="db-alerts-title">
                {hasAlerts 
                  ? `Existem ${vencidasList.length + totalAtendimentosAbertos + contratosCancelados30Dias} pendências importantes` 
                  : "Central de Pendências"
                }
              </h4>
              <p className="db-alerts-subtitle">
                {hasAlerts 
                  ? "Algumas tarefas e pagamentos do operacional ou financeiro precisam de revisão."
                  : "Nenhuma mensalidade vencida · Nenhum atendimento agendado · Nenhum contrato vencendo hoje"
                }
              </p>
            </div>
          </div>
          {hasAlerts && (
            <Link href="#operacional-alerts">
              <button className="db-alerts-btn">Ver Pendências</button>
            </Link>
          )}
        </div>

        {hasAlerts && (
          <div className="db-alerts-grid" id="operacional-alerts">
            {totalMensalidadesVencidasQtd > 0 && (
              <div className="db-alert-item">
                <span className="db-alert-item-dot" />
                <div className="db-alert-item-content">
                  {totalMensalidadesVencidasQtd} mensalidades vencidas
                  <div className="db-alert-item-subtext">
                    Total em aberto com atraso: <strong>{formatCurrency(totalValorAtraso)}</strong>
                  </div>
                </div>
              </div>
            )}
            {contratosCancelados30Dias > 0 && (
              <div className="db-alert-item">
                <span className="db-alert-item-dot" />
                <div className="db-alert-item-content">
                  {contratosCancelados30Dias} contratos cancelados
                  <div className="db-alert-item-subtext">Cancelamentos nos últimos 30 dias</div>
                </div>
              </div>
            )}
            {totalAtendimentosAbertos > 0 && (
              <div className="db-alert-item">
                <span className="db-alert-item-dot" />
                <div className="db-alert-item-content">
                  {totalAtendimentosAbertos} atendimentos abertos
                  <div className="db-alert-item-subtext">Aguardando finalização do operador</div>
                </div>
              </div>
            )}
            {convitesAguardandoSeteDias > 0 && (
              <div className="db-alert-item">
                <span className="db-alert-item-dot" />
                <div className="db-alert-item-content">
                  {convitesAguardandoSeteDias} convites pendentes
                  <div className="db-alert-item-subtext">Envios aguardando ativação há +7 dias</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 3. HIERARQUIA DOS KPIS ── */}
      <div className="db-kpis-container">
        {/* ROW 1: Principais Métricas Financeiras / Operacionais */}
        <div className="db-kpi-row-1">
          {(isFullView || isFinanceiro) && (
            <div className="db-card db-card-main">
              <span className="db-kpi-title">Receita Recebida</span>
              <h2 className="db-kpi-val db-kpi-val-main">{formatCurrency(valorRecebido)}</h2>
            </div>
          )}
          {(isFullView || isFinanceiro) && (
            <div className="db-card db-card-main">
              <span className="db-kpi-title">Valor em Aberto</span>
              <h2 className="db-kpi-val db-kpi-val-main" style={{ color: "#e05353" }}>{formatCurrency(valorEmAberto)}</h2>
            </div>
          )}
          {(isFullView || isAtendente || isConsulta) && (
            <div className="db-card db-card-main">
              <span className="db-kpi-title">Clientes Ativos</span>
              <h2 className="db-kpi-val db-kpi-val-main" style={{ color: "#118c7e" }}>{clientesAtivos}</h2>
            </div>
          )}
        </div>

        {/* ROW 2: Métricas de Volume Intermediárias */}
        <div className="db-kpi-row-2">
          {(isFullView || isAtendente || isConsulta) && (
            <div className="db-card">
              <span className="db-kpi-title">Contratos Ativos</span>
              <h2 className="db-kpi-val">{contratosAtivos}</h2>
            </div>
          )}
          {isFullView && (
            <div className="db-card">
              <span className="db-kpi-title">Usuários Ativos</span>
              <h2 className="db-kpi-val">{activeUsers}</h2>
            </div>
          )}
          {(isFullView || isAtendente) && (
            <div className="db-card">
              <span className="db-kpi-title">Atendimentos</span>
              <h2 className="db-kpi-val">{atendimentosQtd}</h2>
            </div>
          )}
          {(isFullView || isFinanceiro) && (
            <div className="db-card">
              <span className="db-kpi-title">Inadimplência</span>
              <h2 className="db-kpi-val" style={{ color: inadimplenciaTaxa > 15 ? "#ef4444" : "#f59e0b" }}>{inadimplenciaTaxa}%</h2>
            </div>
          )}
        </div>

        {/* ROW 3: Métricas Secundárias / Administrativas */}
        {isFullView && (
          <div className="db-kpi-row-3">
            {(isFullView || isAtendente) && (
              <div className="db-card" style={{ padding: "1.1rem 1.5rem" }}>
                <span className="db-kpi-title" style={{ fontSize: "0.75rem" }}>Total de Agregados</span>
                <h3 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0 }}>{totalAgregados}</h3>
              </div>
            )}
            <div className="db-card" style={{ padding: "1.1rem 1.5rem" }}>
              <span className="db-kpi-title" style={{ fontSize: "0.75rem" }}>Usuários Inativos</span>
              <h3 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0 }}>{inactiveUsers}</h3>
            </div>
            <div className="db-card" style={{ padding: "1.1rem 1.5rem" }}>
              <span className="db-kpi-title" style={{ fontSize: "0.75rem" }}>Convites Pendentes</span>
              <h3 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0 }}>{pendingInvites}</h3>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. AÇÕES RÁPIDAS PREMIUM CARD ── */}
      {!isConsulta && (
        <div>
          <h3 className="db-actions-title">Ações Rápidas</h3>
          <div className="db-actions-grid">
            {canAddCliente && (
              <Link href="/dashboard/clientes?action=new" className="db-action-card">
                <div className="db-action-icon">➕</div>
                <div className="db-action-meta">
                  <span className="db-action-title-text">Novo Cliente</span>
                  <span className="db-action-desc">Cadastrar novo cliente</span>
                </div>
              </Link>
            )}
            {canAddContrato && (
              <Link href="/dashboard/contratos?action=new" className="db-action-card">
                <div className="db-action-icon">📄</div>
                <div className="db-action-meta">
                  <span className="db-action-title-text">Novo Contrato</span>
                  <span className="db-action-desc">Criar contrato funerário</span>
                </div>
              </Link>
            )}
            {canGerarMensalidade && (
              <Link href="/dashboard/mensalidades?action=new" className="db-action-card">
                <div className="db-action-icon">💰</div>
                <div className="db-action-meta">
                  <span className="db-action-title-text">Gerar Mensalidade</span>
                  <span className="db-action-desc">Criar cobrança recorrente</span>
                </div>
              </Link>
            )}
            {canAddAtendimento && (
              <Link href="/dashboard/atendimento?action=new" className="db-action-card">
                <div className="db-action-icon">🏥</div>
                <div className="db-action-meta">
                  <span className="db-action-title-text">Novo Atendimento</span>
                  <span className="db-action-desc">Registrar óbito/atendimento</span>
                </div>
              </Link>
            )}
            {canVerRelatorios && (
              <Link href="/dashboard/relatorios" className="db-action-card">
                <div className="db-action-icon">📊</div>
                <div className="db-action-meta">
                  <span className="db-action-title-text">Financeiro</span>
                  <span className="db-action-desc">Visualizar relatórios</span>
                </div>
              </Link>
            )}
            {canAddUsuario && (
              <Link href="/dashboard/usuarios?action=new" className="db-action-card">
                <div className="db-action-icon">👥</div>
                <div className="db-action-meta">
                  <span className="db-action-title-text">Novo Usuário</span>
                  <span className="db-action-desc">Adicionar colaborador</span>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── 5. GRÁFICOS & EMPTY STATES ── */}
      {!isConsulta && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          
          {/* Gráfico 1: Contratos por Plano */}
          {(isFullView || isAtendente) && (
            <div className="db-card">
              <h3 className="db-chart-card-title">Contratos por Plano</h3>
              {planEntries.length === 0 ? (
                <div className="db-empty-state">
                  <span className="db-empty-icon">📊</span>
                  <h4 className="db-empty-title">Nenhum plano ativo</h4>
                  <p className="db-empty-desc">
                    Assim que clientes e contratos forem cadastrados, os gráficos serão exibidos automaticamente.
                  </p>
                  {canAddContrato && (
                    <Link href="/dashboard/contratos?action=new">
                      <button className="db-empty-btn">Novo Contrato</button>
                    </Link>
                  )}
                </div>
              ) : (
                <svg width="100%" height={planEntries.length * 35 + 20} style={{ overflow: "visible" }}>
                  {planEntries.map(([plano, count], index) => {
                    const y = index * 35 + 10;
                    const barWidth = `${(count / maxPlanCount) * 60}%`;
                    return (
                      <g key={plano}>
                        <text x="0" y={y + 13} fill="#475569" fontSize="11" fontWeight="600">{plano}</text>
                        <rect x="120" y={y} width={barWidth} height="15" rx="4" fill="#0b4f59" />
                        <text x={`calc(120px + ${barWidth} + 6px)`} y={y + 12} fill="#0f172a" fontSize="11" fontWeight="bold">{count}</text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          )}

          {/* Gráfico 2: Mensalidades Status */}
          {(isFullView || isFinanceiro) && (
            <div className="db-card">
              <h3 className="db-chart-card-title">Status de Mensalidades</h3>
              {filteredMensalidades.length === 0 ? (
                <div className="db-empty-state">
                  <span className="db-empty-icon">💰</span>
                  <h4 className="db-empty-title">Sem faturamento no período</h4>
                  <p className="db-empty-desc">
                    Gere mensalidades ou carnês para visualizar a distribuição financeira de pagamentos.
                  </p>
                  {canGerarMensalidade && (
                    <Link href="/dashboard/mensalidades?action=new">
                      <button className="db-empty-btn">Gerar Mensalidade</button>
                    </Link>
                  )}
                </div>
              ) : (
                <svg viewBox="0 0 300 180" width="100%" height="180" style={{ overflow: "visible" }}>
                  <line x1="40" y1="20" x2="280" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="75" x2="280" y2="75" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="130" x2="280" y2="130" stroke="#f1f5f9" strokeWidth="1" />

                  {/* Pagas */}
                  <rect x="65" y={130 - (paidCount / maxMensalidadeCount) * 100} width="30" height={(paidCount / maxMensalidadeCount) * 100} rx="4" fill="#10b981" />
                  <text x="80" y={120 - (paidCount / maxMensalidadeCount) * 100} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">{paidCount}</text>
                  <text x="80" y="148" textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748b">Pagas</text>

                  {/* Em Aberto */}
                  <rect x="145" y={130 - (openCount / maxMensalidadeCount) * 100} width="30" height={(openCount / maxMensalidadeCount) * 100} rx="4" fill="#f59e0b" />
                  <text x="160" y={120 - (openCount / maxMensalidadeCount) * 100} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">{openCount}</text>
                  <text x="160" y="148" textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748b">Em Aberto</text>

                  {/* Canceladas */}
                  <rect x="225" y={130 - (cancelCount / maxMensalidadeCount) * 100} width="30" height={(cancelCount / maxMensalidadeCount) * 100} rx="4" fill="#ef4444" />
                  <text x="240" y={120 - (cancelCount / maxMensalidadeCount) * 100} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">{cancelCount}</text>
                  <text x="240" y="148" textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748b">Canceladas</text>
                </svg>
              )}
            </div>
          )}

          {/* Gráfico 3: Atendimentos por Mês */}
          {(isFullView || isAtendente) && (
            <div className="db-card">
              <h3 className="db-chart-card-title">Atendimentos por Mês</h3>
              {sortedMonths.length === 0 ? (
                <div className="db-empty-state">
                  <span className="db-empty-icon">🏥</span>
                  <h4 className="db-empty-title">Sem atendimentos recentes</h4>
                  <p className="db-empty-desc">
                    Atendimentos e funerais cadastrados nos últimos meses aparecerão estruturados aqui.
                  </p>
                  {canAddAtendimento && (
                    <Link href="/dashboard/atendimento?action=new">
                      <button className="db-empty-btn">Novo Atendimento</button>
                    </Link>
                  )}
                </div>
              ) : (
                <svg viewBox="0 0 300 180" width="100%" height="180" style={{ overflow: "visible" }}>
                  <line x1="40" y1="40" x2="280" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="90" x2="280" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="140" x2="280" y2="140" stroke="#f1f5f9" strokeWidth="1" />

                  {linePoints.length > 1 && (
                    <polyline fill="none" stroke="#0b4f59" strokeWidth="2.5" points={polylinePoints} />
                  )}

                  {linePoints.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="5" fill="white" stroke="#0b4f59" strokeWidth="2.5" />
                      <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0f172a">{p.value}</text>
                      <text x={p.x} y="155" textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600">{p.label}</text>
                    </g>
                  ))}
                </svg>
              )}
            </div>
          )}

        </div>
      )}

      {/* ── 6. LISTAS RÁPIDAS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        
        {/* 1. Últimos Contratos */}
        {(isFullView || isAtendente || isConsulta) && (
          <div className="db-card">
            <h3 className="db-chart-card-title">Últimos Contratos</h3>
            {ultimosContratos.length === 0 ? (
              <p style={{ color: "#64748b", fontStyle: "italic", fontSize: "0.85rem", padding: "1rem 0" }}>Nenhum contrato cadastrado.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Número</th>
                    <th style={{ textAlign: "left" }}>Cliente</th>
                    <th style={{ textAlign: "left" }}>Data</th>
                    <th style={{ textAlign: "right" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimosContratos.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: "700", color: "#0b4f59" }}>{c.numeroContrato}</td>
                      <td>{c.clienteNome}</td>
                      <td>{formatDate(c.dataInicio)}</td>
                      <td style={{ textAlign: "right" }}>
                        <span style={{ color: c.status === "Ativo" ? "#10b981" : "#64748b", fontWeight: "700" }}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 2. Últimos Atendimentos */}
        {(isFullView || isAtendente) && (
          <div className="db-card">
            <h3 className="db-chart-card-title">Últimos Atendimentos</h3>
            {ultimosAtendimentos.length === 0 ? (
              <p style={{ color: "#64748b", fontStyle: "italic", fontSize: "0.85rem", padding: "1rem 0" }}>Nenhum atendimento realizado.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Data/Hora</th>
                    <th style={{ textAlign: "left" }}>Paciente</th>
                    <th style={{ textAlign: "left" }}>Operador</th>
                    <th style={{ textAlign: "right" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimosAtendimentos.map((a) => (
                    <tr key={a.id}>
                      <td>{formatDate(a.data)} {a.hora}</td>
                      <td>{a.clienteNome}</td>
                      <td>{a.operador}</td>
                      <td style={{ textAlign: "right" }}>
                        <span style={{ color: a.status === "Finalizado" ? "#10b981" : "#f59e0b", fontWeight: "700" }}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 3. Mensalidades Vencidas */}
        {(isFullView || isFinanceiro) && (
          <div className="db-card">
            <h3 className="db-chart-card-title" style={{ color: "#e05353" }}>Mensalidades Vencidas</h3>
            {mensalidadesVencidas.length === 0 ? (
              <p style={{ color: "#64748b", fontStyle: "italic", fontSize: "0.85rem", padding: "1rem 0" }}>Nenhuma mensalidade vencida pendente.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Vencimento</th>
                    <th style={{ textAlign: "left" }}>Titular</th>
                    <th style={{ textAlign: "left" }}>Contrato</th>
                    <th style={{ textAlign: "right" }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {mensalidadesVencidas.map((m) => (
                    <tr key={m.id}>
                      <td style={{ color: "#ef4444", fontWeight: "700" }}>{formatDate(m.dataVencimento)}</td>
                      <td>{m.clienteNome}</td>
                      <td>{m.numeroContrato}</td>
                      <td style={{ textAlign: "right", fontWeight: "700", color: "#ef4444" }}>{formatCurrency(m.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
