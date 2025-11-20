// ==========================================================
// backend/middleware/authMiddleware.js - COMPLETO CON MÓDULO 4
// Middleware de autenticación y autorización
// ==========================================================

const jwt = require('jsonwebtoken');
const database = require('../config/database');

// ==========================================================
// VERIFICAR TOKEN JWT
// ==========================================================

/**
 * Middleware para verificar token JWT
 * @desc Verifica el token JWT y agrega el usuario al request
 * @access Private
 */
const verificarToken = async (req, res, next) => {
    try {
        let token;

        // 1. Obtener token del header Authorization
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
            console.log('🔑 Token obtenido del header Authorization');
        } 
        // 2. Obtener token de query string (para desarrollo/testing)
        else if (req.query.token) {
            token = req.query.token;
            console.log('🔑 Token obtenido del query string');
        }

        // Si no hay token
        if (!token) {
            return res.status(401).json({
                error: 'Acceso no autorizado. Token requerido.',
                codigo: 'TOKEN_REQUIRED',
                sugerencia: 'Incluye el token en el header: Authorization: Bearer {token}'
            });
        }

        // Verificar token
        const JWT_SECRET = process.env.JWT_SECRET || 'secreto_por_defecto_para_desarrollo';
        const decoded = jwt.verify(token, JWT_SECRET);
        
        console.log('✅ Token verificado para usuario:', decoded.id);

        // CORREGIDO: usar correo_verificado en lugar de email_verificado
        const [usuarios] = await database.query(
            `SELECT id, nombre, primer_apellido, correo, rol, estado_cuenta, correo_verificado 
             FROM usuarios 
             WHERE id = ?`,
            [decoded.id]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                error: 'Token inválido. Usuario no encontrado.',
                codigo: 'USER_NOT_FOUND'
            });
        }

        const usuario = usuarios[0];

        // Verificar estado de la cuenta
        if (usuario.estado_cuenta !== 'activo') {
            return res.status(401).json({
                error: `Cuenta ${usuario.estado_cuenta}. Contacta al administrador.`,
                codigo: 'ACCOUNT_INACTIVE',
                estado: usuario.estado_cuenta
            });
        }

        // Agregar usuario al request para uso en controllers
        req.user = usuario;
        
        console.log('✅ Usuario autenticado:', {
            id: usuario.id,
            correo: usuario.correo,
            rol: usuario.rol
        });

        next();

    } catch (error) {
        console.error('❌ Error verificando token:', error.message);

        // Manejar errores específicos de JWT
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Token inválido',
                codigo: 'INVALID_TOKEN',
                detalle: error.message
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expirado. Por favor inicia sesión nuevamente.',
                codigo: 'TOKEN_EXPIRED',
                expiro_en: error.expiredAt
            });
        }

        if (error.name === 'NotBeforeError') {
            return res.status(401).json({
                error: 'Token aún no es válido',
                codigo: 'TOKEN_NOT_YET_VALID'
            });
        }

        // Error genérico
        res.status(500).json({
            error: 'Error interno del servidor al verificar token',
            codigo: 'TOKEN_VERIFICATION_ERROR'
        });
    }
};

// ==========================================================
// VERIFICAR ROL DE USUARIO - CORREGIDO
// ==========================================================

/**
 * Middleware para verificar que el usuario tenga uno de los roles permitidos
 * @param {...(string|string[])} rolesPermitidos - Roles permitidos como array o argumentos individuales
 * @returns {Function} Middleware function
 * 
 * @example
 * // Uso con array (RECOMENDADO):
 * router.get('/ruta', verificarRol(['alumno']), controller)
 *
 * // Uso con múltiples argumentos:
 * router.get('/ruta', verificarRol('profesor', 'admin'), controller)
 * 
 * // Uso con múltiples roles:
 * router.get('/ruta', verificarRol(['profesor', 'admin']), controller)
 * 
 * // Uso con string único (también funciona):
 * router.get('/ruta', verificarRol('alumno'), controller)
 */
const verificarRol = (...rolesPermitidos) => {
    return (req, res, next) => {
        // Verificar que el usuario esté autenticado
        if (!req.user) {
            return res.status(401).json({
                error: 'Usuario no autenticado',
                codigo: 'UNAUTHENTICATED',
                sugerencia: 'Primero debes iniciar sesión'
            });
        }

        // CORREGIDO: Asegurarse de que rolesPermitidos sea un array y aceptar argumentos múltiples
        let rolesArray = rolesPermitidos;
        if (rolesPermitidos.length === 1 && Array.isArray(rolesPermitidos[0])) {
            rolesArray = rolesPermitidos[0];
        }

        // Normalizar roles permitidos y soportar alias comunes
        const normalizarRol = (rol = '') => {
            const value = rol.toString().toLowerCase();
            if (['admin', 'administrador'].includes(value)) return 'admin';
            if (['profesor', 'teacher', 'docente'].includes(value)) return 'profesor';
            if (['alumno', 'estudiante', 'student'].includes(value)) return 'alumno';
            return value;
        };

        const rolesNormalizados = rolesArray.map(normalizarRol);
        const rolUsuario = normalizarRol(req.user.rol);

        // Verificar si el rol del usuario está en los roles permitidos
        if (!rolesNormalizados.includes(rolUsuario)) {
            console.log(`❌ Acceso denegado: usuario con rol "${req.user.rol}" intentó acceder a recurso que requiere roles: ${rolesArray.join(', ')}`);
            
            return res.status(403).json({
                error: 'No tienes permisos para realizar esta acción',
                codigo: 'INSUFFICIENT_PERMISSIONS',
                rol_requerido: rolesArray,
                tu_rol: req.user.rol,
                usuario_id: req.user.id
            });
        }

        console.log(`✅ Acceso permitido: usuario con rol "${req.user.rol}" para roles: ${rolesArray.join(', ')}`);
        next();
    };
};

// ==========================================================
// VERIFICAR EMAIL VERIFICADO
// ==========================================================

/**
 * Middleware para verificar que el email del usuario esté verificado
 * @desc Requiere que verificarToken se ejecute primero
 * @access Private
 * CORREGIDO: usar correo_verificado en lugar de email_verificado
 */
const verificarEmail = (req, res, next) => {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
        return res.status(401).json({
            error: 'Usuario no autenticado',
            codigo: 'UNAUTHENTICATED'
        });
    }

    // CORREGIDO: verificar correo_verificado en lugar de email_verificado
    if (!req.user.correo_verificado) {
        console.log(`❌ Email no verificado para usuario: ${req.user.id}`);
        
        return res.status(403).json({
            error: 'Debes verificar tu email antes de acceder a este recurso',
            codigo: 'EMAIL_NOT_VERIFIED',
            sugerencia: 'Revisa tu correo electrónico y ingresa el código de verificación'
        });
    }

    console.log(`✅ Email verificado para usuario: ${req.user.id}`);
    next();
};

// ==========================================================
// VERIFICAR PROPIO USUARIO O ADMIN
// ==========================================================

/**
 * Middleware para verificar que el usuario esté accediendo a sus propios datos
 * o que sea administrador
 * @param {string} paramName - Nombre del parámetro que contiene el ID del usuario
 * @returns {Function} Middleware function
 * 
 * @example
 * router.get('/usuarios/:id', verificarPropioUsuarioOAdmin('id'), controller)
 */
const verificarPropioUsuarioOAdmin = (paramName = 'id') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Usuario no autenticado',
                codigo: 'UNAUTHENTICATED'
            });
        }

        const idSolicitado = parseInt(req.params[paramName]);
        const esAdmin = ['admin', 'administrador'].includes(req.user.rol);
        const esPropioUsuario = req.user.id === idSolicitado;

        if (!esPropioUsuario && !esAdmin) {
            console.log(`❌ Usuario ${req.user.id} intentó acceder a datos del usuario ${idSolicitado}`);
            
            return res.status(403).json({
                error: 'No tienes permisos para acceder a estos datos',
                codigo: 'FORBIDDEN'
            });
        }

        console.log(`✅ Acceso permitido: ${esPropioUsuario ? 'propio usuario' : 'admin'}`);
        next();
    };
};

// ==========================================================
// MIDDLEWARE DE LOGGING DE REQUESTS
// ==========================================================

/**
 * Middleware para loguear requests (útil para debugging)
 * @desc Registra información sobre cada request
 * @access Public/Private
 */
const logRequests = (req, res, next) => {
    const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        user: req.user ? `${req.user.id} (${req.user.rol})` : 'Anonymous'
    };

    console.log(`📨 [REQUEST]`, logData);
    
    // Registrar tiempo de respuesta
    const startTime = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`✅ [RESPONSE] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });

    next();
};

// ==========================================================
// RATE LIMITING POR USUARIO
// ==========================================================

/**
 * Middleware simple de rate limiting por usuario
 * @param {number} maxRequests - Máximo número de requests
 * @param {number} windowMs - Ventana de tiempo en milisegundos
 * @returns {Function} Middleware function
 */
const rateLimitPorUsuario = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    const requests = new Map();

    return (req, res, next) => {
        if (!req.user) {
            return next();
        }

        const userId = req.user.id;
        const now = Date.now();
        const userRequests = requests.get(userId) || [];

        // Filtrar requests dentro de la ventana de tiempo
        const recentRequests = userRequests.filter(time => now - time < windowMs);

        if (recentRequests.length >= maxRequests) {
            console.log(`⚠️ Rate limit excedido para usuario: ${userId}`);
            
            return res.status(429).json({
                error: 'Demasiadas peticiones. Por favor intenta más tarde.',
                codigo: 'TOO_MANY_REQUESTS',
                retry_after: Math.ceil(windowMs / 1000) + ' segundos'
            });
        }

        // Agregar request actual
        recentRequests.push(now);
        requests.set(userId, recentRequests);

        next();
    };
};

// ==========================================================
// MIDDLEWARES ESPECÍFICOS PARA MÓDULO 4
// ==========================================================

/**
 * Middleware para verificar que el usuario es profesor
 * @access Private (Profesor only)
 */
const verificarProfesor = (req, res, next) => {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
        return res.status(401).json({
            error: 'Usuario no autenticado',
            codigo: 'UNAUTHENTICATED'
        });
    }

    // Aceptar variantes del rol profesor para compatibilidad con datos existentes
    const rolesProfesor = ['profesor', 'teacher'];

    // Permitimos también a administradores acceder para tareas de soporte
    const rolesPermitidos = [...rolesProfesor, 'admin'];

    if (!rolesPermitidos.includes(req.user.rol)) {
        return res.status(403).json({
            error: 'Acceso denegado. Solo profesores pueden acceder a este recurso.',
            codigo: 'PROFESOR_REQUIRED',
            tu_rol: req.user.rol,
            roles_aceptados: rolesPermitidos
        });
    }

    console.log(`✅ Acceso de profesor permitido: ${req.user.id} (rol: ${req.user.rol})`);
    next();
};

/**
 * Middleware para verificar que el usuario es estudiante
 * @access Private (Estudiante only)
 */
const verificarEstudiante = (req, res, next) => {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
        return res.status(401).json({
            error: 'Usuario no autenticado',
            codigo: 'UNAUTHENTICATED'
        });
    }

    if (req.user.rol !== 'alumno') {
        return res.status(403).json({
            error: 'Acceso denegado. Solo estudiantes pueden acceder a este recurso.',
            codigo: 'ESTUDIANTE_REQUIRED',
            tu_rol: req.user.rol
        });
    }

    console.log(`✅ Acceso de estudiante permitido: ${req.user.id}`);
    next();
};

/**
 * Middleware para verificar que el usuario es administrador
 * @access Private (Admin only)
 */
const verificarAdmin = (req, res, next) => {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
        return res.status(401).json({
            error: 'Usuario no autenticado',
            codigo: 'UNAUTHENTICATED'
        });
    }

    if (req.user.rol !== 'admin') {
        return res.status(403).json({
            error: 'Acceso denegado. Solo administradores pueden acceder a este recurso.',
            codigo: 'ADMIN_REQUIRED',
            tu_rol: req.user.rol
        });
    }

    console.log(`✅ Acceso de administrador permitido: ${req.user.id}`);
    next();
};

// ==========================================================
// EXPORTAR MIDDLEWARES
// ==========================================================

module.exports = {
    verificarToken,
    verificarRol,
    verificarEmail,
    verificarPropioUsuarioOAdmin,
    logRequests,
    rateLimitPorUsuario,
    // Middlewares específicos del Módulo 4
    verificarProfesor,
    verificarEstudiante,
    verificarAdmin
};