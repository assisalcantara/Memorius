"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { pdvVendasSupabaseService } from "@/services/pdv-vendas.supabase.service";
import { PdvVenda } from "@/types";
import { Receipt, AlertTriangle, RotateCcw } from "@/components/icons/AdminIcons";

export default function VendasRealizadasPage() {
  const [vendas, setVendas] = useState<PdvVenda[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [vendaSelecionada, setVendaSelecionada] = useState<PdvVenda | null>(null);

  // Modal Cancelamento / Estorno
  const [modalEstornoOpen, setModalEstornoOpen] = useState<boolean>(false);
  const [motivoEstorno, setMotivoEstorno] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarVendas();
  }, []);

  async function carregarVendas() {
    setLoading(true);
    try {
      const { data, error } = await (supabase.from("pdv_vendas") as any)
        .select(`
          *,
          clientes:cliente_id (nome),
          pdv_venda_itens (
            *,
            produtos_servicos (nome)
          ),
          pdv_pagamentos (*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVendas(
        (data || []).map((row: any) => ({
          id: row.id,
          tenantId: row.tenant_id,
          turnoId: row.turno_id,
          caixaId: row.caixa_id,
          operadorId: row.operador_id,
          clienteId: row.cliente_id,
          numeroVenda: row.numero_venda,
          status: row.status,
          subtotal: Number(row.subtotal),
          descontoValor: Number(row.desconto_valor),
          totalLiquido: Number(row.total_liquido),
          totalPago: Number(row.total_pago),
          troco: Number(row.troco),
          estoqueBaixado: row.estoque_baixado,
          dataFinalizacao: row.data_finalizacao,
          motivoCancelamento: row.motivo_cancelamento,
          itens: row.pdv_venda_itens,
          pagamentos: row.pdv_pagamentos,
          createdAt: row.created_at,
        }))
      );
    } catch (err: any) {
      console.error("Erro ao listar vendas:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleEstornarVenda() {
    if (!vendaSelecionada || !vendaSelecionada.id) return;
    if (!motivoEstorno.trim()) {
      setErro("O motivo do cancelamento é obrigatório.");
      return;
    }

    setActionLoading(true);
    setErro(null);
    try {
      await pdvVendasSupabaseService.cancelarEstornarVenda(vendaSelecionada.id, motivoEstorno);
      setMensagem(`Venda #${vendaSelecionada.numeroVenda} cancelada e estornada com sucesso!`);
      setModalEstornoOpen(false);
      setMotivoEstorno("");
      await carregarVendas();
    } catch (err: any) {
      setErro(err.message || "Falha ao estornar venda. Exige perfil gerencial.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#0C1837", margin: 0 }}>Histórico de Vendas</h2>
        <p style={{ fontSize: "14px", color: "#5A6A85", margin: "4px 0 0 0" }}>
          Auditoria de cupons emitidos, baixas de estoque e estornos compensatórios.
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
          <div style={{ padding: "30px", textAlign: "center" }}>Carregando vendas...</div>
        ) : vendas.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#8E9CAE" }}>
            <Receipt size={40} color="#CBD5E1" />
            <p style={{ marginTop: "10px", fontSize: "14px" }}>Nenhuma venda registrada no PDV.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#F7F9FC", borderBottom: "1px solid #E4EAF0", color: "#5A6A85" }}>
                <th style={{ padding: "12px 16px" }}>Venda #</th>
                <th style={{ padding: "12px 16px" }}>Data / Hora</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px" }}>Total Líquido</th>
                <th style={{ padding: "12px 16px" }}>Estoque Baixado</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendas.map((v) => (
                <tr key={v.id} style={{ borderBottom: "1px solid #E4EAF0" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0C1837" }}>
                    #{v.numeroVenda}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#5A6A85" }}>
                    {new Date(v.createdAt!).toLocaleString("pt-BR")}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background:
                          v.status === "CONCLUIDA"
                            ? "#E8F5F1"
                            : v.status === "CANCELADA"
                            ? "#FEF2F2"
                            : "#FFF3DC",
                        color:
                          v.status === "CONCLUIDA"
                            ? "#0A9476"
                            : v.status === "CANCELADA"
                            ? "#DC2626"
                            : "#B78103",
                      }}
                    >
                      {v.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: "#0C1837" }}>
                    R$ {v.totalLiquido.toFixed(2)}
                  </td>
                  <td style={{ padding: "12px 16px", color: v.estoqueBaixado ? "#0A9476" : "#8E9CAE" }}>
                    {v.estoqueBaixado ? "Sim" : "Não"}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    {v.status === "CONCLUIDA" && (
                      <button
                        onClick={() => {
                          setVendaSelecionada(v);
                          setModalEstornoOpen(true);
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "1px solid #DC2626",
                          background: "#FFF",
                          color: "#DC2626",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Estornar Venda
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Estorno */}
      {modalEstornoOpen && vendaSelecionada && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(12, 24, 55, 0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "460px", background: "#FFFFFF", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#DC2626" }}>
              Estornar Venda #{vendaSelecionada.numeroVenda}
            </h3>
            <p style={{ fontSize: "12px", color: "#5A6A85", margin: 0 }}>
              Esta ação irá devolver os produtos ao estoque contábil e emitir movimentos compensatórios de saída no caixa do turno. Requer autorização de ADMIN ou GERENTE.
            </p>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                Motivo / Justificativa do Cancelamento
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Desistência do cliente logo após emissão do cupom"
                value={motivoEstorno}
                onChange={(e) => setMotivoEstorno(e.target.value)}
                style={{ width: "100%", borderRadius: "8px", border: "1px solid #D2DDEC", padding: "8px", fontSize: "13px" }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button onClick={() => setModalEstornoOpen(false)} style={{ flex: 1, height: "40px", borderRadius: "8px", border: "1px solid #D2DDEC", background: "#FFF" }}>
                Voltar
              </button>
              <button
                disabled={actionLoading}
                onClick={handleEstornarVenda}
                style={{ flex: 1, height: "40px", borderRadius: "8px", border: "none", background: "#DC2626", color: "#FFF", fontWeight: 600, cursor: "pointer" }}
              >
                {actionLoading ? "Processando..." : "Confirmar Estorno"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
