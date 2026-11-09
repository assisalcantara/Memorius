"use client";

import { useEffect, useState } from "react";
import { useTenant } from "@/context/TenantContext";
import { caixaPdvSupabaseService } from "@/services/caixa-pdv.supabase.service";
import { CaixaFisico, CaixaTurno, CaixaMovimentacao, CaixaFormaPagamento } from "@/types";
import { DollarSign, AlertTriangle, Package, RotateCcw } from "@/components/icons/AdminIcons";

export default function ControleCaixaPage() {
  const { userProfile } = useTenant();

  const [caixas, setCaixas] = useState<CaixaFisico[]>([]);
  const [caixaSelecionado, setCaixaSelecionado] = useState<string>("");
  const [turnoAtivo, setTurnoAtivo] = useState<CaixaTurno | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Formulário Abertura
  const [fundoTroco, setFundoTroco] = useState<string>("100.00");
  const [obsAbertura, setObsAbertura] = useState<string>("");

  // Formulário Movimentação Avulsa (Suprimento / Sangria)
  const [modalMovOpen, setModalMovOpen] = useState<boolean>(false);
  const [tipoMov, setTipoMov] = useState<"SUPRIMENTO" | "SANGRIA">("SUPRIMENTO");
  const [valorMov, setValorMov] = useState<string>("");
  const [motivoMov, setMotivoMov] = useState<string>("");

  // Formulário Fechamento Cego
  const [modalFechamentoOpen, setModalFechamentoOpen] = useState<boolean>(false);
  const [declDinheiro, setDeclDinheiro] = useState<string>("");
  const [declPix, setDeclPix] = useState<string>("");
  const [declCartao, setDeclCartao] = useState<string>("");
  const [motivoDivergencia, setMotivoDivergencia] = useState<string>("");
  const [fechamentoConcluido, setFechamentoConcluido] = useState<any | null>(null);

  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const [listaCaixas, turno] = await Promise.all([
        caixaPdvSupabaseService.getCaixasFisicos(),
        caixaPdvSupabaseService.getTurnoAtivoOperador(),
      ]);
      setCaixas(listaCaixas.filter((c: CaixaFisico) => c.ativo));
      if (listaCaixas.length > 0) {
        setCaixaSelecionado(listaCaixas[0].id!);
      }
      setTurnoAtivo(turno);
    } catch (err: any) {
      console.error("Erro ao carregar dados do caixa:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAbrirTurno() {
    if (!caixaSelecionado) {
      setErro("Selecione um terminal de caixa.");
      return;
    }
    setActionLoading(true);
    setErro(null);
    try {
      await caixaPdvSupabaseService.abrirTurno(
        caixaSelecionado,
        Number(fundoTroco),
        obsAbertura || undefined
      );
      setMensagem("Turno de caixa aberto com sucesso!");
      await carregarDados();
    } catch (err: any) {
      setErro(err.message || "Erro ao abrir turno de caixa.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLancarMovimentacao() {
    if (!turnoAtivo || !turnoAtivo.id) return;
    if (!valorMov || Number(valorMov) <= 0) {
      setErro("Informe um valor válido.");
      return;
    }
    if (!motivoMov.trim()) {
      setErro("O motivo da movimentação é obrigatório.");
      return;
    }

    setActionLoading(true);
    setErro(null);
    try {
      if (tipoMov === "SUPRIMENTO") {
        await caixaPdvSupabaseService.lancarSuprimento(
          turnoAtivo.id,
          Number(valorMov),
          motivoMov
        );
      } else {
        await caixaPdvSupabaseService.lancarSangria(
          turnoAtivo.id,
          Number(valorMov),
          motivoMov
        );
      }
      setMensagem(`${tipoMov} registrado com sucesso!`);
      setModalMovOpen(false);
      setValorMov("");
      setMotivoMov("");
      await carregarDados();
    } catch (err: any) {
      setErro(err.message || "Falha ao registrar movimentação.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFecharTurnoCego() {
    if (!turnoAtivo || !turnoAtivo.id) return;
    if (declDinheiro === "") {
      setErro("Informe a contagem física do dinheiro.");
      return;
    }

    setActionLoading(true);
    setErro(null);
    try {
      const res = await caixaPdvSupabaseService.fecharTurnoCego(turnoAtivo.id, {
        declaradoDinheiro: Number(declDinheiro),
        declaradoPix: declPix ? Number(declPix) : 0,
        declaradoCartaoDebito: declCartao ? Number(declCartao) : 0,
        motivoDivergencia: motivoDivergencia || undefined,
      });

      setFechamentoConcluido(res);
      setModalFechamentoOpen(false);
      setMensagem("Fechamento cego concluído com sucesso!");
      await carregarDados();
    } catch (err: any) {
      setErro(err.message || "Erro no fechamento cego.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <div style={{ padding: "30px", textAlign: "center" }}>Carregando dados do caixa...</div>;
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#0C1837", margin: 0 }}>Controle de Caixa</h2>
          <p style={{ fontSize: "14px", color: "#5A6A85", margin: "4px 0 0 0" }}>
            Gestão de turnos, suprimentos, sangrias e fechamento cego por operador.
          </p>
        </div>
      </div>

      {mensagem && (
        <div style={{ padding: "12px 16px", background: "#E8F5F1", color: "#0A9476", borderRadius: "8px", fontWeight: 600, fontSize: "14px" }}>
          {mensagem}
        </div>
      )}

      {erro && (
        <div style={{ padding: "12px 16px", background: "#FEF2F2", color: "#DC2626", borderRadius: "8px", fontWeight: 600, fontSize: "14px" }}>
          {erro}
        </div>
      )}

      {/* Card de Status do Turno Atual */}
      <div style={{ background: "#FFFFFF", borderRadius: "12px", border: "1px solid #E4EAF0", padding: "24px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0C1837", margin: "0 0 16px 0" }}>
          Status do Operador Atual: {userProfile?.nome}
        </h3>

        {!turnoAtivo ? (
          /* Formulário de Abertura */
          <div style={{ maxWidth: "500px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ background: "#F7F9FC", padding: "14px", borderRadius: "8px", border: "1px solid #E4EAF0" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#0C1837" }}>Nenhum turno aberto no momento</span>
              <p style={{ fontSize: "12px", color: "#5A6A85", margin: "4px 0 0 0" }}>
                Declare o terminal e o valor de fundo de troco para iniciar a operação.
              </p>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0C1837", marginBottom: "4px" }}>
                Terminal de Caixa Físico
              </label>
              <select
                value={caixaSelecionado}
                onChange={(e) => setCaixaSelecionado(e.target.value)}
                style={{ width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #D2DDEC", padding: "0 10px", fontSize: "14px" }}
              >
                {caixas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} ({c.identificadorPdv || "Sem código"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0C1837", marginBottom: "4px" }}>
                Fundo de Troco (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={fundoTroco}
                onChange={(e) => setFundoTroco(e.target.value)}
                style={{ width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #D2DDEC", padding: "0 10px", fontSize: "14px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0C1837", marginBottom: "4px" }}>
                Observações de Abertura (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Turno da manhã"
                value={obsAbertura}
                onChange={(e) => setObsAbertura(e.target.value)}
                style={{ width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #D2DDEC", padding: "0 10px", fontSize: "14px" }}
              />
            </div>

            <button
              disabled={actionLoading}
              onClick={handleAbrirTurno}
              style={{
                height: "44px",
                background: "linear-gradient(135deg, #0A9476 0%, #003D33 100%)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              {actionLoading ? "Abrindo Turno..." : "Abrir Caixa Agora"}
            </button>
          </div>
        ) : (
          /* Painel do Turno Aberto */
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
              <div style={{ background: "#F7F9FC", padding: "14px", borderRadius: "8px", border: "1px solid #E4EAF0" }}>
                <span style={{ fontSize: "11px", color: "#5A6A85", textTransform: "uppercase", fontWeight: 700 }}>Status do Turno</span>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#0A9476", marginTop: "4px" }}>
                  {turnoAtivo.status}
                </div>
              </div>

              <div style={{ background: "#F7F9FC", padding: "14px", borderRadius: "8px", border: "1px solid #E4EAF0" }}>
                <span style={{ fontSize: "11px", color: "#5A6A85", textTransform: "uppercase", fontWeight: 700 }}>Fundo de Troco Inicial</span>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#0C1837", marginTop: "4px" }}>
                  R$ {turnoAtivo.fundoTroco.toFixed(2)}
                </div>
              </div>

              <div style={{ background: "#F7F9FC", padding: "14px", borderRadius: "8px", border: "1px solid #E4EAF0" }}>
                <span style={{ fontSize: "11px", color: "#5A6A85", textTransform: "uppercase", fontWeight: 700 }}>Abertura</span>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0C1837", marginTop: "6px" }}>
                  {new Date(turnoAtivo.dataAbertura).toLocaleString("pt-BR")}
                </div>
              </div>
            </div>

            {/* Ações Operacionais */}
            <div style={{ display: "flex", gap: "12px", borderTop: "1px solid #E4EAF0", paddingTop: "16px" }}>
              <button
                onClick={() => {
                  setTipoMov("SUPRIMENTO");
                  setModalMovOpen(true);
                }}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "1px solid #0A9476",
                  background: "#E8F5F1",
                  color: "#0A9476",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                + Suprimento de Troco
              </button>

              <button
                onClick={() => {
                  setTipoMov("SANGRIA");
                  setModalMovOpen(true);
                }}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "1px solid #D2DDEC",
                  background: "#FFFFFF",
                  color: "#0C1837",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                - Sangria para Cofre
              </button>

              <button
                onClick={() => setModalFechamentoOpen(true)}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#DC2626",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  marginLeft: "auto",
                }}
              >
                Encerrar Caixa (Fechamento Cego)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Suprimento / Sangria */}
      {modalMovOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(12, 24, 55, 0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "420px", background: "#FFFFFF", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#0C1837" }}>
              Lançar {tipoMov}
            </h3>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={valorMov}
                onChange={(e) => setValorMov(e.target.value)}
                style={{ width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #D2DDEC", padding: "0 10px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Motivo / Justificativa</label>
              <input
                type="text"
                placeholder="Ex: Reforço moedas"
                value={motivoMov}
                onChange={(e) => setMotivoMov(e.target.value)}
                style={{ width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #D2DDEC", padding: "0 10px" }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button onClick={() => setModalMovOpen(false)} style={{ flex: 1, height: "40px", borderRadius: "8px", border: "1px solid #D2DDEC", background: "#FFF" }}>Cancelar</button>
              <button onClick={handleLancarMovimentacao} style={{ flex: 1, height: "40px", borderRadius: "8px", border: "none", background: "#0A9476", color: "#FFF", fontWeight: 600 }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fechamento Cego */}
      {modalFechamentoOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(12, 24, 55, 0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "460px", background: "#FFFFFF", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#0C1837" }}>Fechamento Cego de Caixa</h3>
            <p style={{ fontSize: "12px", color: "#5A6A85", margin: 0 }}>
              Conte o dinheiro físico e valores apurados. Os totais do sistema permanecem ocultos conforme política de segurança.
            </p>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Contagem Física em Dinheiro (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={declDinheiro}
                onChange={(e) => setDeclDinheiro(e.target.value)}
                style={{ width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #D2DDEC", padding: "0 10px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Comprovantes PIX (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={declPix}
                onChange={(e) => setDeclPix(e.target.value)}
                style={{ width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #D2DDEC", padding: "0 10px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Comprovantes Cartão (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={declCartao}
                onChange={(e) => setDeclCartao(e.target.value)}
                style={{ width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #D2DDEC", padding: "0 10px" }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button onClick={() => setModalFechamentoOpen(false)} style={{ flex: 1, height: "42px", borderRadius: "8px", border: "1px solid #D2DDEC", background: "#FFF" }}>Cancelar</button>
              <button onClick={handleFecharTurnoCego} style={{ flex: 1, height: "42px", borderRadius: "8px", border: "none", background: "#DC2626", color: "#FFF", fontWeight: 600 }}>Encerrar Turno</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
