/* ============================================
   SPEAKLEXI - LECCIONES INTERACTIVAS
   Archivo: assets/js/pages/estudiante/lecciones.js
   Usa: APP_CONFIG, ModuleLoader, Utils, toastManager
   ============================================ */

(async () => {
    'use strict';

    const dependencias = ['APP_CONFIG', 'toastManager', 'ModuleLoader', 'Utils'];
    const progressStore = window.StudentProgress || null;

    if (!progressStore) {
        console.warn('[SpeakLexi] StudentProgress store no encontrado. La sesión actual no persistirá progreso.');
    }

    const inicializado = await window.ModuleLoader.initModule({
        moduleName: 'Lecciones Interactivas',
        dependencies: dependencias,
        onReady: inicializarModulo,
        onError: (error) => {
            console.error('💥 Error al cargar lecciones:', error);
            mostrarErrorInicial('No fue posible cargar las lecciones. Intenta recargar la página.');
        }
    });

    if (!inicializado) return;

    function mostrarErrorInicial(mensaje) {
        const descripcion = document.getElementById('lesson-description');
        if (descripcion) {
            descripcion.innerHTML = `<div class="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-200">${mensaje}</div>`;
        }
    }

    function inicializarModulo() {
        const baseLessonsData = window.LESSONS_DATA || {};
        const lessonsData = window.CustomLessonsStore
            ? window.CustomLessonsStore.mergeWithBase(baseLessonsData)
            : baseLessonsData;
        if (!lessonsData || Object.keys(lessonsData).length === 0) {
            mostrarErrorInicial('No se encontró el banco de preguntas. Verifica la carga del archivo lecciones-data.js');
            return;
        }

        const elements = {
            idiomaSelect: document.getElementById('idioma-select'),
            nivelSelect: document.getElementById('nivel-select'),
            startBtn: document.getElementById('start-lesson-btn'),
            resetBtn: document.getElementById('reset-selection-btn'),
            lessonDescription: document.getElementById('lesson-description'),
            lessonContainer: document.getElementById('lesson-container'),
            questionWrapper: document.getElementById('question-wrapper'),
            resultsContainer: document.getElementById('results-container'),
            questionIndex: document.getElementById('question-index'),
            selectedLessonTitle: document.getElementById('selected-lesson-title'),
            historyContainer: document.getElementById('history-container'),
            historyEmpty: document.getElementById('history-empty')
        };

        const STORAGE_KEY = 'speaklexi_lessons_history';
        const LANGUAGE_LABELS = {
            ingles: { label: 'Inglés', flag: '🇬🇧' },
            frances: { label: 'Francés', flag: '🇫🇷' },
            aleman: { label: 'Alemán', flag: '🇩🇪' },
            italiano: { label: 'Italiano', flag: '🇮🇹' }
        };
        const LEVEL_LABELS = {
            A1: 'Principiante',
            A2: 'Elemental',
            B1: 'Intermedio',
            B2: 'Intermedio alto',
            C1: 'Avanzado',
            C2: 'Maestría'
        };

        const estado = {
            idioma: null,
            nivel: null,
            leccion: null,
            preguntas: [],
            indicePregunta: 0,
            respuestas: [],
            aciertos: 0,
            inicio: null
        };

        function obtenerEtiquetaIdioma(key) {
            const info = LANGUAGE_LABELS[key];
            return info ? `${info.flag} ${info.label}` : window.Utils.capitalize(key);
        }

        function obtenerDescripcionNivel(level) {
            return LEVEL_LABELS[level] || level;
        }

        function poblarIdiomas() {
            if (!elements.idiomaSelect) return;
            elements.idiomaSelect.innerHTML = '';
            Object.keys(lessonsData).forEach((key) => {
                if (!lessonsData[key]) return;
                const option = document.createElement('option');
                option.value = key;
                option.textContent = obtenerEtiquetaIdioma(key);
                elements.idiomaSelect.appendChild(option);
            });
        }

        function poblarNiveles(idioma) {
            if (!elements.nivelSelect) return;
            elements.nivelSelect.innerHTML = '';
            const niveles = lessonsData[idioma] ? Object.keys(lessonsData[idioma]) : [];
            niveles.sort((a, b) => {
                const orden = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
                return orden.indexOf(a) - orden.indexOf(b);
            });
            niveles.forEach((nivel) => {
                const option = document.createElement('option');
                option.value = nivel;
                option.textContent = `${nivel} · ${obtenerDescripcionNivel(nivel)}`;
                elements.nivelSelect.appendChild(option);
            });
        }

        function actualizarDescripcion(idioma, nivel) {
            if (!elements.lessonDescription) return;
            const leccion = lessonsData[idioma]?.[nivel];
            if (!leccion) {
                elements.lessonDescription.innerHTML = '<p class="text-sm text-red-600 dark:text-red-300">Selecciona un idioma y nivel válidos para ver la descripción.</p>';
                return;
            }

            let descripcionHTML = `
                <div class="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-xl">
                    <p class="text-sm font-semibold text-primary-700 dark:text-primary-300">${obtenerEtiquetaIdioma(idioma)} · ${nivel}</p>
                    <p class="mt-2 text-sm text-gray-700 dark:text-gray-200">${leccion.description}</p>
                    <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">Esta lección contiene 10 preguntas de opción múltiple. Recibirás retroalimentación inmediata y tus resultados se guardarán en el historial.</p>
                </div>
            `;

            if (window.CustomLessonsStore) {
                const lessonKey = window.CustomLessonsStore.getLessonKey(idioma, nivel);
                const recursos = window.CustomLessonsStore.getMediaResources(lessonKey);
                if (recursos.length) {
                    descripcionHTML += generarSeccionMultimedia(recursos);
                }
            }

            elements.lessonDescription.innerHTML = descripcionHTML;
        }

        function limpiarResultados() {
            estado.leccion = null;
            estado.preguntas = [];
            estado.indicePregunta = 0;
            estado.respuestas = [];
            estado.aciertos = 0;
            estado.inicio = null;
            if (elements.lessonContainer) elements.lessonContainer.classList.add('hidden');
            if (elements.resultsContainer) elements.resultsContainer.classList.add('hidden');
            if (elements.questionWrapper) elements.questionWrapper.innerHTML = '';
            if (elements.questionIndex) elements.questionIndex.textContent = '1';
            if (elements.selectedLessonTitle) elements.selectedLessonTitle.textContent = '';
        }

        function manejarInicioLeccion() {
            const idiomaSeleccionado = elements.idiomaSelect?.value;
            const nivelSeleccionado = elements.nivelSelect?.value;

            if (!idiomaSeleccionado || !lessonsData[idiomaSeleccionado]) {
                window.toastManager.warning('Selecciona un idioma válido para iniciar.');
                return;
            }

            if (!nivelSeleccionado || !lessonsData[idiomaSeleccionado][nivelSeleccionado]) {
                window.toastManager.warning('Selecciona un nivel disponible para ese idioma.');
                return;
            }

            const leccion = lessonsData[idiomaSeleccionado][nivelSeleccionado];
            estado.idioma = idiomaSeleccionado;
            estado.nivel = nivelSeleccionado;
            estado.leccion = leccion;
            estado.preguntas = Array.isArray(leccion.questions) ? [...leccion.questions] : [];
            estado.indicePregunta = 0;
            estado.respuestas = [];
            estado.aciertos = 0;
            estado.inicio = Date.now();

            if (estado.preguntas.length !== 10) {
                console.warn(`⚠️ La lección ${idiomaSeleccionado.toUpperCase()} ${nivelSeleccionado} no contiene 10 preguntas (actual: ${estado.preguntas.length}).`);
            }

            if (elements.lessonContainer) elements.lessonContainer.classList.remove('hidden');
            if (elements.resultsContainer) elements.resultsContainer.classList.add('hidden');
            if (elements.selectedLessonTitle) {
                elements.selectedLessonTitle.textContent = `${obtenerEtiquetaIdioma(estado.idioma)} · ${estado.nivel} (${obtenerDescripcionNivel(estado.nivel)})`;
            }

            progressStore?.changeCourse(estado.idioma, estado.nivel);
            window.toastManager.success('¡Lección iniciada!');
            renderizarPregunta();
            window.Utils.scrollTo('#lesson-container', 120);
        }

        function renderizarMedia(media) {
            if (!media) return '';
            if (media.type === 'audio' && media.src) {
                return `
                    <div class="mt-4 bg-gray-100 dark:bg-gray-700/60 rounded-xl p-4">
                        <p class="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2"><i class="fas fa-headphones mr-2"></i>${media.label || 'Escucha y responde'}</p>
                        <audio controls class="w-full">
                            <source src="${media.src}" type="audio/mpeg">
                            Tu navegador no soporta la reproducción de audio.
                        </audio>
                    </div>
                `;
            }
            if (media.type === 'image' && media.src) {
                return `
                    <div class="mt-4">
                        <img src="${media.src}" alt="Referencia de la pregunta" class="rounded-xl border border-gray-200 dark:border-gray-700 w-full object-cover max-h-56">
                        ${media.label ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-2">${media.label}</p>` : ''}
                    </div>
                `;
            }
            return '';
        }

        function renderizarPregunta() {
            if (!elements.questionWrapper || !estado.leccion) return;

            const total = estado.preguntas.length;
            const indice = estado.indicePregunta;
            const pregunta = estado.preguntas[indice];

            if (!pregunta) {
                mostrarResultados();
                return;
            }

            if (elements.questionIndex) {
                elements.questionIndex.textContent = `${indice + 1}`;
            }

            const progreso = Math.round(((indice + 1) / total) * 100);

            const opcionesHTML = (pregunta.options || []).map((opcion, idx) => `
                <button
                    class="opcion-respuesta w-full text-left rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-4 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all"
                    data-index="${idx}"
                >
                    <span class="font-medium text-gray-900 dark:text-white">${opcion}</span>
                </button>
            `).join('');

            elements.questionWrapper.innerHTML = `
                <div class="space-y-5">
                    <div>
                        <div class="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                            <span>Pregunta ${indice + 1} de ${total}</span>
                            <span>${progreso}% completado</span>
                        </div>
                        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div class="h-2 bg-gradient-to-r from-secondary-500 to-primary-500 rounded-full transition-all" style="width: ${progreso}%"></div>
                        </div>
                    </div>

                    <div>
                        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">${pregunta.prompt}</h2>
                        ${renderizarMedia(pregunta.media)}
                    </div>

                    <div class="space-y-3" id="options-container">
                        ${opcionesHTML}
                    </div>

                    <div id="feedback" class="hidden p-4 rounded-xl border-2"></div>

                    <div class="flex justify-end">
                        <button id="next-question-btn" class="hidden px-5 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors">
                            Siguiente pregunta
                        </button>
                    </div>
                </div>
            `;

            elements.questionWrapper.querySelectorAll('.opcion-respuesta').forEach((btn) => {
                btn.addEventListener('click', (event) => manejarRespuesta(event, pregunta));
            });
        }

        function generarSeccionMultimedia(recursos) {
            return `
                <div class="mt-4">
                    <p class="text-sm font-semibold text-primary-700 dark:text-primary-200 mb-2 flex items-center gap-2">
                        <i class="fas fa-photo-video"></i>
                        Recursos multimedia recomendados
                    </p>
                    <div class="grid gap-2">
                        ${recursos.map((recurso) => `
                            <a href="${recurso.url}" target="_blank" rel="noopener" class="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300 dark:hover:border-primary-500 transition-colors">
                                <span class="text-lg">
                                    ${obtenerIconoMultimedia(recurso.tipo)}
                                </span>
                                <div>
                                    <p class="font-semibold text-gray-900 dark:text-white">${sanitizarTexto(recurso.titulo)}</p>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">${sanitizarTexto(recurso.descripcion || 'Recurso adicional para tu práctica')}</p>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        function obtenerIconoMultimedia(tipo) {
            switch (tipo) {
                case 'audio': return '🎧';
                case 'video': return '🎬';
                case 'image': return '🖼️';
                case 'document': return '📄';
                default: return '📎';
            }
        }

        function sanitizarTexto(texto = '') {
            if (window.Utils?.escapeHtml) {
                return window.Utils.escapeHtml(texto);
            }
            const div = document.createElement('div');
            div.textContent = texto;
            return div.innerHTML;
        }

        function manejarRespuesta(evento, pregunta) {
            const boton = evento.currentTarget;
            if (!boton || boton.classList.contains('pointer-events-none')) return;

            const seleccion = parseInt(boton.dataset.index, 10);
            const correcta = pregunta.answer;
            const esCorrecta = seleccion === correcta;

            estado.respuestas.push({ seleccion, correcta, pregunta });
            if (esCorrecta) estado.aciertos += 1;

            const feedback = elements.questionWrapper?.querySelector('#feedback');
            const botones = elements.questionWrapper?.querySelectorAll('.opcion-respuesta');

            botones?.forEach((btn, idx) => {
                btn.classList.add('pointer-events-none');
                btn.classList.remove('hover:border-primary-400', 'hover:bg-primary-50', 'dark:hover:bg-primary-900/30');

                if (idx === correcta) {
                    btn.classList.add('border-green-500', 'bg-green-50', 'dark:bg-green-900/30');
                    btn.querySelector('span')?.classList.add('text-green-700', 'dark:text-green-300');
                }

                if (idx === seleccion && !esCorrecta) {
                    btn.classList.add('border-red-500', 'bg-red-50', 'dark:bg-red-900/30');
                    btn.querySelector('span')?.classList.add('text-red-700', 'dark:text-red-300');
                }
            });

            if (feedback) {
                feedback.classList.remove('hidden');
                feedback.classList.add(esCorrecta ? 'border-green-300' : 'border-red-300', esCorrecta ? 'bg-green-50' : 'bg-red-50', esCorrecta ? 'dark:bg-green-900/30' : 'dark:bg-red-900/30');
                feedback.innerHTML = `
                    <div class="flex items-start gap-3">
                        <i class="${esCorrecta ? 'fas fa-check-circle text-green-500 dark:text-green-300' : 'fas fa-times-circle text-red-500 dark:text-red-300'} text-xl"></i>
                        <div>
                            <p class="font-semibold ${esCorrecta ? 'text-green-700 dark:text-green-200' : 'text-red-700 dark:text-red-200'}">${esCorrecta ? '¡Respuesta correcta!' : 'Respuesta incorrecta'}</p>
                            <p class="text-sm text-gray-700 dark:text-gray-200 mt-1">${pregunta.explanation || 'Revisa la opción destacada en verde.'}</p>
                        </div>
                    </div>
                `;
            }

            const botonSiguiente = elements.questionWrapper?.querySelector('#next-question-btn');
            if (botonSiguiente) {
                botonSiguiente.textContent = estado.indicePregunta < estado.preguntas.length - 1 ? 'Siguiente pregunta' : 'Ver resultados';
                botonSiguiente.classList.remove('hidden');
                botonSiguiente.addEventListener('click', avanzarPregunta, { once: true });
            }
        }

        function avanzarPregunta() {
            estado.indicePregunta += 1;
            if (estado.indicePregunta >= estado.preguntas.length) {
                mostrarResultados();
            } else {
                renderizarPregunta();
            }
        }

        function mostrarResultados() {
            if (!elements.resultsContainer || !estado.leccion) return;

            const total = estado.preguntas.length || 10;
            const porcentaje = Math.round((estado.aciertos / total) * 100);
            const duracion = estado.inicio ? Math.round((Date.now() - estado.inicio) / 1000) : 0;

            const progresoLeccion = progressStore?.recordLesson({
                idioma: estado.idioma,
                nivel: estado.nivel,
                aciertos: estado.aciertos,
                total
            }) || null;

            const xpGanado = progresoLeccion?.xpGanado ?? Math.max(10, estado.aciertos * 15);
            const corazonesPerdidos = progresoLeccion?.corazonesPerdidos ?? Math.max(0, total - estado.aciertos);
            const corazonesRestantes = progresoLeccion?.corazonesRestantes ?? Math.max(0, (progressStore?.MAX_HEARTS || 50) - corazonesPerdidos);

            guardarEnHistorial({
                idioma: estado.idioma,
                nivel: estado.nivel,
                aciertos: estado.aciertos,
                total,
                porcentaje,
                duracion,
                xp: xpGanado,
                corazones: {
                    perdidos: corazonesPerdidos,
                    restantes: corazonesRestantes
                }
            });

            elements.lessonContainer?.classList.add('hidden');
            elements.resultsContainer.classList.remove('hidden');
            window.toastManager.success(`Lección completada · +${xpGanado} XP`);

            const mensajeMotivador = porcentaje === 100
                ? '¡Perfecto! Dominaste esta lección.'
                : porcentaje >= 80
                    ? '¡Excelente trabajo! Sigue practicando para alcanzar la perfección.'
                    : porcentaje >= 60
                        ? 'Buen progreso. Repasa las preguntas para consolidar el conocimiento.'
                        : 'Te recomendamos repetir la lección para mejorar tu puntuación.';

            const idiomaEtiqueta = obtenerEtiquetaIdioma(estado.idioma);

            const heartsMax = progressStore?.MAX_HEARTS || 50;
            const logrosNuevos = progresoLeccion?.logrosDesbloqueados?.length
                ? `<div class="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800">
                        <p class="text-sm font-semibold text-yellow-700 dark:text-yellow-200 mb-2">¡Nuevos logros desbloqueados!</p>
                        <ul class="text-sm text-yellow-800 dark:text-yellow-100 space-y-1">
                            ${progresoLeccion.logrosDesbloqueados.map((logro) => `<li>🏅 ${logro.titulo}</li>`).join('')}
                        </ul>
                    </div>`
                : '';

            elements.resultsContainer.innerHTML = `
                <div class="space-y-6 animate-fade-in">
                    <div class="flex flex-wrap justify-between items-center gap-4">
                        <div>
                            <p class="text-sm text-gray-500 dark:text-gray-400">Resultado de la lección</p>
                            <h2 class="text-3xl font-bold text-gray-900 dark:text-white">${idiomaEtiqueta} · ${estado.nivel}</h2>
                        </div>
                        <div class="text-right">
                            <span class="inline-flex items-center justify-center px-4 py-2 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 font-semibold text-lg">${estado.aciertos}/${total} aciertos</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <p class="text-sm text-gray-500 dark:text-gray-400">Precisión</p>
                            <p class="text-2xl font-bold text-primary-600 dark:text-primary-400">${porcentaje}%</p>
                        </div>
                        <div class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <p class="text-sm text-gray-500 dark:text-gray-400">Tiempo invertido</p>
                            <p class="text-2xl font-bold text-secondary-600 dark:text-secondary-400">${duracion} s</p>
                        </div>
                        <div class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <p class="text-sm text-gray-500 dark:text-gray-400">Nivel practicado</p>
                            <p class="text-2xl font-bold text-green-600 dark:text-green-400">${estado.nivel}</p>
                        </div>
                        <div class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <p class="text-sm text-gray-500 dark:text-gray-400">Experiencia ganada</p>
                            <p class="text-2xl font-bold text-purple-600 dark:text-purple-300">+${xpGanado} XP</p>
                        </div>
                        <div class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <p class="text-sm text-gray-500 dark:text-gray-400">Corazones perdidos</p>
                            <p class="text-2xl font-bold text-rose-600 dark:text-rose-400">-${corazonesPerdidos} ❤️</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Te quedan ${corazonesRestantes}/${heartsMax}</p>
                        </div>
                    </div>

                    <div class="p-5 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700">
                        <p class="text-sm text-primary-700 dark:text-primary-300">${mensajeMotivador} Ganaste <strong>${xpGanado} XP</strong> en esta sesión.</p>
                    </div>

                    ${logrosNuevos}

                    <div class="flex flex-wrap gap-3">
                        <button id="retry-lesson-btn" class="px-5 py-3 rounded-xl bg-secondary-600 text-white font-semibold hover:bg-secondary-700 transition-colors">
                            <i class="fas fa-redo mr-2"></i>Repetir esta lección
                        </button>
                        <button id="new-lesson-btn" class="px-5 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                            <i class="fas fa-random mr-2"></i>Elegir otra combinación
                        </button>
                        <a href="/pages/estudiante/leaderboard.html" class="inline-flex items-center px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:from-amber-600 hover:to-orange-600 transition-all">
                            <i class="fas fa-trophy mr-2"></i>Ver tabla de clasificación
                        </a>
                    </div>
                </div>
            `;

            elements.resultsContainer.querySelector('#retry-lesson-btn')?.addEventListener('click', () => {
                window.toastManager.info('Vamos a repetir la misma lección.');
                manejarInicioLeccion();
            });
            elements.resultsContainer.querySelector('#new-lesson-btn')?.addEventListener('click', () => {
                window.toastManager.info('Selecciona un nuevo idioma o nivel para continuar.');
                limpiarResultados();
                window.Utils.scrollTo('body');
            });

            renderizarHistorial();
        }

        function guardarEnHistorial(registro) {
            try {
                const historial = window.Utils.getFromStorage(STORAGE_KEY, []) || [];
                historial.unshift({
                    id: window.Utils.generateId(),
                    fecha: new Date().toISOString(),
                    ...registro
                });
                const limitado = historial.slice(0, 6);
                window.Utils.saveToStorage(STORAGE_KEY, limitado);
            } catch (error) {
                console.error('Error guardando el historial de lecciones:', error);
            }
        }

        function renderizarHistorial() {
            if (!elements.historyContainer || !elements.historyEmpty) return;
            const historial = window.Utils.getFromStorage(STORAGE_KEY, []) || [];

            if (!historial.length) {
                elements.historyContainer.innerHTML = '';
                elements.historyEmpty.classList.remove('hidden');
                return;
            }

            elements.historyEmpty.classList.add('hidden');
            elements.historyContainer.innerHTML = historial.map((item) => {
                const idiomaLabel = obtenerEtiquetaIdioma(item.idioma);
                const fecha = window.Utils.formatDate(item.fecha, 'full');
                const xpRegistro = item.xp || item.xp_ganado || 0;
                const corazones = item.corazones?.perdidos ?? 0;
                return `
                    <div class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                        <div class="flex items-center justify-between text-sm">
                            <span class="font-semibold text-gray-900 dark:text-white">${idiomaLabel} · ${item.nivel}</span>
                            <span class="text-gray-500 dark:text-gray-400">${fecha}</span>
                        </div>
                        <div class="mt-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                            <span>${item.aciertos}/${item.total} aciertos</span>
                            <span>${item.porcentaje}% · +${xpRegistro} XP</span>
                        </div>
                        <div class="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                            <span>${item.duracion || 0}s</span>
                            <span>${corazones} ❤️ perdidos</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function restablecerSeleccion() {
            limpiarResultados();
            const idiomaPreferido = obtenerIdiomaPreferido();
            seleccionarIdioma(idiomaPreferido);
            actualizarDescripcion(idiomaPreferido, elements.nivelSelect?.value);
            window.toastManager.info('Selección restablecida a tu idioma preferido.');
        }

        function seleccionarIdioma(idioma) {
            if (!elements.idiomaSelect) return;
            const existe = Array.from(elements.idiomaSelect.options).some((opt) => opt.value === idioma);
            elements.idiomaSelect.value = existe ? idioma : elements.idiomaSelect.options[0]?.value;
            poblarNiveles(elements.idiomaSelect.value);
        }

        function obtenerIdiomaPreferido() {
            const preferenciaProgreso = progressStore?.getSnapshot()?.idiomaKey;
            if (preferenciaProgreso) return preferenciaProgreso;

            const storageKeys = window.APP_CONFIG?.STORAGE?.KEYS || {};
            const almacenado = window.Utils.getFromStorage(storageKeys.IDIOMA) || window.Utils.getFromStorage(storageKeys.CURSO_ACTUAL);
            if (!almacenado) return 'ingles';
            const normalizado = almacenado.toString().trim().toLowerCase();
            if (normalizado.includes('fr')) return 'frances';
            if (normalizado.includes('de')) return 'aleman';
            if (normalizado.includes('it')) return 'italiano';
            return 'ingles';
        }

        function aplicarParametrosURL() {
            const params = new URLSearchParams(window.location.search);
            const idiomaParam = params.get('idioma');
            const nivelParam = params.get('nivel');
            const filtro = params.get('filtro');

            if (idiomaParam && lessonsData[idiomaParam]) {
                seleccionarIdioma(idiomaParam);
            }

            if (nivelParam && lessonsData[elements.idiomaSelect.value]?.[nivelParam]) {
                elements.nivelSelect.value = nivelParam;
            } else if (filtro === 'principiante') {
                elements.nivelSelect.value = 'A1';
            }

            actualizarDescripcion(elements.idiomaSelect.value, elements.nivelSelect.value);

            if (params.get('autoStart') === 'true') {
                manejarInicioLeccion();
            }
        }

        // Inicialización
        poblarIdiomas();
        seleccionarIdioma(obtenerIdiomaPreferido());
        actualizarDescripcion(elements.idiomaSelect.value, elements.nivelSelect.value);
        renderizarHistorial();
        aplicarParametrosURL();

        // Eventos
        elements.idiomaSelect?.addEventListener('change', () => {
            poblarNiveles(elements.idiomaSelect.value);
            actualizarDescripcion(elements.idiomaSelect.value, elements.nivelSelect.value);
        });
        elements.nivelSelect?.addEventListener('change', () => {
            actualizarDescripcion(elements.idiomaSelect.value, elements.nivelSelect.value);
        });
        elements.startBtn?.addEventListener('click', manejarInicioLeccion);
        elements.resetBtn?.addEventListener('click', restablecerSeleccion);
    }
})();
