/* ============================================
   SPEAKLEXI - Dashboard Profesor (Módulo 4)
   ✅ VERSIÓN CORREGIDA - Mapeo correcto de campos
   ============================================ */

class ProfesorDashboard {
    constructor() {
        this.API_URL = window.APP_CONFIG?.API?.API_URL || 'http://localhost:5000/api';
        this.token = localStorage.getItem('token');
        this.profesorData = null;
        this.init();
    }

    async init() {
        try {
            console.log('✅ Dashboard Profesor iniciando...');
            
            await this.cargarDatosDashboard();
            this.renderizarDashboard();
            this.configurarEventListeners();
            
            console.log('✅ Dashboard Profesor listo');
        } catch (error) {
            console.error('💥 Error inicializando dashboard:', error);
            this.mostrarError('Error al cargar el dashboard');
        }
    }

    async cargarDatosDashboard() {
        try {
            console.log('📊 Cargando datos del dashboard...');
            
            const response = await fetch(`${this.API_URL}/profesor/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Error en la respuesta del servidor');
            }

            this.profesorData = result.data;
            console.log('✅ Datos del dashboard cargados:', this.profesorData);
            
            // 🔍 DEBUG: Ver estructura de datos
            if (this.profesorData.estudiantes_recientes && this.profesorData.estudiantes_recientes.length > 0) {
                console.log('📋 Estructura de estudiante:', this.profesorData.estudiantes_recientes[0]);
            }
            
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            this.profesorData = this.generarDashboardDemo();
        }
    }

    generarDashboardDemo() {
        const leaderboard = window.StudentProgress?.getLeaderboard?.('global')?.ranking || [];
        const estudiantes = (leaderboard.length ? leaderboard : this.obtenerEstudiantesDemo())
            .map((item, index) => ({
                id: item.id || index + 1,
                nombre: item.nombre_completo || item.nombre || `Estudiante ${index + 1}`,
                primer_apellido: item.primer_apellido || '',
                correo: item.correo || item.email || `estudiante${index + 1}@demo.com`,
                nivel_actual: item.nivel_xp || item.nivel || 'A1',
                total_xp: item.total_xp || Math.floor(Math.random() * 2500) + 500,
                lecciones_completadas: item.lecciones_completadas || Math.floor(Math.random() * 20) + 10,
                racha_actual: item.racha_dias || Math.floor(Math.random() * 10),
                promedio_progreso: item.porcentaje || Math.floor(Math.random() * 40) + 60,
                idioma: item.idioma || 'Inglés'
            }));

        const estadisticas = {
            total_estudiantes: estudiantes.length,
            promedio_clase: Math.round(estudiantes.reduce((acc, e) => acc + (e.promedio_progreso || 0), 0) / Math.max(1, estudiantes.length)),
            total_lecciones_completadas: estudiantes.reduce((acc, e) => acc + (e.lecciones_completadas || 0), 0),
            tiempo_total_horas: estudiantes.length * 12,
            estudiantes_activos: estudiantes.filter((e) => (e.racha_actual || 0) >= 3).length
        };

        return {
            profesor: {
                nombre: 'Ana',
                primer_apellido: 'Martínez',
                curso_nombre: 'Inglés General B1',
                nivel: 'B1',
                idioma: 'Inglés'
            },
            estadisticas,
            top_estudiantes: estudiantes.slice(0, 5),
            estudiantes_recientes: estudiantes,
            alertas: this.generarAlertasDemo(estudiantes)
        };
    }

    obtenerEstudiantesDemo() {
        return [
            { nombre_completo: 'Lucía Hernández', nivel: 'B2', total_xp: 4200, porcentaje: 88 },
            { nombre_completo: 'Mateo García', nivel: 'B1', total_xp: 3650, porcentaje: 82 },
            { nombre_completo: 'Camila Torres', nivel: 'C1', total_xp: 5100, porcentaje: 93 },
            { nombre_completo: 'Julián Pérez', nivel: 'A2', total_xp: 2100, porcentaje: 74 },
            { nombre_completo: 'Valentina Ruiz', nivel: 'C2', total_xp: 5900, porcentaje: 96 },
            { nombre_completo: 'Diego Martínez', nivel: 'B2', total_xp: 3300, porcentaje: 79 },
            { nombre_completo: 'Sara López', nivel: 'A1', total_xp: 1700, porcentaje: 68 }
        ];
    }

    generarAlertasDemo(estudiantes) {
        return estudiantes.slice(-3).map((estudiante, index) => ({
            id: estudiante.id || index + 1,
            titulo: 'Atención a la motivación',
            descripcion: `${estudiante.nombre} redujo su actividad esta semana.`,
            severidad: index === 0 ? 'critical' : 'warning',
            estudiante_nombre: estudiante.nombre
        }));
    }

    renderizarDashboard() {
        if (!this.profesorData) {
            this.mostrarError('No se pudieron cargar los datos');
            return;
        }

        const {
            profesor,
            estadisticas,
            top_estudiantes = [],
            estudiantes_recientes = [],
            alertas = [],
            // Compatibilidad con payloads camelCase (ej: topEstudiantes, estudiantes)
            topEstudiantes = [],
            estudiantes = []
        } = this.profesorData;

        // Header con información del profesor
        this.actualizarHeaderProfesor(profesor);

        // Estadísticas principales
        this.actualizarEstadisticasPrincipales(estadisticas);

        // Top 5 estudiantes: prioriza snake_case, luego camelCase y finalmente lista completa
        const candidatosTop = top_estudiantes.length ? top_estudiantes : topEstudiantes;
        const listaEstudiantes = estudiantes_recientes.length ? estudiantes_recientes : estudiantes;
        const topNormalizados = this.normalizarEstudiantes(candidatosTop.length ? candidatosTop : listaEstudiantes);
        const listaNormalizada = this.normalizarEstudiantes(listaEstudiantes);

        this.renderizarTopEstudiantes(topNormalizados);

        // Lista completa de estudiantes
        this.renderizarListaEstudiantes(listaNormalizada);

        // Alertas
        this.renderizarAlertas(alertas);

        // Mostrar contenido
        this.mostrarContenido();
    }

    actualizarHeaderProfesor(profesor) {
        const elementos = {
            nombreProfesor: document.getElementById('nombreProfesor'),
            cursoAsignado: document.getElementById('cursoAsignado'),
            nivelIdioma: document.getElementById('nivelIdioma')
        };

        if (elementos.nombreProfesor) {
            elementos.nombreProfesor.textContent = `${profesor.nombre} ${profesor.primer_apellido}`;
        }
        if (elementos.cursoAsignado) {
            elementos.cursoAsignado.textContent = profesor.curso_nombre || 'Sin curso asignado';
        }
        if (elementos.nivelIdioma) {
            elementos.nivelIdioma.textContent = `${profesor.nivel || 'N/A'} - ${profesor.idioma || 'N/A'}`;
        }
    }

    actualizarEstadisticasPrincipales(estadisticas) {
        const elementos = {
            totalEstudiantes: document.getElementById('totalEstudiantes'),
            promedioClase: document.getElementById('promedioClase'),
            leccionesCompletadas: document.getElementById('leccionesCompletadas'),
            tiempoTotalHoras: document.getElementById('tiempoTotalHoras')
        };

        if (elementos.totalEstudiantes) {
            elementos.totalEstudiantes.textContent = estadisticas.total_estudiantes || 0;
        }

        if (elementos.promedioClase) {
            const promedio = Math.round(estadisticas.promedio_clase || 0);
            elementos.promedioClase.textContent = `${promedio}%`;
        }

        if (elementos.leccionesCompletadas) {
            elementos.leccionesCompletadas.textContent = 
                (estadisticas.total_lecciones_completadas || 0).toLocaleString();
        }

        if (elementos.tiempoTotalHoras) {
            const horas = Math.round(estadisticas.tiempo_total_horas || 0);
            elementos.tiempoTotalHoras.textContent = `${horas}h`;
        }
    }

    normalizarEstudiantes(estudiantes = []) {
        return (estudiantes || []).map((est, index) => {
            const nombreCompleto = est.nombre_completo || est.estudiante_nombre || `${est.nombre || ''} ${est.primer_apellido || ''}`.trim();
            const [nombre, ...restoApellidos] = nombreCompleto.trim().split(' ');
            const primer_apellido = est.primer_apellido || restoApellidos.join(' ');

            return {
                id: est.id || est.usuario_id || est.estudiante_id || index + 1,
                nombre: est.nombre || nombre || '',
                primer_apellido: primer_apellido || '',
                nombre_completo: nombreCompleto || `${nombre || ''} ${primer_apellido || ''}`.trim(),
                correo: est.correo || est.email || '',
                nivel_actual: est.nivel_actual || est.nivel || est.nivel_xp || 'A1',
                idioma_aprendizaje: est.idioma_aprendizaje || est.idioma || 'Inglés',
                total_xp: est.total_xp || 0,
                lecciones_completadas: est.lecciones_completadas || est.leccionesCompletadas || 0,
                lecciones_iniciadas: est.lecciones_iniciadas || est.lecciones_en_progreso || est.lecciones || 0,
                promedio_general: est.promedio_general ?? est.promedio_progreso ?? est.porcentaje ?? 0,
                promedio_progreso: est.promedio_progreso ?? est.promedio_general ?? est.porcentaje ?? 0,
                tiempo_total_estudio: est.tiempo_total_estudio || est.tiempo_total_horas || 0,
                racha_actual: est.racha_actual || est.racha_dias || 0,
                curso_nombre: est.curso_nombre || '',
                curso_id: est.curso_id || est.leccion_id || null
            };
        });
    }

    renderizarTopEstudiantes(estudiantes) {
        const container = document.getElementById('topEstudiantes');
        if (!container) return;

        if (!estudiantes || estudiantes.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <div class="text-5xl mb-3">🏆</div>
                    <p class="text-gray-600 dark:text-gray-400">No hay estudiantes todavía</p>
                </div>
            `;
            return;
        }

        const top5 = estudiantes.slice(0, 5);

        container.innerHTML = top5.map((est, index) => {
            const nombreCompleto = est.nombre_completo || `${est.nombre || ''} ${est.primer_apellido || ''}`.trim();
            
            return `
                <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div class="flex items-center space-x-4">
                        <div class="flex-shrink-0 w-10 h-10 bg-gradient-to-br ${this.getGradientByRank(index)} rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                            ${index + 1}
                        </div>
                        <div>
                            <h4 class="font-semibold text-gray-900 dark:text-white">
                                ${nombreCompleto}
                            </h4>
                            <p class="text-sm text-gray-600 dark:text-gray-400">
                                ${est.lecciones_completadas || 0} lecciones completadas
                            </p>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                            ${est.total_xp || 0} XP
                        </div>
                        <div class="text-sm text-gray-500">
                            ${Math.round(est.promedio_general || est.promedio_progreso || 0)}% progreso
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getGradientByRank(index) {
        const gradients = [
            'from-yellow-400 to-yellow-600',
            'from-gray-300 to-gray-500',
            'from-orange-400 to-orange-600',
            'from-blue-400 to-blue-600',
            'from-purple-400 to-purple-600'
        ];
        return gradients[index] || 'from-gray-400 to-gray-600';
    }

    renderizarListaEstudiantes(estudiantes) {
        const container = document.getElementById('lista-estudiantes');
        if (!container) {
            console.warn('⚠️ No se encontró el contenedor lista-estudiantes');
            return;
        }

        if (!estudiantes || estudiantes.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-12">
                        <div class="text-6xl mb-4">👥</div>
                        <p class="text-gray-500 dark:text-gray-400 text-lg">No hay estudiantes asignados</p>
                        <p class="text-sm text-gray-400 mt-2">Los estudiantes aparecerán aquí cuando se asignen</p>
                    </td>
                </tr>
            `;
            return;
        }

        // 🔍 DEBUG: Ver estructura del primer estudiante
        console.log('📋 Campos disponibles en estudiante:', Object.keys(estudiantes[0]));
        console.log('📋 Datos del primer estudiante:', estudiantes[0]);

        container.innerHTML = estudiantes.map(est => {
            // ✅ MAPEO CORRECTO: Obtener ID correcto
            const estudianteId = est.id || est.usuario_id || est.estudiante_id;
            
            return `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td class="px-6 py-4">
                        <div class="flex items-center space-x-3">
                            <div class="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                                <span class="text-white font-bold text-xs">
                                    ${(est.nombre?.charAt(0) || '')}${(est.primer_apellido?.charAt(0) || '')}
                                </span>
                            </div>
                            <div>
                                <div class="font-semibold text-gray-900 dark:text-white">
                                    ${est.nombre || ''} ${est.primer_apellido || ''}
                                </div>
                                <div class="text-sm text-gray-600 dark:text-gray-400">
                                    ${est.correo || ''}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 rounded-full font-medium">
                            ${est.nivel_actual || est.nivel || 'A1'}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-gray-900 dark:text-white">
                        ${est.idioma_aprendizaje || est.idioma || 'Inglés'}
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-sm text-gray-700 dark:text-gray-300">
                            ${est.lecciones_completadas || 0}/${est.lecciones_iniciadas || est.lecciones_en_progreso || 0}
                        </span>
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex items-center space-x-2">
                            <div class="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                <div class="bg-green-500 h-2 rounded-full transition-all" 
                                     style="width: ${Math.round(est.promedio_progreso || est.promedio_general || 0)}%"></div>
                            </div>
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                ${Math.round(est.promedio_progreso || est.promedio_general || 0)}%
                            </span>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-lg font-bold text-blue-600 dark:text-blue-400">
                            ${est.total_xp || 0}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

        console.log(`✅ ${estudiantes.length} estudiantes renderizados en la tabla`);
    }

    renderizarAlertas(alertas) {
        const container = document.getElementById('alertasContainer');
        const badge = document.getElementById('alertasBadge');
        
        if (!container) return;

        if (badge) {
            const totalAlertas = alertas?.length || 0;
            badge.textContent = totalAlertas;
            badge.classList.toggle('hidden', totalAlertas === 0);
        }

        if (!alertas || alertas.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <div class="text-5xl mb-3">🎉</div>
                    <p class="text-gray-600 dark:text-gray-400 font-medium">
                        ¡Excelente trabajo!
                    </p>
                    <p class="text-sm text-gray-500 mt-1">
                        No hay alertas pendientes
                    </p>
                </div>
            `;
            return;
        }

        const severityColors = {
            'info': 'bg-blue-100 text-blue-800 border-blue-500 dark:bg-blue-900/20 dark:text-blue-300',
            'warning': 'bg-yellow-100 text-yellow-800 border-yellow-500 dark:bg-yellow-900/20 dark:text-yellow-300',
            'critical': 'bg-red-100 text-red-800 border-red-500 dark:bg-red-900/20 dark:text-red-300'
        };

        container.innerHTML = alertas.map(alerta => {
            const colorClase = severityColors[alerta.severidad] || severityColors.info;
            
            return `
                <div class="p-4 border-l-4 ${colorClase} bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-xs px-2 py-1 rounded-full ${colorClase}">
                                    ${(alerta.severidad || 'info').toUpperCase()}
                                </span>
                                <span class="text-sm text-gray-600 dark:text-gray-400">
                                    ${alerta.estudiante_nombre || 'Estudiante'}
                                </span>
                            </div>
                            <h4 class="font-medium text-gray-900 dark:text-white">${alerta.titulo || 'Alerta'}</h4>
                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                ${alerta.descripcion || 'Sin descripción disponible'}
                            </p>
                        </div>
                        <button onclick="dashboard.resolverAlerta(${alerta.id})" 
                                class="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 ml-4">
                            Revisar
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    mostrarContenido() {
        const loading = document.getElementById('loadingDashboard');
        const content = document.getElementById('dashboardContent');

        if (loading) loading.classList.add('hidden');
        if (content) content.classList.remove('hidden');
    }

    configurarEventListeners() {
        const btnEstadisticas = document.getElementById('btnVerEstadisticas');
        const btnRetroalimentacion = document.getElementById('btnRetroalimentacion');
        const btnPlanificacion = document.getElementById('btnPlanificacion');

        if (btnEstadisticas) {
            btnEstadisticas.addEventListener('click', () => {
                window.location.href = '/pages/profesor/estadisticas-profesor.html';
            });
        }

        if (btnRetroalimentacion) {
            btnRetroalimentacion.addEventListener('click', () => {
                window.location.href = '/pages/profesor/retroalimentacion-profesor.html';
            });
        }

        if (btnPlanificacion) {
            btnPlanificacion.addEventListener('click', () => {
                window.location.href = '/pages/profesor/planificacion.html';
            });
        }
    }

    async resolverAlerta(alertaId) {
        try {
            const response = await fetch(`${this.API_URL}/profesor/alertas/${alertaId}/revisar`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                await this.cargarDatosDashboard();
                this.renderizarDashboard();
                this.mostrarNotificacion('Alerta marcada como revisada', 'success');
            }
        } catch (error) {
            console.error('❌ Error resolviendo alerta:', error);
            this.mostrarError('Error al marcar alerta como revisada');
        }
    }

    mostrarNotificacion(mensaje, tipo = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            tipo === 'success' ? 'bg-green-500 text-white' : 
            tipo === 'error' ? 'bg-red-500 text-white' : 
            'bg-blue-500 text-white'
        }`;
        toast.textContent = mensaje;
        
        document.body.appendChild(toast);
        setTimeout(() => document.body.removeChild(toast), 3000);
    }

    mostrarError(mensaje) {
        this.mostrarNotificacion(mensaje, 'error');
    }
}

// Inicialización global
let dashboard;

document.addEventListener('DOMContentLoaded', () => {
    dashboard = new ProfesorDashboard();
});

window.ProfesorDashboard = ProfesorDashboard;
window.dashboard = dashboard;