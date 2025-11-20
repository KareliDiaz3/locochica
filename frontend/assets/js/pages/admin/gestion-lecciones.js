/* ============================================
   SPEAKLEXI - GESTIÓN DE LECCIONES (ADMIN) CORREGIDO
   Archivo: assets/js/pages/admin/gestion-lecciones.js
   ============================================ */
(() => {
    'use strict';

    let leccionesData = [];
    let paginaActual = 1;
    const leccionesPorPagina = 10;

    const customStore = window.CustomLessonsStore || null;
    const ensureArray = (value) => Array.isArray(value) ? value : [];

    function normalizarIdiomaKey(etiqueta = '') {
        const valor = etiqueta.toString().toLowerCase();
        if (valor.includes('fr')) return 'frances';
        if (valor.includes('al') || valor.includes('de')) return 'aleman';
        if (valor.includes('it')) return 'italiano';
        if (valor.includes('port')) return 'portugues';
        return 'ingles';
    }
    let actividadesPersonalizadas = [];
    let leccionEnEdicionId = null;
    let leccionEnEdicionEsCustom = false;
    let modalActividad = null;

    async function init() {
        console.log('🚀 Iniciando Gestión de Lecciones...');
        
        await waitForDependencies();
        
        if (!verificarPermisosAdmin()) {
            return;
        }
        
        crearModalActividad();
        setupEventListeners();
        await cargarLecciones();
        
        console.log('✅ Gestión de Lecciones inicializada');
    }

    function setupEventListeners() {
        document.getElementById('btn-crear-leccion')?.addEventListener('click', mostrarModalCrear);
        document.getElementById('btn-refrescar')?.addEventListener('click', cargarLecciones);
        document.getElementById('btn-cancelar-crear')?.addEventListener('click', ocultarModalCrear);
        document.getElementById('btn-guardar-leccion')?.addEventListener('click', crearLeccion);
        document.getElementById('buscar-leccion')?.addEventListener('input', filtrarLecciones);
        document.getElementById('filtro-nivel')?.addEventListener('change', filtrarLecciones);
        document.getElementById('btn-prev')?.addEventListener('click', () => cambiarPagina(-1));
        document.getElementById('btn-next')?.addEventListener('click', () => cambiarPagina(1));
        document.getElementById('btn-agregar-actividad')?.addEventListener('click', () => abrirModalActividad());
        
        document.getElementById('buscar-leccion')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                filtrarLecciones();
            }
        });
    }

    async function cargarLecciones() {
        try {
            mostrarLoading(true);
            
            const endpoint = window.APP_CONFIG?.API?.ENDPOINTS?.LECCIONES?.LISTAR || '/lecciones';
            const response = await window.apiClient.get(endpoint);
            
            console.log('📦 Respuesta completa:', response);
            
            if (response.success) {
                // 🔧 CORRECCIÓN: response.data contiene {success, data, paginacion}
                // El array de lecciones está en response.data.data
                const serverData = response.data;
                
                // Verificar estructura de la respuesta
                if (serverData.data && Array.isArray(serverData.data)) {
                    leccionesData = serverData.data;
                    console.log('✅ Lecciones cargadas del servidor:', leccionesData.length);
                } else if (Array.isArray(serverData)) {
                    // Fallback: si data es directamente un array
                    leccionesData = serverData;
                    console.log('✅ Lecciones cargadas (estructura alternativa):', leccionesData.length);
                } else {
                    console.warn('⚠️ Estructura de respuesta inesperada:', serverData);
                    throw new Error('Estructura de datos incorrecta');
                }

                if (customStore) {
                    const customSummary = customStore.getSummary();
                    if (customSummary.length) {
                        leccionesData = [...leccionesData, ...customSummary];
                    }
                }
                
                actualizarEstadisticas();
                mostrarLecciones();
                window.toastManager.success(`${leccionesData.length} lecciones cargadas correctamente`);
            } else {
                throw new Error(response.error || 'Error al cargar lecciones');
            }
        } catch (error) {
            console.warn('⚠️ Error cargando lecciones:', error);
            window.toastManager.warning('Usando datos de demostración. Servidor no disponible.');
            
            leccionesData = obtenerLeccionesDemo();
            if (customStore) {
                const customSummary = customStore.getSummary();
                if (customSummary.length) {
                    leccionesData = [...leccionesData, ...customSummary];
                }
            }
            actualizarEstadisticas();
            mostrarLecciones();
        } finally {
            mostrarLoading(false);
        }
    }

    function obtenerLeccionesDemo() {
        return [
            {
                id: 1,
                titulo: "Saludos y Presentaciones Básicas",
                descripcion: "Aprende a saludar y presentarte en situaciones cotidianas",
                nivel: "A1",
                idioma: "Inglés",
                estado: "activa",
                duracion_minutos: 45,
                orden: 1,
                creado_en: new Date().toISOString(),
                creado_por: "Admin Demo"
            },
            {
                id: 2,
                titulo: "Números y Fechas",
                descripcion: "Domina los números cardinales, ordinales y cómo expresar fechas",
                nivel: "A1",
                idioma: "Inglés", 
                estado: "borrador",
                duracion_minutos: 60,
                orden: 2,
                creado_en: new Date(Date.now() - 86400000).toISOString(),
                creado_por: "Admin Demo"
            },
            {
                id: 3,
                titulo: "Conversaciones en Restaurante",
                descripcion: "Frases útiles para pedir comida en un restaurante",
                nivel: "A2",
                idioma: "Inglés",
                estado: "inactiva",
                duracion_minutos: 50,
                orden: 3,
                creado_en: new Date(Date.now() - 172800000).toISOString(),
                creado_por: "Admin Demo"
            }
        ];
    }

    function actualizarEstadisticas() {
        // 🔧 VALIDACIÓN: Asegurar que leccionesData es un array
        if (!Array.isArray(leccionesData)) {
            console.error('❌ leccionesData no es un array:', typeof leccionesData, leccionesData);
            leccionesData = [];
            return;
        }
        
        const total = leccionesData.length;
        const activas = leccionesData.filter(l => l.estado === 'activa').length;
        const borrador = leccionesData.filter(l => l.estado === 'borrador').length;
        const inactivas = leccionesData.filter(l => l.estado === 'inactiva').length;

        const totalEl = document.getElementById('total-lecciones');
        const activasEl = document.getElementById('lecciones-activas');
        const borradorEl = document.getElementById('lecciones-borrador');
        const inactivasEl = document.getElementById('lecciones-inactivas');

        if (totalEl) totalEl.textContent = total;
        if (activasEl) activasEl.textContent = activas;
        if (borradorEl) borradorEl.textContent = borrador;
        if (inactivasEl) inactivasEl.textContent = inactivas;
    }

    function mostrarLecciones() {
        const tbody = document.getElementById('tabla-lecciones');
        if (!tbody) return;

        const leccionesFiltradas = obtenerLeccionesFiltradas();
        const inicio = (paginaActual - 1) * leccionesPorPagina;
        const fin = inicio + leccionesPorPagina;
        const leccionesPagina = leccionesFiltradas.slice(inicio, fin);

        if (leccionesPagina.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="py-12 text-center text-gray-500 dark:text-gray-400">
                        <i class="fas fa-search text-3xl mb-3 opacity-50"></i>
                        <p class="text-lg">No se encontraron lecciones</p>
                        <p class="text-sm mt-1">Intenta ajustar los filtros de búsqueda</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = leccionesPagina.map((leccion) => {
            const esCustom = leccion.esCustom || (typeof leccion.id === 'string' && leccion.id.startsWith('custom-'));
            const idiomaDisplay = leccion.idioma || leccion.idiomaLabel || 'Idioma';
            const accionesId = typeof leccion.id === 'string' ? leccion.id : String(leccion.id || '');
            const idiomaKey = leccion.idiomaKey || normalizarIdiomaKey(idiomaDisplay);
            const lessonKey = leccion.lessonKey || (esCustom ? `custom:${accionesId}` : `base:${idiomaKey}:${leccion.nivel}`);

            return `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td class="py-4 px-4">
                    <div>
                        <p class="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            ${escapeHtml(leccion.titulo)}
                            ${esCustom ? '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-200">Custom</span>' : ''}
                        </p>
                        <p class="text-sm text-gray-600 dark:text-gray-400">${escapeHtml(leccion.descripcion || 'Sin descripción')}</p>
                    </div>
                </td>
                <td class="py-4 px-4">
                    <span class="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                        ${escapeHtml(leccion.nivel)}
                    </span>
                </td>
                <td class="py-4 px-4 text-gray-600 dark:text-gray-400">${escapeHtml(idiomaDisplay)}</td>
                <td class="py-4 px-4">
                    <span class="px-2 py-1 text-xs ${
                        leccion.estado === 'activa' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                        leccion.estado === 'borrador' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
                        'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    } rounded-full">
                        ${leccion.estado}
                    </span>
                </td>
                <td class="py-4 px-4 text-gray-600 dark:text-gray-400">${leccion.duracion_minutos} min</td>
                <td class="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">${formatearFecha(leccion.creado_en)}</td>
                <td class="py-4 px-4">
                    <div class="flex gap-2">
                        <button onclick="window.gestionLecciones.editarLeccion('${accionesId}')" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="window.gestionLecciones.verLeccion('${accionesId}')" class="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20" title="Ver">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="window.gestionLecciones.gestionarMultimedia('${lessonKey}')" class="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 transition-colors p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20" title="Multimedia">
                            <i class="fas fa-file-upload"></i>
                        </button>
                        <button onclick="window.gestionLecciones.eliminarLeccion('${accionesId}')" class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');

        actualizarPaginacion(leccionesFiltradas.length);
    }

    function obtenerLeccionesFiltradas() {
        const busquedaEl = document.getElementById('buscar-leccion');
        const nivelFiltroEl = document.getElementById('filtro-nivel');
        
        if (!busquedaEl || !nivelFiltroEl) return leccionesData;
        
        const busqueda = busquedaEl.value.toLowerCase();
        const nivelFiltro = nivelFiltroEl.value;
        
        return leccionesData.filter(leccion => {
            const coincideBusqueda = !busqueda || 
                leccion.titulo.toLowerCase().includes(busqueda) || 
                (leccion.descripcion && leccion.descripcion.toLowerCase().includes(busqueda));
            const coincideNivel = !nivelFiltro || leccion.nivel === nivelFiltro;
            
            return coincideBusqueda && coincideNivel;
        });
    }

    function filtrarLecciones() {
        paginaActual = 1;
        mostrarLecciones();
    }

    function actualizarPaginacion(total) {
        const desde = Math.min((paginaActual - 1) * leccionesPorPagina + 1, total);
        const hasta = Math.min(paginaActual * leccionesPorPagina, total);
        
        const desdeEl = document.getElementById('mostrando-desde');
        const hastaEl = document.getElementById('mostrando-hasta');
        const totalEl = document.getElementById('total-registros');
        const prevBtn = document.getElementById('btn-prev');
        const nextBtn = document.getElementById('btn-next');
        
        if (desdeEl) desdeEl.textContent = desde;
        if (hastaEl) hastaEl.textContent = hasta;
        if (totalEl) totalEl.textContent = total;
        
        if (prevBtn) prevBtn.disabled = paginaActual === 1;
        if (nextBtn) nextBtn.disabled = hasta >= total;
    }

    function cambiarPagina(direccion) {
        const leccionesFiltradas = obtenerLeccionesFiltradas();
        const totalPaginas = Math.ceil(leccionesFiltradas.length / leccionesPorPagina);
        const nuevaPagina = paginaActual + direccion;
        
        if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
            paginaActual = nuevaPagina;
            mostrarLecciones();
        }
    }

    function mostrarModalCrear() {
        const modal = document.getElementById('modal-crear-leccion');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
        const tituloModal = leccionEnEdicionId ? 'Editar Lección Personalizada' : 'Crear Nueva Lección';
        const textoBtn = leccionEnEdicionId ? 'Guardar Cambios' : 'Crear Lección';
        actualizarModalLeccion(tituloModal, textoBtn);
        renderActividades();
    }

    function ocultarModalCrear() {
        const modal = document.getElementById('modal-crear-leccion');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        resetFormularioLeccion();
    }

    function resetFormularioLeccion() {
        const form = document.getElementById('form-crear-leccion');
        form?.reset();
        actividadesPersonalizadas = [];
        leccionEnEdicionId = null;
        leccionEnEdicionEsCustom = false;
        renderActividades();
        actualizarModalLeccion('Crear Nueva Lección', 'Crear Lección');
    }

    function actualizarModalLeccion(titulo, textoBoton) {
        const tituloEl = document.querySelector('#modal-crear-leccion h3');
        const btnGuardar = document.getElementById('btn-guardar-leccion');
        if (tituloEl) tituloEl.textContent = titulo;
        if (btnGuardar) {
            btnGuardar.innerHTML = `<i class="fas fa-save mr-2"></i>${textoBoton}`;
        }
    }

    function renderActividades() {
        const contenedor = document.getElementById('lista-actividades');
        if (!contenedor) return;

        if (actividadesPersonalizadas.length === 0) {
            contenedor.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Aún no has agregado preguntas dinámicas. Usa el botón para crear la primera.</p>';
            return;
        }

        contenedor.innerHTML = actividadesPersonalizadas.map((actividad, index) => `
            <div class="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800 shadow-sm">
                <div class="flex justify-between items-start gap-3">
                    <div class="flex-1">
                        <p class="font-semibold text-gray-900 dark:text-white">${escapeHtml(actividad.prompt)}</p>
                        <ul class="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                            ${actividad.options.map((opcion, idx) => `
                                <li class="flex items-start gap-2 ${idx === actividad.answer ? 'text-green-600 dark:text-green-400 font-semibold' : ''}">
                                    <span class="text-xs font-bold w-6 text-center px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">${idx + 1}</span>
                                    <span>${escapeHtml(opcion)}</span>
                                </li>
                            `).join('')}
                        </ul>
                        ${actividad.mediaUrl ? `
                            <p class="mt-2 text-xs text-primary-600 dark:text-primary-300 flex items-center gap-2">
                                <i class="fas fa-link"></i>${escapeHtml(actividad.mediaUrl)}
                            </p>
                        ` : ''}
                    </div>
                    <div class="flex flex-col gap-2">
                        <button class="btn-editar-actividad px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 hover:bg-blue-100" data-index="${index}">
                            <i class="fas fa-pen mr-1"></i>Editar
                        </button>
                        <button class="btn-eliminar-actividad px-3 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300 hover:bg-red-100" data-index="${index}">
                            <i class="fas fa-trash mr-1"></i>Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        contenedor.querySelectorAll('.btn-editar-actividad').forEach((btn) => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index, 10);
                abrirModalActividad(actividadesPersonalizadas[idx], idx);
            });
        });

        contenedor.querySelectorAll('.btn-eliminar-actividad').forEach((btn) => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index, 10);
                eliminarActividad(idx);
            });
        });
    }

    function crearModalActividad() {
        if (modalActividad) return;

        const modal = document.createElement('div');
        modal.id = 'modal-actividad';
        modal.className = 'hidden fixed inset-0 bg-black bg-opacity-50 z-50 items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-xl font-semibold text-gray-900 dark:text-white">Actividad dinámica</h3>
                    <button type="button" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" data-close-modal>
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pregunta *</label>
                        <textarea name="prompt" rows="2" required class="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Escribe la consigna de la pregunta"></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Opciones (una por línea) *</label>
                        <textarea name="options" rows="4" required class="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Escribe al menos 2 opciones&#10;Opción 1&#10;Opción 2"></textarea>
                    </div>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Respuesta correcta (número)</label>
                            <input type="number" name="answer" min="1" value="1" class="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Ingresa el número de la opción correcta (1 = primera opción).</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de recurso</label>
                            <select name="mediaType" class="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                                <option value="">Sin recurso</option>
                                <option value="image">Imagen</option>
                                <option value="audio">Audio</option>
                                <option value="video">Video</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL del recurso</label>
                            <input type="url" name="mediaUrl" class="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="https://...">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Etiqueta del recurso</label>
                            <input type="text" name="mediaLabel" class="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Ej: Escucha la pronunciación">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Explicación</label>
                        <textarea name="explanation" rows="2" class="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Explica por qué la respuesta es correcta."></textarea>
                    </div>
                    <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button type="button" class="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" data-close-modal>Cancelar</button>
                        <button type="submit" class="px-5 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"><i class="fas fa-save mr-2"></i>Guardar actividad</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        modalActividad = {
            root: modal,
            form: modal.querySelector('form'),
            inputs: {
                prompt: modal.querySelector('textarea[name="prompt"]'),
                options: modal.querySelector('textarea[name="options"]'),
                answer: modal.querySelector('input[name="answer"]'),
                explanation: modal.querySelector('textarea[name="explanation"]'),
                mediaType: modal.querySelector('select[name="mediaType"]'),
                mediaUrl: modal.querySelector('input[name="mediaUrl"]'),
                mediaLabel: modal.querySelector('input[name="mediaLabel"]')
            },
            closeButtons: modal.querySelectorAll('[data-close-modal]'),
            editingIndex: null
        };

        modalActividad.form.addEventListener('submit', manejarGuardarActividad);
        modalActividad.closeButtons.forEach((btn) => btn.addEventListener('click', cerrarModalActividad));
        modal.addEventListener('click', (event) => {
            if (event.target === modal) cerrarModalActividad();
        });
    }

    function abrirModalActividad(data = {}, index = null) {
        if (!modalActividad) return;
        modalActividad.editingIndex = index;
        modalActividad.inputs.prompt.value = data.prompt || '';
        modalActividad.inputs.options.value = ensureArray(data.options).join('\n');
        modalActividad.inputs.answer.value = (Number.isInteger(data.answer) ? data.answer + 1 : 1);
        modalActividad.inputs.explanation.value = data.explanation || '';
        modalActividad.inputs.mediaType.value = data.mediaType || data.media?.type || '';
        modalActividad.inputs.mediaUrl.value = data.mediaUrl || data.media?.src || '';
        modalActividad.inputs.mediaLabel.value = data.mediaLabel || data.media?.label || '';

        modalActividad.root.classList.remove('hidden');
        modalActividad.root.classList.add('flex');
    }

    function cerrarModalActividad() {
        if (!modalActividad) return;
        modalActividad.root.classList.add('hidden');
        modalActividad.root.classList.remove('flex');
        modalActividad.form.reset();
        modalActividad.editingIndex = null;
    }

    function manejarGuardarActividad(event) {
        event.preventDefault();
        if (!modalActividad) return;

        const opciones = modalActividad.inputs.options.value
            .split('\n')
            .map((opt) => opt.trim())
            .filter(Boolean);

        if (opciones.length < 2) {
            window.toastManager?.warning('Agrega al menos dos opciones para la actividad');
            return;
        }

        const respuesta = Math.max(1, Math.min(opciones.length, parseInt(modalActividad.inputs.answer.value, 10) || 1)) - 1;

        const actividad = {
            prompt: modalActividad.inputs.prompt.value.trim(),
            options: opciones,
            answer: respuesta,
            explanation: modalActividad.inputs.explanation.value.trim(),
            mediaType: modalActividad.inputs.mediaType.value,
            mediaUrl: modalActividad.inputs.mediaUrl.value.trim(),
            mediaLabel: modalActividad.inputs.mediaLabel.value.trim()
        };

        if (!actividad.prompt) {
            window.toastManager?.warning('La pregunta no puede estar vacía');
            return;
        }

        if (modalActividad.editingIndex !== null) {
            actividadesPersonalizadas[modalActividad.editingIndex] = actividad;
        } else {
            actividadesPersonalizadas.push(actividad);
        }

        cerrarModalActividad();
        renderActividades();
        window.toastManager?.success('Actividad guardada correctamente');
    }

    function eliminarActividad(index) {
        actividadesPersonalizadas.splice(index, 1);
        renderActividades();
    }

    function convertirActividadesParaGuardado() {
        return actividadesPersonalizadas.map((actividad) => ({
            prompt: actividad.prompt,
            options: actividad.options,
            answer: actividad.answer,
            explanation: actividad.explanation,
            media: actividad.mediaType && actividad.mediaUrl ? {
                type: actividad.mediaType,
                label: actividad.mediaLabel || 'Recurso de apoyo',
                src: actividad.mediaUrl
            } : undefined
        }));
    }

    function guardarLeccionLocal(datosLeccion) {
        if (!customStore) return;

        if (leccionEnEdicionId) {
            customStore.updateLesson(leccionEnEdicionId, datosLeccion);
            window.toastManager?.success('Lección personalizada actualizada en modo local');
        } else {
            customStore.addLesson(datosLeccion);
            window.toastManager?.success('Lección guardada localmente');
        }

        actividadesPersonalizadas = [];
        leccionEnEdicionId = null;
        leccionEnEdicionEsCustom = false;
        cargarLecciones();
        ocultarModalCrear();
    }

    function cargarLeccionCustomEnFormulario(id) {
        if (!customStore) return;
        const lesson = customStore.getLesson(id);
        if (!lesson) {
            window.toastManager?.error('No se encontró la lección personalizada seleccionada');
            return;
        }

        const form = document.getElementById('form-crear-leccion');
        if (!form) return;

        form.querySelector('[name="titulo"]').value = lesson.titulo || '';
        form.querySelector('[name="descripcion"]').value = lesson.descripcion || '';
        form.querySelector('[name="nivel"]').value = lesson.nivel || 'A1';
        form.querySelector('[name="idioma"]').value = lesson.idiomaLabel || lesson.idioma || 'Inglés';
        form.querySelector('[name="duracion_minutos"]').value = lesson.duracion_minutos || 30;
        form.querySelector('[name="orden"]').value = lesson.orden || 0;
        form.querySelector('[name="contenido"]').value = lesson.contenido || '';

        actividadesPersonalizadas = ensureArray(lesson.actividades).map((actividad) => ({
            prompt: actividad.prompt,
            options: actividad.options || [],
            answer: actividad.answer || 0,
            explanation: actividad.explanation || '',
            mediaType: actividad.media?.type || '',
            mediaUrl: actividad.media?.src || '',
            mediaLabel: actividad.media?.label || ''
        }));
        leccionEnEdicionId = lesson.id;
        leccionEnEdicionEsCustom = true;
        renderActividades();
        mostrarModalCrear();
    }

    async function crearLeccion() {
        const form = document.getElementById('form-crear-leccion');
        if (!form) return;
        
        const formData = new FormData(form);
        
        const titulo = formData.get('titulo');
        const nivel = formData.get('nivel');
        const idioma = formData.get('idioma');
        
        if (!titulo || !nivel || !idioma) {
            window.toastManager?.error('Por favor completa todos los campos requeridos');
            return;
        }

        if (actividadesPersonalizadas.length < 3) {
            window.toastManager?.warning('Agrega al menos 3 actividades dinámicas para la lección');
            return;
        }

        const actividadesConvertidas = convertirActividadesParaGuardado();
        
        const datosLeccion = {
            titulo: titulo,
            descripcion: formData.get('descripcion') || '',
            nivel: nivel,
            idioma: idioma,
            duracion_minutos: parseInt(formData.get('duracion_minutos') || 30, 10),
            orden: parseInt(formData.get('orden') || 0, 10),
            contenido: formData.get('contenido') || '',
            estado: 'activa',
            actividades: actividadesConvertidas
        };

        try {
            mostrarLoading(true);

            if (leccionEnEdicionId && leccionEnEdicionEsCustom && customStore) {
                customStore.updateLesson(leccionEnEdicionId, datosLeccion);
                window.toastManager?.success('Lección personalizada actualizada correctamente');
                await cargarLecciones();
                ocultarModalCrear();
                return;
            }
            
            const endpoint = window.APP_CONFIG?.API?.ENDPOINTS?.LECCIONES?.CREAR || '/lecciones';
            const response = await window.apiClient.post(endpoint, datosLeccion);
            
            console.log('📦 Respuesta crear lección:', response);
            
            if (response.success) {
                window.toastManager?.success('Lección creada exitosamente');
                actividadesPersonalizadas = [];
                const serverData = response.data;
                const leccionId = serverData.data?.id || serverData.data?.leccion_id;

                // Guardar también en el almacenamiento local para que aparezca en el listado y en multimedia
                if (customStore) {
                    const idiomaKey = normalizarIdiomaKey(idioma);
                    const leccionLocal = {
                        ...datosLeccion,
                        actividades: actividadesConvertidas,
                        idiomaKey,
                        idiomaLabel: idioma,
                        estado: 'activa',
                        id: leccionId || undefined,
                        esCustom: true,
                        creado_por: 'Administrador'
                    };
                    customStore.addLesson(leccionLocal);
                }

                await cargarLecciones();
                ocultarModalCrear();

                setTimeout(() => {
                    if (leccionId) {
                        window.location.href = `/pages/admin/editor-leccion.html?id=${leccionId}`;
                    }
                }, 800);
                
            } else {
                throw new Error(response.error || 'Error al crear lección');
            }
        } catch (error) {
            console.warn('Error creando lección, usando almacenamiento local:', error);
            if (customStore) {
                guardarLeccionLocal(datosLeccion);
            } else {
                window.toastManager?.error('Error al crear la lección: ' + (error.message || 'Error desconocido'));
            }
        } finally {
            mostrarLoading(false);
        }
    }

    // Exportar funciones globalmente
    window.gestionLecciones = {
        editarLeccion: (id) => {
            if (typeof id === 'string' && id.startsWith('custom-') && customStore) {
                cargarLeccionCustomEnFormulario(id);
                return;
            }
            window.location.href = `/pages/admin/editor-leccion.html?id=${id}`;
        },
        
        verLeccion: (id) => {
            window.location.href = `/pages/admin/vista-previa.html?id=${id}`;
        },
        
        gestionarMultimedia: (lessonKey) => {
            window.location.href = `/pages/admin/gestion-multimedia.html?lessonKey=${encodeURIComponent(lessonKey)}`;
        },
        
        eliminarLeccion: async (id) => {
            if (typeof id === 'string' && id.startsWith('custom-') && customStore) {
                if (!confirm('¿Eliminar esta lección personalizada?')) return;
                customStore.deleteLesson(id);
                window.toastManager?.success('Lección personalizada eliminada');
                await cargarLecciones();
                return;
            }

            if (!confirm('¿Estás seguro de que quieres eliminar esta lección?\nEsta acción no se puede deshacer.')) {
                return;
            }
            
            try {
                mostrarLoading(true);
                
                const endpoint = window.APP_CONFIG?.API?.ENDPOINTS?.LECCIONES?.ELIMINAR?.replace(':id', id) || `/lecciones/${id}`;
                const response = await window.apiClient.delete(endpoint);
                
                if (response.success) {
                    window.toastManager?.success('Lección eliminada exitosamente');
                    await cargarLecciones();
                } else {
                    throw new Error(response.error || 'Error al eliminar lección');
                }
            } catch (error) {
                console.error('Error eliminando lección:', error);
                window.toastManager?.error('Error al eliminar la lección');
            } finally {
                mostrarLoading(false);
            }
        }
    };

    // Funciones auxiliares
    function formatearFecha(fechaISO) {
        try {
            const fecha = new Date(fechaISO);
            return fecha.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return 'Fecha inválida';
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function mostrarLoading(mostrar) {
        document.body.style.cursor = mostrar ? 'wait' : 'default';
    }

    async function waitForDependencies() {
        const dependencies = ['APP_CONFIG', 'apiClient', 'toastManager', 'Utils'];
        const maxWaitTime = 5000;
        const startTime = Date.now();
        
        while (dependencies.some(dep => !window[dep])) {
            if (Date.now() - startTime > maxWaitTime) {
                console.error('❌ Timeout esperando dependencias');
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('✅ Dependencias cargadas:', dependencies.filter(dep => window[dep]));
    }

    function verificarPermisosAdmin() {
        try {
            const usuario = window.Utils?.getFromStorage(window.APP_CONFIG?.STORAGE?.KEYS?.USUARIO) || 
                           JSON.parse(localStorage.getItem('usuario') || '{}');
            
            const token = window.Utils?.getFromStorage(window.APP_CONFIG?.STORAGE?.KEYS?.TOKEN) || 
                         localStorage.getItem('token');
            
            console.log('👤 Usuario actual:', usuario);
            console.log('🔑 Token presente:', !!token);
            
            if (!token) {
                console.warn('⚠️ No hay token de autenticación');
                mostrarErrorPermisos('Debes iniciar sesión para acceder a esta página');
                return false;
            }
            
            const rol = (usuario.rol || usuario.role || '').toLowerCase();
            console.log('👔 Rol del usuario:', rol);
            
        const rolesPermitidos = ['admin', 'administrador', 'profesor'];
        
        if (!rolesPermitidos.includes(rol)) {
            console.warn('⚠️ Usuario sin permisos de gestión. Rol:', rol);
            mostrarErrorPermisos('No tienes permisos para gestionar lecciones (se requiere rol de administrador o profesor).');
            return false;
        }
        
        console.log('✅ Usuario autorizado para gestionar lecciones');
            return true;
            
        } catch (error) {
            console.error('💥 Error verificando permisos:', error);
            mostrarErrorPermisos('Error al verificar permisos');
            return false;
        }
    }

    function mostrarErrorPermisos(mensaje) {
        if (window.toastManager) {
            window.toastManager.error(mensaje);
        } else {
            alert(mensaje);
        }
        
        setTimeout(() => {
            window.location.href = '/pages/auth/login.html';
        }, 2000);
    }

    // Inicializar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }

})();