/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { TableContainer } from "@/components/ui/TableContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useStorage } from "@/hooks/useStorage";
import { contratosSupabaseService } from "@/services/contratos.supabase.service";
import { clientesSupabaseService } from "@/services/clientes.supabase.service";
import { planosSupabaseService } from "@/services/planos.supabase.service";
import { Contrato, Cliente, Plano, EmpresaConfig } from "@/types";
import { formatDate, formatCurrency, formatCPF, generatePrintProtocol, getCurrentFormattedDateTime } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ModalConfirm } from "@/components/ui/ModalConfirm";
import { contractTemplatesSupabaseService } from "@/services/contract-templates.supabase.service";
import { empresaConfigSupabaseService } from "@/services/empresa-config.supabase.service";

export default function ContratosPage() {
  const { data: contratos, loading, create, update, remove } = useStorage<Contrato>(contratosSupabaseService as any);
  const { data: clientes } = useStorage<Cliente>(clientesSupabaseService as any);
  const { data: planos } = useStorage<Plano>(planosSupabaseService as any);
  const toast = useToast();

  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [companyConfig, setCompanyConfig] = useState<EmpresaConfig | null>(null);

  useEffect(() => {
    empresaConfigSupabaseService.getConfig().then((cfg) => {
      if (cfg) setCompanyConfig(cfg);
    });
  }, []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContrato, setEditingContrato] = useState<Contrato | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);

  // Print States
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printingContrato, setPrintingContrato] = useState<Contrato | null>(null);
  const [activeTemplates, setActiveTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [previewProtocol, setPreviewProtocol] = useState("");
  const [previewPrintDate, setPreviewPrintDate] = useState("");

  const handleOpenPrint = async (contrato: Contrato) => {
    setPrintingContrato(contrato);
    setPreviewProtocol(generatePrintProtocol(contrato.numeroContrato));
    setPreviewPrintDate(getCurrentFormattedDateTime());
    setLoadingTemplates(true);
    setIsPrintModalOpen(true);
    try {
      const templates = await contractTemplatesSupabaseService.getActive();
      setActiveTemplates(templates);
      if (templates.length > 0) {
        setSelectedTemplateId(String(templates[0].id));
      } else {
        setSelectedTemplateId("");
      }
    } catch (e: any) {
      toast.error("Erro ao carregar modelos de contratos: " + e.message);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const compileTemplate = (templateContent: string, contrato: Contrato) => {
    if (!templateContent) return "";
    
    const clientObj = clientes.find((c) => String(c.id) === String(contrato.clienteId));
    const planoObj = planos.find((p) => String(p.id) === String(contrato.planoId));

    const formatValue = (val: string) => {
      return `<strong>${val.toUpperCase()}</strong>`;
    };

    const nomeCliente = formatValue(contrato.clienteNome || clientObj?.nomeCompleto || "Não informado");
    const cpfCliente = formatValue(clientObj?.cpf ? formatCPF(clientObj.cpf) : "Não informado");
    const numeroContrato = formatValue(contrato.numeroContrato || "Não informado");
    const planoNome = formatValue(contrato.planoNome || planoObj?.nome || "Não informado");
    
    const valorPlano = formatValue(planoObj?.valorMensal 
      ? formatCurrency(planoObj.valorMensal) 
      : "Não informado");
      
    const dataContrato = formatValue(contrato.dataInicio 
      ? formatDate(contrato.dataInicio) 
      : "Não informado");

    let text = templateContent;
    text = text.replaceAll("{{nome_cliente}}", nomeCliente);
    text = text.replaceAll("{{cpf_cliente}}", cpfCliente);
    text = text.replaceAll("{{numero_contrato}}", numeroContrato);
    text = text.replaceAll("{{plano_nome}}", planoNome);
    text = text.replaceAll("{{valor_mensal}}", valorPlano);
    text = text.replaceAll("{{data_contrato}}", dataContrato);

    return text;
  };

  const handlePrint = (compiledContent: string, contrato: Contrato) => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      const addressString = [
        companyConfig?.logradouro,
        companyConfig?.numero,
        companyConfig?.bairro,
        companyConfig?.cidade,
        companyConfig?.estado
      ].filter(Boolean).join(", ").toUpperCase() || "Não informado";

      const contactsString = [
        companyConfig?.telefone,
        companyConfig?.celular
      ].filter(Boolean).join(" / ") || "Não informado";

      const protocolId = generatePrintProtocol(contrato.numeroContrato);
      const printDate = getCurrentFormattedDateTime();

      printWindow.document.write(`
        <html>
          <head>
            <title>Contrato - ${contrato.numeroContrato}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 40px;
                color: #1e293b;
                line-height: 1.6;
              }
              .letterhead {
                display: flex;
                align-items: center;
                border-bottom: 2px solid #e53e3e;
                padding-bottom: 12px;
                margin-bottom: 30px;
              }
              .logo-box {
                flex-shrink: 0;
                margin-right: 15px;
              }
              .logo-box img {
                max-height: 80px;
                display: block;
              }
              .info-box {
                flex-grow: 1;
                text-align: left;
              }
              .company-name {
                color: #e53e3e;
                font-size: 24px;
                font-weight: 800;
                margin-bottom: 6px;
                letter-spacing: 0.5px;
              }
              .company-details {
                color: #e53e3e;
                font-size: 10px;
                font-weight: bold;
                line-height: 1.4;
                margin-bottom: 2px;
              }
              .contract-content {
                white-space: pre-wrap;
                text-align: justify;
                font-size: 14px;
              }
              .print-footer {
                margin-top: 50px;
                border-top: 1px dashed #cbd5e1;
                padding-top: 10px;
                font-size: 11px;
                color: #64748b;
                display: flex;
                justify-content: space-between;
              }
              @media print {
                body {
                  margin: 20mm;
                }
              }
            </style>
          </head>
          <body>
            <div class="letterhead">
              <div class="logo-box">
                ${companyConfig?.logoUrl ? `<img src="${companyConfig.logoUrl}" alt="Logo" />` : ''}
              </div>
              <div class="info-box">
                <div class="company-name">${(companyConfig?.nomeFantasia || companyConfig?.razaoSocial || "Empresa").toUpperCase()}</div>
                <div class="company-details">CNPJ: ${companyConfig?.cnpj || "Não informado"}</div>
                <div class="company-details">END: ${addressString}</div>
                <div class="company-details">CONTATOS: ${contactsString} | E-MAIL: ${(companyConfig?.email || "Não informado").toUpperCase()}</div>
              </div>
            </div>
            <div class="contract-content">${compiledContent}</div>
            <div class="print-footer">
              <span><strong>Protocolo:</strong> ${protocolId}</span>
              <span><strong>Data de Impressão:</strong> ${printDate}</span>
            </div>
            <script>
              window.onload = function() {
                const img = document.querySelector('.logo-box img');
                if (img && img.src && !img.complete) {
                  img.onload = function() {
                    window.print();
                    window.close();
                  };
                  img.onerror = function() {
                    window.print();
                    window.close();
                  };
                  setTimeout(function() {
                    window.print();
                    window.close();
                  }, 2000);
                } else {
                  window.print();
                  window.close();
                }
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      toast.error("Não foi possível abrir a janela de impressão. Por favor, libere os pop-ups.");
    }
  };

  // Form State
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [selectedPlanoId, setSelectedPlanoId] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [status, setStatus] = useState("Ativo");

  // Selected Plano details derived state
  const selectedPlano = planos.find((p) => String(p.id) === String(selectedPlanoId));

  const handleOpenNew = () => {
    if (clientes.length === 0 || planos.length === 0) {
      toast.error("É necessário ter pelo menos um Cliente e um Plano cadastrados para criar um Contrato.");
      return;
    }
    setEditingContrato(null);
    setSelectedClienteId(String(clientes[0].id));
    setSelectedPlanoId(String(planos[0].id));
    setDataInicio(new Date().toISOString().split("T")[0]);
    setStatus("Ativo");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contrato: Contrato) => {
    setEditingContrato(contrato);
    setSelectedClienteId(String(contrato.clienteId));
    setSelectedPlanoId(String(contrato.planoId));
    setDataInicio(contrato.dataInicio);
    setStatus(contrato.status);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string | number) => {
    setConfirmDeleteId(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const clienteObj = clientes.find((c) => String(c.id) === String(selectedClienteId));
    const planoObj = planos.find((p) => String(p.id) === String(selectedPlanoId));

    if (!clienteObj || !planoObj) {
      toast.error("Cliente ou Plano inválido.");
      return;
    }

    const payload: Omit<Contrato, "id"> = {
      numeroContrato: editingContrato?.numeroContrato || `CON-${Date.now().toString().slice(-6)}`,
      clienteId: clienteObj.id!,
      clienteNome: clienteObj.nomeCompleto,
      planoId: planoObj.id,
      planoNome: planoObj.nome,
      dataInicio,
      status,
    };

    try {
      if (editingContrato && editingContrato.id !== undefined) {
        await update(editingContrato.id, payload);
        toast.success("Contrato atualizado com sucesso!");
      } else {
        await create(payload);
        toast.success("Contrato emitido com sucesso!");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar contrato.");
    }
  };

  // Filter Contracts
  const filteredContratos = contratos.filter((c) => {
    const matchesSearch =
      c.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.numeroContrato.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "TODOS" || c.status.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  const canCreate = clientes.length > 0 && planos.length > 0;

  return (
    <div>
      <PageTitle
        title="Gerenciar Contratos"
        icon="📄"
        actions={
          <Button onClick={handleOpenNew} disabled={!canCreate} style={{ opacity: canCreate ? 1 : 0.6 }}>
            ➕ Novo Contrato
          </Button>
        }
      />

      {!canCreate && (
        <div
          style={{
            backgroundColor: "#fff3cd",
            color: "#856404",
            padding: "1rem",
            borderRadius: "var(--border-radius)",
            marginBottom: "1.5rem",
            border: "1px solid #ffeeba",
          }}
        >
          ⚠️ <strong>Atenção:</strong> Você precisa cadastrar pelo menos um <strong>Cliente</strong> e um <strong>Plano</strong> antes de poder criar contratos.
        </div>
      )}

      {/* Filter Card */}
      <Card title="Filtro de Busca" icon="⏬">
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: "250px" }}>
            <Input
              placeholder="Pesquisar por Cliente ou Nº de Contrato"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ width: "150px" }}>
            <div className="form-group">
              <label>Status</label>
              <select
                className="auth-input"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--border-radius)",
                  fontSize: "1rem",
                }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="TODOS">TODOS</option>
                <option value="ATIVO">ATIVO</option>
                <option value="INATIVO">INATIVO</option>
                <option value="CANCELADO">CANCELADO</option>
              </select>
            </div>
          </div>
          <Button
            variant="cancel"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("TODOS");
            }}
          >
            Limpar
          </Button>
        </div>
      </Card>

      {/* List Container */}
      <TableContainer title="Listagem de Contratos" count={filteredContratos.length}>
        {loading ? (
          <SkeletonTable cols={6} rows={6} />
        ) : filteredContratos.length === 0 ? (
          <EmptyState
            message="Nenhum contrato cadastrado ou encontrado nos filtros."
            description="Crie um novo contrato vinculando um cliente ativo a um plano cadastrado."
            actionLabel="Novo Contrato"
            onAction={handleOpenNew}
          />
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "1rem",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid var(--color-border)", textAlign: "left" }}>
                <th style={{ padding: "0.8rem" }}>Nº Contrato</th>
                <th style={{ padding: "0.8rem" }}>Cliente</th>
                <th style={{ padding: "0.8rem" }}>Plano</th>
                <th style={{ padding: "0.8rem" }}>Data Adesão</th>
                <th style={{ padding: "0.8rem" }}>Valor Mensal</th>
                <th style={{ padding: "0.8rem" }}>Status</th>
                <th style={{ padding: "0.8rem", textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredContratos.map((c) => {
                // Find Plano details to show valor if not on Contract payload
                const plano = planos.find((p) => String(p.id) === String(c.planoId));
                const valor = plano?.valorMensal || 0;

                return (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    <td style={{ padding: "0.8rem", fontWeight: "bold" }}>{c.numeroContrato}</td>
                    <td style={{ padding: "0.8rem" }}>{c.clienteNome}</td>
                    <td style={{ padding: "0.8rem" }}>{c.planoNome}</td>
                    <td style={{ padding: "0.8rem" }}>{formatDate(c.dataInicio)}</td>
                    <td style={{ padding: "0.8rem", fontWeight: "bold" }}>{formatCurrency(valor)}</td>
                    <td style={{ padding: "0.8rem" }}>
                      <StatusBadge status={c.status} />
                    </td>
                    <td style={{ padding: "0.8rem", textAlign: "right" }}>
                      <button
                        onClick={() => handleOpenPrint(c)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "1.1rem",
                          marginRight: "0.5rem",
                        }}
                        title="Imprimir"
                      >
                        🖨️
                      </button>
                      <button
                        onClick={() => handleOpenEdit(c)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "1.1rem",
                          marginRight: "0.5rem",
                        }}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(c.id!)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "1.1rem",
                        }}
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableContainer>

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingContrato ? "Editar Contrato" : "Novo Contrato"}
      >
        <form onSubmit={handleSubmit}>
          {/* Cliente Selection */}
          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label>Cliente <span style={{ color: "#d32f2f" }}>*</span></label>
            <select
              className="auth-input"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--border-radius)",
                fontSize: "1rem",
              }}
              autoFocus
              value={selectedClienteId}
              onChange={(e) => setSelectedClienteId(e.target.value)}
              required
            >
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nomeCompleto} ({c.cpf || "Sem CPF"})
                </option>
              ))}
            </select>
          </div>

          {/* Plano Selection */}
          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label>Plano <span style={{ color: "#d32f2f" }}>*</span></label>
            <select
              className="auth-input"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--border-radius)",
                fontSize: "1rem",
              }}
              value={selectedPlanoId}
              onChange={(e) => setSelectedPlanoId(e.target.value)}
              required
            >
              {planos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Derived Fields - Read only display */}
          {selectedPlano && (
            <div
              style={{
                padding: "1rem",
                backgroundColor: "#f8f9fa",
                borderRadius: "6px",
                marginBottom: "1rem",
                border: "1px solid #e9ecef",
              }}
            >
              <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold", color: "var(--brand)" }}>
                Informações do Plano Selecionado:
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.95rem" }}>
                <li style={{ margin: "0.2rem 0" }}>💰 <strong>Valor Mensal:</strong> {formatCurrency(selectedPlano.valorMensal || 0)}</li>
                <li style={{ margin: "0.2rem 0" }}>⏱️ <strong>Dias Carência:</strong> {selectedPlano.diasCarencia || 0} dias</li>
                <li style={{ margin: "0.2rem 0" }}>📅 <strong>Duração do Contrato:</strong> {selectedPlano.nMeses || "-"} meses</li>
              </ul>
            </div>
          )}

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Data Adesão"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                requiredMark
                required
              />
            </div>
            <div style={{ width: "150px" }}>
              <div className="form-group">
                <label>Status</label>
                <select
                  className="auth-input"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--border-radius)",
                    fontSize: "1rem",
                  }}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <Button type="button" variant="cancel" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingContrato ? "Salvar Alterações" : "Emitir Contrato"}
            </Button>
          </div>
        </form>
      </Modal>

      <ModalConfirm
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (confirmDeleteId !== null) {
            try {
              await remove(confirmDeleteId);
              toast.success("Contrato excluído com sucesso!");
              setConfirmDeleteId(null);
            } catch (err: any) {
              toast.error(err.message || "Erro ao excluir contrato.");
            }
          }
        }}
        title="Excluir Contrato"
        message="Tem certeza que deseja excluir este contrato? Essa ação não poderá ser desfeita."
        confirmText="Excluir"
        variant="danger"
      />

      {/* Modal Impressão */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Imprimir Contrato"
      >
        {loadingTemplates ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>Carregando modelos de contratos...</div>
        ) : activeTemplates.length === 0 ? (
          <div style={{ padding: "1.5rem", textAlign: "center" }}>
            <p style={{ color: "#ef4444", fontWeight: "bold", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
              ⚠️ Nenhum modelo de contrato ativo encontrado. Solicite ao administrador o cadastro de um modelo.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button type="button" variant="cancel" onClick={() => setIsPrintModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label>Escolha o Modelo de Contrato</label>
              <select
                className="auth-input"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--border-radius)",
                  fontSize: "1rem",
                }}
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                {activeTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.titulo}
                  </option>
                ))}
              </select>
            </div>

            {/* Preview Box */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", color: "#555", marginBottom: "0.4rem" }}>
                Visualização Prévia:
              </label>
              {(() => {
                const selectedTemplate = activeTemplates.find((t) => String(t.id) === String(selectedTemplateId));
                if (!selectedTemplate || !printingContrato) return null;
                const compiled = compileTemplate(selectedTemplate.conteudo, printingContrato);
                return (
                  <div
                    style={{
                      border: "1px solid #cbd5e1",
                      padding: "20px",
                      maxHeight: "350px",
                      overflowY: "auto",
                      backgroundColor: "#ffffff",
                      color: "#1e293b",
                      borderRadius: "6px",
                      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)"
                    }}
                  >
                    {/* Timbre Preview */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      borderBottom: "2px solid #e53e3e",
                      paddingBottom: "10px",
                      marginBottom: "20px",
                      fontFamily: "Arial, sans-serif"
                    }}>
                      <div style={{ flexShrink: 0, marginRight: "15px" }}>
                        {companyConfig?.logoUrl && (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={companyConfig.logoUrl} 
                              alt="Logo" 
                              style={{ maxHeight: "60px", display: "block" }} 
                            />
                          </>
                        )}
                      </div>
                      <div style={{ flexGrow: 1, textAlign: "left" }}>
                        <div style={{ color: "#e53e3e", fontSize: "1.2rem", fontWeight: 800, marginBottom: "4px" }}>
                          {(companyConfig?.nomeFantasia || companyConfig?.razaoSocial || "Empresa").toUpperCase()}
                        </div>
                        <div style={{ color: "#e53e3e", fontSize: "0.65rem", fontWeight: "bold", lineHeight: 1.3 }}>
                          CNPJ: {companyConfig?.cnpj || "Não informado"}
                        </div>
                        <div style={{ color: "#e53e3e", fontSize: "0.65rem", fontWeight: "bold", lineHeight: 1.3 }}>
                          END: {[
                            companyConfig?.logradouro,
                            companyConfig?.numero,
                            companyConfig?.bairro,
                            companyConfig?.cidade,
                            companyConfig?.estado
                          ].filter(Boolean).join(", ").toUpperCase() || "Não informado"}
                        </div>
                        <div style={{ color: "#e53e3e", fontSize: "0.65rem", fontWeight: "bold", lineHeight: 1.3 }}>
                          CONTATOS: {[companyConfig?.telefone, companyConfig?.celular].filter(Boolean).join(" / ") || "Não informado"} | E-MAIL: {(companyConfig?.email || "Não informado").toUpperCase()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Contract Content */}
                    <div dangerouslySetInnerHTML={{ __html: compiled }} style={{ whiteSpace: "pre-wrap", textAlign: "justify", fontFamily: "serif", fontSize: "0.9rem" }} />
                    
                    {/* Print Footer Preview */}
                    <div style={{
                      marginTop: "30px",
                      borderTop: "1px dashed #cbd5e1",
                      paddingTop: "10px",
                      fontSize: "0.75rem",
                      color: "#64748b",
                      display: "flex",
                      justifyContent: "space-between",
                      fontFamily: "Arial, sans-serif"
                    }}>
                      <span><strong>Protocolo:</strong> {previewProtocol}</span>
                      <span><strong>Data de Impressão:</strong> {previewPrintDate}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <Button type="button" variant="cancel" onClick={() => setIsPrintModalOpen(false)}>
                Fechar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const selectedTemplate = activeTemplates.find((t) => String(t.id) === String(selectedTemplateId));
                  if (selectedTemplate && printingContrato) {
                    const compiled = compileTemplate(selectedTemplate.conteudo, printingContrato);
                    handlePrint(compiled, printingContrato);
                  }
                }}
              >
                🖨️ Imprimir
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
