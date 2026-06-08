/* JS - Obituário */

console.log('[OBITUARIO] script carregado');

const btnAdicionarObituario = document.getElementById('btnAdicionarObituario');
const viewLista = document.getElementById('viewLista');
const viewFormulario = document.getElementById('viewFormulario');
const formObituario = document.getElementById('formObituario');
const listaObituariosEl = document.getElementById('listaObituarios');
const btnCancelarObito = document.getElementById('btnCancelarObito');

// Campos
const dataFalecimento = document.getElementById('dataFalecimento');
const horaFalecimento = document.getElementById('horaFalecimento');
const tipoAtendimento = document.getElementById('tipoAtendimento');
const nomeFalecido = document.getElementById('nomeFalecido');
const apelido = document.getElementById('apelido');
const dataNascimento = document.getElementById('dataNascimento');
const cidadeFalecido = document.getElementById('cidadeFalecido');
const causaMortis = document.getElementById('causaMortis');
const dataSepultamento = document.getElementById('dataSepultamento');
const horaSepultamento = document.getElementById('horaSepultamento');
const localVelorio = document.getElementById('localVelorio');
const localSepultamento = document.getElementById('localSepultamento');
const cidadeSepultamento = document.getElementById('cidadeSepultamento');
const mensagemCondolencia = document.getElementById('mensagemCondolencia');
const fotoFalecido = document.getElementById('fotoFalecido');

function inicializar() {
    btnAdicionarObituario.addEventListener('click', () => {
        showFormulario();
    });

    btnCancelarObito.addEventListener('click', (e) => {
        e.preventDefault();
        showLista();
    });

    formObituario.addEventListener('submit', salvarObituario);

    carregarObituarios();
}

function showLista() {
    viewFormulario.classList.remove('active');
    viewLista.classList.add('active');
    formObituario.reset();
    delete formObituario.dataset.editId;
}

function showFormulario() {
    viewLista.classList.remove('active');
    viewFormulario.classList.add('active');
    formObituario.reset();
}

function salvarObituario(e) {
    e.preventDefault();

    const idEdit = formObituario.dataset.editId;

    const novo = {
        id: idEdit ? parseInt(idEdit) : Date.now(),
        dataFalecimento: dataFalecimento.value || '',
        horaFalecimento: horaFalecimento.value || '',
        tipoAtendimento: tipoAtendimento.value || '',
        nomeFalecido: nomeFalecido.value.trim(),
        apelido: apelido.value.trim(),
        dataNascimento: dataNascimento.value || '',
        cidadeFalecido: cidadeFalecido.value.trim(),
        causaMortis: causaMortis.value.trim(),
        dataSepultamento: dataSepultamento.value || '',
        horaSepultamento: horaSepultamento.value || '',
        localVelorio: localVelorio.value.trim(),
        localSepultamento: localSepultamento.value.trim(),
        cidadeSepultamento: cidadeSepultamento.value.trim(),
        mensagemCondolencia: mensagemCondolencia.value.trim(),
        foto: null,
        criadoEm: new Date().toISOString()
    };

    // Processar foto (opcional)
    const file = fotoFalecido.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(ev) {
            novo.foto = ev.target.result;
            persistirObituario(novo, idEdit);
        };
        reader.readAsDataURL(file);
    } else {
        persistirObituario(novo, idEdit);
    }
}

function persistirObituario(novo, idEdit) {
    const obituarios = JSON.parse(localStorage.getItem('obituarios') || '[]');

    if (idEdit) {
        const idx = obituarios.findIndex(o => o.id === parseInt(idEdit));
        if (idx !== -1) {
            obituarios[idx] = novo;
            showSuccessSafe('Obituário atualizado com sucesso!');
        } else {
            obituarios.push(novo);
            showSuccessSafe('Obituário adicionado com sucesso!');
        }
    } else {
        obituarios.push(novo);
        showSuccessSafe('Obituário adicionado com sucesso!');
    }

    localStorage.setItem('obituarios', JSON.stringify(obituarios));
    carregarObituarios();
    showLista();
}

function carregarObituarios() {
    const obituarios = JSON.parse(localStorage.getItem('obituarios') || '[]');
    renderLista(obituarios);
}

function renderLista(obituarios) {
    if (!obituarios || obituarios.length === 0) {
        listaObituariosEl.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum obituário registrado</td></tr>';
        return;
    }

    listaObituariosEl.innerHTML = obituarios.map(o => {
        const data = o.dataFalecimento ? new Date(o.dataFalecimento).toLocaleDateString('pt-BR') : '-';
        return `
            <tr>
                <td>${data}</td>
                <td>${escapeHtml(o.nomeFalecido)}</td>
                <td>${escapeHtml(o.localSepultamento || '')}</td>
                <td>${escapeHtml(o.cidadeSepultamento || o.cidadeFalecido || '')}</td>
                <td>
                    <button class="btn btn-add" onclick="editarObituario(${o.id})">✏️</button>
                    <button class="btn btn-delete" onclick="deletarObituario(${o.id})">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function editarObituario(id) {
    const obituarios = JSON.parse(localStorage.getItem('obituarios') || '[]');
    const o = obituarios.find(x => x.id === id);
    if (!o) { showErrorSafe('Registro não encontrado'); return; }

    // Preencher formulário
    dataFalecimento.value = o.dataFalecimento || '';
    horaFalecimento.value = o.horaFalecimento || '';
    tipoAtendimento.value = o.tipoAtendimento || '';
    nomeFalecido.value = o.nomeFalecido || '';
    apelido.value = o.apelido || '';
    dataNascimento.value = o.dataNascimento || '';
    cidadeFalecido.value = o.cidadeFalecido || '';
    causaMortis.value = o.causaMortis || '';
    dataSepultamento.value = o.dataSepultamento || '';
    horaSepultamento.value = o.horaSepultamento || '';
    localVelorio.value = o.localVelorio || '';
    localSepultamento.value = o.localSepultamento || '';
    cidadeSepultamento.value = o.cidadeSepultamento || '';
    mensagemCondolencia.value = o.mensagemCondolencia || '';

    formObituario.dataset.editId = id;
    showFormulario();
}

function deletarObituario(id) {
    if (!confirm('Deseja realmente deletar este obituário?')) return;
    let obituarios = JSON.parse(localStorage.getItem('obituarios') || '[]');
    obituarios = obituarios.filter(o => o.id !== id);
    localStorage.setItem('obituarios', JSON.stringify(obituarios));
    carregarObituarios();
    showSuccessSafe('Obituário deletado');
}

// Helpers
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[m]; });
}

function showSuccessSafe(msg) {
    if (typeof showSuccess === 'function') showSuccess(msg);
    else alert(msg);
}
function showErrorSafe(msg) {
    if (typeof showError === 'function') showError(msg);
    else alert(msg);
}

// Expose functions for inline buttons
window.editarObituario = editarObituario;
window.deletarObituario = deletarObituario;

document.addEventListener('DOMContentLoaded', inicializar);
