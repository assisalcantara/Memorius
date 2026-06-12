export interface Cliente {
  id?: string | number;
  nomeCompleto: string;
  cpf: string;
  rg: string;
  dataNascimento: string;
  sexo: string;
  nomePai?: string;
  nomeMae?: string;
  naturalidade?: string;
  estadoCivil?: string;
  nomeConjuge?: string;
  profissao?: string;
  localTrabalho?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  telefone?: string;
  email?: string;
  status: string;
  dataCadastro: string;
}

export interface Plano {
  id: string | number;
  nome: string;
  diasCarencia?: string | number;
  nMeses?: string | number;
  limiteDependentes?: string | number;
  valorMensal?: string | number;
  descricao?: string;
  coberturaBasica?: string;
  coberturaAdicional?: string;
  status?: string;
  dataCadastro?: string;
}

export interface Funcionario {
  id?: string | number;
  foto?: string; // base64 or file path
  nome: string;
  grupo?: string;
  email?: string;
  cpf: string;
  funcao?: string;
  rg?: string;
  telefoneCelular?: string;
  whatsapp: string;
  cep?: string;
  endereco?: string;
  cidade?: string;
  bairro?: string;
  uf?: string;
  dataNascimento?: string;
  dataAdmissao?: string;
  status: string;
  banco?: string;
  agencia?: string;
  contaCorrente?: string;
  pix?: string;
  observacoes?: string;
}

export interface Agregado {
  id?: string | number;
  contratoId: string | number;
  nome: string;
  cpf?: string;
  dataNascimento?: string;
  parentesco?: string;
  liberacao?: string;
}

export interface Contrato {
  id?: string | number;
  numeroContrato: string;
  clienteId: string | number;
  clienteNome: string;
  planoId: string | number;
  planoNome: string;
  dataInicio: string;
  status: string;
  agregados?: Agregado[];
}

export interface Mensalidade {
  id?: string | number;
  contratoId: string | number;
  numeroContrato: string;
  clienteNome: string;
  planoNome: string;
  competencia: string; // ex: "06/2026"
  dataVencimento: string;
  valor: string | number;
  status: "EM_ABERTO" | "PAGO" | "CANCELADO";
  dataPagamento?: string;
  valorRecebido?: string | number;
  observacao?: string;
}

export interface Atendimento {
  id?: string | number;
  contratoId: string | number;
  clienteNome: string;
  planoNome: string;
  data: string;
  hora: string;
  local: string;
  tipo: "TITULAR" | "DEPENDENTE";
  responsavel: string;
  telefone: string;
  observacoes?: string;
  status: string; // ex: "Aberto", "Finalizado"
  operador: string;
}

export interface EmpresaConfig {
  id?: string;
  tenant_id?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  telefone?: string;
  celular?: string;
  email?: string;
  site?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  logoUrl?: string;
  corPrimaria?: string;
  corSecundaria?: string;
}

export interface AuditLog {
  id?: string;
  tenant_id?: string;
  user_id?: string | null;
  user_name?: string | null;
  role_name?: string | null;
  modulo: string;
  acao: string;
  registro_id?: string | null;
  descricao?: string | null;
  ip?: string | null;
  created_at?: string;
}

export interface Profile {
  id?: string;
  tenant_id?: string | null;
  nome: string | null;
  email: string | null;
  role?: string | null;
  role_id: string | null;
  role_name?: string | null;
  ativo: boolean;
  status: 'ATIVO' | 'INATIVO' | 'CONVIDADO';
  created_at?: string;
}

export interface SaasPlan {
  id: string;
  nome: string;
  descricao?: string;
  valorMensal?: number;
  valorAnual?: number;
  limiteUsuarios?: number;
  limiteClientes?: number;
  limiteContratos?: number;
  limiteStorageMb?: number;
  trialDias?: number;
  ativo: boolean;
  destaque: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadSaas {
  id: string;
  nomeEmpresa: string;
  responsavel?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  cidade?: string;
  uf?: string;
  origem?: string;
  interessePlano?: string;
  observacoes?: string;
  status: 'NOVO' | 'CONTATO_REALIZADO' | 'PROPOSTA_ENVIADA' | 'NEGOCIACAO' | 'FECHADO' | 'PERDIDO';
  createdAt?: string;
  updatedAt?: string;
}

export interface PropostaSaas {
  id: string;
  leadId: string;
  leadNomeEmpresa?: string;
  titulo: string;
  descricao?: string;
  valorProposto?: number;
  planoSaasId?: string;
  planoNome?: string;
  validade?: string;
  status: 'RASCUNHO' | 'ENVIADA' | 'NEGOCIACAO' | 'APROVADA' | 'RECUSADA' | 'EXPIRADA';
  observacoes?: string;
  convertedTenantId?: string;
  convertedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TenantSubscription {
  id: string;
  tenantId: string;
  tenantEmpresa?: string;
  saasPlanId: string;
  saasPlanNome?: string;
  status: 'ATIVO' | 'TRIAL' | 'SUSPENSO' | 'CANCELADO';
  ciclo: 'MENSAL' | 'ANUAL';
  valor: number;
  dataInicio: string;
  dataVencimento: string;
  dataCancelamento?: string;
  observacoes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaaSInvoice {
  id: string;
  subscriptionId?: string | null;
  tenantId: string;
  tenantEmpresa?: string;
  descricao?: string;
  valor: number;
  competencia: string;
  vencimento: string;
  pagamentoEm?: string | null;
  status: 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO';
  observacoes?: string;
  asaasCustomerId?: string | null;
  asaasPaymentId?: string | null;
  asaasInvoiceUrl?: string | null;
  asaasStatus?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaasGatewayConfig {
  id?: string;
  provider: string;
  ambiente: 'SANDBOX' | 'PRODUCAO';
  apiKey: string;
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContractTemplate {
  id?: string;
  tenantId?: string; // We can use camelCase in TS, but wait, the database has tenant_id. Let's support both or match database style. Let's use tenantId and tenant_id, or just what matches standard models in the project.
  tenant_id?: string;
  titulo: string;
  conteudo: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}


