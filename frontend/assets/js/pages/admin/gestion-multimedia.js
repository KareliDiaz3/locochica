/* ============================================
   SPEAKLEXI - GESTIÓN DE MULTIMEDIA (ADMIN)
   Archivo: assets/js/pages/admin/gestion-multimedia.js
   Usa: CustomLessonsStore, LESSONS_DATA, toastManager
   ============================================ */

(() => {
    'use strict';

    const elementos = {
        lessonSelect: document.getElementById('lesson-select'),
        lessonSummary: document.getElementById('lesson-summary'),
        summaryTitle: document.getElementById('summary-title'),
        summaryTags: document.getElementById('summary-tags'),
        mediaList: document.getElementById('media-list'),
        mediaCountBadge: document.getElementById('media-count-badge'),
        form: document.getElementById('form-multimedia')
    };

    const state = {
        lessonOptions: [],
        selectedLessonKey: null
    };

    const store = window.CustomLessonsStore || null;

    function init() {
        if (!store) {
            console.error('CustomLessonsStore no está disponible.');
            return;
        }
        cargarOpcionesLecciones();
        configurarEventos();
    }

    function cargarOpcionesLecciones() {
        const baseLessons = window.LESSONS_DATA || {};
        state.lessonOptions = store.listLessonOptions(baseLessons);
        const preseleccion = obtenerLeccionPreseleccionada();

        if (!elementos.lessonSelect) return;
        elementos.lessonSelect.innerHTML = state.lessonOptions.length
            ? state.lessonOptions.map((lesson) => `
                <option value="${lesson.key}">
                    ${lesson.titulo} • ${lesson.nivel} ${lesson.esCustom ? '(Custom)' : ''}
                </option>
            `).join('')
            : '<option value="">No hay lecciones disponibles</option>';

        if (state.lessonOptions.length) {
            const encontrada = state.lessonOptions.find((opcion) => opcion.key === preseleccion);
            state.selectedLessonKey = encontrada ? encontrada.key : state.lessonOptions[0].key;
            elementos.lessonSelect.value = state.selectedLessonKey;
            actualizarResumenLeccion();
            renderizarRecursos();
        }
    }

    function configurarEventos() {
        elementos.lessonSelect?.addEventListener('change', (event) => {
            state.selectedLessonKey = event.target.value;
            actualizarResumenLeccion();
            renderizarRecursos();
        });

        elementos.form?.addEventListener('submit', manejarEnvioFormulario);
    }

    function obtenerLeccionSeleccionada() {
        return state.lessonOptions.find((lesson) => lesson.key === state.selectedLessonKey) || null;
    }

    function actualizarResumenLeccion() {
        const leccion = obtenerLeccionSeleccionada();
        if (!leccion || !elementos.summaryTitle) return;

        elementos.summaryTitle.textContent = leccion.titulo;
        if (elementos.summaryTags) {
            elementos.summaryTags.innerHTML = `
                <span class="px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                    ${leccion.idiomaLabel}
                </span>
                <span class="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                    Nivel ${leccion.nivel}
                </span>
                ${leccion.esCustom ? '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">Custom</span>' : ''}
            `;
        }
    }

    function renderizarRecursos() {
        if (!elementos.mediaList || !state.selectedLessonKey) return;

        const recursos = store.getMediaResources(state.selectedLessonKey);

        if (elementos.mediaCountBadge) {
            elementos.mediaCountBadge.textContent = `${recursos.length} recurso${recursos.length === 1 ? '' : 's'}`;
        }

        if (recursos.length === 0) {
            elementos.mediaList.innerHTML = `
                <div class="col-span-full text-center text-gray-500 dark:text-gray-400 py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                    Aún no hay recursos asociados a esta lección.
                </div>
            `;
            return;
        }

        elementos.mediaList.innerHTML = recursos.map((recurso) => `
            <div class="border border-gray-200 dark:border-gray-700 rounded-2xl p-4 flex flex-col gap-3 bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-shadow">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        ${obtenerIconoRecurso(recurso.tipo)}
                        <div>
                            <p class="font-semibold text-gray-900 dark:text-white">${recurso.titulo}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">${formatearTipo(recurso.tipo)}</p>
                        </div>
                    </div>
                    <button data-id="${recurso.id}" class="btn-eliminar-recurso text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-semibold">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-300">${recurso.descripcion || 'Sin descripción'}</p>
                <div class="flex flex-wrap gap-2 text-xs">
                    <button data-url="${recurso.url}" class="btn-preview px-3 py-1 bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300 rounded-full font-semibold flex items-center gap-1">
                        <i class="fas fa-external-link-alt"></i> Abrir recurso
                    </button>
                    ${recurso.thumbnail ? `
                        <button data-url="${recurso.thumbnail}" class="btn-preview px-3 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-full font-semibold flex items-center gap-1">
                            <i class="fas fa-image"></i> Ver miniatura
                        </button>
                    ` : ''}
                </div>
                <p class="text-xs text-gray-400 dark:text-gray-500">Agregado el ${new Date(recurso.createdAt).toLocaleDateString()}</p>
            </div>
        `).join('');

        elementos.mediaList.querySelectorAll('.btn-preview').forEach((btn) => {
            btn.addEventListener('click', (event) => {
                const url = event.currentTarget.dataset.url;
                if (url) {
                    window.open(url, '_blank', 'noopener');
                }
            });
        });

        elementos.mediaList.querySelectorAll('.btn-eliminar-recurso').forEach((btn) => {
            btn.addEventListener('click', (event) => {
                const { id } = event.currentTarget.dataset;
                if (!id) return;
                const confirmado = confirm('¿Deseas eliminar este recurso?');
                if (!confirmado) return;
                store.deleteMediaResource(id);
                toast('Recurso eliminado correctamente');
                renderizarRecursos();
            });
        });
    }

    function manejarEnvioFormulario(event) {
        event.preventDefault();
        if (!state.selectedLessonKey) {
            toast('Selecciona una lección antes de agregar multimedia', 'error');
            return;
        }

        const formData = new FormData(elementos.form);
        const recurso = {
            lessonKey: state.selectedLessonKey,
            tipo: formData.get('tipo'),
            titulo: formData.get('titulo'),
            descripcion: formData.get('descripcion'),
            url: formData.get('url'),
            thumbnail: formData.get('thumbnail')
        };

        if (!recurso.url) {
            toast('La URL del recurso es obligatoria', 'error');
            return;
        }

        try {
            store.addMediaResource(recurso);
            toast('Recurso agregado correctamente');
            elementos.form.reset();
            renderizarRecursos();
        } catch (error) {
            toast(error.message || 'Ocurrió un error al guardar el recurso', 'error');
        }
    }

    function obtenerIconoRecurso(tipo) {
        const iconos = {
            image: '<span class="w-10 h-10 rounded-xl bg-pink-100 text-pink-500 flex items-center justify-center text-xl"><i class="fas fa-image"></i></span>',
            audio: '<span class="w-10 h-10 rounded-xl bg-green-100 text-green-500 flex items-center justify-center text-xl"><i class="fas fa-music"></i></span>',
            video: '<span class="w-10 h-10 rounded-xl bg-blue-100 text-blue-500 flex items-center justify-center text-xl"><i class="fas fa-video"></i></span>',
            document: '<span class="w-10 h-10 rounded-xl bg-yellow-100 text-yellow-500 flex items-center justify-center text-xl"><i class="fas fa-file-alt"></i></span>'
        };
        return iconos[tipo] || iconos.document;
    }

    function formatearTipo(tipo) {
        const nombres = {
            image: 'Imagen',
            audio: 'Audio',
            video: 'Video',
            document: 'Documento'
        };
        return nombres[tipo] || 'Recurso';
    }

    function toast(message, type = 'success') {
        if (window.toastManager && typeof window.toastManager[type] === 'function') {
            window.toastManager[type](message);
        } else if (window.toastManager) {
            window.toastManager.success(message);
        } else {
            alert(message);
        }
    }

    function obtenerLeccionPreseleccionada() {
        const params = new URLSearchParams(window.location.search);
        return params.get('lessonKey');
    }

    document.addEventListener('DOMContentLoaded', init);
})();

