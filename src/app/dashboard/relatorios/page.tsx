/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { useStorage } from "@/hooks/useStorage";
import { clientesSupabaseService } from "@/services/clientes.supabase.service";
import { contratosSupabaseService } from "@/services/contratos.supabase.service";
import { planosSupabaseService } from "@/services/planos.supabase.service";
import { mensalidadesSupabaseService } from "@/services/mensalidades.supabase.service";
import { atendimentosSupabaseService } from "@/services/atendimentos.supabase.service";
import { empresaConfigSupabaseService } from "@/services/empresa-config.supabase.service";
import { usePermission } from "@/context/PermissionContext";
import { useTenant } from "@/context/TenantContext";
import { generateClientesReport } from "@/lib/reports/clientes.report";
import { generateContratosReport } from "@/lib/reports/contratos.report";
import { generateMensalidadesReport } from "@/lib/reports/mensalidades.report";
import { generateAtendimentosReport } from "@/lib/reports/atendimentos.report";
import { Cliente, Contrato, Plano, Mensalidade, Atendimento } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type ReportModule = "CLIENTES" | "CONTRATOS" | "MENSALIDADES" | "ATENDIMENTOS";

export default function RelatoriosPage() {
  const { tenant, userProfile } = useTenant();
  const { roleName } = usePermission();
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    empresaConfigSupabaseService.getConfig().then((res) => {
      if (res) setConfig(res);
    });
  }, [tenant]);

  // Load data
  const { data: clientes } = useStorage<Cliente>(clientesSupabaseService as any);
  const { data: contratos } = useStorage<Contrato>(contratosSupabaseService as any);
  const { data: planos } = useStorage<Plano>(planosSupabaseService as any);
  const { data: mensalidades } = useStorage<Mensalidade>(mensalidadesSupabaseService as any);
  const { data: atendimentos } = useStorage<Atendimento>(atendimentosSupabaseService as any);

  // Check role restrictions
  const isFullView = roleName === "ADMIN" || roleName === "GERENTE";
  const isAtendente = roleName === "ATENDENTE";
  const isFinanceiro = roleName === "FINANCEIRO";
  const isConsulta = roleName === "CONSULTA";

  // Default module selection based on role
  const getInitialModule = (): ReportModule => {
    if (isFinanceiro) return "MENSALIDADES";
    if (isAtendente) return "CLIENTES";
    return "CLIENTES"; // ADMIN, GERENTE, CONSULTA
  };

  const [activeModule, setActiveModule] = useState<ReportModule>(getInitialModule());

  // Filter States
  const [clientStatus, setClientStatus] = useState("TODOS");
  const [clientCity, setClientCity] = useState("");

  const [contractStatus, setContractStatus] = useState("TODOS");
  const [contractPlan, setContractPlan] = useState("TODOS");

  const [paymentStatus, setPaymentStatus] = useState("TODOS");
  const [paymentDateStart, setPaymentDateStart] = useState("");
  const [paymentDateEnd, setPaymentDateEnd] = useState("");

  const [appointmentStatus, setAppointmentStatus] = useState("TODOS");
  const [appointmentDateStart, setAppointmentDateStart] = useState("");
  const [appointmentDateEnd, setAppointmentDateEnd] = useState("");

  // Check if current tab is allowed
  const isTabAllowed = (tab: ReportModule): boolean => {
    if (isFullView || isConsulta) return true;
    if (isFinanceiro && tab === "MENSALIDADES") return true;
    if (isAtendente && (tab === "CLIENTES" || tab === "ATENDIMENTOS")) return true;
    return false;
  };

  // Generate filtered reports
  const getFilteredData = (): any[] => {
    if (activeModule === "CLIENTES") {
      return generateClientesReport(clientes, { status: clientStatus, cidade: clientCity });
    }
    if (activeModule === "CONTRATOS") {
      return generateContratosReport(contratos, { status: contractStatus, planoId: contractPlan });
    }
    if (activeModule === "MENSALIDADES") {
      return generateMensalidadesReport(mensalidades, { status: paymentStatus, dataInicio: paymentDateStart, dataFim: paymentDateEnd });
    }
    if (activeModule === "ATENDIMENTOS") {
      return generateAtendimentosReport(atendimentos, { status: appointmentStatus, dataInicio: appointmentDateStart, dataFim: appointmentDateEnd });
    }
    return [];
  };

  const filteredRecords = getFilteredData();
  const hasRecords = filteredRecords.length > 0;

  // Render applied filters description
  const getFiltersDescription = () => {
    const desc: string[] = [];
    if (activeModule === "CLIENTES") {
      desc.push(`Status: ${clientStatus}`);
      if (clientCity) desc.push(`Cidade: ${clientCity}`);
    } else if (activeModule === "CONTRATOS") {
      desc.push(`Status: ${contractStatus}`);
      if (contractPlan !== "TODOS") {
        const pName = planos.find(p => String(p.id) === contractPlan)?.nome || "Plano Selecionado";
        desc.push(`Plano: ${pName}`);
      }
    } else if (activeModule === "MENSALIDADES") {
      desc.push(`Status: ${paymentStatus}`);
      if (paymentDateStart || paymentDateEnd) {
        desc.push(`Período: ${paymentDateStart || "início"} até ${paymentDateEnd || "fim"}`);
      }
    } else if (activeModule === "ATENDIMENTOS") {
      desc.push(`Status: ${appointmentStatus}`);
      if (appointmentDateStart || appointmentDateEnd) {
        desc.push(`Período: ${appointmentDateStart || "início"} até ${appointmentDateEnd || "fim"}`);
      }
    }
    return desc.join(" | ");
  };

  const handlePrint = () => {
    if (isConsulta) return;
    if (!hasRecords) return;
    window.print();
  };

  return (
    <div>
      {/* CSS custom for Print Media */}
      <style jsx global>{`
        @media print {
          /* Hide all UI containers */
          .sidebar, 
          .header, 
          .no-print, 
          .filter-card, 
          .tab-menu, 
          button, 
          header, 
          footer, 
          aside {
            display: none !important;
          }
          
          /* Force full width on print */
          body, .dashboard-container, .right-section, .main-content {
            background: white !important;
            color: black !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          
          /* Display custom printed layout header */
          .print-report-header-layout {
            display: block !important;
          }

          /* Table optimizations */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 1.5rem !important;
          }
          th, td {
            border: 1px solid #ddd !important;
            padding: 8px !important;
            font-size: 10pt !important;
          }
          th {
            background-color: #f2f2f2 !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }

        .print-report-header-layout {
          display: none;
        }
      `}</style>

      {/* Screen layout */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ color: "var(--brand)", margin: 0 }}>📊 Relatórios e Impressões PDF</h2>
        {hasRecords && !isConsulta && (
          <button
            onClick={handlePrint}
            style={{
              padding: "0.6rem 1.2rem",
              backgroundColor: "var(--brand)",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "0.9rem"
            }}
          >
            🖨️ Imprimir PDF
          </button>
        )}
        {isConsulta && (
          <span style={{ fontSize: "0.85rem", color: "#e74c3c", fontWeight: "bold" }}>
            ⚠️ Modo Consulta: Impressão desativada.
          </span>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="tab-menu no-print" style={{ display: "flex", gap: "0.5rem", borderBottom: "2px solid #ddd", marginBottom: "1.5rem" }}>
        {isTabAllowed("CLIENTES") && (
          <button
            onClick={() => setActiveModule("CLIENTES")}
            style={{
              padding: "0.8rem 1.2rem",
              border: "none",
              borderBottom: activeModule === "CLIENTES" ? "3px solid var(--brand)" : "3px solid transparent",
              background: "transparent",
              color: activeModule === "CLIENTES" ? "var(--brand)" : "#666",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "0.95rem"
            }}
          >
            👥 Clientes
          </button>
        )}
        {isTabAllowed("CONTRATOS") && (
          <button
            onClick={() => setActiveModule("CONTRATOS")}
            style={{
              padding: "0.8rem 1.2rem",
              border: "none",
              borderBottom: activeModule === "CONTRATOS" ? "3px solid var(--brand)" : "3px solid transparent",
              background: "transparent",
              color: activeModule === "CONTRATOS" ? "var(--brand)" : "#666",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "0.95rem"
            }}
          >
            📄 Contratos
          </button>
        )}
        {isTabAllowed("MENSALIDADES") && (
          <button
            onClick={() => setActiveModule("MENSALIDADES")}
            style={{
              padding: "0.8rem 1.2rem",
              border: "none",
              borderBottom: activeModule === "MENSALIDADES" ? "3px solid var(--brand)" : "3px solid transparent",
              background: "transparent",
              color: activeModule === "MENSALIDADES" ? "var(--brand)" : "#666",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "0.95rem"
            }}
          >
            💰 Mensalidades
          </button>
        )}
        {isTabAllowed("ATENDIMENTOS") && (
          <button
            onClick={() => setActiveModule("ATENDIMENTOS")}
            style={{
              padding: "0.8rem 1.2rem",
              border: "none",
              borderBottom: activeModule === "ATENDIMENTOS" ? "3px solid var(--brand)" : "3px solid transparent",
              background: "transparent",
              color: activeModule === "ATENDIMENTOS" ? "var(--brand)" : "#666",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "0.95rem"
            }}
          >
            🏥 Atendimentos
          </button>
        )}
      </div>

      {/* Filter Section Card */}
      <div className="filter-card no-print" style={{ background: "white", padding: "1.5rem", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", marginBottom: "2rem" }}>
        <h3 style={{ color: "var(--brand)", marginTop: 0, marginBottom: "1rem", fontSize: "1rem" }}>Filtros do Relatório</h3>
        
        {/* Module specific filter forms */}
        {activeModule === "CLIENTES" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#666", marginBottom: "0.4rem" }}>Status</label>
              <select
                value={clientStatus}
                onChange={(e) => setClientStatus(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.9rem" }}
              >
                <option value="TODOS">Todos</option>
                <option value="ATIVOS">Ativos</option>
                <option value="INATIVOS">Inativos</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#666", marginBottom: "0.4rem" }}>Cidade</label>
              <input
                type="text"
                placeholder="Ex: São Paulo"
                value={clientCity}
                onChange={(e) => setClientCity(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.9rem" }}
              />
            </div>
          </div>
        )}

        {activeModule === "CONTRATOS" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#666", marginBottom: "0.4rem" }}>Status</label>
              <select
                value={contractStatus}
                onChange={(e) => setContractStatus(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.9rem" }}
              >
                <option value="TODOS">Todos</option>
                <option value="ATIVOS">Ativos</option>
                <option value="CANCELADOS">Cancelados</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#666", marginBottom: "0.4rem" }}>Plano</label>
              <select
                value={contractPlan}
                onChange={(e) => setContractPlan(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.9rem" }}
              >
                <option value="TODOS">Todos</option>
                {planos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeModule === "MENSALIDADES" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#666", marginBottom: "0.4rem" }}>Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.9rem" }}
              >
                <option value="TODOS">Todos</option>
                <option value="EM_ABERTO">Em Aberto</option>
                <option value="PAGO">Pagas</option>
                <option value="CANCELADO">Canceladas</option>
                <option value="INADIMPLENTES">Inadimplentes (Atrasadas)</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#666", marginBottom: "0.4rem" }}>Vencimento Inicial</label>
              <input
                type="date"
                value={paymentDateStart}
                onChange={(e) => setPaymentDateStart(e.target.value)}
                style={{ width: "100%", padding: "0.45rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.9rem" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#666", marginBottom: "0.4rem" }}>Vencimento Final</label>
              <input
                type="date"
                value={paymentDateEnd}
                onChange={(e) => setPaymentDateEnd(e.target.value)}
                style={{ width: "100%", padding: "0.45rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.9rem" }}
              />
            </div>
          </div>
        )}

        {activeModule === "ATENDIMENTOS" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#666", marginBottom: "0.4rem" }}>Status</label>
              <select
                value={appointmentStatus}
                onChange={(e) => setAppointmentStatus(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.9rem" }}
              >
                <option value="TODOS">Todos</option>
                <option value="Aberto">Aberto</option>
                <option value="Finalizado">Finalizado</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#666", marginBottom: "0.4rem" }}>Data Inicial</label>
              <input
                type="date"
                value={appointmentDateStart}
                onChange={(e) => setAppointmentDateStart(e.target.value)}
                style={{ width: "100%", padding: "0.45rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.9rem" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#666", marginBottom: "0.4rem" }}>Data Final</label>
              <input
                type="date"
                value={appointmentDateEnd}
                onChange={(e) => setAppointmentDateEnd(e.target.value)}
                style={{ width: "100%", padding: "0.45rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.9rem" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Printed Header Layout Structure */}
      <div className="print-report-header-layout" style={{ fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {config?.logoUrl ? (
              <img src={config.logoUrl} alt="Logo" style={{ maxHeight: "60px", maxWidth: "150px", objectFit: "contain", borderRadius: "4px" }} />
            ) : null}
            <div>
              <h1 style={{ margin: "0 0 5px 0", fontSize: "16pt", color: "#333" }}>{config?.nomeFantasia || config?.razaoSocial || tenant.empresa || "LegacyFlow"}</h1>
              <p style={{ margin: 0, fontSize: "9pt", color: "#666" }}>
                {config?.cnpj ? `CNPJ: ${config.cnpj} | ` : ""}
                {config?.telefone || config?.celular ? `Contato: ${config.telefone || config.celular} | ` : ""}
                {config?.email ? `Email: ${config.email}` : ""}
              </p>
              {config?.cidade && (
                <p style={{ margin: "3px 0 0 0", fontSize: "9pt", color: "#666" }}>
                  {config.logradouro}{config.numero ? `, ${config.numero}` : ""} - {config.cidade}/{config.estado || "UF"}
                </p>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: "9pt", color: "#555" }}>
              Emissão: {new Date().toLocaleDateString("pt-BR")} {new Date().toLocaleTimeString("pt-BR")}
            </p>
            <p style={{ margin: "5px 0 0 0", fontSize: "9pt", color: "#666" }}>Operador: {userProfile?.nome}</p>
          </div>
        </div>
        <hr style={{ border: "0", borderTop: "2px solid #333", margin: "10px 0" }} />
        <h2 style={{ textAlign: "center", margin: "10px 0", fontSize: "14pt", textTransform: "uppercase" }}>
          Relatório de {activeModule === "CLIENTES" && "Clientes"}
          {activeModule === "CONTRATOS" && "Contratos"}
          {activeModule === "MENSALIDADES" && "Mensalidades"}
          {activeModule === "ATENDIMENTOS" && "Atendimentos"}
        </h2>
        <p style={{ fontSize: "9pt", color: "#555", fontStyle: "italic", textAlign: "center", margin: "0 0 1.5rem 0" }}>
          Filtros aplicados: {getFiltersDescription()}
        </p>
      </div>

      {/* Report Table / Preview */}
      <div style={{ background: "white", padding: "1.5rem", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)" }}>
        <h3 className="no-print" style={{ marginTop: 0, marginBottom: "1rem", color: "var(--brand)", borderBottom: "1px solid #eee", paddingBottom: "0.5rem", fontSize: "1rem" }}>
          Visualização Prévia ({filteredRecords.length} registros)
        </h3>

        {!hasRecords ? (
          <div style={{ padding: "3rem 0", fontStyle: "italic", color: "#666", textAlign: "center" }}>
            Nenhum registro correspondente aos filtros aplicados foi encontrado.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ddd", background: "#f8f9fa", textAlign: "left" }}>
                {activeModule === "CLIENTES" && (
                  <>
                    <th style={{ padding: "0.6rem" }}>Nome</th>
                    <th style={{ padding: "0.6rem" }}>CPF</th>
                    <th style={{ padding: "0.6rem" }}>Telefone</th>
                    <th style={{ padding: "0.6rem" }}>Cidade/UF</th>
                    <th style={{ padding: "0.6rem", textAlign: "right" }}>Status</th>
                  </>
                )}
                {activeModule === "CONTRATOS" && (
                  <>
                    <th style={{ padding: "0.6rem" }}>Nº Contrato</th>
                    <th style={{ padding: "0.6rem" }}>Cliente</th>
                    <th style={{ padding: "0.6rem" }}>Plano</th>
                    <th style={{ padding: "0.6rem" }}>Data Início</th>
                    <th style={{ padding: "0.6rem", textAlign: "right" }}>Status</th>
                  </>
                )}
                {activeModule === "MENSALIDADES" && (
                  <>
                    <th style={{ padding: "0.6rem" }}>Competência</th>
                    <th style={{ padding: "0.6rem" }}>Vencimento</th>
                    <th style={{ padding: "0.6rem" }}>Cliente</th>
                    <th style={{ padding: "0.6rem" }}>Nº Contrato</th>
                    <th style={{ padding: "0.6rem", textAlign: "right" }}>Valor</th>
                    <th style={{ padding: "0.6rem", textAlign: "right" }}>Status</th>
                  </>
                )}
                {activeModule === "ATENDIMENTOS" && (
                  <>
                    <th style={{ padding: "0.6rem" }}>Data/Hora</th>
                    <th style={{ padding: "0.6rem" }}>Paciente</th>
                    <th style={{ padding: "0.6rem" }}>Plano</th>
                    <th style={{ padding: "0.6rem" }}>Tipo</th>
                    <th style={{ padding: "0.6rem" }}>Responsável</th>
                    <th style={{ padding: "0.6rem", textAlign: "right" }}>Status</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((item, idx) => (
                <tr key={item.id || idx} style={{ borderBottom: "1px solid #eee" }}>
                  {activeModule === "CLIENTES" && (
                    <>
                      <td style={{ padding: "0.6rem", fontWeight: "bold" }}>{item.nomeCompleto}</td>
                      <td style={{ padding: "0.6rem" }}>{item.cpf}</td>
                      <td style={{ padding: "0.6rem" }}>{item.telefone}</td>
                      <td style={{ padding: "0.6rem" }}>{item.cidade ? `${item.cidade}/${item.estado || "UF"}` : "-"}</td>
                      <td style={{ padding: "0.6rem", textAlign: "right", color: item.status === "Ativo" ? "#27ae60" : "#777", fontWeight: "bold" }}>{item.status}</td>
                    </>
                  )}
                  {activeModule === "CONTRATOS" && (
                    <>
                      <td style={{ padding: "0.6rem", fontWeight: "bold" }}>{item.numeroContrato}</td>
                      <td style={{ padding: "0.6rem" }}>{item.clienteNome}</td>
                      <td style={{ padding: "0.6rem" }}>{item.planoNome}</td>
                      <td style={{ padding: "0.6rem" }}>{formatDate(item.dataInicio)}</td>
                      <td style={{ padding: "0.6rem", textAlign: "right", color: item.status === "Ativo" ? "#27ae60" : "#e74c3c", fontWeight: "bold" }}>{item.status}</td>
                    </>
                  )}
                  {activeModule === "MENSALIDADES" && (
                    <>
                      <td style={{ padding: "0.6rem" }}>{item.competencia}</td>
                      <td style={{ padding: "0.6rem" }}>{formatDate(item.dataVencimento)}</td>
                      <td style={{ padding: "0.6rem" }}>{item.clienteNome}</td>
                      <td style={{ padding: "0.6rem", fontWeight: "bold" }}>{item.numeroContrato}</td>
                      <td style={{ padding: "0.6rem", textAlign: "right", fontWeight: "bold" }}>{formatCurrency(item.valor)}</td>
                      <td style={{ padding: "0.6rem", textAlign: "right", color: item.status === "PAGO" ? "#27ae60" : item.status === "EM_ABERTO" ? "#f2994a" : "#777", fontWeight: "bold" }}>{item.status}</td>
                    </>
                  )}
                  {activeModule === "ATENDIMENTOS" && (
                    <>
                      <td style={{ padding: "0.6rem" }}>{formatDate(item.data)} {item.hora}</td>
                      <td style={{ padding: "0.6rem", fontWeight: "bold" }}>{item.clienteNome}</td>
                      <td style={{ padding: "0.6rem" }}>{item.planoNome}</td>
                      <td style={{ padding: "0.6rem" }}>{item.tipo}</td>
                      <td style={{ padding: "0.6rem" }}>{item.responsavel}</td>
                      <td style={{ padding: "0.6rem", textAlign: "right", color: item.status === "Finalizado" ? "#27ae60" : "#f2994a", fontWeight: "bold" }}>{item.status}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
