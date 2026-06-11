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

// Extended interface to include responsavel locally
interface ExtendedEmpresaConfig extends EmpresaConfig {
  responsavel?: string;
}

export default function ConfiguracoesPage() {
  const { tenant } = useTenant();
  const { roleName } = usePermission();
  const toast = useToast();

  const canEdit = roleName === "ADMIN" || roleName === "GERENTE";
  const [activeTab, setActiveTab] = useState<TabType>("DADOS");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [originalData, setOriginalData] = useState<ExtendedEmpresaConfig | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<ExtendedEmpresaConfig>({
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
    responsavel: "",
  });

  // Check if form data has been altered compared to original database loaded data, or a new logo is queued
  const isDirty = originalData 
    ? (JSON.stringify(formData) !== JSON.stringify(originalData) || logoFile !== null) 
    : false;

  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await empresaConfigSupabaseService.getConfig();
        if (config) {
          const initial = {
            ...config,
            responsavel: tenant.responsavel || "",
          };
          setFormData(initial);
          setOriginalData(initial);
        } else {
          // Pre-fill initial state with Tenant data
          const initial = {
            razaoSocial: tenant.empresa || "",
            nomeFantasia: tenant.empresa || "",
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
            responsavel: tenant.responsavel || "",
          };
          setFormData(initial);
          setOriginalData(initial);
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

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    try {
      let finalLogoUrl = formData.logoUrl;

      // If a temporary local logo has been chosen, upload it now
      if (logoFile && tenant.tenantId) {
        setUploading(true);
        const publicUrl = await empresaConfigSupabaseService.uploadLogo(logoFile, tenant.tenantId);
        if (publicUrl) {
          finalLogoUrl = publicUrl;
        }
        setUploading(false);
      }

      // Save responsible in tenants table directly if it changed
      if (tenant.tenantId && formData.responsavel !== originalData?.responsavel) {
        const { supabase } = await import("@/lib/supabase/client");
        await (supabase.from("tenants") as any)
          .update({ responsavel: formData.responsavel })
          .eq("id", tenant.tenantId);
      }

      // Prepare payload (removing responsavel to match database columns)
      const configPayload = { ...formData } as any;
      delete configPayload.responsavel;
      const payload = {
        ...configPayload,
        logoUrl: finalLogoUrl
      };

      const saved = await empresaConfigSupabaseService.saveConfig(payload);
      if (saved) {
        const updated = {
          ...saved,
          responsavel: formData.responsavel
        };
        setFormData(updated);
        setOriginalData(updated);
        setLogoFile(null); // Clear the file state
        toast.success("Configurações salvas com sucesso!");
        // Reload page to propagate changes to Header layout after a brief timeout
        setTimeout(() => {
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }, 800);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canEdit) return;

    // Create temporary object URL for instant preview
    const objectUrl = URL.createObjectURL(file);
    setLogoFile(file);
    setFormData((prev) => ({ ...prev, logoUrl: objectUrl }));

    // Reset input value so the same file can be chosen again if needed
    e.target.value = "";

    // Show toast notification with Save button
    toast.success(
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <div style={{ fontWeight: "bold" }}>Nova logomarca carregada.</div>
        <div style={{ fontSize: "0.8rem", fontWeight: 500, opacity: 0.9 }}>As alterações ainda não foram aplicadas.</div>
        <button
          type="button"
          onClick={() => {
            const formElement = document.getElementById("config-form") as HTMLFormElement;
            if (formElement) {
              formElement.requestSubmit();
            }
          }}
          style={{
            alignSelf: "flex-start",
            backgroundColor: "#ffffff",
            color: "#27ae60",
            border: "none",
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "0.75rem",
            fontWeight: "bold",
            cursor: "pointer",
            marginTop: "6px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}
        >
          💾 Salvar Agora
        </button>
      </div>
    );
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Carregando configurações...</div>;
  }

  return (
    <div style={{ paddingBottom: isDirty ? "100px" : "20px" }}>
      <PageTitle 
        title="Configurações da Empresa" 
        actions={
          canEdit && (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {isDirty && (
                <span style={{ 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: "0.4rem", 
                  fontSize: "0.8rem", 
                  fontWeight: 700, 
                  color: "#ef4444", 
                  backgroundColor: "#fee2e2", 
                  padding: "4px 10px", 
                  borderRadius: "20px"
                }}>
                  <span style={{ 
                    width: "8px", 
                    height: "8px", 
                    borderRadius: "50%", 
                    backgroundColor: "#ef4444" 
                  }}></span>
                  Alterações não salvas
                </span>
              )}
              <button
                type="submit"
                form="config-form"
                disabled={saving}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  backgroundColor: "#0b4f59",
                  color: "#ffffff",
                  height: "42px",
                  padding: "0 1.25rem",
                  borderRadius: "10px",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(11, 79, 89, 0.15)",
                  transition: "all 0.2s ease",
                  visibility: "visible",
                  opacity: 1
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#083a42";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "#0b4f59";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                💾 Salvar Alterações
              </button>
            </div>
          )
        }
      />
      
      {!canEdit && (
        <div style={{ padding: "1rem", background: "#fcf8e3", border: "1px solid #faebcc", borderRadius: "6px", color: "#8a6d3b", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
          <strong>Modo de Leitura:</strong> Seu perfil ({roleName}) possui permissions apenas para visualização. As alterações estão desativadas.
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

      <form id="config-form" onSubmit={handleSave}>
        <Card>
          <div style={{ padding: "0.5rem" }}>
          
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
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "0.4rem", fontWeight: "bold" }}>Nome do Responsável</label>
                <Input
                  name="responsavel"
                  value={formData.responsavel || ""}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  placeholder="Nome do responsável pela empresa"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "0.4rem", fontWeight: "bold" }}>Contato</label>
                <Input
                  name="telefone"
                  value={formData.telefone || ""}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  placeholder="(00) 0000-0000"
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
                <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.5rem" }}>
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

              {/* Logo upload com Preview Premium, Trocar e Remover */}
              <div>
                <h4 style={{ margin: "0 0 1rem 0", color: "#0f172a", fontSize: "0.95rem", fontWeight: 700 }}>🏢 Logomarca</h4>
                
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1rem" }}>
                  {formData.logoUrl ? (
                    <div style={{ 
                      border: "1px solid #e2e8f0", 
                      padding: "8px", 
                      borderRadius: "12px", 
                      backgroundColor: "#f8fafc",
                      width: "120px",
                      height: "120px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden"
                    }}>
                      <img src={formData.logoUrl} alt="Logo Preview" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                    </div>
                  ) : (
                    <div style={{ 
                      border: "2px dashed #cbd5e1", 
                      borderRadius: "12px", 
                      backgroundColor: "#f8fafc",
                      width: "120px",
                      height: "120px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#64748b",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      gap: "0.25rem"
                    }}>
                      <span style={{ fontSize: "2rem" }}>📸</span>
                      Sem logomarca
                    </div>
                  )}

                  {canEdit && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <label 
                        htmlFor="logo-file-input"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem 1rem",
                          backgroundColor: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: "#334155",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#ffffff"}
                      >
                        📂 {formData.logoUrl ? "Trocar imagem" : "Selecionar imagem"}
                      </label>
                      <input
                        id="logo-file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        style={{ display: "none" }}
                      />
                      
                      {formData.logoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, logoUrl: "" }));
                            setLogoFile(null);
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.5rem 1rem",
                            backgroundColor: "transparent",
                            border: "1px solid #fee2e2",
                            borderRadius: "8px",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            color: "#ef4444",
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = "#fef2f2";
                            e.currentTarget.style.borderColor = "#fca5a5";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.borderColor = "#fee2e2";
                          }}
                        >
                          🗑️ Remover imagem
                        </button>
                      )}
                      
                      {uploading && <div style={{ fontSize: "0.8rem", color: "var(--brand)", marginTop: "0.1rem" }}>Enviando imagem...</div>}
                    </div>
                  )}
                </div>
              </div>

              {/* Live Preview Paleta */}
              <div style={{ gridColumn: "span 2", marginTop: "1rem" }}>
                <h4 style={{ margin: "0 0 1rem 0", color: "#0f172a", fontSize: "0.95rem", fontWeight: 700 }}>🎨 Preview em Tempo Real</h4>
                <div style={{ 
                  border: "1px solid #e2e8f0", 
                  borderRadius: "12px", 
                  padding: "1rem", 
                  backgroundColor: "#f8fafc",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1.5rem"
                }}>
                  {/* Header preview */}
                  <div style={{ 
                    gridColumn: "span 2",
                    backgroundColor: formData.corPrimaria || "#2f80ed",
                    color: "#ffffff",
                    padding: "0.6rem 1rem",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "0.85rem",
                    fontWeight: 700
                  }}>
                    <span>🏢 {formData.nomeFantasia || "Minha Empresa"} (Header)</span>
                    <span style={{ 
                      backgroundColor: formData.corSecundaria || "#27ae60",
                      color: "#ffffff",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "0.7rem",
                      fontWeight: 600
                    }}>
                      Ativo (Badge)
                    </span>
                  </div>

                  {/* Card & Button Preview */}
                  <div style={{ 
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "0.75rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                  }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a" }}>Card Preview</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Este card exemplifica o uso das suas cores de identidade.</div>
                    <button 
                      type="button" 
                      style={{ 
                        backgroundColor: formData.corPrimaria || "#2f80ed", 
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        padding: "0.4rem 0.8rem",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        alignSelf: "flex-start",
                        marginTop: "0.25rem"
                      }}
                    >
                      Botão Primário
                    </button>
                  </div>

                  <div style={{ 
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "0.75rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                  }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a" }}>Badge & Secundária</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>O destaque e elementos secundários herdam esta cor.</div>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                      <span style={{ 
                        border: `1.5px solid ${formData.corSecundaria || "#27ae60"}`,
                        color: formData.corSecundaria || "#27ae60",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "0.7rem",
                        fontWeight: 700
                      }}>
                        Destaque Secundário
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          </div>
        </Card>
      </form>

      {/* Dynamic bottom bar for unsaved changes */}
      {isDirty && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#0f172a",
            color: "#ffffff",
            padding: "0.85rem 1.5rem",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "2rem",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
            zIndex: 9999,
            width: "calc(100% - 40px)",
            maxWidth: "600px",
            animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <span style={{ fontSize: "0.9rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            ⚠️ Existem alterações não salvas.
          </span>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Button
              type="button"
              variant="cancel"
              onClick={() => {
                if (originalData) {
                  setFormData(originalData);
                  setLogoFile(null);
                }
              }}
              style={{
                color: "#94a3b8",
                borderColor: "#334155",
                padding: "0.4rem 1rem",
                fontSize: "0.85rem",
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="config-form"
              disabled={saving}
              style={{
                backgroundColor: "#0b4f59",
                color: "#ffffff",
                padding: "0.4rem 1.2rem",
                fontSize: "0.85rem",
                fontWeight: 700,
              }}
            >
              💾 Salvar Alterações
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
