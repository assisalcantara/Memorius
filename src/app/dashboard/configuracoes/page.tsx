/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { useTenant } from "@/context/TenantContext";
import { usePermission } from "@/context/PermissionContext";
import { useToast } from "@/context/ToastContext";
import { empresaConfigSupabaseService } from "@/services/empresa-config.supabase.service";
import { PageTitle } from "@/components/ui/PageTitle";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmpresaConfig } from "@/types";

type TabType = "DADOS" | "ENDERECO" | "CONTATOS" | "IDENTIDADE";

export default function ConfiguracoesPage() {
  const { tenant } = useTenant();
  const { roleName } = usePermission();
  const toast = useToast();

  const canEdit = roleName === "ADMIN" || roleName === "GERENTE";
  const [activeTab, setActiveTab] = useState<TabType>("DADOS");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState<EmpresaConfig>({
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    logradouro: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
    telefone: "",
    celular: "",
    email: "",
    site: "",
    logoUrl: "",
    corPrimaria: "#2f80ed",
    corSecundaria: "#27ae60",
  });

  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await empresaConfigSupabaseService.getConfig();
        if (config) {
          setFormData(config);
        } else {
          // Pre-fill initial state with Tenant data
          setFormData((prev) => ({
            ...prev,
            nomeFantasia: tenant.empresa || "",
            razaoSocial: tenant.empresa || "",
            responsavel: tenant.responsavel || "",
          }));
        }
      } catch (err: any) {
        toast.error("Erro ao carregar configurações: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, [tenant, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "cep") {
      const cleanCep = value.replace(/\D/g, "");
      if (cleanCep.length === 8) {
        fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
          .then((res) => res.json())
          .then((data) => {
            if (!data.erro) {
              setFormData((prev) => ({
                ...prev,
                logradouro: data.logradouro || prev.logradouro,
                bairro: data.bairro || prev.bairro,
                cidade: data.localidade || prev.cidade,
                estado: data.uf || prev.estado,
              }));
            }
          })
          .catch((err) => console.error("Erro ao buscar CEP:", err));
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    try {
      const saved = await empresaConfigSupabaseService.saveConfig(formData);
      if (saved) {
        setFormData(saved);
        toast.success("Configurações salvas com sucesso!");
        // Reload page to propagate changes to Header layout
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canEdit || !tenant.tenantId) return;

    setUploading(true);
    try {
      const publicUrl = await empresaConfigSupabaseService.uploadLogo(file, tenant.tenantId);
      if (publicUrl) {
        setFormData((prev) => ({ ...prev, logoUrl: publicUrl }));
        toast.success("Logomarca enviada com sucesso! Lembre-se de salvar as alterações.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar logomarca.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Carregando configurações...</div>;
  }

  return (
    <div>
      <PageTitle title="Configurações da Empresa" />
      
      {!canEdit && (
        <div style={{ padding: "1rem", background: "#fcf8e3", border: "1px solid #faebcc", borderRadius: "6px", color: "#8a6d3b", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
          <strong>Modo de Leitura:</strong> Seu perfil ({roleName}) possui permissões apenas para visualização. As alterações estão desativadas.
        </div>
      )}

      {/* Tabs list */}
      <div style={{ display: "flex", gap: "24px", borderBottom: "2px solid #ddd", marginBottom: "1.25rem", paddingBottom: "2px" }}>
        {(["DADOS", "ENDERECO", "CONTATOS", "IDENTIDADE"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "6px 0",
              border: "none",
              borderBottom: activeTab === tab ? "3px solid var(--brand)" : "3px solid transparent",
              background: "transparent",
              color: activeTab === tab ? "var(--brand)" : "#666",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "0.95rem",
              transition: "all 0.2s"
            }}
          >
            {tab === "DADOS" && "🏢 Dados Gerais"}
            {tab === "ENDERECO" && "📍 Endereço"}
            {tab === "CONTATOS" && "📞 Contato"}
            {tab === "IDENTIDADE" && "🎨 Identidade Visual"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave}>
        <Card>
          <div style={{ padding: "1rem" }}>
          
          {/* Dados Gerais */}
          {activeTab === "DADOS" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "0.4rem", fontWeight: "bold" }}>Razão Social</label>
                <Input
                  name="razaoSocial"
                  value={formData.razaoSocial || ""}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  placeholder="Razão Social da empresa"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "0.4rem", fontWeight: "bold" }}>Nome Fantasia</label>
                <Input
                  name="nomeFantasia"
                  value={formData.nomeFantasia || ""}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  placeholder="Nome fantasia da funerária"
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "0.4rem", fontWeight: "bold" }}>CNPJ</label>
                <Input
                  name="cnpj"
                  value={formData.cnpj || ""}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  placeholder="00.000.000/0001-00"
                />
              </div>
            </div>
          )}

          {/* Endereço */}
          {activeTab === "ENDERECO" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "1.5rem" }}>
              <div style={{ gridColumn: "span 4" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "0.4rem", fontWeight: "bold" }}>Logradouro</label>
                <Input
                  name="logradouro"
                  value={formData.logradouro || ""}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  placeholder="Rua, Avenida, etc."
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "0.4rem", fontWeight: "bold" }}>Número</label>
                <Input
                  name="numero"
                  value={formData.numero || ""}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  placeholder="Nº"
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "0.4rem", fontWeight: "bold" }}>Bairro</label>
                <Input
                  name="bairro"
                  value={formData.bairro || ""}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  placeholder="Bairro"
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "0.4rem", fontWeight: "bold" }}>Cidade</label>
                <Input
                  name="cidade"
                  value={formData.cidade || ""}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  placeholder="Cidade"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "0.4rem", fontWeight: "bold" }}>UF</label>
                <Input
                  name="estado"
                  value={formData.estado || ""}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  placeholder="UF"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "0.4rem", fontWeight: "bold" }}>CEP</label>
                <Input
                  name="cep"
                  value={formData.cep || ""}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  placeholder="00000-000"
                />
              </div>
            </div>
          )}

          {/* Contatos */}
          {activeTab === "CONTATOS" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "0.4rem", fontWeight: "bold" }}>Telefone Fixo</label>
                <Input
                  name="telefone"
                  value={formData.telefone || ""}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  placeholder="(00) 0000-0000"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "0.4rem", fontWeight: "bold" }}>Celular / WhatsApp</label>
                <Input
                  name="celular"
                  value={formData.celular || ""}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  placeholder="(00) 90000-0000"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "0.4rem", fontWeight: "bold" }}>E-mail Comercial</label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  placeholder="contato@funeraria.com"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "0.4rem", fontWeight: "bold" }}>Website</label>
                <Input
                  name="site"
                  value={formData.site || ""}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  placeholder="www.funeraria.com"
                />
              </div>
            </div>
          )}

          {/* Identidade Visual */}
          {activeTab === "IDENTIDADE" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              
              {/* Cores */}
              <div>
                <h4 style={{ margin: "0 0 1rem 0", color: "#333", fontSize: "0.95rem" }}>🎨 Paleta de Cores</h4>
                <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "#666", marginBottom: "0.3rem" }}>Cor Primária</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        type="color"
                        name="corPrimaria"
                        value={formData.corPrimaria || "#2f80ed"}
                        onChange={handleInputChange}
                        disabled={!canEdit}
                        style={{ width: "40px", height: "40px", padding: 0, border: "none", cursor: canEdit ? "pointer" : "default" }}
                      />
                      <span style={{ fontSize: "0.85rem", fontFamily: "monospace" }}>{formData.corPrimaria}</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "#666", marginBottom: "0.3rem" }}>Cor Secundária</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        type="color"
                        name="corSecundaria"
                        value={formData.corSecundaria || "#27ae60"}
                        onChange={handleInputChange}
                        disabled={!canEdit}
                        style={{ width: "40px", height: "40px", padding: 0, border: "none", cursor: canEdit ? "pointer" : "default" }}
                      />
                      <span style={{ fontSize: "0.85rem", fontFamily: "monospace" }}>{formData.corSecundaria}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logo upload */}
              <div>
                <h4 style={{ margin: "0 0 1rem 0", color: "#333", fontSize: "0.95rem" }}>🏢 Logomarca</h4>
                
                {formData.logoUrl ? (
                  <div style={{ marginBottom: "1rem", border: "1px dashed #ccc", padding: "0.5rem", borderRadius: "6px", width: "fit-content", backgroundColor: "#fcfcfc" }}>
                    <img src={formData.logoUrl} alt="Logo Preview" style={{ maxHeight: "80px", maxWidth: "200px", objectFit: "contain" }} />
                  </div>
                ) : (
                  <div style={{ fontSize: "0.85rem", color: "#777", fontStyle: "italic", marginBottom: "1rem" }}>Nenhuma logo enviada.</div>
                )}

                {canEdit && (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                      style={{ display: "block", fontSize: "0.85rem" }}
                    />
                    {uploading && <div style={{ fontSize: "0.8rem", color: "var(--brand)", marginTop: "0.3rem" }}>Enviando imagem...</div>}
                  </div>
                )}
              </div>
            </div>
          )}

          </div>
        </Card>

        {/* Form Actions */}
        {canEdit && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
            <Button
              type="submit"
              disabled={saving}
              style={{ backgroundColor: "var(--brand)", color: "white", padding: "0.6rem 1.8rem" }}
            >
              {saving ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
