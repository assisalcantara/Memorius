"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/context/TenantContext";
import { caixaPdvSupabaseService } from "@/services/caixa-pdv.supabase.service";
import { produtosEstoqueSupabaseService } from "@/services/produtos-estoque.supabase.service";
import { pdvVendasSupabaseService } from "@/services/pdv-vendas.supabase.service";
import { CaixaTurno, ProdutoServico, CaixaFormaPagamento, PdvVenda } from "@/types";
import { ShoppingCart, DollarSign, Package, AlertTriangle, RotateCcw } from "@/components/icons/AdminIcons";

interface ItemCarrinho {
  produto: ProdutoServico;
  quantidade: number;
  desconto: number;
}

export default function PdvFrenteCaixaPage() {
  const router = useRouter();
  const { tenant, userProfile } = useTenant();

  const [turnoAtivo, setTurnoAtivo] = useState<CaixaTurno | null>(null);
  const [loadingTurno, setLoadingTurno] = useState<boolean>(true);
  const [produtos, setProdutos] = useState<ProdutoServico[]>([]);
  const [busca, setBusca] = useState<string>("");
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");

  // Carrinho de Compras
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [descontoGlobal, setDescontoGlobal] = useState<number>(0);
  const [descontoMotivo, setDescontoMotivo] = useState<string>("");

  // Modal / Pagamentos
  const [modalPagamentoOpen, setModalPagamentoOpen] = useState<boolean>(false);
  const [formaPagamento, setFormaPagamento] = useState<CaixaFormaPagamento>("DINHEIRO");
  const [origemConfirmacao, setOrigemConfirmacao] = useState<"PRESENCIAL_CONFIRMADO" | "GATEWAY_ASAAS">("PRESENCIAL_CONFIRMADO");
  const [valorRecebido, setValorRecebido] = useState<string>("");
  const [processandoVenda, setProcessandoVenda] = useState<boolean>(false);
  const [vendaPendenteId, setVendaPendenteId] = useState<string | null>(null);
  const [vendaConcluida, setVendaConcluida] = useState<any | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarTurno();
    carregarProdutos();
  }, []);

  async function carregarTurno() {
    setLoadingTurno(true);
    try {
      const turno = await caixaPdvSupabaseService.getTurnoAtivoOperador();
      setTurnoAtivo(turno);
    } catch (err: any) {
      console.error("Erro ao carregar turno:", err);
    } finally {
      setLoadingTurno(false);
    }
  }

  async function carregarProdutos() {
    try {
      const prods = await produtosEstoqueSupabaseService.getAll();
      setProdutos(prods.filter((p: ProdutoServico) => p.ativo));
    } catch (err: any) {
      console.error("Erro ao listar produtos:", err);
    }
  }

  const produtosFiltrados = produtos.filter((p) => {
    const matchTipo = filtroTipo === "TODOS" || p.tipo === filtroTipo;
    const matchBusca =
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (p.codigo && p.codigo.toLowerCase().includes(busca.toLowerCase())) ||
      (p.codigoBarras && p.codigoBarras.includes(busca));
    return matchTipo && matchBusca;
  });

  function adicionarAoCarrinho(produto: ProdutoServico) {
    setCarrinho((prev) => {
      const index = prev.findIndex((i) => i.produto.id === produto.id);
      if (index >= 0) {
        const novo = [...prev];
        novo[index].quantidade += 1;
        return novo;
      }
      return [...prev, { produto, quantidade: 1, desconto: 0 }];
    });
  }

  function alterarQuantidade(produtoId: string, delta: number) {
    setCarrinho((prev) =>
      prev
        .map((i) => {
          if (i.produto.id === produtoId) {
            const novaQtd = i.quantidade + delta;
            return novaQtd > 0 ? { ...i, quantidade: novaQtd } : null;
          }
          return i;
        })
        .filter((i): i is ItemCarrinho => i !== null)
    );
  }

  function removerDoCarrinho(produtoId: string) {
    setCarrinho((prev) => prev.filter((i) => i.produto.id !== produtoId));
  }

  const subtotal = carrinho.reduce((acc, i) => acc + i.quantidade * i.produto.precoVenda, 0);
  const totalLiquido = Math.max(0, subtotal - descontoGlobal);
  const trocoCalculado =
    formaPagamento === "DINHEIRO" && Number(valorRecebido) > totalLiquido
      ? Number(valorRecebido) - totalLiquido
      : 0;

  async function handleFinalizarVenda() {
    if (!turnoAtivo || !turnoAtivo.id) {
      setErro("É necessário ter um turno aberto para realizar vendas.");
      return;
    }
    if (carrinho.length === 0) {
      setErro("O carrinho está vazio.");
      return;
    }

    setProcessandoVenda(true);
    setErro(null);

    try {
      // 1. Criar Venda
      const resVenda = await pdvVendasSupabaseService.criarVenda({
        turnoId: turnoAtivo.id,
        itens: carrinho.map((i) => ({
          produtoId: i.produto.id!,
          quantidade: i.quantidade,
          desconto: i.desconto,
        })),
        descontoValor: descontoGlobal,
        descontoMotivo: descontoMotivo || undefined,
      });

      // 2. Adicionar Pagamento
      // Se for gateway ASAAS ou PIX dinâmico sem confirmação imediata, lança como pendente aguardando webhook
      const gatewayId = origemConfirmacao === "GATEWAY_ASAAS" ? `asaas_pay_${Date.now()}` : undefined;

      const resPag = await pdvVendasSupabaseService.adicionarPagamento({
        vendaId: resVenda.vendaId,
        formaPagamento,
        valor: totalLiquido,
        valorRecebido: formaPagamento === "DINHEIRO" ? Number(valorRecebido) : undefined,
        gatewayPaymentId: gatewayId,
      });

      // Se o pagamento ficou PENDENTE, NÃO finaliza a venda nem baixa estoque!
      if (resPag.status === "PENDENTE") {
        setVendaPendenteId(resVenda.vendaId);
        setModalPagamentoOpen(false);
        setErro(null);
        return;
      }

      // 3. Finalizar Venda e baixar estoque (APENAS se o pagamento foi CONFIRMADO)
      const resFin = await pdvVendasSupabaseService.finalizarVenda(resVenda.vendaId);

      setVendaConcluida({
        vendaId: resVenda.vendaId,
        numeroVenda: resFin.numeroVenda,
        totalPago: totalLiquido,
        troco: resPag.troco,
        formaPagamento,
      });

      // Limpar carrinho
      setCarrinho([]);
      setDescontoGlobal(0);
      setDescontoMotivo("");
      setValorRecebido("");
      setVendaPendenteId(null);
      setModalPagamentoOpen(false);

      // Recarregar estoque dos produtos
      carregarProdutos();
    } catch (err: any) {
      setErro(err.message || "Erro ao processar venda no PDV.");
    } finally {
      setProcessandoVenda(false);
    }
  }

  if (loadingTurno) {
    return (
      <div style={{ padding: "30px", textAlign: "center", color: "#666" }}>
        Carregando status do terminal de caixa...
      </div>
    );
  }

  // Se não houver turno aberto, exibe alerta e convite para abertura
  if (!turnoAtivo || turnoAtivo.status !== "ABERTO") {
    return (
      <div style={{ maxWidth: "600px", margin: "60px auto", padding: "24px", background: "#FFFFFF", borderRadius: "12px", border: "1px solid #E4EAF0", textAlign: "center" }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "28px", background: "#FFF3DC", color: "#B78103", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
          <AlertTriangle size={32} />
        </div>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0C1837", margin: "0 0 8px 0" }}>Caixa Fechado</h2>
        <p style={{ fontSize: "14px", color: "#5A6A85", margin: "0 0 24px 0", lineHeight: "1.5" }}>
          Para iniciar as operações de venda no PDV, é necessário abrir o turno de caixa com a declaração do fundo de troco.
        </p>
        <button
          onClick={() => router.push("/dashboard/pdv/caixa")}
          style={{
            padding: "12px 24px",
            background: "linear-gradient(135deg, #0A9476 0%, #003D33 100%)",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(10, 148, 118, 0.3)",
          }}
        >
          Ir para Controle de Caixa
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "20px", minHeight: "calc(100vh - 120px)" }}>
      {/* Coluna Esquerda: Catálogo de Produtos & Serviços */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Barra Superior de Busca e Filtros */}
        <div style={{ background: "#FFFFFF", padding: "16px 20px", borderRadius: "12px", border: "1px solid #E4EAF0", display: "flex", alignItems: "center", gap: "14px" }}>
          <input
            type="text"
            placeholder="Buscar por nome, código ou código de barras (F2)..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              flex: 1,
              height: "40px",
              padding: "0 14px",
              borderRadius: "8px",
              border: "1px solid #D2DDEC",
              fontSize: "14px",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: "6px" }}>
            {["TODOS", "PRODUTO", "SERVICO"].map((tipo) => (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(tipo)}
                style={{
                  height: "40px",
                  padding: "0 14px",
                  borderRadius: "8px",
                  border: filtroTipo === tipo ? "1px solid #0A9476" : "1px solid #D2DDEC",
                  background: filtroTipo === tipo ? "#E8F5F1" : "#FFFFFF",
                  color: filtroTipo === tipo ? "#0A9476" : "#5A6A85",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                {tipo === "TODOS" ? "Todos" : tipo === "PRODUTO" ? "Produtos" : "Serviços"}
              </button>
            ))}
          </div>
        </div>

        {/* Grade de Itens do Catálogo */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px" }}>
          {produtosFiltrados.map((p) => (
            <div
              key={p.id}
              onClick={() => adicionarAoCarrinho(p)}
              style={{
                background: "#FFFFFF",
                borderRadius: "10px",
                border: "1px solid #E4EAF0",
                padding: "16px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#0A9476")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E4EAF0")}
            >
              <div>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: 700,
                    marginBottom: "8px",
                    background: p.tipo === "PRODUTO" ? "#E8F5F1" : "#F0F4FE",
                    color: p.tipo === "PRODUTO" ? "#0A9476" : "#1B59F8",
                  }}
                >
                  {p.tipo}
                </span>
                <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#0C1837", margin: "0 0 6px 0", lineHeight: "1.3" }}>
                  {p.nome}
                </h4>
                {p.codigo && <span style={{ fontSize: "11px", color: "#8E9CAE" }}>Cód: {p.codigo}</span>}
              </div>

              <div style={{ marginTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <span style={{ fontSize: "16px", fontWeight: 700, color: "#0C1837" }}>
                    R$ {p.precoVenda.toFixed(2)}
                  </span>
                  {p.controlaEstoque && (
                    <div style={{ fontSize: "11px", color: (p.estoqueAtual ?? 0) <= 0 ? "#DC2626" : "#5A6A85" }}>
                      Estoque: {p.estoqueAtual ?? 0} un
                    </div>
                  )}
                </div>
                <button
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    background: "#F7F9FC",
                    border: "1px solid #D2DDEC",
                    color: "#0A9476",
                    fontSize: "18px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coluna Direita: Carrinho & Finalização */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          border: "1px solid #E4EAF0",
          display: "flex",
          flexDirection: "column",
          padding: "20px",
          height: "calc(100vh - 120px)",
          position: "sticky",
          top: "80px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E4EAF0", paddingBottom: "14px", marginBottom: "14px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0C1837", margin: 0 }}>Cupom / Venda</h3>
            <span style={{ fontSize: "12px", color: "#5A6A85" }}>Operador: {userProfile?.nome}</span>
          </div>
          <span style={{ fontSize: "12px", background: "#E8F5F1", color: "#0A9476", padding: "4px 8px", borderRadius: "6px", fontWeight: 600 }}>
            PDV Ativo
          </span>
        </div>

        {/* Lista de Itens no Carrinho */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", paddingRight: "4px" }}>
          {carrinho.length === 0 ? (
            <div style={{ margin: "auto", textAlign: "center", color: "#8E9CAE" }}>
              <ShoppingCart size={40} color="#CBD5E1" />
              <p style={{ fontSize: "13px", marginTop: "8px" }}>Nenhum item adicionado à venda</p>
            </div>
          ) : (
            carrinho.map((item) => (
              <div key={item.produto.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#F7F9FC", borderRadius: "8px", border: "1px solid #E4EAF0" }}>
                <div style={{ flex: 1, paddingRight: "10px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#0C1837" }}>{item.produto.nome}</div>
                  <div style={{ fontSize: "11px", color: "#5A6A85" }}>
                    {item.quantidade} x R$ {item.produto.precoVenda.toFixed(2)}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button onClick={() => alterarQuantidade(item.produto.id!, -1)} style={{ width: "24px", height: "24px", borderRadius: "4px", border: "1px solid #CBD5E1", background: "#FFF", cursor: "pointer" }}>-</button>
                  <span style={{ fontSize: "12px", fontWeight: 600, minWidth: "16px", textAlign: "center" }}>{item.quantidade}</span>
                  <button onClick={() => alterarQuantidade(item.produto.id!, 1)} style={{ width: "24px", height: "24px", borderRadius: "4px", border: "1px solid #CBD5E1", background: "#FFF", cursor: "pointer" }}>+</button>
                  <button onClick={() => removerDoCarrinho(item.produto.id!)} style={{ color: "#DC2626", background: "none", border: "none", cursor: "pointer", marginLeft: "6px", fontSize: "14px" }}>×</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totais & Desconto */}
        <div style={{ borderTop: "1px solid #E4EAF0", paddingTop: "14px", marginTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#5A6A85" }}>
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "#5A6A85" }}>
            <span>Desconto</span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="R$ 0,00"
              value={descontoGlobal || ""}
              onChange={(e) => setDescontoGlobal(Number(e.target.value))}
              style={{ width: "90px", height: "28px", padding: "0 6px", textAlign: "right", borderRadius: "6px", border: "1px solid #D2DDEC" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: 700, color: "#0C1837", borderTop: "1px solid #E4EAF0", paddingTop: "10px" }}>
            <span>Total Líquido</span>
            <span style={{ color: "#0A9476" }}>R$ {totalLiquido.toFixed(2)}</span>
          </div>

          {vendaPendenteId && (
            <div style={{ padding: "12px", borderRadius: "8px", background: "#FFF3DC", color: "#B78103", fontSize: "12px", border: "1px solid #FFE0A3" }}>
              <strong>Atenção:</strong> Venda registrada aguardando confirmação do webhook do gateway ASAAS. O estoque <strong>não</strong> foi baixado e a venda permanece pendente.
            </div>
          )}

          {vendaConcluida && (
            <div style={{ padding: "12px", borderRadius: "8px", background: "#E8F5F1", color: "#0A9476", fontSize: "12px", border: "1px solid #C1E7DC" }}>
              <strong>Venda #{vendaConcluida.numeroVenda} Finalizada com Sucesso!</strong>
              <div>Total Pago: R$ {vendaConcluida.totalPago.toFixed(2)}</div>
              {vendaConcluida.troco > 0 && <div>Troco: R$ {vendaConcluida.troco.toFixed(2)}</div>}
            </div>
          )}

          {erro && (
            <div style={{ padding: "8px", borderRadius: "6px", background: "#FEF2F2", color: "#DC2626", fontSize: "12px" }}>
              {erro}
            </div>
          )}

          <button
            disabled={carrinho.length === 0}
            onClick={() => setModalPagamentoOpen(true)}
            style={{
              height: "46px",
              background: carrinho.length === 0 ? "#CBD5E1" : "linear-gradient(135deg, #0A9476 0%, #003D33 100%)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: 600,
              cursor: carrinho.length === 0 ? "not-allowed" : "pointer",
              boxShadow: carrinho.length === 0 ? "none" : "0 4px 14px rgba(10, 148, 118, 0.35)",
              marginTop: "8px",
            }}
          >
            Avançar para Pagamento
          </button>
        </div>
      </div>

      {/* Modal de Pagamento & Confirmação */}
      {modalPagamentoOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(12, 24, 55, 0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "480px", background: "#FFFFFF", borderRadius: "12px", border: "1px solid #E4EAF0", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0C1837", margin: 0 }}>Recebimento da Venda</h3>

            <div style={{ background: "#F7F9FC", padding: "14px", borderRadius: "8px", textAlign: "center" }}>
              <span style={{ fontSize: "12px", color: "#5A6A85" }}>Valor Total a Pagar</span>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#0A9476" }}>R$ {totalLiquido.toFixed(2)}</div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0C1837", marginBottom: "6px" }}>
                Forma de Pagamento
              </label>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value as CaixaFormaPagamento)}
                style={{ width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #D2DDEC", padding: "0 10px", fontSize: "14px" }}
              >
                <option value="DINHEIRO">Dinheiro (em espécie)</option>
                <option value="PIX">PIX</option>
                <option value="CARTAO_DEBITO">Cartão de Débito</option>
                <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                <option value="OUTROS">Outros</option>
              </select>
            </div>

            {formaPagamento !== "DINHEIRO" && (
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0C1837", marginBottom: "6px" }}>
                  Origem da Transação
                </label>
                <select
                  value={origemConfirmacao}
                  onChange={(e) => setOrigemConfirmacao(e.target.value as any)}
                  style={{ width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #D2DDEC", padding: "0 10px", fontSize: "14px" }}
                >
                  <option value="PRESENCIAL_CONFIRMADO">Máquina POS / Presencial (Confirmado na hora)</option>
                  <option value="GATEWAY_ASAAS">Gateway ASAAS (Aguardar Webhook real - Venda Pendente)</option>
                </select>
              </div>
            )}

            {formaPagamento === "DINHEIRO" && (
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0C1837", marginBottom: "6px" }}>
                  Valor Recebido (para cálculo de troco)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder={`R$ ${totalLiquido.toFixed(2)}`}
                  value={valorRecebido}
                  onChange={(e) => setValorRecebido(e.target.value)}
                  style={{ width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #D2DDEC", padding: "0 10px", fontSize: "14px" }}
                />
                {trocoCalculado > 0 && (
                  <div style={{ marginTop: "6px", fontSize: "13px", fontWeight: 600, color: "#0A9476" }}>
                    Troco a devolver: R$ {trocoCalculado.toFixed(2)}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button
                disabled={processandoVenda}
                onClick={() => setModalPagamentoOpen(false)}
                style={{ flex: 1, height: "42px", borderRadius: "8px", border: "1px solid #D2DDEC", background: "#FFF", color: "#5A6A85", fontWeight: 600, cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                disabled={processandoVenda}
                onClick={handleFinalizarVenda}
                style={{ flex: 1, height: "42px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #0A9476 0%, #003D33 100%)", color: "#FFF", fontWeight: 600, cursor: "pointer" }}
              >
                {processandoVenda ? "Processando..." : "Confirmar e Finalizar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
