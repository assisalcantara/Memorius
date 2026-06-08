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

