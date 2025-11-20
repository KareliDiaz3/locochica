/* ============================================
   SPEAKLEXI - PÁGINA DE LOGIN
   Archivo: assets/js/pages/auth/login.js
   Usa: API_CONFIG, STORAGE_CONFIG, ROLES_CONFIG, apiClient, formValidator, toastManager
   ============================================ */

(() => {
    'use strict';

    // ============================================
    // 1. ESPERA ACTIVA DE DEPENDENCIAS
    // ============================================
    const requiredDependencies = [
        'API_CONFIG',
        'STORAGE_CONFIG', 
        'ROLES_CONFIG',
        'apiClient', 
        'formValidator',
        'toastManager',
        'themeManager'
    ];

    /**
     * Espera a que todas las dependencias estén cargadas
     */
    async function waitForDependencies(maxWaitMs = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitMs) {
            const allLoaded = requiredDependencies.every(dep => window[dep]);
            
            if (allLoaded) {
                console.log('✅ Todas las dependencias cargadas');
                return true;
            }
            
            // Esperar 100ms antes de revisar de nuevo
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Timeout: mostrar qué falta
        const missing = requiredDependencies.filter(dep => !window[dep]);
        console.error(`❌ Timeout esperando dependencias. Faltan: ${missing.join(', ')}`);
        return false;
    }

    /**
     * Verificación de dependencias con reporte detallado
     */
    function checkDependencies() {
        const results = {};
        let allOk = true;
        
        for (const dep of requiredDependencies) {
            const loaded = !!window[dep];
            results[dep] = loaded;
            
            if (!loaded) {
                console.error(`❌ ${dep} no está cargado`);
                allOk = false;
            }
        }
        
        return { allOk, results };
    }

    // ============================================
    // 2. CONFIGURACIÓN DESDE APP_CONFIG (CORREGIDO)
    // ============================================
    const config = {
        get ENDPOINTS() { return window.API_CONFIG?.ENDPOINTS || {}; },
        get STORAGE() { return window.STORAGE_CONFIG?.KEYS || {}; },
        get VALIDATION() { return window.VALIDATION_CONFIG || {}; },
        get UI() { return window.UI_CONFIG || {}; },
        get ROLES() { return window.ROLES_CONFIG || {}; }
    };

    // ============================================
    // 3. ELEMENTOS DEL DOM
    // ============================================
    const elementos = {
        loginForm: document.getElementById('login-form'),
        emailInput: document.getElementById('email'),
        passwordInput: document.getElementById('password'),
        submitBtn: document.getElementById('submit-btn'),
        togglePassword: document.getElementById('toggle-password'),
        eyeIcon: document.getElementById('eye-icon'),
        errorAlert: document.getElementById('error-alert'),
        errorMessage: document.getElementById('error-message'),
        deactivatedAlert: document.getElementById('deactivated-alert'),
        deactivatedMessage: document.getElementById('deactivated-message'),
        reactivateBtn: document.getElementById('reactivate-btn'),
        toggleTestUsers: document.getElementById('toggle-test-users'),
        testUsersContainer: document.getElementById('test-users-container'),
        toggleIcon: document.getElementById('toggle-icon')
    };

    // ============================================
    // 4. ESTADO DE LA APLICACIÓN
    // ============================================
    const estado = {
        isLoading: false,
        userId: null,
        diasRestantes: 0,
        cuentaDesactivada: false,
        reactivacionPendiente: null
    };

    const REACTIVATION_STORAGE_KEY = 'speaklexi_reactivation_request';

    // ============================================
    // 5. USUARIOS DE PRUEBA
    // ============================================
    const TEST_USERS = [
        {
            name: "Estudiante Demo",
            email: "estudiante@speaklexi.com",
            password: "Estudiante123!",
            role: "estudiante",
            description: "Acceso completo al módulo de aprendizaje",
            color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
        },
        {
            name: "Profesor Demo",
            email: "profesor@speaklexi.com",
            password: "Profesor123!",
            role: "profesor",
            description: "Acceso a estadísticas y retroalimentación",
            color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        },
        {
            name: "Admin Demo",
            email: "admin@speaklexi.com",
            password: "Admin123!",
            role: "admin",
            description: "Gestión de contenido y lecciones",
            color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
        },
    ];

    // ============================================
    // 6. FUNCIONES PRINCIPALES
    // ============================================

    /**
     * Inicializa el módulo
     */
    async function init() {
        console.log('🚀 Iniciando módulo Login...');
        
        // Esperar a que se carguen las dependencias
        const dependenciesLoaded = await waitForDependencies();
        
        if (!dependenciesLoaded) {
            const { results } = checkDependencies();
            console.error('💥 No se pudieron cargar todas las dependencias:', results);
            
            // Mostrar error en la UI
            if (elementos.errorAlert && elementos.errorMessage) {
                elementos.errorMessage.textContent = 'Error al cargar módulos del sistema. Recarga la página.';
                elementos.errorAlert.classList.remove('hidden');
            }
            return;
        }

        console.log('✅ Módulo Login inicializado correctamente');
        
        setupEventListeners();
        cargarUsuariosPrueba();

        estado.reactivacionPendiente = cargarInfoReactivacion();
        if (estado.reactivacionPendiente && elementos.emailInput && !elementos.emailInput.value) {
            elementos.emailInput.value = estado.reactivacionPendiente.email;
            mostrarAlertaReactivacion();
        } else {
            verificarBanderaReactivacionURL();
        }
        
        if (window.APP_ENV?.DEBUG) {
            console.log('🔧 Módulo Login listo:', { config, elementos });
        }
    }

    /**
     * Configura todos los event listeners
     */
    function setupEventListeners() {
        // Formulario principal
        elementos.loginForm?.addEventListener('submit', manejarLogin);
        
        // Toggle password visibility
        elementos.togglePassword?.addEventListener('click', togglePasswordVisibility);
        
        // Toggle test users
        elementos.toggleTestUsers?.addEventListener('click', toggleTestUsersVisibility);
        
        // Reactivar cuenta
        elementos.reactivateBtn?.addEventListener('click', manejarReactivacionCuenta);

        elementos.emailInput?.addEventListener('input', manejarCambioEmail);
    }

    /**
     * Maneja el proceso de login
     */
    async function manejarLogin(e) {
        e.preventDefault();
        
        if (estado.isLoading) return;
        
        const datos = obtenerDatosFormulario();
        const validacion = validarFormulario(datos);
        
        if (!validacion.esValido) {
            mostrarErrores(validacion.errores);
            return;
        }

        await intentarReactivacionSilenciosa(datos.correo);
        await iniciarSesion(datos);
    }

    /**
     * Obtiene datos del formulario
     */
    function obtenerDatosFormulario() {
        return {
            correo: elementos.emailInput.value.trim(),
            password: elementos.passwordInput.value
        };
    }

    /**
     * Valida el formulario completo
     */
    function validarFormulario(datos) {
        const errores = {};
        
        // Validar email
        if (!datos.correo) {
            errores.email = 'El correo electrónico es requerido';
        } else if (window.formValidator && !window.formValidator.validateEmail(datos.correo)) {
            errores.email = 'Por favor ingresa un email válido';
        }
        
        // Validar contraseña
        if (!datos.password) {
            errores.password = 'La contraseña es requerida';
        } else if (datos.password.length < 6) {
            errores.password = 'La contraseña debe tener al menos 6 caracteres';
        }
        
        return {
            esValido: Object.keys(errores).length === 0,
            errores: errores
        };
    }

    /**
     * Inicia sesión en el sistema
     */
    async function iniciarSesion(datos) {
        try {
            estado.isLoading = true;
            mostrarLoading(true);
            limpiarErrores();

            console.log('🔐 Intentando login...');

            // ✅ USAR apiClient CON ENDPOINTS CORRECTO
            const endpoint = window.API_CONFIG.ENDPOINTS.AUTH.LOGIN;
            const response = await window.apiClient.post(endpoint, datos);

            console.log('📥 Respuesta del servidor:', response);

            if (response.success) {
                await manejarLoginExitoso(response.data);
            } else {
                manejarErrorLogin(response);
            }

        } catch (error) {
            manejarError('Error de conexión', error);
        } finally {
            estado.isLoading = false;
            mostrarLoading(false);
        }
    }

    /**
     * Maneja login exitoso
     */
    async function manejarLoginExitoso(data) {
        console.log('✅ Login exitoso. Data recibida:', data);
        
        limpiarInfoReactivacion();
        const usuario = data.usuario;
        const token = data.token;

        if (!usuario || !token) {
            console.error('❌ Respuesta inválida:', { usuario, token });
            throw new Error('Respuesta inválida del servidor');
        }

        // ✅ GUARDAR EN STORAGE USANDO CONFIG CORRECTO
        const TOKEN = window.STORAGE_CONFIG.KEYS.TOKEN;
        const USUARIO = window.STORAGE_CONFIG.KEYS.USUARIO;
        console.log('💾 Guardando en localStorage:', { USUARIO, TOKEN });
        
        localStorage.setItem(TOKEN, token);
        localStorage.setItem(USUARIO, JSON.stringify(usuario));

        window.toastManager.success(`¡Bienvenido ${usuario.nombre}!`);

        // ✅ REDIRIGIR SEGÚN ROL USANDO CONFIG CORRECTO
        const rol = usuario.rol?.toLowerCase();
        console.log('🎭 Rol del usuario:', rol);
        
        let dashboardUrl = window.ROLES_CONFIG.RUTAS_DASHBOARD[rol];
        console.log('🔗 URL de dashboard (config):', dashboardUrl);
        
        // 🔧 AJUSTE: Si la ruta es absoluta, ajustarla según ubicación actual
        if (dashboardUrl && dashboardUrl.startsWith('/pages/')) {
            // Estamos en /pages/auth/login.html
            // Necesitamos ir a /pages/estudiante/...
            dashboardUrl = dashboardUrl.replace('/pages/', '../');
            console.log('🔧 URL ajustada:', dashboardUrl);
        }
        
        if (!dashboardUrl) {
            console.warn('⚠️ No se encontró ruta para rol:', rol);
            dashboardUrl = '../estudiante/estudiante-dashboard.html';
        }

        console.log('➡️ Redirigiendo a:', dashboardUrl);

        setTimeout(() => {
            window.location.href = dashboardUrl;
        }, 1000);
    }

    /**
     * Maneja errores de login
     */
    function manejarErrorLogin(response) {
        console.log('❌ Error en login:', response);
        
        if (response.codigo === 'CUENTA_DESACTIVADA') {
            estado.userId = response.usuario_id?.toString() || null;
            estado.diasRestantes = response.dias_restantes || 0;
            
            elementos.deactivatedMessage.textContent = estado.diasRestantes > 0 
                ? `Tienes ${estado.diasRestantes} días para reactivarla.`
                : 'El período de recuperación ha expirado.';
            
            elementos.deactivatedAlert.classList.remove('hidden');
            
            if (estado.diasRestantes <= 0) {
                elementos.reactivateBtn.classList.add('hidden');
            }
            
        } else if (response.codigo === 'CUENTA_ELIMINADA' || response.codigo === 'CUENTA_ELIMINADA_TEMPORAL') {
            guardarInfoReactivacion({
                email: elementos.emailInput.value.trim(),
                userId: response.usuario_id?.toString() || null,
                expiresAt: Date.now() + ((response.dias_restantes || 30) * 24 * 60 * 60 * 1000)
            });
            mostrarAlertaReactivacion();
        } else if (response.codigo === 'EMAIL_NOT_VERIFIED') {
            window.toastManager.error('Email no verificado. Revisa tu correo.');
            setTimeout(() => {
                window.location.href = `verificar-email.html?email=${encodeURIComponent(elementos.emailInput.value)}`;
            }, 1500);
        } else {
            mostrarError(response.error || 'Error en el servidor');
        }
    }

    /**
     * Maneja errores inesperados
     */
    function manejarError(mensaje, error) {
        console.error('💥 Error:', error);
        
        if (window.APP_ENV?.DEBUG) {
            console.trace();
        }
        
        let errorMsg = mensaje;
        if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
            errorMsg = 'No se pudo conectar al servidor. Verifica tu conexión.';
        }
        
        mostrarError(errorMsg);
    }

    // ============================================
    // 7. FUNCIONES DE UI/UX
    // ============================================

    function mostrarLoading(mostrar) {
        elementos.submitBtn.disabled = mostrar;
        
        if (mostrar) {
            elementos.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Iniciando sesión...';
        } else {
            elementos.submitBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Iniciar Sesión';
        }
    }

    function mostrarError(mensaje) {
        elementos.errorMessage.textContent = mensaje;
        elementos.errorAlert.classList.remove('hidden');
        elementos.deactivatedAlert.classList.add('hidden');
    }

    function mostrarErrores(errores) {
        limpiarErrores();
        
        Object.entries(errores).forEach(([campo, mensaje]) => {
            const input = document.getElementById(campo);
            if (input) {
                input.classList.add('border-red-500');
            }
        });
        
        // Mostrar primer error
        const primerError = Object.values(errores)[0];
        if (primerError) {
            mostrarError(primerError);
        }
    }

    function limpiarErrores() {
        elementos.errorAlert?.classList.add('hidden');
        elementos.deactivatedAlert?.classList.add('hidden');
        
        // Limpiar estilos de error en inputs
        elementos.emailInput?.classList.remove('border-red-500');
        elementos.passwordInput?.classList.remove('border-red-500');
    }

    function togglePasswordVisibility() {
        const type = elementos.passwordInput.type === 'password' ? 'text' : 'password';
        elementos.passwordInput.type = type;
        elementos.eyeIcon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    }

    function toggleTestUsersVisibility() {
        elementos.testUsersContainer.classList.toggle('hidden');
        elementos.toggleIcon.className = elementos.testUsersContainer.classList.contains('hidden') 
            ? 'fas fa-chevron-down text-gray-500' 
            : 'fas fa-chevron-up text-gray-500';
    }

    function cargarInfoReactivacion() {
        const data = window.Utils?.getFromStorage(REACTIVATION_STORAGE_KEY);
        if (!data) return null;
        if (data.expiresAt && Date.now() > data.expiresAt) {
            window.Utils.removeFromStorage(REACTIVATION_STORAGE_KEY);
            return null;
        }
        return data;
    }

    function guardarInfoReactivacion(info) {
        const payload = {
            email: info.email,
            userId: info.userId,
            expiresAt: info.expiresAt
        };
        window.Utils?.saveToStorage(REACTIVATION_STORAGE_KEY, payload);
        estado.reactivacionPendiente = payload;
    }

    function limpiarInfoReactivacion() {
        window.Utils?.removeFromStorage(REACTIVATION_STORAGE_KEY);
        estado.reactivacionPendiente = null;
        ocultarAlertaReactivacion();
    }

    function mostrarAlertaReactivacion() {
        if (!estado.reactivacionPendiente || !elementos.deactivatedAlert) return;
        const dias = diasRestantesReactivacion();
        elementos.deactivatedMessage.textContent = dias > 0
            ? `Tu cuenta fue eliminada. Ingresa nuevamente antes de ${dias} día(s) para reactivarla automáticamente.`
            : 'El periodo de reactivación ha expirado.';
        elementos.deactivatedAlert.classList.remove('hidden');
        elementos.reactivateBtn.classList.toggle('hidden', dias <= 0);
        elementos.reactivateBtn.textContent = dias > 0 ? 'Reactivar mi cuenta' : 'Contactar soporte';
    }

    function ocultarAlertaReactivacion() {
        elementos.deactivatedAlert?.classList.add('hidden');
    }

    function diasRestantesReactivacion() {
        if (!estado.reactivacionPendiente?.expiresAt) return 0;
        return Math.max(0, Math.ceil((estado.reactivacionPendiente.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));
    }

    function manejarCambioEmail(event) {
        if (!estado.reactivacionPendiente) return;
        const valor = event.target.value.trim().toLowerCase();
        if (valor === estado.reactivacionPendiente.email?.toLowerCase()) {
            mostrarAlertaReactivacion();
        } else {
            ocultarAlertaReactivacion();
        }
    }

    function verificarBanderaReactivacionURL() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('reactivar') && estado.reactivacionPendiente) {
            mostrarAlertaReactivacion();
        }
    }

    async function intentarReactivacionSilenciosa(correo) {
        if (!estado.reactivacionPendiente) return;
        if (estado.reactivacionPendiente.email?.toLowerCase() !== correo.toLowerCase()) return;
        await ejecutarReactivacion(true);
    }

    async function ejecutarReactivacion(silencioso = false) {
        if (!estado.reactivacionPendiente) return false;
        const info = estado.reactivacionPendiente;
        const baseEndpoint = window.API_CONFIG?.ENDPOINTS?.USUARIO?.REACTIVAR || '/usuario/reactivar/:id';
        const objetivoId = info.userId || 'self';
        const endpoint = baseEndpoint.replace(':id', objetivoId);

        try {
            const response = await window.apiClient.post(endpoint, {
                email: info.email
            });

            if (!response.success && response.status !== 404) {
                throw new Error(response.error || 'No se pudo reactivar la cuenta');
            }

            if (!silencioso) {
                window.toastManager?.success('¡Cuenta reactivada! Inicia sesión nuevamente.');
            }
            limpiarInfoReactivacion();
            return true;
        } catch (error) {
            if (silencioso) {
                console.warn('Reactivación silenciosa fallida:', error);
            } else {
                window.toastManager?.error(error.message || 'Error al reactivar la cuenta');
            }
            return false;
        }
    }

    // ============================================
    // 8. FUNCIONES ESPECÍFICAS DEL MÓDULO
    // ============================================
    
    function cargarUsuariosPrueba() {
        if (!elementos.testUsersContainer) return;
        
        elementos.testUsersContainer.innerHTML = TEST_USERS.map(user => `
            <button type="button" data-email="${user.email}" data-password="${user.password}" class="test-user-btn w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-md">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex-1 min-w-0">
                        <p class="font-medium text-sm text-gray-900 dark:text-white">${user.name}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">${user.email}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">${user.description}</p>
                    </div>
                    <span class="text-xs font-medium px-3 py-1 rounded-full ${user.color} whitespace-nowrap">
                        ${user.role}
                    </span>
                </div>
            </button>
        `).join('');

        // Agregar event listeners a botones de usuarios de prueba
        document.querySelectorAll('.test-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const button = e.currentTarget;
                elementos.emailInput.value = button.dataset.email;
                elementos.passwordInput.value = button.dataset.password;
                elementos.testUsersContainer.classList.add('hidden');
                elementos.toggleIcon.className = 'fas fa-chevron-down text-gray-500';
                limpiarErrores();
                window.toastManager.success(`Credenciales cargadas - ${button.querySelector('p').textContent}`);
            });
        });
    }

    async function manejarReactivacionCuenta() {
        if (!estado.reactivacionPendiente) {
            window.toastManager?.error('No hay ninguna cuenta pendiente por reactivar');
            return;
        }

        elementos.reactivateBtn.disabled = true;
        elementos.reactivateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Reactivando...';

        await ejecutarReactivacion(false);

        elementos.reactivateBtn.disabled = false;
        elementos.reactivateBtn.innerHTML = '<i class="fas fa-refresh mr-2"></i>Reactivar mi cuenta';
    }

    // ============================================
    // 9. INICIALIZACIÓN
    // ============================================
    
    // Esperar a que el DOM esté listo Y las dependencias cargadas
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM ya está listo, iniciar con delay para dar tiempo a scripts async
        setTimeout(init, 200);
    }

})();