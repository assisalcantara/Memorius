"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { orcamentosFunerariosSupabaseService } from "@/services/orcamentos-funerarios.supabase.service";
import { OrcamentoFunerario } from "@/types";
import { Calculator, AlertTriangle, FileText } from "@/components/icons/AdminIcons";

export default function OrcamentosFunerariosPage() {
  const [orcamentos, setOrcamentos] = useState<OrcamentoFunerario[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [orcamentoSelecionado, setOrcamentoSelecionado] = useState<OrcamentoFunerario | null>(null);

  // Modal de Aprovação
  const [modalAprovarOpen, setModalAprovarOpen] = useState<boolean>(false);
  const [respNome, setRespNome] = useState<string>("");
  const [respDoc, setRespDoc] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarOrcamentos();
  }, []);

  async function carregarOrcamentos() {
    setLoading(true);
    try {
      const { data, error } = await (supabase.from("orcamentos_funerarios") as any)
        .select(`
          *,
          clientes:cliente_id (nome, cpf, telefone),
          orcamento_funerario_itens (
            *,
            produtos_servicos (nome)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrcamentos(
        (data || []).map((row: any) => ({
          id: row.id,
          tenantId: row.tenant_id,
          atendimentoId: row.atendimento_id,
          clienteId: row.cliente_id,
          contratoId: row.contrato_id,
          numeroOrcamento: row.numero_orcamento,
          status: row.status,
          temCoberturaPlano: row.tem_cobertura_plano,
          planoNome: row.plano_nome,
          diasCarenciaPlano: row.dias_carencia_plano,
          diasDesdeAdesao: row.dias_desde_adesao,
          emCarencia: row.em_carencia,
          totalBruto: Number(row.total_bruto),
          totalCoberto: Number(row.total_coberto),
          totalAdicionalParticular: Number(row.total_adicional_particular),
          totalDesconto: Number(row.total_desconto),
          totalLiquidoCliente: Number(row.total_liquido_cliente),
          tipoAceite: row.tipo_aceite,
          responsavelAceiteNome: row.responsavel_aceite_nome,
          responsavelAceiteDocumento: row.responsavel_aceite_documento,
          tokenAssinaturaRemota: row.token_assinatura_remota,
          clienteNome: row.clientes?.nome,
          itens: row.orcamento_funerario_itens,
          createdAt: row.created_at,
        }))
      );
    } catch (err: any) {
      console.error("Erro ao listar orçamentos:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAprovarOrcamento() {
    if (!orcamentoSelecionado || !orcamentoSelecionado.id) return;
    if (!respNome.trim() || !respDoc.trim()) {
      setErro("Informe o nome e documento do responsável pelo aceite.");
      return;
    }

    setActionLoading(true);
    setErro(null);
    try {
      await orcamentosFunerariosSupabaseService.aprovarOrcamento({
        orcamentoId: orcamentoSelecionado.id,
        responsavelNome: respNome,
        responsavelDocumento: respDoc,
        tipoAceite: "PRESENCIAL",
      });

      setMensagem(`Orçamento #${orcamentoSelecionado.numeroOrcamento} aprovado e congelado com sucesso!`);
      setModalAprovarOpen(false);
      setRespNome("");
      setRespDoc("");
      await carregarOrcamentos();
    } catch (err: any) {
      setErro(err.message || "Erro ao aprovar orçamento.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#0C1837", margin: 0 }}>Orçamentos Funerários</h2>
        <p style={{ fontSize: "14px", color: "#5A6A85", margin: "4px 0 0 0" }}>
          Discriminação de itens cobertos pelo plano, adicionais particulares e aprovação com snapshot imutável.
        </p>
      </div>

      {mensagem && (
        <div style={{ padding: "12px 16px", background: "#E8F5F1", color: "#0A9476", borderRadius: "8px", fontWeight: 600 }}>
          {mensagem}
        </div>
      )}

      {erro && (
        <div style={{ padding: "12px 16px", background: "#FEF2F2", color: "#DC2626", borderRadius: "8px", fontWeight: 600 }}>
          {erro}
        </div>
      )}

      <div style={{ background: "#FFFFFF", borderRadius: "12px", border: "1px solid #E4EAF0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "30px", textAlign: "center" }}>Carregando orçamentos...</div>
        ) : orcamentos.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#8E9CAE" }}>
            <Calculator size={40} color="#CBD5E1" />
            <p style={{ marginTop: "10px", fontSize: "14px" }}>Nenhum orçamento funerário emitido.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#F7F9FC", borderBottom: "1px solid #E4EAF0", color: "#5A6A85" }}>
                <th style={{ padding: "12px 16px" }}>Orçamento #</th>
                <th style={{ padding: "12px 16px" }}>Cliente / Contrato</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px" }}>Coberto (Plano)</th>
                <th style={{ padding: "12px 16px" }}>Devido Cliente</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {orcamentos.map((o) => (
                <tr key={o.id} style={{ borderBottom: "1px solid #E4EAF0" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0C1837" }}>
                    #{o.numeroOrcamento}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#0C1837" }}>
                    <div>{o.clienteNome || "Particular"}</div>
                    {o.planoNome && (
                      <div style={{ fontSize: "11px", color: o.emCarencia ? "#DC2626" : "#0A9476" }}>
                        {o.planoNome} {o.emCarencia ? "(Em Carência)" : "(Coberto)"}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background:
                          o.status === "APROVADO"
                            ? "#E8F5F1"
                            : o.status === "REJEITADO" || o.status === "CANCELADO"
                            ? "#FEF2F2"
                            : "#FFF3DC",
                        color:
                          o.status === "APROVADO"
                            ? "#0A9476"
                            : o.status === "REJEITADO" || o.status === "CANCELADO"
                            ? "#DC2626"
                            : "#B78103",
                      }}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#0A9476", fontWeight: 600 }}>
                    R$ {o.totalCoberto.toFixed(2)}
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: "#0C1837" }}>
                    R$ {o.totalLiquidoCliente.toFixed(2)}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    {o.status === "RASCUNHO" || o.status === "ENVIADO" ? (
                      <button
                        onClick={() => {
                          setOrcamentoSelecionado(o);
                          setModalAprovarOpen(true);
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "none",
                          background: "#0A9476",
                          color: "#FFF",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Aprovar Aceite
                      </button>
                    ) : (
                      <span style={{ fontSize: "11px", color: "#5A6A85" }}>Snapshot Congelado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Aprovação */}
      {modalAprovarOpen && orcamentoSelecionado && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(12, 24, 55, 0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "460px", background: "#FFFFFF", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#0C1837" }}>
              Aprovar Orçamento #{orcamentoSelecionado.numeroOrcamento}
            </h3>
            <p style={{ fontSize: "12px", color: "#5A6A85", margin: 0 }}>
              Esta ação formaliza o aceite contratual da família e congela um snapshot auditável e imutável de todos os itens e valores acordados.
            </p>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                Nome do Responsável pelo Aceite
              </label>
              <input
                type="text"
                placeholder="Ex: Maria das Couves"
                value={respNome}
                onChange={(e) => setRespNome(e.target.value)}
                style={{ width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #D2DDEC", padding: "0 10px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                Documento (CPF / RG) do Responsável
              </label>
              <input
                type="text"
                placeholder="Ex: 123.456.789-00"
                value={respDoc}
                onChange={(e) => setRespDoc(e.target.value)}
                style={{ width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #D2DDEC", padding: "0 10px" }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button onClick={() => setModalAprovarOpen(false)} style={{ flex: 1, height: "40px", borderRadius: "8px", border: "1px solid #D2DDEC", background: "#FFF" }}>
                Cancelar
              </button>
              <button
                disabled={actionLoading}
                onClick={handleAprovarOrcamento}
                style={{ flex: 1, height: "40px", borderRadius: "8px", border: "none", background: "#0A9476", color: "#FFF", fontWeight: 600, cursor: "pointer" }}
              >
                {actionLoading ? "Aprovando..." : "Confirmar e Congelar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
