/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface SearchResultItem {
  id: string | number;
  title: string;
  subtitle?: string;
  route: string;
}

interface SearchGroup {
  category: string;
  items: SearchResultItem[];
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      const timer = setTimeout(() => {
        setResults([]);
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const term = `%${query}%`;

        const [
          clientesRes,
          contratosRes,
          agregadosRes,
          mensalidadesRes,
          atendimentosRes,
          usuariosRes,
        ] = await Promise.all([
          (supabase.from("clientes") as any).select("id, nome").ilike("nome", term).limit(5),
          (supabase.from("contratos") as any).select("id, numero_contrato").ilike("numero_contrato", term).limit(5),
          (supabase.from("agregados") as any).select("id, nome").ilike("nome", term).limit(5),
          (supabase.from("mensalidades") as any).select("id, cliente_nome, numero_contrato").or(`cliente_nome.ilike.${term},numero_contrato.ilike.${term}`).limit(5),
          (supabase.from("atendimentos") as any).select("id, cliente_nome").ilike("cliente_nome", term).limit(5),
          (supabase.from("profiles") as any).select("id, nome, email").or(`nome.ilike.${term},email.ilike.${term}`).limit(5),
        ]);

        const groups: SearchGroup[] = [];

        if (clientesRes.data && clientesRes.data.length > 0) {
          groups.push({
            category: "CLIENTES",
            items: clientesRes.data.map((c: any) => ({
              id: c.id,
              title: c.nome,
              route: "/dashboard/clientes",
            })),
          });
        }

        if (contratosRes.data && contratosRes.data.length > 0) {
          groups.push({
            category: "CONTRATOS",
            items: contratosRes.data.map((c: any) => ({
              id: c.id,
              title: `CTR-${c.numero_contrato}`,
              route: "/dashboard/contratos",
            })),
          });
        }

        if (agregadosRes.data && agregadosRes.data.length > 0) {
          groups.push({
            category: "AGREGADOS",
            items: agregadosRes.data.map((a: any) => ({
              id: a.id,
              title: a.nome,
              route: "/dashboard/agregados",
            })),
          });
        }

        if (mensalidadesRes.data && mensalidadesRes.data.length > 0) {
          groups.push({
            category: "MENSALIDADES",
            items: mensalidadesRes.data.map((m: any) => ({
              id: m.id,
              title: `${m.cliente_nome}`,
              subtitle: `CTR-${m.numero_contrato}`,
              route: "/dashboard/mensalidades",
            })),
          });
        }

        if (atendimentosRes.data && atendimentosRes.data.length > 0) {
          groups.push({
            category: "ATENDIMENTOS",
            items: atendimentosRes.data.map((a: any) => ({
              id: a.id,
              title: a.cliente_nome,
              route: "/dashboard/atendimento",
            })),
          });
        }

        if (usuariosRes.data && usuariosRes.data.length > 0) {
          groups.push({
            category: "USUÁRIOS",
            items: usuariosRes.data.map((u: any) => ({
              id: u.id,
              title: u.nome,
              subtitle: u.email,
              route: "/dashboard/usuarios",
            })),
          });
        }

        setResults(groups);
      } catch (err) {
        console.error("Erro na busca global:", err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleItemClick = (route: string) => {
    router.push(route);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%", maxWidth: "400px" }}>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          placeholder="Busca global inteligente..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          style={{
            width: "100%",
            padding: "0.6rem 2.5rem 0.6rem 1rem",
            borderRadius: "20px",
            border: "1px solid var(--color-border)",
            fontSize: "0.9rem",
            outline: "none",
            backgroundColor: "#f9f9f9",
            transition: "all 0.2s ease",
          }}
        />
        <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#888", display: "flex", alignItems: "center" }}>
          {loading ? (
            <span className="spinner-loader" style={{ width: "16px", height: "16px", border: "2px solid #ccc", borderTopColor: "#333", borderRadius: "50%", display: "inline-block", animation: "spin 1s linear infinite" }} />
          ) : (
            <span>🔍</span>
          )}
        </div>
      </div>

      {open && query.trim().length >= 2 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            backgroundColor: "white",
            border: "1px solid #e0e0e0",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            zIndex: 9999,
            maxHeight: "400px",
            overflowY: "auto",
            padding: "0.5rem 0",
          }}
        >
          {results.length === 0 && !loading && (
            <div style={{ padding: "1rem", textAlign: "center", color: "#888", fontSize: "0.9rem" }}>
              Nenhum resultado encontrado para &quot;{query}&quot;
            </div>
          )}

          {results.map((group) => (
            <div key={group.category} style={{ marginBottom: "0.5rem" }}>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  color: "#999",
                  padding: "0.4rem 1rem",
                  letterSpacing: "0.05em",
                  backgroundColor: "#fcfcfc",
                }}
              >
                {group.category}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {group.items.map((item) => (
                  <li key={`${group.category}-${item.id}`}>
                    <button
                      onClick={() => handleItemClick(item.route)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "0.6rem 1rem",
                        border: "none",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.1rem",
                        transition: "background-color 0.15s ease",
                      }}
                      className="global-search-item"
                    >
                      <span style={{ fontSize: "0.9rem", color: "#333", fontWeight: "500" }}>
                        • {item.title}
                      </span>
                      {item.subtitle && (
                        <span style={{ fontSize: "0.75rem", color: "#777", paddingLeft: "0.8rem" }}>
                          {item.subtitle}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
