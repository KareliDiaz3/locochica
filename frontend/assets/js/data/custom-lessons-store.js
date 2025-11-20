/* ============================================
   SPEAKLEXI - CUSTOM LESSONS & MEDIA STORE
   Archivo: assets/js/data/custom-lessons-store.js
   Gestiona lecciones creadas por admin y recursos multimedia locales
   ============================================ */

(function registerCustomLessonsStore() {
    'use strict';

    if (typeof window === 'undefined') return;

    const STORAGE_KEY = 'speaklexi_custom_lessons_v1';
    const MEDIA_KEY = 'speaklexi_lessons_media_v1';
    const DIALECT_MAP = {
        ingles: 'Inglés',
        inglés: 'Inglés',
        english: 'Inglés',
        frances: 'Francés',
        francés: 'Francés',
        french: 'Francés',
        aleman: 'Alemán',
        alemán: 'Alemán',
        german: 'Alemán',
        italiano: 'Italiano',
        italian: 'Italiano',
        portugues: 'Portugués',
        portugués: 'Portugués',
        portuguese: 'Portugués'
    };
    const DEFAULT_OPTIONS = ['Opción A', 'Opción B', 'Opción C', 'Opción D'];
    const MAX_MEDIA = 24;

    function safeParse(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            console.warn(`[CustomLessonsStore] Error parsing ${key}:`, error);
            return fallback;
        }
    }

    function safeSave(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn(`[CustomLessonsStore] Error saving ${key}:`, error);
        }
    }

    function normalizeIdioma(idioma = 'Inglés') {
        const lower = idioma.toString().trim().toLowerCase();
        const normalizedKey = Object.keys(DIALECT_MAP).find(key => key === lower);
        const key = (normalizedKey || 'ingles').replace('é', 'e').replace('á', 'a');
        const label = DIALECT_MAP[normalizedKey || 'ingles'] || 'Inglés';
        return { key, label };
    }

    function ensureArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    const state = {
        lessons: ensureArray(safeParse(STORAGE_KEY, [])),
        media: ensureArray(safeParse(MEDIA_KEY, []))
    };

    function saveLessons() {
        safeSave(STORAGE_KEY, state.lessons);
    }

    function saveMedia() {
        safeSave(MEDIA_KEY, state.media);
    }

    function buildLessonId() {
        return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    }

    function buildMediaId() {
        return `media-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    }

    function buildLessonKey({ idiomaKey, nivel, id, origen }) {
        if (origen === 'custom' && id) {
            return `custom:${id}`;
        }
        return `base:${idiomaKey}:${nivel}`;
    }

    function guessIdiomaKeyFromLabel(label = '') {
        const { key } = normalizeIdioma(label);
        return key;
    }

    function formatActivity(activity = {}) {
        const options = ensureArray(activity.options).length ? activity.options : DEFAULT_OPTIONS;
        const answer = Number.isInteger(activity.answer) ? activity.answer : 0;
        const media = activity.mediaType && activity.mediaUrl
            ? {
                type: activity.mediaType,
                label: activity.mediaLabel || 'Recurso de apoyo',
                src: activity.mediaUrl
            }
            : undefined;

        return {
            prompt: activity.prompt || 'Pregunta sin definir',
            options,
            answer: Math.max(0, Math.min(options.length - 1, answer)),
            explanation: activity.explanation || 'Revisa la opción correcta e intenta nuevamente.',
            media
        };
    }

    function toLessonsDataEntry(lesson) {
        return {
            title: lesson.titulo,
            description: lesson.descripcion || 'Lección personalizada creada por el administrador.',
            questions: lesson.actividades.map(formatActivity)
        };
    }

    function listBaseLessons(baseLessons = {}) {
        const opciones = [];
        Object.entries(baseLessons).forEach(([idiomaKey, niveles]) => {
            Object.entries(niveles || {}).forEach(([nivel, data]) => {
                opciones.push({
                    key: buildLessonKey({ idiomaKey, nivel }),
                    idiomaKey,
                    idiomaLabel: DIALECT_MAP[idiomaKey] || idiomaKey,
                    nivel,
                    titulo: data?.title || `${(DIALECT_MAP[idiomaKey] || idiomaKey)} ${nivel}`,
                    esCustom: false
                });
            });
        });
        return opciones;
    }

    function listCustomLessons() {
        return state.lessons.map((lesson) => ({
            key: buildLessonKey({ idiomaKey: lesson.idiomaKey, nivel: lesson.nivel, id: lesson.id, origen: 'custom' }),
            idiomaKey: lesson.idiomaKey,
            idiomaLabel: lesson.idiomaLabel,
            nivel: lesson.nivel,
            titulo: lesson.titulo,
            esCustom: true,
            id: lesson.id
        }));
    }

    function resolveLessonKey(lesson) {
        if (!lesson) return null;
        if (lesson.esCustom || lesson.origen === 'custom' || (lesson.id && String(lesson.id).startsWith('custom-'))) {
            return buildLessonKey({ idiomaKey: lesson.idiomaKey, nivel: lesson.nivel, id: lesson.id, origen: 'custom' });
        }
        return buildLessonKey({ idiomaKey: lesson.idiomaKey, nivel: lesson.nivel });
    }

    function convertIdiomaKey(keyOrLabel, nivel) {
        if (!keyOrLabel) return { key: 'ingles', label: 'Inglés', nivel: nivel || 'A1' };
        const { key, label } = normalizeIdioma(keyOrLabel);
        return { key, label, nivel: nivel || 'A1' };
    }

    const CustomLessonsStore = {
        getLessons() {
            return clone(state.lessons);
        },

        getLesson(id) {
            return clone(state.lessons.find((lesson) => lesson.id === id));
        },

        getSummary() {
            return clone(state.lessons).map((lesson) => ({
                id: lesson.id,
                titulo: lesson.titulo,
                descripcion: lesson.descripcion,
                nivel: lesson.nivel,
                idioma: lesson.idiomaLabel,
                idiomaKey: lesson.idiomaKey,
                estado: lesson.estado || 'activa',
                duracion_minutos: lesson.duracion_minutos || 30,
                orden: lesson.orden || 0,
                creado_en: lesson.creado_en,
                creado_por: lesson.creado_por || 'Administrador',
                esCustom: true,
                total_preguntas: lesson.actividades.length,
                lessonKey: buildLessonKey({ idiomaKey: lesson.idiomaKey, nivel: lesson.nivel, id: lesson.id, origen: 'custom' })
            }));
        },

        addLesson(data) {
            const idiomaInfo = normalizeIdioma(data.idioma || data.idiomaLabel || data.idiomaKey);
            const actividades = ensureArray(data.actividades).map(formatActivity);
            const nuevo = {
                id: buildLessonId(),
                titulo: data.titulo || 'Lección personalizada',
                descripcion: data.descripcion || 'Lección creada por el equipo de contenido.',
                nivel: data.nivel || 'A1',
                idiomaKey: idiomaInfo.key,
                idiomaLabel: idiomaInfo.label,
                duracion_minutos: parseInt(data.duracion_minutos, 10) || 30,
                orden: parseInt(data.orden, 10) || 0,
                estado: data.estado || 'activa',
                contenido: data.contenido || '',
                actividades,
                creado_en: new Date().toISOString(),
                creado_por: data.creado_por || 'Administrador'
            };

            state.lessons.push(nuevo);
            saveLessons();
            return clone(nuevo);
        },

        updateLesson(id, updates = {}) {
            const index = state.lessons.findIndex((lesson) => lesson.id === id);
            if (index === -1) return null;

            const lesson = state.lessons[index];
            if (updates.idioma || updates.idiomaKey || updates.idiomaLabel) {
                const idiomaInfo = normalizeIdioma(updates.idioma || updates.idiomaLabel || updates.idiomaKey);
                lesson.idiomaKey = idiomaInfo.key;
                lesson.idiomaLabel = idiomaInfo.label;
            }
            if (updates.nivel) lesson.nivel = updates.nivel;
            if (updates.titulo) lesson.titulo = updates.titulo;
            if (updates.descripcion !== undefined) lesson.descripcion = updates.descripcion;
            if (updates.estado) lesson.estado = updates.estado;
            if (updates.duracion_minutos !== undefined) {
                lesson.duracion_minutos = parseInt(updates.duracion_minutos, 10) || lesson.duracion_minutos;
            }
            if (updates.orden !== undefined) {
                lesson.orden = parseInt(updates.orden, 10) || lesson.orden;
            }
            if (updates.contenido !== undefined) lesson.contenido = updates.contenido;
            if (Array.isArray(updates.actividades)) {
                lesson.actividades = updates.actividades.map(formatActivity);
            }

            state.lessons[index] = lesson;
            saveLessons();
            return clone(lesson);
        },

        deleteLesson(id) {
            const initialLength = state.lessons.length;
            state.lessons = state.lessons.filter((lesson) => lesson.id !== id);
            if (state.lessons.length !== initialLength) {
                saveLessons();
            }
        },

        mergeWithBase(baseLessons = {}) {
            const merged = clone(baseLessons);
            state.lessons.forEach((lesson) => {
                const idiomaKey = lesson.idiomaKey || 'ingles';
                if (!merged[idiomaKey]) {
                    merged[idiomaKey] = {};
                }
                merged[idiomaKey][lesson.nivel] = toLessonsDataEntry(lesson);
            });
            return merged;
        },

        listLessonOptions(baseLessons = window.LESSONS_DATA || {}) {
            const baseOptions = listBaseLessons(baseLessons);
            const customOptions = listCustomLessons();
            return [
                ...customOptions.sort((a, b) => b.titulo.localeCompare(a.titulo)),
                ...baseOptions.sort((a, b) => a.titulo.localeCompare(b.titulo))
            ];
        },

        getLessonKey(idiomaOrLessonKey, nivel) {
            if (idiomaOrLessonKey?.startsWith?.('base:') || idiomaOrLessonKey?.startsWith?.('custom:')) {
                return idiomaOrLessonKey;
            }
            if (!nivel && idiomaOrLessonKey && idiomaOrLessonKey.includes(':')) {
                return idiomaOrLessonKey;
            }
            const idiomaInfo = convertIdiomaKey(idiomaOrLessonKey, nivel);
            return buildLessonKey({ idiomaKey: idiomaInfo.key, nivel: idiomaInfo.nivel });
        },

        addMediaResource(resource) {
            if (!resource || !resource.lessonKey) return null;
            const existing = state.media.filter((item) => item.lessonKey === resource.lessonKey);
            if (existing.length >= MAX_MEDIA) {
                throw new Error('Se alcanzó el límite de recursos multimedia para esta lección');
            }

            const nuevo = {
                id: buildMediaId(),
                lessonKey: resource.lessonKey,
                tipo: resource.tipo || 'image',
                titulo: resource.titulo || 'Recurso sin título',
                descripcion: resource.descripcion || 'Recurso añadido para enriquecer la lección.',
                url: resource.url,
                thumbnail: resource.thumbnail || (resource.tipo === 'image' ? resource.url : null),
                createdAt: new Date().toISOString(),
                metadata: resource.metadata || {}
            };

            state.media.push(nuevo);
            saveMedia();
            return clone(nuevo);
        },

        getMediaResources(lessonKey) {
            if (!lessonKey) return [];
            return clone(state.media.filter((item) => item.lessonKey === lessonKey));
        },

        deleteMediaResource(mediaId) {
            const initialLength = state.media.length;
            state.media = state.media.filter((item) => item.id !== mediaId);
            if (state.media.length !== initialLength) {
                saveMedia();
            }
        },

        getMediaSummary() {
            return clone(state.media);
        }
    };

    window.CustomLessonsStore = CustomLessonsStore;
})();

