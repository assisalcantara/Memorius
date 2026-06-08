/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useStorage } from "@/hooks/useStorage";
import { clientesSupabaseService } from "@/services/clientes.supabase.service";
import { contratosSupabaseService } from "@/services/contratos.supabase.service";
import { mensalidadesSupabaseService } from "@/services/mensalidades.supabase.service";
import { atendimentosSupabaseService } from "@/services/atendimentos.supabase.service";
import { agregadosSupabaseService } from "@/services/agregados.supabase.service";
import { auditLogSupabaseService } from "@/services/audit-log.supabase.service";
import { usuariosSupabaseService } from "@/services/usuarios.supabase.service";
import { usePermission } from "@/context/PermissionContext";
import { Cliente, Contrato, Mensalidade, Agregado, Atendimento, AuditLog, Profile } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type FilterType = "HOJE" | "7_DIAS" | "30_DIAS" | "90_DIAS" | "ANO_ATUAL";

function isWithinDateRange(dateStr: string | undefined | null, filter: FilterType): boolean {
  if (!dateStr) return false;
  try {
    // Standardize date strings to YYYY-MM-DD
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

  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    if (isFullView) {
      auditLogSupabaseService.getLogs().then(data => {
        setRecentLogs(data.slice(0, 5));
      });
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
  const totalAgregados = agregados.length; // counts don't strictly have date, but we take total or filter by contract if matching contracts

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

  // 9. User Metrics (Sprint 29)
  const totalUsers = profiles.length;
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
        const monthYear = `${parts[1]}/${parts[0]}`; // MM/YYYY
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
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <h2 style={{ color: "var(--brand)", margin: 0 }}>Dashboard Executivo</h2>
        
        {/* Filtro de período */}
        <div style={{ display: "flex", gap: "0.25rem", background: "#f1f1f1", padding: "0.25rem", borderRadius: "8px" }}>
          {(["HOJE", "7_DIAS", "30_DIAS", "90_DIAS", "ANO_ATUAL"] as FilterType[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: "bold",
                backgroundColor: filter === opt ? "var(--brand)" : "transparent",
                color: filter === opt ? "white" : "#555",
                transition: "all 0.2s"
              }}
            >
              {opt === "HOJE" && "Hoje"}
              {opt === "7_DIAS" && "7 Dias"}
              {opt === "30_DIAS" && "30 Dias"}
              {opt === "90_DIAS" && "90 Dias"}
              {opt === "ANO_ATUAL" && "Ano Atual"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Indicadores */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {/* Clientes Ativos */}
        {(isFullView || isAtendente || isConsulta) && (
          <div style={{ padding: "1.2rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid var(--brand)" }}>
            <span style={{ fontSize: "0.8rem", color: "#666", textTransform: "uppercase", fontWeight: "bold" }}>Clientes Ativos</span>
            <h2 style={{ margin: "0.5rem 0 0 0", color: "#333" }}>{clientesAtivos}</h2>
          </div>
        )}

        {/* Contratos Ativos */}
        {(isFullView || isAtendente || isConsulta) && (
          <div style={{ padding: "1.2rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #27ae60" }}>
            <span style={{ fontSize: "0.8rem", color: "#666", textTransform: "uppercase", fontWeight: "bold" }}>Contratos Ativos</span>
            <h2 style={{ margin: "0.5rem 0 0 0", color: "#333" }}>{contratosAtivos}</h2>
          </div>
        )}

        {/* Total de Agregados */}
        {(isFullView || isAtendente) && (
          <div style={{ padding: "1.2rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #2f80ed" }}>
            <span style={{ fontSize: "0.8rem", color: "#666", textTransform: "uppercase", fontWeight: "bold" }}>Total de Agregados</span>
            <h2 style={{ margin: "0.5rem 0 0 0", color: "#333" }}>{totalAgregados}</h2>
          </div>
        )}

        {/* Atendimentos */}
        {(isFullView || isAtendente) && (
          <div style={{ padding: "1.2rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #9b51e0" }}>
            <span style={{ fontSize: "0.8rem", color: "#666", textTransform: "uppercase", fontWeight: "bold" }}>Atendimentos no Período</span>
            <h2 style={{ margin: "0.5rem 0 0 0", color: "#333" }}>{atendimentosQtd}</h2>
          </div>
        )}

        {/* Mensalidades em Aberto */}
        {(isFullView || isFinanceiro) && (
          <div style={{ padding: "1.2rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #f2994a" }}>
            <span style={{ fontSize: "0.8rem", color: "#666", textTransform: "uppercase", fontWeight: "bold" }}>Contas em Aberto</span>
            <h2 style={{ margin: "0.5rem 0 0 0", color: "#333" }}>{mensalidadesAbertoQtd}</h2>
          </div>
        )}

        {/* Valor em Aberto */}
        {(isFullView || isFinanceiro) && (
          <div style={{ padding: "1.2rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #eb5757" }}>
            <span style={{ fontSize: "0.8rem", color: "#666", textTransform: "uppercase", fontWeight: "bold" }}>Valor Total em Aberto</span>
            <h2 style={{ margin: "0.5rem 0 0 0", color: "#333" }}>{formatCurrency(valorEmAberto)}</h2>
          </div>
        )}

        {/* Valor Recebido */}
        {(isFullView || isFinanceiro) && (
          <div style={{ padding: "1.2rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #2ecc71" }}>
            <span style={{ fontSize: "0.8rem", color: "#666", textTransform: "uppercase", fontWeight: "bold" }}>Valor Recebido</span>
            <h2 style={{ margin: "0.5rem 0 0 0", color: "#333" }}>{formatCurrency(valorRecebido)}</h2>
          </div>
        )}

        {/* Taxa de Inadimplência */}
        {(isFullView || isFinanceiro) && (
          <div style={{ padding: "1.2rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #e74c3c" }}>
            <span style={{ fontSize: "0.8rem", color: "#666", textTransform: "uppercase", fontWeight: "bold" }}>Inadimplência</span>
            <h2 style={{ margin: "0.5rem 0 0 0", color: "#333" }}>{inadimplenciaTaxa}%</h2>
          </div>
        )}

        {/* Total de Usuários */}
        {isFullView && (
          <div style={{ padding: "1.2rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #34495e" }}>
            <span style={{ fontSize: "0.8rem", color: "#666", textTransform: "uppercase", fontWeight: "bold" }}>Total de Usuários</span>
            <h2 style={{ margin: "0.5rem 0 0 0", color: "#333" }}>{totalUsers}</h2>
          </div>
        )}

        {/* Usuários Ativos */}
        {isFullView && (
          <div style={{ padding: "1.2rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #2ecc71" }}>
            <span style={{ fontSize: "0.8rem", color: "#666", textTransform: "uppercase", fontWeight: "bold" }}>Usuários Ativos</span>
            <h2 style={{ margin: "0.5rem 0 0 0", color: "#333" }}>{activeUsers}</h2>
          </div>
        )}

        {/* Usuários Inativos */}
        {isFullView && (
          <div style={{ padding: "1.2rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #95a5a6" }}>
            <span style={{ fontSize: "0.8rem", color: "#666", textTransform: "uppercase", fontWeight: "bold" }}>Usuários Inativos</span>
            <h2 style={{ margin: "0.5rem 0 0 0", color: "#333" }}>{inactiveUsers}</h2>
          </div>
        )}

        {/* Convites Pendentes */}
        {isFullView && pendingInvites > 0 && (
          <div style={{ padding: "1.2rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #f1c40f" }}>
            <span style={{ fontSize: "0.8rem", color: "#666", textTransform: "uppercase", fontWeight: "bold" }}>Convites Pendentes</span>
            <h2 style={{ margin: "0.5rem 0 0 0", color: "#333" }}>{pendingInvites}</h2>
          </div>
        )}
      </div>

      {/* Seção de Gráficos */}
      {!isConsulta && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          
          {/* Gráfico 1: Contratos por Plano */}
          {(isFullView || isAtendente) && (
            <div style={{ background: "white", padding: "1.5rem", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)" }}>
              <h3 style={{ color: "var(--brand)", marginBottom: "1.2rem", fontSize: "1rem" }}>Contratos por Plano</h3>
              {planEntries.length === 0 ? (
                <div style={{ height: "150px", display: "flex", alignItems: "center", justifyContent: "center", color: "#777", fontStyle: "italic" }}>
                  Sem dados suficientes para exibir gráfico.
                </div>
              ) : (
                <svg width="100%" height={planEntries.length * 35 + 20} style={{ overflow: "visible" }}>
                  {planEntries.map(([plano, count], index) => {
                    const y = index * 35 + 10;
                    const barWidth = `${(count / maxPlanCount) * 60}%`;
                    return (
                      <g key={plano}>
                        <text x="0" y={y + 13} fill="#555" fontSize="11" fontWeight="500">{plano}</text>
                        <rect x="120" y={y} width={barWidth} height="15" rx="3" fill="var(--brand)" />
                        <text x={`calc(120px + ${barWidth} + 6px)`} y={y + 12} fill="#333" fontSize="11" fontWeight="bold">{count}</text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          )}

          {/* Gráfico 2: Mensalidades Status */}
          {(isFullView || isFinanceiro) && (
            <div style={{ background: "white", padding: "1.5rem", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)" }}>
              <h3 style={{ color: "var(--brand)", marginBottom: "1.2rem", fontSize: "1rem" }}>Status de Mensalidades</h3>
              {filteredMensalidades.length === 0 ? (
                <div style={{ height: "150px", display: "flex", alignItems: "center", justifyContent: "center", color: "#777", fontStyle: "italic" }}>
                  Sem dados suficientes para exibir gráfico.
                </div>
              ) : (
                <svg viewBox="0 0 300 180" width="100%" height="180" style={{ overflow: "visible" }}>
                  <line x1="40" y1="20" x2="280" y2="20" stroke="#f1f1f1" strokeWidth="1" />
                  <line x1="40" y1="75" x2="280" y2="75" stroke="#f1f1f1" strokeWidth="1" />
                  <line x1="40" y1="130" x2="280" y2="130" stroke="#f1f1f1" strokeWidth="1" />

                  {/* Paid */}
                  <rect x="65" y={130 - (paidCount / maxMensalidadeCount) * 100} width="30" height={(paidCount / maxMensalidadeCount) * 100} rx="3" fill="#2ecc71" />
                  <text x="80" y={120 - (paidCount / maxMensalidadeCount) * 100} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#333">{paidCount}</text>
                  <text x="80" y="148" textAnchor="middle" fontSize="10" fill="#666">Pagas</text>

                  {/* Open */}
                  <rect x="145" y={130 - (openCount / maxMensalidadeCount) * 100} width="30" height={(openCount / maxMensalidadeCount) * 100} rx="3" fill="#f2994a" />
                  <text x="160" y={120 - (openCount / maxMensalidadeCount) * 100} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#333">{openCount}</text>
                  <text x="160" y="148" textAnchor="middle" fontSize="10" fill="#666">Em Aberto</text>

                  {/* Cancelled */}
                  <rect x="225" y={130 - (cancelCount / maxMensalidadeCount) * 100} width="30" height={(cancelCount / maxMensalidadeCount) * 100} rx="3" fill="#e74c3c" />
                  <text x="240" y={120 - (cancelCount / maxMensalidadeCount) * 100} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#333">{cancelCount}</text>
                  <text x="240" y="148" textAnchor="middle" fontSize="10" fill="#666">Canceladas</text>
                </svg>
              )}
            </div>
          )}

          {/* Gráfico 3: Atendimentos por Mês */}
          {(isFullView || isAtendente) && (
            <div style={{ background: "white", padding: "1.5rem", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)" }}>
              <h3 style={{ color: "var(--brand)", marginBottom: "1.2rem", fontSize: "1rem" }}>Atendimentos por Mês</h3>
              {sortedMonths.length === 0 ? (
                <div style={{ height: "150px", display: "flex", alignItems: "center", justifyContent: "center", color: "#777", fontStyle: "italic" }}>
                  Sem dados suficientes para exibir gráfico.
                </div>
              ) : (
                <svg viewBox="0 0 300 180" width="100%" height="180" style={{ overflow: "visible" }}>
                  <line x1="40" y1="40" x2="280" y2="40" stroke="#f1f1f1" strokeWidth="1" />
                  <line x1="40" y1="90" x2="280" y2="90" stroke="#f1f1f1" strokeWidth="1" />
                  <line x1="40" y1="140" x2="280" y2="140" stroke="#f1f1f1" strokeWidth="1" />

                  {linePoints.length > 1 && (
                    <polyline fill="none" stroke="var(--brand)" strokeWidth="2.5" points={polylinePoints} />
                  )}

                  {linePoints.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="4.5" fill="white" stroke="var(--brand)" strokeWidth="2.5" />
                      <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#333">{p.value}</text>
                      <text x={p.x} y="155" textAnchor="middle" fontSize="9" fill="#666">{p.label}</text>
                    </g>
                  ))}
                </svg>
              )}
            </div>
          )}

        </div>
      )}

      {/* Alertas Operacionais e Ações Rápidas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Alertas Operacionais */}
        {hasAlerts && (
          <div className="dashboard-card" style={{ borderLeft: "4px solid var(--danger)", backgroundColor: "#fff8f8" }}>
            <h3 style={{ color: "var(--danger)", margin: "0 0 1rem 0", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>⚠</span> Alertas Operacionais Críticos
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
              {totalMensalidadesVencidasQtd > 0 && (
                <div style={{ padding: "0.8rem", background: "white", borderRadius: "8px", border: "1px solid #ffd4d4" }}>
                  <span style={{ fontSize: "1.1rem", marginRight: "0.5rem" }}>⚠</span>
                  <strong>{totalMensalidadesVencidasQtd} mensalidades vencidas</strong>
                  <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" }}>
                    Valor total em atraso: <strong style={{ color: "var(--danger)" }}>{formatCurrency(totalValorAtraso)}</strong>
                  </div>
                </div>
              )}
              {contratosCancelados30Dias > 0 && (
                <div style={{ padding: "0.8rem", background: "white", borderRadius: "8px", border: "1px solid #ffd4d4", display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: "1.1rem", marginRight: "0.5rem" }}>⚠</span>
                  <span><strong>{contratosCancelados30Dias} contratos cancelados</strong> nos últimos 30 dias</span>
                </div>
              )}
              {convitesAguardandoSeteDias > 0 && (
                <div style={{ padding: "0.8rem", background: "white", borderRadius: "8px", border: "1px solid #ffd4d4", display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: "1.1rem", marginRight: "0.5rem" }}>⚠</span>
                  <span><strong>{convitesAguardandoSeteDias} convites</strong> aguardando ativação há mais de 7 dias</span>
                </div>
              )}
              {totalUsuariosInativos > 0 && (
                <div style={{ padding: "0.8rem", background: "white", borderRadius: "8px", border: "1px solid #ffd4d4", display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: "1.1rem", marginRight: "0.5rem" }}>⚠</span>
                  <span><strong>{totalUsuariosInativos} usuários inativos</strong></span>
                </div>
              )}
              {totalAtendimentosAbertos > 0 && (
                <div style={{ padding: "0.8rem", background: "white", borderRadius: "8px", border: "1px solid #ffd4d4", display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: "1.1rem", marginRight: "0.5rem" }}>⚠</span>
                  <span><strong>{totalAtendimentosAbertos} atendimentos</strong> aguardando finalização</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions Premium */}
        {!isConsulta && (
          <div className="dashboard-card">
            <h3 style={{ color: "var(--brand)", margin: "0 0 1.2rem 0", fontSize: "1.1rem" }}>Ações Rápidas</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "1rem" }}>
              {canAddCliente && (
                <Link href="/dashboard/clientes?action=new" style={{ textDecoration: "none" }}>
                  <div className="dashboard-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.2rem", textAlign: "center", height: "100%", border: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>➕</span>
                    <span style={{ fontWeight: "700", fontSize: "0.85rem", color: "var(--text-primary)" }}>Novo Cliente</span>
                  </div>
                </Link>
              )}
              {canAddContrato && (
                <Link href="/dashboard/contratos?action=new" style={{ textDecoration: "none" }}>
                  <div className="dashboard-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.2rem", textAlign: "center", height: "100%", border: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📄</span>
                    <span style={{ fontWeight: "700", fontSize: "0.85rem", color: "var(--text-primary)" }}>Novo Contrato</span>
                  </div>
                </Link>
              )}
              {canGerarMensalidade && (
                <Link href="/dashboard/mensalidades?action=new" style={{ textDecoration: "none" }}>
                  <div className="dashboard-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.2rem", textAlign: "center", height: "100%", border: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>💰</span>
                    <span style={{ fontWeight: "700", fontSize: "0.85rem", color: "var(--text-primary)" }}>Gerar Mensalidade</span>
                  </div>
                </Link>
              )}
              {canAddAtendimento && (
                <Link href="/dashboard/atendimento?action=new" style={{ textDecoration: "none" }}>
                  <div className="dashboard-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.2rem", textAlign: "center", height: "100%", border: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🏥</span>
                    <span style={{ fontWeight: "700", fontSize: "0.85rem", color: "var(--text-primary)" }}>Novo Atendimento</span>
                  </div>
                </Link>
              )}
              {canVerRelatorios && (
                <Link href="/dashboard/relatorios" style={{ textDecoration: "none" }}>
                  <div className="dashboard-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.2rem", textAlign: "center", height: "100%", border: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📊</span>
                    <span style={{ fontWeight: "700", fontSize: "0.85rem", color: "var(--text-primary)" }}>Relatório Financeiro</span>
                  </div>
                </Link>
              )}
              {canAddUsuario && (
                <Link href="/dashboard/usuarios?action=new" style={{ textDecoration: "none" }}>
                  <div className="dashboard-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.2rem", textAlign: "center", height: "100%", border: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👥</span>
                    <span style={{ fontWeight: "700", fontSize: "0.85rem", color: "var(--text-primary)" }}>Novo Usuário</span>
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Listas Rápidas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem" }}>
        
        {/* 1. Últimos Contratos */}
        {(isFullView || isAtendente || isConsulta) && (
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)" }}>
            <h3 style={{ color: "var(--brand)", marginBottom: "1rem", borderBottom: "1px solid #eee", paddingBottom: "0.5rem", fontSize: "1rem" }}>
              Últimos Contratos
            </h3>
            {ultimosContratos.length === 0 ? (
              <p style={{ color: "#777", fontStyle: "italic", fontSize: "0.9rem" }}>Nenhum contrato cadastrado.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #ddd", textAlign: "left", color: "#666" }}>
                    <th style={{ padding: "0.5rem" }}>Número</th>
                    <th style={{ padding: "0.5rem" }}>Cliente</th>
                    <th style={{ padding: "0.5rem" }}>Data</th>
                    <th style={{ padding: "0.5rem", textAlign: "right" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimosContratos.map((c) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "0.5rem", fontWeight: "bold" }}>{c.numeroContrato}</td>
                      <td style={{ padding: "0.5rem" }}>{c.clienteNome}</td>
                      <td style={{ padding: "0.5rem" }}>{formatDate(c.dataInicio)}</td>
                      <td style={{ padding: "0.5rem", textAlign: "right" }}>
                        <span style={{ color: c.status === "Ativo" ? "#27ae60" : "#777", fontWeight: "bold" }}>
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
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)" }}>
            <h3 style={{ color: "var(--brand)", marginBottom: "1rem", borderBottom: "1px solid #eee", paddingBottom: "0.5rem", fontSize: "1rem" }}>
              Últimos Atendimentos
            </h3>
            {ultimosAtendimentos.length === 0 ? (
              <p style={{ color: "#777", fontStyle: "italic", fontSize: "0.9rem" }}>Nenhum atendimento realizado.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #ddd", textAlign: "left", color: "#666" }}>
                    <th style={{ padding: "0.5rem" }}>Data/Hora</th>
                    <th style={{ padding: "0.5rem" }}>Paciente</th>
                    <th style={{ padding: "0.5rem" }}>Operador</th>
                    <th style={{ padding: "0.5rem", textAlign: "right" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimosAtendimentos.map((a) => (
                    <tr key={a.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "0.5rem" }}>{formatDate(a.data)} {a.hora}</td>
                      <td style={{ padding: "0.5rem" }}>{a.clienteNome}</td>
                      <td style={{ padding: "0.5rem" }}>{a.operador}</td>
                      <td style={{ padding: "0.5rem", textAlign: "right" }}>
                        <span style={{ color: a.status === "Finalizado" ? "#27ae60" : "#f2994a", fontWeight: "bold" }}>
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
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)" }}>
            <h3 style={{ color: "var(--brand)", marginBottom: "1rem", borderBottom: "1px solid #eee", paddingBottom: "0.5rem", fontSize: "1rem" }}>
              Mensalidades Vencidas
            </h3>
            {mensalidadesVencidas.length === 0 ? (
              <p style={{ color: "#777", fontStyle: "italic", fontSize: "0.9rem" }}>Nenhuma mensalidade vencida pendente.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #ddd", textAlign: "left", color: "#666" }}>
                    <th style={{ padding: "0.5rem" }}>Vencimento</th>
                    <th style={{ padding: "0.5rem" }}>Titular</th>
                    <th style={{ padding: "0.5rem" }}>Contrato</th>
                    <th style={{ padding: "0.5rem", textAlign: "right" }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {mensalidadesVencidas.map((m) => (
                    <tr key={m.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "0.5rem", color: "#e74c3c", fontWeight: "bold" }}>{formatDate(m.dataVencimento)}</td>
                      <td style={{ padding: "0.5rem" }}>{m.clienteNome}</td>
                      <td style={{ padding: "0.5rem" }}>{m.numeroContrato}</td>
                      <td style={{ padding: "0.5rem", textAlign: "right", fontWeight: "bold" }}>{formatCurrency(m.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 4. Últimas Atividades */}
        {isFullView && (
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)" }}>
            <h3 style={{ color: "var(--brand)", marginBottom: "1rem", borderBottom: "1px solid #eee", paddingBottom: "0.5rem", fontSize: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Últimas Atividades</span>
              <Link href="/dashboard/auditoria" style={{ fontSize: "0.8rem", color: "var(--brand)", textDecoration: "underline" }}>Ver tudo</Link>
            </h3>
            {recentLogs.length === 0 ? (
              <p style={{ color: "#777", fontStyle: "italic", fontSize: "0.9rem" }}>Nenhuma atividade registrada.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #ddd", textAlign: "left", color: "#666" }}>
                    <th style={{ padding: "0.5rem" }}>Data/Hora</th>
                    <th style={{ padding: "0.5rem" }}>Usuário</th>
                    <th style={{ padding: "0.5rem" }}>Ação</th>
                    <th style={{ padding: "0.5rem" }}>Módulo</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => {
                    const formatTime = (dateStr?: string) => {
                      if (!dateStr) return "-";
                      try {
                        const date = new Date(dateStr);
                        return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                      } catch {
                        return "";
                      }
                    };
                    return (
                      <tr key={log.id} style={{ borderBottom: "1px solid #eee" }} title={log.descricao || ""}>
                        <td style={{ padding: "0.5rem", color: "#666" }}>{formatDate(log.created_at || "")} {formatTime(log.created_at)}</td>
                        <td style={{ padding: "0.5rem", fontWeight: "bold" }}>{log.user_name || "Sistema"}</td>
                        <td style={{ padding: "0.5rem" }}>
                          <span style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            backgroundColor: log.acao === "CREATE" ? "#e6f4ea" : log.acao === "DELETE" || log.acao === "CANCELAR" ? "#fce8e6" : "#e8f0fe",
                            color: log.acao === "CREATE" ? "#137333" : log.acao === "DELETE" || log.acao === "CANCELAR" ? "#c5221f" : "#1a73e8",
                          }}>
                            {log.acao}
                          </span>
                        </td>
                        <td style={{ padding: "0.5rem" }}>{log.modulo}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
