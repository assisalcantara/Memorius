"use client";

import { useEffect, useState } from "react";
import { produtosEstoqueSupabaseService } from "@/services/produtos-estoque.supabase.service";
import { itemCategoriasSupabaseService } from "@/services/item-categorias.supabase.service";
import { ProdutoServico, ItemCategoria } from "@/types";
import { Package, PlusCircle, AlertTriangle } from "@/components/icons/AdminIcons";

export default function CatalogoEstoquePage() {
  const [produtos, setProdutos] = useState<ProdutoServico[]>([]);
  const [categorias, setCategorias] = useState<ItemCategoria[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busca, setBusca] = useState<string>("");

  // Modal Novo Item
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [nome, setNome] = useState<string>("");
  const [tipo, setTipo] = useState<"PRODUTO" | "SERVICO">("PRODUTO");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [precoVenda, setPrecoVenda] = useState<string>("");
  const [precoCusto, setPrecoCusto] = useState<string>("");
  const [controlaEstoque, setControlaEstoque] = useState<boolean>(true);
  const [codigo, setCodigo] = useState<string>("");
  const [codigoBarras, setCodigoBarras] = useState<string>("");

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        produtosEstoqueSupabaseService.getAll(),
        itemCategoriasSupabaseService.getAll(),
      ]);
      setProdutos(prods);
      setCategorias(cats);
      if (cats.length > 0) {
        setCategoriaId(cats[0].id!);
      }
    } catch (err: any) {
      console.error("Erro ao listar catálogo:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSalvarItem() {
    if (!nome.trim() || !precoVenda) {
      setErro("Nome e Preço de Venda são obrigatórios.");
      return;
    }

    setActionLoading(true);
    setErro(null);
    try {
      await produtosEstoqueSupabaseService.create({
        nome,
        tipo,
        categoriaId: categoriaId || undefined,
        precoVenda: Number(precoVenda),
        precoCusto: precoCusto ? Number(precoCusto) : 0,
        controlaEstoque: tipo === "PRODUTO" ? controlaEstoque : false,
        codigo: codigo || undefined,
        codigoBarras: codigoBarras || undefined,
        ativo: true,
      });

      setMensagem("Item adicionado ao catálogo com sucesso!");
      setModalOpen(false);
      setNome("");
      setPrecoVenda("");
      setPrecoCusto("");
      setCodigo("");
      setCodigoBarras("");
      await carregarDados();
    } catch (err: any) {
      setErro(err.message || "Falha ao criar item no catálogo.");
    } finally {
      setActionLoading(false);
    }
  }

  const produtosFiltrados = produtos.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (p.codigo && p.codigo.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#0C1837", margin: 0 }}>Catálogo & Estoque</h2>
          <p style={{ fontSize: "14px", color: "#5A6A85", margin: "4px 0 0 0" }}>
            Gestão de produtos, serviços, preços de venda e controle kardex de estoque.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          style={{
            padding: "10px 18px",
            background: "linear-gradient(135deg, #0A9476 0%, #003D33 100%)",
            color: "#FFF",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          + Novo Item
        </button>
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

      {/* Busca */}
      <div style={{ background: "#FFFFFF", padding: "14px 16px", borderRadius: "10px", border: "1px solid #E4EAF0" }}>
        <input
          type="text"
          placeholder="Buscar por nome ou código..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px", border: "1px solid #D2DDEC", fontSize: "14px" }}
        />
      </div>

      <div style={{ background: "#FFFFFF", borderRadius: "12px", border: "1px solid #E4EAF0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "30px", textAlign: "center" }}>Carregando catálogo...</div>
        ) : produtosFiltrados.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#8E9CAE" }}>
            <Package size={40} color="#CBD5E1" />
            <p style={{ marginTop: "10px", fontSize: "14px" }}>Nenhum item cadastrado no catálogo.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#F7F9FC", borderBottom: "1px solid #E4EAF0", color: "#5A6A85" }}>
                <th style={{ padding: "12px 16px" }}>Código</th>
                <th style={{ padding: "12px 16px" }}>Nome do Item</th>
                <th style={{ padding: "12px 16px" }}>Tipo</th>
                <th style={{ padding: "12px 16px" }}>Preço de Venda</th>
                <th style={{ padding: "12px 16px" }}>Estoque Atual</th>
              </tr>
            </thead>
            <tbody>
              {produtosFiltrados.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #E4EAF0" }}>
                  <td style={{ padding: "12px 16px", color: "#5A6A85" }}>{p.codigo || "-"}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0C1837" }}>{p.nome}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: p.tipo === "PRODUTO" ? "#E8F5F1" : "#F0F4FE",
                        color: p.tipo === "PRODUTO" ? "#0A9476" : "#1B59F8",
                      }}
                    >
                      {p.tipo}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: "#0C1837" }}>
                    R$ {p.precoVenda.toFixed(2)}
                  </td>
                  <td style={{ padding: "12px 16px", color: p.controlaEstoque ? ((p.estoqueAtual ?? 0) <= 0 ? "#DC2626" : "#0A9476") : "#8E9CAE" }}>
                    {p.controlaEstoque ? `${p.estoqueAtual ?? 0} un` : "N/A (Serviço)"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Novo Item */}
      {modalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(12, 24, 55, 0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "480px", background: "#FFFFFF", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#0C1837" }}>Novo Item no Catálogo</h3>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Nome do Item</label>
              <input
                type="text"
                placeholder="Ex: Urna Mogno Nobre"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                style={{ width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #D2DDEC", padding: "0 10px" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Tipo</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as any)}
                  style={{ width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #D2DDEC", padding: "0 10px" }}
                >
                  <option value="PRODUTO">Produto (com estoque)</option>
                  <option value="SERVICO">Serviço</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Preço de Venda (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={precoVenda}
                  onChange={(e) => setPrecoVenda(e.target.value)}
                  style={{ width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #D2DDEC", padding: "0 10px" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button onClick={() => setModalOpen(false)} style={{ flex: 1, height: "40px", borderRadius: "8px", border: "1px solid #D2DDEC", background: "#FFF" }}>
                Cancelar
              </button>
              <button
                disabled={actionLoading}
                onClick={handleSalvarItem}
                style={{ flex: 1, height: "40px", borderRadius: "8px", border: "none", background: "#0A9476", color: "#FFF", fontWeight: 600, cursor: "pointer" }}
              >
                {actionLoading ? "Salvando..." : "Salvar Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
